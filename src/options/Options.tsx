import { useEffect, useState } from "react";
import { KNOWN_PROVIDERS, getProvider } from "../lib/providers";
import type { ChatBackend, ProviderId } from "../lib/providers/types";
import {
  type Settings,
  clearAllHistory,
  exportAllData,
  getActiveProviderId,
  getProviderConfig,
  getSettings,
  setActiveProviderId,
  setProviderConfig,
  setSettings,
} from "../lib/storage";

type AvailabilityMap = Partial<Record<ProviderId, { available: boolean; reason?: string }>>;

// These providers are not yet implemented. Show them but prevent selection.
const COMING_SOON = new Set<ProviderId>(["openai", "google", "openrouter", "ollama"]);

const PROVIDER_HELP: Record<ProviderId, { url?: string; helper: string }> = {
  "chrome-nano": {
    helper:
      "Built into Chrome 138+. Enable at chrome://flags/#prompt-api-for-gemini-nano if needed.",
  },
  groq: {
    url: "https://console.groq.com/keys",
    helper: "Free tier, fast inference. Sign up at console.groq.com, paste the key here.",
  },
  anthropic: {
    url: "https://console.anthropic.com",
    helper: "Pay-as-you-go Claude access. Create a key in the Anthropic console.",
  },
  openai: { url: "https://platform.openai.com/api-keys", helper: "Coming in v0.2." },
  google: { url: "https://aistudio.google.com/apikey", helper: "Coming in v0.2." },
  openrouter: { url: "https://openrouter.ai/keys", helper: "Coming in v0.2." },
  ollama: { helper: "Coming in v0.2. Run Ollama at localhost:11434." },
};

