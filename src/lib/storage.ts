// chrome.storage.local wrappers. Single source of truth for key names.

import type { Message } from "./providers/types";
import type { ProviderConfig, ProviderId } from "./providers/types";

export type Settings = {
  /** Truncate extracted page content to this many tokens before sending. */
  pageTokenBudget: number;
  /** Show token / cost counter in side panel footer. */
  showTokenCounter: boolean;
  /** Persist conversations across sessions. Off => session-scoped only. */
  persistHistory: boolean;
  /** Telemetry — off by default; the project ships with none currently. */
  telemetry: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  pageTokenBudget: 8000,
  showTokenCounter: true,
  persistHistory: true,
  telemetry: false,
};

const K = {
  /** Incremented when the stored data shape changes in a breaking way. */
  schemaVersion: "pagegist:schema-version",
  activeProvider: "pagegist:active-provider",
  providerConfig: (id: ProviderId) => `pagegist:provider-config:${id}`,
  settings: "pagegist:settings",
  history: (urlHash: string) => `pagegist:history:${urlHash}`,
  onboarded: "pagegist:onboarded",
} as const;

/**
 * Current storage schema version. Bump this whenever the stored data shape
 * changes in a breaking way and add a migration case in `migrateIfNeeded()`.
 */
const CURRENT_SCHEMA_VERSION = 1;

async function get<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as T | undefined;
}

async function set<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// ---- API key obfuscation ----
//
// Keys are XOR'd with chrome.runtime.id and base64-encoded before storage.
// Encoded values are prefixed with "xor1:" so we can detect and transparently
// upgrade any legacy plaintext values on first read.
//
// IMPORTANT: for a *published* extension, chrome.runtime.id is a fixed, public
// value (it appears in the Web Store URL), so the XOR key is effectively public.
// This is OBFUSCATION, not encryption.
//
// Threat model: prevents API keys from being readable at a glance in DevTools →
// Application → Extension storage. It does NOT stop a motivated attacker with
// access to the machine. For a BYOK extension that makes no server-side calls,
// this is the appropriate level of protection.

// Prefix v2: encodes value as UTF-8 bytes before XOR-ing, so the function
// correctly handles any Unicode character (emoji, CJK, RTL scripts, etc.).
// Old "xor1:" values are treated as legacy plaintext and re-encoded on first write.
const OBFUSCATION_PREFIX = "xor2:";
const LEGACY_PREFIX = "xor1:";

function obfuscateKey(value: string): string {
  const seed = chrome.runtime.id;
  // Encode to UTF-8 bytes so every character maps to a well-defined byte sequence.
  const input = new TextEncoder().encode(value);
  const xored = input.map((b, i) => b ^ seed.charCodeAt(i % seed.length));
  // btoa requires a binary string whose char codes are in the 0-255 range.
  // Uint8Array guarantees that, so this is always safe.
  return OBFUSCATION_PREFIX + btoa(String.fromCharCode(...xored));
}

function deobfuscateKey(value: string): string {
  // Legacy plaintext (no prefix) or old xor1 format: return as-is so the
  // caller gets the raw value; the next write will re-encode it with xor2.
  if (!value.startsWith(OBFUSCATION_PREFIX)) {
    if (value.startsWith(LEGACY_PREFIX)) {
      // xor1 used charCodeAt which is equivalent to treating the string as
      // latin-1. Reverse it the same way so users don't lose their keys.
      const seed = chrome.runtime.id;
      const bytes = [...atob(value.slice(LEGACY_PREFIX.length))].map((c) => c.charCodeAt(0));
      return bytes
        .map((b, i) => String.fromCharCode(b ^ seed.charCodeAt(i % seed.length)))
        .join("");
    }
    return value;
  }
  const seed = chrome.runtime.id;
  // Reverse: base64 → binary string → Uint8Array of XOR'd bytes → XOR again → UTF-8 decode.
  const xored = Uint8Array.from(atob(value.slice(OBFUSCATION_PREFIX.length)), (c) =>
    c.charCodeAt(0),
  );
  const original = xored.map((b, i) => b ^ seed.charCodeAt(i % seed.length));
  return new TextDecoder().decode(original);
}

function encodeConfig(cfg: ProviderConfig): ProviderConfig {
  if (!cfg.apiKey) return cfg;
  return { ...cfg, apiKey: obfuscateKey(cfg.apiKey) };
}

