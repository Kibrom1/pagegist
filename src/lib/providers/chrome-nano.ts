// Chrome built-in Prompt API (Gemini Nano). Free, on-device, no key.

import type { ChatBackend, Message } from "./types";
import { ProviderError } from "./types";

// `LanguageModel` is the Chrome 138+ entry point. Older builds expose
// it under `window.ai.languageModel`. We check both shapes at runtime.
//
// API note: Chrome 138 moved language fields from singular strings
// (expectedOutputLanguage) to plural arrays (expectedOutputLanguages).
// The old singular names are silently ignored and trigger a console warning —
// we use only the new plural-array names.
type LanguageModelGlobal = {
  availability(opts?: {
    expectedInputLanguages?: string[];
    expectedOutputLanguages?: string[];
  }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(opts?: {
    initialPrompts?: { role: "system" | "user" | "assistant"; content: string }[];
    expectedInputLanguages?: string[];
    expectedOutputLanguages?: string[];
    monitor?: (m: EventTarget) => void;
    signal?: AbortSignal;
    topK?: number;
    temperature?: number;
  }): Promise<LanguageModelSession>;
};

// Language options are set at session-creation time (create()); promptStreaming
// may accept overrides in some builds.
type LanguageModelSession = {
  prompt(
    input: string,
    opts?: { signal?: AbortSignal; expectedOutputLanguage?: string },
  ): Promise<string>;
  promptStreaming(
    input: string,
    opts?: { signal?: AbortSignal; expectedOutputLanguage?: string },
  ): ReadableStream<string>;
  destroy(): void;
};

function getLanguageModel(): LanguageModelGlobal | null {
  const g = globalThis as unknown as {
    LanguageModel?: LanguageModelGlobal;
    ai?: { languageModel?: LanguageModelGlobal };
  };
  return g.LanguageModel ?? g.ai?.languageModel ?? null;
}

export const chromeNano: ChatBackend = {
  id: "chrome-nano",
  displayName: "Chrome (Gemini Nano)",
  tier: "free",
  defaultModel: "gemini-nano",
  // Nano's context window is ~6K tokens. Reserve ~2K for system prompt,
  // conversation history, and response headroom — leaving 4K for page content.
  maxContextTokens: 4000,

  async availability() {
    const lm = getLanguageModel();
    if (!lm) {
      return {
        available: false,
        reason:
          "Prompt API not present. Requires Chrome 138+ with built-in AI enabled (chrome://flags/#prompt-api-for-gemini-nano).",
      };
    }
    try {
      const status = await lm.availability({
        expectedInputLanguages: ["en"],
        expectedOutputLanguages: ["en"],
      });
      if (status === "available") return { available: true };
      if (status === "downloading") {
        return { available: false, reason: "Gemini Nano is downloading on this device." };
      }
      if (status === "downloadable") {
        return {
          available: false,
          reason: "Gemini Nano needs to download first. Open the side panel to trigger it.",
        };
      }
      return {
        available: false,
        reason: "On-device model unavailable on this hardware.",
      };
    } catch (err) {
      return {
        available: false,
        reason: err instanceof Error ? err.message : "Availability check failed.",
      };
    }
  },

  async *chat(messages: Message[], opts) {
    const lm = getLanguageModel();
    if (!lm) {
      throw new ProviderError("chrome-nano", "unavailable", "Prompt API not present.");
    }

    // The Prompt API takes a system + prior turns as `initialPrompts`,
    // and the final user turn is sent to promptStreaming.
    const lastUserIdx = findLastUserIndex(messages);
    if (lastUserIdx === -1) {
      throw new ProviderError("chrome-nano", "unknown", "No user message to send.");
    }

    const initialPrompts = messages
      .slice(0, lastUserIdx)
      .map((m) => ({ role: m.role, content: m.content }));
    const lastUser = messages[lastUserIdx];
    if (!lastUser) {
      throw new ProviderError("chrome-nano", "unknown", "No user message to send.");
    }

    let session: LanguageModelSession;
    try {
      session = await lm.create({
        initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined,
        expectedInputLanguages: ["en"],
        expectedOutputLanguages: ["en"],
        signal: opts?.signal,
      });
    } catch (err) {
      throw new ProviderError(
        "chrome-nano",
        "unavailable",
        err instanceof Error ? err.message : "Failed to create session.",
      );
    }

    try {
      const stream = session.promptStreaming(lastUser.content, {
        signal: opts?.signal,
        expectedOutputLanguage: "en",
      });
      const reader = stream.getReader();
      let accumulated = "";
      // null = not yet determined; true = Chrome sends full text per chunk
      // (cumulative); false = Chrome sends only the new delta per chunk
      // (incremental). Detection is deferred to the SECOND chunk because on
      // the first chunk accumulated="" and value.startsWith("") is always true,
      // making it impossible to distinguish the two modes.
      let cumulativeMode: boolean | null = null;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          if (cumulativeMode === null) {
            if (accumulated.length === 0) {
              // First chunk: yield verbatim and record as baseline for the
              // second-chunk mode detection. Can't distinguish modes yet.
              accumulated = value;
              yield value;
              continue;
            }
            // Second (or later) chunk with mode still unknown: detect by
            // checking whether Chrome sent the full accumulated text again
            // (cumulative) or just the new delta (incremental).
            cumulativeMode = value.startsWith(accumulated);
          }

          if (cumulativeMode) {
            const delta = value.slice(accumulated.length);
            accumulated = value;
            if (delta) yield delta;
          } else {
            accumulated += value;
            yield value;
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      session.destroy();
    }
  },

  estimateCost: () => 0,
};

function findLastUserIndex(messages: Message[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return i;
  }
  return -1;
}