export function Options() {
  const [activeId, setActiveId] = useState<ProviderId>("chrome-nano");
  const [settings, setLocalSettings] = useState<Settings | null>(null);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [keys, setKeys] = useState<Record<ProviderId, string>>({} as Record<ProviderId, string>);
  const [models, setModels] = useState<Record<ProviderId, string>>(
    {} as Record<ProviderId, string>,
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [checkingProvider, setCheckingProvider] = useState<ProviderId | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = (await getActiveProviderId()) ?? "chrome-nano";
      const [settingsResult, ...cfgs] = await Promise.all([
        getSettings(),
        ...KNOWN_PROVIDERS.map((pid) => getProviderConfig(pid)),
      ]);
      if (cancelled) return;
      setActiveId(id);
      setLocalSettings(settingsResult);
      const k: Record<string, string> = {};
      const m: Record<string, string> = {};
      for (let i = 0; i < KNOWN_PROVIDERS.length; i++) {
        const pid = KNOWN_PROVIDERS[i];
        const cfg = cfgs[i];
        if (pid && cfg) {
          k[pid] = cfg.apiKey ?? "";
          m[pid] = cfg.model ?? "";
        }
      }
      setKeys(k as Record<ProviderId, string>);
      setModels(m as Record<ProviderId, string>);
      // Only probe availability for implemented providers.
      const results = await Promise.all(
        KNOWN_PROVIDERS.filter((pid) => !COMING_SOON.has(pid)).map((pid) =>
          getProvider(pid)
            .availability()
            .then((r) => [pid, r] as const),
        ),
      );
      if (cancelled) return;
      const av: AvailabilityMap = Object.fromEntries(
        results.map(([pid, r]) => [
          pid,
          r.available ? { available: true } : { available: false, reason: r.reason },
        ]),
      );
      setAvailability(av);
    })().catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings) return <div className="shell">Loading…</div>;

  const onChangeProvider = async (id: ProviderId) => {
    setActiveId(id);
    await setActiveProviderId(id);
  };

  const onSaveKey = async (id: ProviderId) => {
    await setProviderConfig(id, { apiKey: keys[id] || undefined, model: models[id] || undefined });
    setSaveStatus(`${id} saved.`);
    setTimeout(() => setSaveStatus(null), 1500);
    setCheckingProvider(id);
    setAvailability((a) => ({ ...a, [id]: undefined }));
    try {
      const result = await getProvider(id).availability();
      setAvailability((a) => ({
        ...a,
        [id]: result.available ? { available: true } : { available: false, reason: result.reason },
      }));
    } finally {
      setCheckingProvider(null);
    }
  };

  const onToggle = async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setLocalSettings(next);
    await setSettings(patch);
  };

  const onExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagegist-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onClearHistory = async () => {
    if (!confirm("Delete all stored conversations? This cannot be undone.")) return;
    await clearAllHistory();
    setSaveStatus("History cleared.");
    setTimeout(() => setSaveStatus(null), 1500);
  };

  return (
    <div className="shell">
      <h1>PageGist</h1>
      <p className="subtitle">Settings · v0.1.1</p>

      <section className="section">
        <h2>Provider</h2>
        <div className="radio-group">
          {KNOWN_PROVIDERS.map((pid) => {
            const backend = getProvider(pid);
            const comingSoon = COMING_SOON.has(pid);
            const av = availability[pid];
            const isChecking = !comingSoon && (checkingProvider === pid || !av);

            return (
              <label
                key={pid}
                className={[activeId === pid ? "selected" : "", comingSoon ? "coming-soon" : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="provider"
                  checked={activeId === pid}
                  disabled={comingSoon}
                  onChange={() => !comingSoon && void onChangeProvider(pid)}
                />
                <div style={{ flex: 1 }}>
                  <strong>{backend.displayName}</strong>
                  {comingSoon ? (
                    <span className="tier-pill coming-soon-pill">Coming soon</span>
                  ) : (
                    <span className="tier-pill">{tierLabel(backend)}</span>
                  )}
                  {!comingSoon && (
                    <span className="meta">
                      {isChecking
                        ? "Checking…"
                        : av
                          ? av.available
                            ? "✓ Ready"
                            : av.reason
                          : "Checking…"}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {!COMING_SOON.has(activeId) && (
        <ProviderConfig
          providerId={activeId}
          backend={getProvider(activeId)}
          keyValue={keys[activeId] ?? ""}
          modelValue={models[activeId] ?? ""}
          onKeyChange={(v) => setKeys((k) => ({ ...k, [activeId]: v }))}
          onModelChange={(v) => setModels((m) => ({ ...m, [activeId]: v }))}
          onSave={() => void onSaveKey(activeId)}
          checking={checkingProvider === activeId}
        />
      )}

      <section className="section">
        <h2>Behavior</h2>
        <label className="field">
          <span className="label">
            <input
              type="checkbox"
              checked={settings.persistHistory}
              onChange={(e) => void onToggle({ persistHistory: e.target.checked })}
            />{" "}
            Save conversations per URL
          </span>
          <span className="hint">Stored in chrome.storage.local. Clear anytime below.</span>
        </label>
        <label className="field">
          <span className="label">
            <input
              type="checkbox"
              checked={settings.showTokenCounter}
              onChange={(e) => void onToggle({ showTokenCounter: e.target.checked })}
            />{" "}
            Show cost counter
          </span>
          <span className="hint">Shows estimated cost per session in the sidebar footer.</span>
        </label>
        <label className="field">
          <span className="label">Page reading limit</span>
          <input
            type="text"
            inputMode="numeric"
            value={String(settings.pageTokenBudget)}
            className={budgetError ? "input-error" : ""}
            onChange={(e) => {
              const raw = e.target.value;
              const n = Number.parseInt(raw, 10);
              if (raw === "" || Number.isNaN(n)) {
                setBudgetError("Enter a number between 500 and 30,000.");
                return;
              }
              if (n < 500) {
                setBudgetError("Minimum is 500.");
                return;
              }
              if (n > 30000) {
                setBudgetError("Maximum is 30,000.");
                return;
              }
              setBudgetError(null);
              void onToggle({ pageTokenBudget: n });
            }}
          />
          {budgetError ? (
            <span className="hint error">{budgetError}</span>
          ) : (
            <span className="hint">
              How much of the page to send to the model. 8,000 fits most pages comfortably.
            </span>
          )}
        </label>
      </section>

      <section className="section">
        <h2>Data</h2>
        <div className="row">
          <button className="ghost" type="button" onClick={() => void onExport()}>
            Export all data
          </button>
          <button className="danger" type="button" onClick={() => void onClearHistory()}>
            Clear all conversations
          </button>
        </div>
      </section>

      {saveStatus && <p className="status ok">{saveStatus}</p>}
    </div>
  );
}

function tierLabel(b: ChatBackend): string {
  switch (b.tier) {
    case "free":
      return "Free · on-device";
    case "byok-free":
      return "Free · BYOK";
    case "byok-paid":
      return "BYOK · paid";
    case "local":
      return "Local";
  }
}

function ProviderConfig({
  providerId,
  backend,
  keyValue,
  modelValue,
  onKeyChange,
  onModelChange,
  onSave,
  checking,
}: {
  providerId: ProviderId;
  backend: ChatBackend;
  keyValue: string;
  modelValue: string;
  onKeyChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onSave: () => void;
  checking?: boolean;
}) {
  const help = PROVIDER_HELP[providerId];
  if (providerId === "chrome-nano") {
    return (
      <section className="section">
        <h2>{backend.displayName}</h2>
        <p className="subtitle" style={{ margin: 0 }}>
          {help.helper}
        </p>
      </section>
    );
  }
  return (
    <section className="section">
      <h2>{backend.displayName}</h2>
      <label className="field">
        <span className="label">
          API key
          {help.url && (
            <a href={help.url} target="_blank" rel="noreferrer" className="get-key-link">
              Get a key →
            </a>
          )}
        </span>
        <input
          type="password"
          value={keyValue}
          onChange={(e) => onKeyChange(e.target.value)}
          placeholder="Paste your key"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="hint">{help.helper}</span>
      </label>
      {backend.supportedModels && backend.supportedModels.length > 0 && (
        <label className="field">
          <span className="label">Model</span>
          <select value={modelValue} onChange={(e) => onModelChange(e.target.value)}>
            <option value="">{backend.defaultModel ?? "Default"}</option>
            {backend.supportedModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <button className="primary" type="button" onClick={onSave} disabled={checking}>
        {checking ? "Checking…" : `Save ${backend.displayName}`}
      </button>
    </section>
  );
}
