// Shared types for every chat backend.

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ChatOpts = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type ProviderAvailability = { available: true } | { available: false; reason: string };

export type ProviderTier = "free" | "byok-free" | "byok-paid" | "local";

export interface ChatBackend {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly tier: ProviderTier;
  /** Default model id for this backend; UI can override via ChatOpts. */
  readonly defaultModel?: string;
  /** Optional, fixed list of supported models for the picker. */
  readonly supportedModels?: readonly { id: string; label: string }[];
  /**
   * Maximum page-content tokens this provider can receive in a single request.
   * This is NOT the model's total context window — it accounts for system
   * prompt overhead, conversation history, and expected response length.
   * Falls back to the user's pageTokenBudget setting if unset.
   */
  readonly maxContextTokens?: number;

  availability(config?: ProviderConfig): Promise<ProviderAvailability>;
  chat(messages: Message[], opts?: ChatOpts): AsyncIterable<string>;
  /** USD cost for input + output tokens. Returns 0 for free providers. */
  estimateCost?(inputTokens: number, outputTokens: number, model?: string): number;
}

export interface ProviderConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export type ProviderId =
  | "chrome-nano"
  | "groq"
  | "anthropic"
  | "openai"
  | "google"
  | "openrouter"
  | "ollama";

export class ProviderError extends Error {
  constructor(
    public readonly providerId: ProviderId,
    public readonly code:
      | "no-key"
      | "invalid-key"
      | "rate-limited"
      | "model-unavailable"
      | "network"
      | "unavailable"
      | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