function decodeConfig(cfg: ProviderConfig): ProviderConfig {
  if (!cfg.apiKey) return cfg;
  return { ...cfg, apiKey: deobfuscateKey(cfg.apiKey) };
}

// ---- Provider config ----

export async function getProviderConfig(id: ProviderId): Promise<ProviderConfig> {
  const raw = (await get<ProviderConfig>(K.providerConfig(id))) ?? {};
  return decodeConfig(raw);
}

export async function setProviderConfig(id: ProviderId, cfg: ProviderConfig): Promise<void> {
  await set(K.providerConfig(id), encodeConfig(cfg));
}

export async function getActiveProviderId(): Promise<ProviderId | undefined> {
  return get<ProviderId>(K.activeProvider);
}

export async function setActiveProviderId(id: ProviderId): Promise<void> {
  await set(K.activeProvider, id);
}

// ---- Settings ----

export async function getSettings(): Promise<Settings> {
  const stored = (await get<Partial<Settings>>(K.settings)) ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await set(K.settings, { ...current, ...patch });
}

// ---- Onboarding ----

export async function isOnboarded(): Promise<boolean> {
  return (await get<boolean>(K.onboarded)) === true;
}

export async function markOnboarded(): Promise<void> {
  await set(K.onboarded, true);
}

/**
 * Run once on service worker startup. Compares the stored schema version
 * against CURRENT_SCHEMA_VERSION and executes any required migrations.
 *
 * v1 → baseline (no migration needed).
 */
export async function migrateIfNeeded(): Promise<void> {
  const stored = (await get<number>(K.schemaVersion)) ?? 0;
  if (stored >= CURRENT_SCHEMA_VERSION) return;
  // Future: add `if (stored < N)` blocks here for each schema bump.
  await set(K.schemaVersion, CURRENT_SCHEMA_VERSION);
}

// ---- Chat history (per URL) ----

export type StoredConversation = {
  url: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

/**
 * Stable SHA-256 hex of a URL.
 *
 * Includes origin + pathname + search so that SPA pages (Reddit threads,
 * tweets, YouTube videos) that differ only in query params get distinct keys.
 * The fragment (#hash) is deliberately excluded — it's client-only and
 * rarely identifies different content.
 */
export async function hashUrl(url: string): Promise<string> {
  const u = new URL(url);
  const canon = `${u.origin}${u.pathname}${u.search}`;
  const bytes = new TextEncoder().encode(canon);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function loadConversation(url: string): Promise<StoredConversation | undefined> {
  const key = K.history(await hashUrl(url));
  return get<StoredConversation>(key);
}

/**
 * Maximum number of per-URL conversations to retain.
 * chrome.storage.local has a 10 MB limit; pruning at 100 conversations
 * keeps typical usage well within bounds (average conversation ~10–20 KB).
 */
const MAX_HISTORY_ENTRIES = 100;

export async function saveConversation(conv: StoredConversation): Promise<void> {
  const key = K.history(await hashUrl(conv.url));
  await set(key, conv);
  await pruneHistory();
}

/**
 * Remove the oldest conversations when the history exceeds MAX_HISTORY_ENTRIES.
 * Sorted by `updatedAt` ascending so the least-recently-used entries are dropped first.
 */
async function pruneHistory(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const entries = Object.entries(all)
    .filter(([k]) => k.startsWith("pagegist:history:"))
    .map(([k, v]) => ({ key: k, updatedAt: (v as StoredConversation).updatedAt ?? 0 }));

  if (entries.length <= MAX_HISTORY_ENTRIES) return;

  entries.sort((a, b) => a.updatedAt - b.updatedAt);
  const toRemove = entries.slice(0, entries.length - MAX_HISTORY_ENTRIES).map((e) => e.key);
  if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
}

export async function clearAllHistory(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const toRemove = Object.keys(all).filter((k) => k.startsWith("pagegist:history:"));
  if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  // Exclude provider configs: they hold the user's (obfuscated, recoverable)
  // API keys. An export the user might share or back up must never leak keys.
  const all = await chrome.storage.local.get(null);
  return Object.fromEntries(
    Object.entries(all).filter(([k]) => !k.startsWith("pagegist:provider-config:")),
  );
}
