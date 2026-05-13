// Provider registry: factory + lookup. The UI never imports backends directly —
// it asks for the active provider here.

import { getActiveProviderId, getProviderConfig } from "../storage";
import { createAnthropicBackend } from "./anthropic";
import { chromeNano } from "./chrome-nano";
import { createGroqBackend } from "./groq";
import type { ChatBackend, ProviderId } from "./types";

export type { ChatBackend, ProviderId } from "./types";

const factories: Record<ProviderId, () => ChatBackend> = {
  "chrome-nano": () => chromeNano,
  groq: () => createGroqBackend(() => getProviderConfig("groq")),
  anthropic: () => createAnthropicBackend(() => getProviderConfig("anthropic")),
  // Phase 2 providers — stubs so the type system stays exhaustive.
  openai: () => notImplemented("openai"),
  google: () => notImplemented("google"),
  openrouter: () => notImplemented("openrouter"),
  ollama: () => notImplemented("ollama"),
};

/** All provider IDs the registry knows about, in onboarding order. */
export const KNOWN_PROVIDERS: readonly ProviderId[] = [
  "chrome-nano",
  "groq",
  "anthropic",
  "openai",
  "google",
  "openrouter",
  "ollama",
];

export function getProvider(id: ProviderId): ChatBackend {
  return factories[id]();
}

export async function getActiveProvider(): Promise<ChatBackend> {
  const id = await getActiveProviderId();
  return getProvider(id ?? "chrome-nano");
}

/**
 * Returns the maximum page-content token budget for the currently active
 * provider. Callers should `Math.min()` this against the user's own
 * `pageTokenBudget` setting so user preferences are always respected.
 */
export async function getActiveProviderContextBudget(): Promise<number> {
  const provider = await getActiveProvider();
  // Default to 8000 — the same as DEFAULT_SETTINGS.pageTokenBudget — so
  // providers that don't declare a limit don't silently expand the budget.
  return provider.maxContextTokens ?? 8000;
}

function notImplemented(id: ProviderId): ChatBackend {
  return {
    id,
    displayName: id,
    tier: "byok-paid",
    async availability() {
      return { available: false, reason: `${id} is planned for v0.2.` };
    },
    chat() {
      // Stub: iterator that throws on first read. Implemented this way (rather
      // than as an async generator) so biome doesn't flag an unused yield.
      return {
        [Symbol.asyncIterator](): AsyncIterator<string> {
          return {
            next(): Promise<IteratorResult<string>> {
              return Promise.reject(new Error(`${id} not implemented yet`));
            },
          };
        },
      };
    },
  };
}
