/**
 * Unit tests for src/lib/storage.ts
 *
 * We mock chrome.storage.local and chrome.runtime to avoid the extension
 * context requirement. The obfuscation tests exercise the XOR roundtrip
 * using the fixed mock runtime ID.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  clearAllHistory,
  exportAllData,
  getActiveProviderId,
  getProviderConfig,
  getSettings,
  hashUrl,
  isOnboarded,
  loadConversation,
  markOnboarded,
  migrateIfNeeded,
  saveConversation,
  setActiveProviderId,
  setProviderConfig,
  setSettings,
} from "../storage";

// ---------------------------------------------------------------------------
// Chrome API mocks
// ---------------------------------------------------------------------------

const MOCK_RUNTIME_ID = "fakeextensionid1234";
const store: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (key: string | null) => {
        if (key === null) return { ...store };
        return { [key]: store[key] };
      }),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      }),
      remove: vi.fn(async (keys: string[]) => {
        for (const k of keys) delete store[k];
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    id: MOCK_RUNTIME_ID,
    lastError: null as null | { message: string },
  },
};

vi.stubGlobal("chrome", chromeMock);

beforeEach(() => {
  // Clear the in-memory store and reset mocks before each test.
  for (const key of Object.keys(store)) delete store[key];
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getSettings / setSettings
// ---------------------------------------------------------------------------

describe("getSettings", () => {
  it("returns DEFAULT_SETTINGS when nothing is stored", async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it("merges stored partial settings with defaults", async () => {
    await setSettings({ showTokenCounter: false });
    const settings = await getSettings();
    expect(settings.showTokenCounter).toBe(false);
    // Other fields should still have their default values.
    expect(settings.pageTokenBudget).toBe(DEFAULT_SETTINGS.pageTokenBudget);
    expect(settings.persistHistory).toBe(DEFAULT_SETTINGS.persistHistory);
  });

  it("persists and retrieves all settings fields", async () => {
    const patch = {
      pageTokenBudget: 4000,
      showTokenCounter: false,
      persistHistory: false,
      telemetry: true,
    };
    await setSettings(patch);
    const settings = await getSettings();
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, ...patch });
  });
});

// ---------------------------------------------------------------------------
// Provider config + obfuscation roundtrip
// ---------------------------------------------------------------------------

describe("setProviderConfig / getProviderConfig", () => {
  it("stores and retrieves a config without an API key", async () => {
    await setProviderConfig("groq", { model: "llama-3.3-70b-versatile" });
    const cfg = await getProviderConfig("groq");
    expect(cfg.model).toBe("llama-3.3-70b-versatile");
    expect(cfg.apiKey).toBeUndefined();
  });

  it("obfuscates the API key in storage (value differs from original)", async () => {
    const apiKey = "gsk_secretkey1234";
    await setProviderConfig("groq", { apiKey });
    // Peek directly into the store to see the raw stored value.
    const rawStored = store["pagegist:provider-config:groq"] as { apiKey?: string };
    expect(rawStored.apiKey).not.toBe(apiKey);
    expect(rawStored.apiKey).toContain("xor2:");
  });

  it("deobfuscates the API key correctly on read", async () => {
    const apiKey = "gsk_secretkey1234";
    await setProviderConfig("groq", { apiKey });
    const cfg = await getProviderConfig("groq");
    expect(cfg.apiKey).toBe(apiKey);
  });

  it("roundtrip is lossless for a key with special characters (Unicode)", async () => {
    // This was a bug in xor1: btoa threw InvalidCharacterError for non-latin1 chars.
    // Fixed in xor2 by encoding to UTF-8 bytes first.
    const apiKey = "sk-ant-\u{1F511}emoji-key-\u4E2D\u6587";
    await setProviderConfig("anthropic", { apiKey });
    const cfg = await getProviderConfig("anthropic");
    expect(cfg.apiKey).toBe(apiKey);
  });

  it("backward-compat: correctly decodes an xor1-encoded value on read", async () => {
    // Simulate a value that was stored with the old xor1 format.
    // We craft it using the same latin-1 XOR logic that xor1 used.
    const apiKey = "oldkey_ascii_only";
    const seed = "fakeextensionid1234";
    const bytes = [...apiKey].map((c, i) => c.charCodeAt(0) ^ seed.charCodeAt(i % seed.length));
    const xor1Value = `xor1:${btoa(String.fromCharCode(...bytes))}`;
    store["pagegist:provider-config:groq"] = { apiKey: xor1Value };
    const cfg = await getProviderConfig("groq");
    expect(cfg.apiKey).toBe(apiKey);
  });
});

// ---------------------------------------------------------------------------
// Active provider
// ---------------------------------------------------------------------------

describe("getActiveProviderId / setActiveProviderId", () => {
  it("returns undefined when nothing is set", async () => {
    const id = await getActiveProviderId();
    expect(id).toBeUndefined();
  });

  it("persists and retrieves the active provider ID", async () => {
    await setActiveProviderId("anthropic");
    const id = await getActiveProviderId();
    expect(id).toBe("anthropic");
  });
});

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

describe("isOnboarded / markOnboarded", () => {
  it("returns false when not yet onboarded", async () => {
    expect(await isOnboarded()).toBe(false);
  });

  it("returns true after markOnboarded is called", async () => {
    await markOnboarded();
    expect(await isOnboarded()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// migrateIfNeeded
// ---------------------------------------------------------------------------

describe("migrateIfNeeded", () => {
  it("sets schema version to CURRENT_SCHEMA_VERSION on a fresh store", async () => {
    await migrateIfNeeded();
    const version = store["pagegist:schema-version"];
    expect(typeof version).toBe("number");
    expect(version as number).toBeGreaterThanOrEqual(1);
  });

  it("does not overwrite a store that is already at current version", async () => {
    await migrateIfNeeded(); // first run
    const v1 = store["pagegist:schema-version"];
    await migrateIfNeeded(); // second run — should be a no-op
    const v2 = store["pagegist:schema-version"];
    expect(v1).toBe(v2);
    // set should only have been called once (the first run).
    const setCalls = (chromeMock.storage.local.set as ReturnType<typeof vi.fn>).mock.calls;
    const versionWrites = setCalls.filter((call) => "pagegist:schema-version" in call[0]);
    expect(versionWrites.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// hashUrl
// ---------------------------------------------------------------------------

describe("hashUrl", () => {
  it("returns a 64-character hex string", async () => {
    const h = await hashUrl("https://example.com/article");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the same hash for the same URL", async () => {
    const h1 = await hashUrl("https://example.com/page?q=1");
    const h2 = await hashUrl("https://example.com/page?q=1");
    expect(h1).toBe(h2);
  });

  it("returns different hashes for different URLs", async () => {
    const h1 = await hashUrl("https://example.com/a");
    const h2 = await hashUrl("https://example.com/b");
    expect(h1).not.toBe(h2);
  });

  it("ignores the URL fragment (#hash)", async () => {
    const h1 = await hashUrl("https://example.com/page");
    const h2 = await hashUrl("https://example.com/page#section");
    expect(h1).toBe(h2);
  });

  it("differentiates URLs with different query strings", async () => {
    const h1 = await hashUrl("https://example.com/page?v=1");
    const h2 = await hashUrl("https://example.com/page?v=2");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// loadConversation / saveConversation / clearAllHistory
// ---------------------------------------------------------------------------

describe("conversation persistence", () => {
  const conv = {
    url: "https://example.com/article",
    title: "Test Article",
    messages: [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ],
    updatedAt: Date.now(),
  };

  it("returns undefined when no conversation is stored", async () => {
    const result = await loadConversation(conv.url);
    expect(result).toBeUndefined();
  });

  it("saves and loads a conversation for the same URL", async () => {
    await saveConversation(conv);
    const loaded = await loadConversation(conv.url);
    expect(loaded).toBeDefined();
    expect(loaded?.title).toBe(conv.title);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.messages[0]?.content).toBe("Hello");
  });

  it("clearAllHistory removes all stored conversations", async () => {
    await saveConversation(conv);
    await clearAllHistory();
    const loaded = await loadConversation(conv.url);
    expect(loaded).toBeUndefined();
  });

  it("clearAllHistory does not remove non-history keys", async () => {
    await setSettings({ showTokenCounter: false });
    await saveConversation(conv);
    await clearAllHistory();
    // Settings should still be intact.
    const settings = await getSettings();
    expect(settings.showTokenCounter).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// exportAllData
// ---------------------------------------------------------------------------

describe("exportAllData", () => {
  it("includes settings in the export", async () => {
    await setSettings({ pageTokenBudget: 5000 });
    const data = await exportAllData();
    expect(data).toHaveProperty("pagegist:settings");
  });

  it("excludes provider config keys (API keys) from the export", async () => {
    await setProviderConfig("groq", { apiKey: "gsk_secret" });
    const data = await exportAllData();
    const hasProviderKey = Object.keys(data).some((k) => k.startsWith("pagegist:provider-config:"));
    expect(hasProviderKey).toBe(false);
  });

  it("includes history in the export", async () => {
    const conv = {
      url: "https://example.com",
      title: "Test",
      messages: [],
      updatedAt: Date.now(),
    };
    await saveConversation(conv);
    const data = await exportAllData();
    const hasHistory = Object.keys(data).some((k) => k.startsWith("pagegist:history:"));
    expect(hasHistory).toBe(true);
  });
});
