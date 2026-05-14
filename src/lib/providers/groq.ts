// Groq — OpenAI-compatible, blazingly fast, generous free tier.

import { streamOpenAICompatible } from "./stream-helpers";
import type { ChatBackend, Message, ProviderConfig } from "./types";
import { ProviderError } from "./types";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (versatile)" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (instant)" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B (32K)" },
  // Gemma 2 9B omitted: its 8K context window is incompatible with the 32K
  // page-content budget. It would silently 400 on any long article.
] as const;

/**
 * Free-tier pricing for Groq is effectively $0; we still publish per-million
 * rates so paid-tier estimates are reasonable.
 */
const PRICING_PER_M_TOKENS: Record<string, { in: number; out: number }> = {
  "llama-3.3-70b-versatile": { in: 0.59, out: 0.79 },
  "llama-3.1-8b-instant": { in: 0.05, out: 0.08 },
  "mixtral-8x7b-32768": { in: 0.24, out: 0.24 },
};

export function createGroqBackend(getConfig: () => Promise<ProviderConfig>): ChatBackend {
  return {
    id: "groq",
    displayName: "Groq",
    tier: "byok-free",
    defaultModel: DEFAULT_MODEL,
    supportedModels: MODELS,
    // All supported models (Llama 3.x, Mixtral) have 32K+ context windows.
    // 32K is a practical page-content ceiling with room for system prompt,
    // conversation history, and response.
    maxContextTokens: 32000,

    async availability() {
      const cfg = await getConfig();
      if (!cfg.apiKey) {
        return { available: false, reason: "Add a Groq API key in settings." };
      }
      return { available: true };
    },

    async *chat(messages: Message[], opts) {
      const cfg = await getConfig();
      if (!cfg.apiKey) throw new ProviderError("groq", "no-key", "No Groq API key configured.");

      yield* streamOpenAICompatible({
        endpoint: ENDPOINT,
        apiKey: cfg.apiKey,
        model: opts?.model ?? cfg.model ?? DEFAULT_MODEL,
        messages,
        providerId: "groq",
        temperature: opts?.temperature,
        maxTokens: opts?.maxTokens,
        signal: opts?.signal,
      });
    },

    estimateCost(inputTokens, outputTokens, model) {
      const m = model ?? DEFAULT_MODEL;
      const p = PRICING_PER_M_TOKENS[m];
      if (!p) return 0;
      return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
    },
  };
}
