// Anthropic Claude. Uses x-api-key + anthropic-version header. SSE schema differs from OpenAI.

import { parseSSE, toProviderError } from "./stream-helpers";
import type { ChatBackend, Message, ProviderConfig } from "./types";
import { ProviderError } from "./types";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const MODELS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
] as const;

/** Approximate USD per 1M tokens, in/out. Last verified: 2026-05. */
const PRICING_PER_M_TOKENS: Record<string, { in: number; out: number }> = {
  "claude-opus-4-6": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

export function createAnthropicBackend(getConfig: () => Promise<ProviderConfig>): ChatBackend {
  return {
    id: "anthropic",
    displayName: "Anthropic Claude",
    tier: "byok-paid",
    defaultModel: DEFAULT_MODEL,
    supportedModels: MODELS,
    // Claude supports up to 200K context, but 32K of page content is a
    // practical ceiling: more than enough for any article, and keeps
    // latency and cost reasonable.
    maxContextTokens: 32000,

    async availability() {
      const cfg = await getConfig();
      if (!cfg.apiKey) {
        return { available: false, reason: "Add an Anthropic API key in settings." };
      }
      return { available: true };
    },

    async *chat(messages: Message[], opts) {
      const cfg = await getConfig();
      if (!cfg.apiKey) {
        throw new ProviderError("anthropic", "no-key", "No Anthropic API key configured.");
      }

      // Anthropic separates `system` from `messages`.
      const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
      const conv = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cfg.apiKey,
          "anthropic-version": API_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        signal: opts?.signal,
        body: JSON.stringify({
          model: opts?.model ?? cfg.model ?? DEFAULT_MODEL,
          system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
          messages: conv,
          stream: true,
          temperature: opts?.temperature ?? 0.4,
          // 4096 gives full-length summaries for typical articles while keeping
          // costs reasonable. Callers can override via opts.maxTokens.
          max_tokens: opts?.maxTokens ?? 4096,
        }),
      }).catch((err: unknown) => {
        throw new ProviderError(
          "anthropic",
          "network",
          err instanceof Error ? err.message : "Network error",
        );
      });

      if (!response.ok) throw await toProviderError(response, "anthropic");

      for await (const payload of parseSSE(response, "anthropic")) {
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            if (evt.delta.text) yield evt.delta.text;
          }
        } catch {
          // Ignore parse errors on keep-alive / unknown events.
        }
      }
    },

    estimateCost(inputTokens, outputTokens, model) {
      const m = model ?? DEFAULT_MODEL;
      const p = PRICING_PER_M_TOKENS[m];
      if (!p) return 0;
      return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
    },
  };
}
