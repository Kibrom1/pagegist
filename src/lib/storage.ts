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

// ---- Provider config ----

export async function getProviderConfig(id: ProviderId): Promise<ProviderConfig> {
  return (await get<ProviderConfig>(K.providerConfig(id))) ?? {};
}

export async function setProviderConfig(id: ProviderId, cfg: ProviderConfig): Promise<void> {
  await set(K.providerConfig(id), cfg);
}

/**
 * SECURITY NOTE: API keys are stored as plain text in chrome.storage.local.
 * chrome.storage.local is sandboxed to the extension and not synced, so it is
 * not accessible to web pages or other extensions — this is an acceptable
 * risk for a BYOK extension.
 *
 * TODO (v0.2): Obfuscate keys with WebCrypto keyed to chrome.runtime.id so
 * that keys become unreadable after uninstall + reinstall (avoids orphaned
 * credentials). When implemented, bump CURRENT_SCHEMA_VERSION and add a
 * migration case in migrateIfNeeded() that clears legacy plain-text configs
 * and surfaces a "please re-enter your keys" prompt in the options UI.
 */

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

export async function saveConversation(conv: StoredConversation): Promise<void> {
  const key = K.history(await hashUrl(conv.url));
  await set(key, conv);
}

export async function clearAllHistory(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const toRemove = Object.keys(all).filter((k) => k.startsWith("pagegist:history:"));
  if (toRemove.length > 0) await chrome.storage.local.remove(toRemove);
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  return chrome.storage.local.get(null);
}
