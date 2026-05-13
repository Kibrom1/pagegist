// Unified chat() — the UI's single entry point regardless of backend.

import { getActiveProvider } from "./providers";
import type { ChatOpts, Message } from "./providers/types";
import { ProviderError } from "./providers/types";

export type ChatResult = {
  providerId: string;
  model: string | undefined;
  /** Token stream of the response. */
  stream: AsyncIterable<string>;
};

export async function chat(messages: Message[], opts?: ChatOpts): Promise<ChatResult> {
  const provider = await getActiveProvider();
  const availability = await provider.availability();
  if (!availability.available) {
    throw new ProviderError(provider.id, "unavailable", availability.reason);
  }
  return {
    providerId: provider.id,
    model: opts?.model ?? provider.defaultModel,
    stream: provider.chat(messages, opts),
  };
}
