// Streaming helpers shared across HTTP-based providers.

import { type Message, ProviderError, type ProviderId } from "./types";

/**
 * Parse a Server-Sent Events stream into individual `data: ...` payloads.
 * Yields the raw JSON string of each event (excluding the `[DONE]` sentinel).
 */
export async function* parseSSE(response: Response, providerId: ProviderId): AsyncIterable<string> {
  if (!response.body) {
    throw new ProviderError(providerId, "network", "Response had no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines.
      while (true) {
        const sep = buffer.indexOf("\n\n");
        if (sep === -1) break;
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of rawEvent.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;
          if (payload) yield payload;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Convert an HTTP error response into a typed ProviderError.
 */
export async function toProviderError(
  response: Response,
  providerId: ProviderId,
): Promise<ProviderError> {
  const text = await response.text().catch(() => "");
  if (response.status === 401 || response.status === 403) {
    return new ProviderError(providerId, "invalid-key", text || "API key was rejected.");
  }
  if (response.status === 429) {
    return new ProviderError(providerId, "rate-limited", text || "Rate limited. Try again soon.");
  }
  if (response.status === 404) {
    return new ProviderError(providerId, "model-unavailable", text || "Model not found.");
  }
  return new ProviderError(
    providerId,
    "unknown",
    `${response.status} ${response.statusText} ${text}`.trim(),
  );
}

/**
 * Stream a chat completion from any OpenAI-compatible endpoint
 * (OpenAI, Groq, OpenRouter, Ollama's /v1/chat/completions).
 */
export async function* streamOpenAICompatible(args: {
  endpoint: string;
  apiKey?: string;
  model: string;
  messages: Message[];
  providerId: ProviderId;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  extraHeaders?: Record<string, string>;
}): AsyncIterable<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(args.apiKey ? { Authorization: `Bearer ${args.apiKey}` } : {}),
    ...args.extraHeaders,
  };

  const response = await fetch(args.endpoint, {
    method: "POST",
    headers,
    signal: args.signal,
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      stream: true,
      temperature: args.temperature ?? 0.4,
      ...(args.maxTokens ? { max_tokens: args.maxTokens } : {}),
    }),
  }).catch((err: unknown) => {
    throw new ProviderError(
      args.providerId,
      "network",
      err instanceof Error ? err.message : "Network error",
    );
  });

  if (!response.ok) throw await toProviderError(response, args.providerId);

  for await (const payload of parseSSE(response, args.providerId)) {
    try {
      const chunk = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
      };
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    } catch {
      // Some servers send keep-alive pings; ignore non-JSON payloads.
    }
  }
}
