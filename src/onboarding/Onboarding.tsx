import { useEffect, useState } from "react";
import { getProvider } from "../lib/providers";
import { setActiveProviderId, setProviderConfig } from "../lib/storage";

type NanoState =
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "unavailable"; reason: string };

export function Onboarding() {
  const [nano, setNano] = useState<NanoState>({ kind: "checking" });
  const [groqKey, setGroqKey] = useState("");
  const [groqKeyError, setGroqKeyError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await getProvider("chrome-nano").availability();
      setNano(
        result.available ? { kind: "available" } : { kind: "unavailable", reason: result.reason },
      );
    })();
  }, []);

  const acceptNano = async () => {
    await setActiveProviderId("chrome-nano");
    setSaved(true);
  };

  const saveGroq = async () => {
    const key = groqKey.trim();
    if (!key) return;
    if (!key.startsWith("gsk_")) {
      setGroqKeyError("Groq keys start with gsk_ — double-check you pasted the right key.");
      return;
    }
    setGroqKeyError(null);
    await setProviderConfig("groq", { apiKey: key });
    await setActiveProviderId("groq");
    setSaved(true);
  };

  const openOptions = () => chrome.runtime.openOptionsPage();

  return (
    <div className="shell">
      <h1>Welcome to PageGist</h1>
      <p className="tagline">
        An AI sidebar that lives in the margin of every page. Highlight to explain, summarize, or
        find counterarguments — without leaving the page.
      </p>

      {nano.kind === "checking" && (
        <div className="card">
          <h2>Checking your hardware…</h2>
          <p>Looking for Chrome's built-in Gemini Nano.</p>
        </div>
      )}

      {nano.kind === "available" && (
        <div className="card">
          <h2>
            <span className="ok">✓</span> PageGist is ready
          </h2>
          <p>
            Your device supports on-device AI (Gemini Nano). No setup, no API key, no cost. The
            model runs locally in Chrome.
          </p>
          <div className="actions">
            <button className="primary" type="button" onClick={() => void acceptNano()}>
              Use Gemini Nano
            </button>
            <button className="ghost" type="button" onClick={openOptions}>
              Configure another provider
            </button>
          </div>
          {saved && (
            <p className="ok" style={{ marginTop: 12 }}>
              Ready. Click the PageGist icon in the toolbar.
            </p>
          )}
        </div>
      )}

      {nano.kind === "unavailable" && (
        <>
          <div className="card">
            <h2>On-device AI not available</h2>
            <p>
              {nano.reason} You can still use PageGist with a free Groq key — it takes about 30
              seconds, no credit card, very fast inference.
            </p>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => {
                setGroqKey(e.target.value);
                setGroqKeyError(null);
              }}
              placeholder="Paste your Groq key (starts with gsk_…)"
              autoComplete="off"
              spellCheck={false}
            />
            {groqKeyError && (
              <p className="error" style={{ marginTop: 6, marginBottom: 0 }}>
                {groqKeyError}
              </p>
            )}
            <div className="actions">
              <a
                className="primary"
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
              >
                Get a free Groq key
              </a>
              <button className="ghost" type="button" onClick={() => void saveGroq()}>
                Save and continue
              </button>
            </div>
            {saved && (
              <p className="ok" style={{ marginTop: 12 }}>
                Saved. Click the PageGist icon in the toolbar.
              </p>
            )}
          </div>
          <div className="card">
            <h2>Advanced: bring your own key</h2>
            <p>
              Want to use Anthropic Claude, OpenAI, or your own local Ollama? Configure it from the
              options page.
            </p>
            <button className="ghost" type="button" onClick={openOptions}>
              Open settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}
