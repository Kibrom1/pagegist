// Orchestrates a chat session: maintains messages, streams responses,
// persists conversation per URL, tallies tokens.

import { useCallback, useEffect, useRef, useState } from "react";
import { chat } from "../../lib/chat";
import { type PageContext, withPageContext } from "../../lib/prompts";
import { getActiveProviderContextBudget } from "../../lib/providers";
import type { Message } from "../../lib/providers/types";
import { ProviderError } from "../../lib/providers/types";
import {
  type StoredConversation,
  getSettings,
  loadConversation,
  saveConversation,
} from "../../lib/storage";
import { countTokens, truncateToTokens } from "../../lib/tokens";

export type ChatMessage = Message & {
  id: string;
  error?: boolean;
};

export type ChatState = {
  messages: ChatMessage[];
  pending: boolean;
  providerId?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
};

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useChat(page: PageContext | undefined) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    pending: false,
    inputTokens: 0,
    outputTokens: 0,
  });
  // Keep a ref to the latest state so send() can read it without listing
  // state as a dependency — otherwise send() gets a new reference on every
  // chunk during streaming, causing unnecessary child re-renders.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const abortRef = useRef<AbortController | null>(null);
  const persistedUrlRef = useRef<string | undefined>(undefined);

  // hydrated = true once history loading for the current URL has resolved.
  // Consumers can use this to know it's safe to check whether messages are
  // empty (and therefore auto-fire a first action).
  const [hydrated, setHydrated] = useState(false);

  // Load persisted conversation when the URL changes.
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    async function hydrate() {
      if (!page?.url) {
        // Page is gone (navigating or panel reloading). Reset the persisted-URL
        // tracker so the next URL always loads fresh rather than hitting the
        // same-URL early-return guard below.
        persistedUrlRef.current = undefined;
        return;
      }
      // Guard: if the URL didn't actually change (e.g. the page object ref
      // changed but URL stayed the same), skip the storage round-trip but
      // still mark hydration done so consumers aren't stuck on hydrated=false.
      if (persistedUrlRef.current === page.url) {
        setHydrated(true);
        return;
      }
      persistedUrlRef.current = page.url;
      const settings = await getSettings();
      if (!settings.persistHistory) {
        if (!cancelled) {
          setState({ messages: [], pending: false, inputTokens: 0, outputTokens: 0 });
          setHydrated(true);
        }
        return;
      }
      const stored = await loadConversation(page.url);
      if (cancelled) return;
      if (stored) {
        setState({
          messages: stored.messages.map((m) => ({ ...m, id: newId() })),
          pending: false,
          inputTokens: 0,
          outputTokens: 0,
        });
      } else {
        setState({ messages: [], pending: false, inputTokens: 0, outputTokens: 0 });
      }
      setHydrated(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [page?.url]);

  const persist = useCallback(
    async (messages: ChatMessage[]) => {
      if (!page) return;
      const settings = await getSettings();
      if (!settings.persistHistory) return;
      const conv: StoredConversation = {
        url: page.url,
        title: page.title,
        messages: messages.map(({ id: _id, error: _err, ...rest }) => rest),
        updatedAt: Date.now(),
      };
      await saveConversation(conv);
    },
    [page],
  );

  const send = useCallback(
    async (userText: string) => {
      const { pending, messages } = stateRef.current;
      if (!page || !userText.trim() || pending) return;

      const settings = await getSettings();
      // Clamp page content to the stricter of: the user's configured budget
      // OR the active provider's declared limit. This matters most for
      // Gemini Nano (~4K effective page budget vs. the default 8K setting).
      const providerBudget = await getActiveProviderContextBudget();
      const effectiveBudget = Math.min(settings.pageTokenBudget, providerBudget);
      const trimmedPage: PageContext = {
        ...page,
        content: truncateToTokens(page.content, effectiveBudget),
      };

      const userMsg: ChatMessage = { id: newId(), role: "user", content: userText.trim() };
      const placeholder: ChatMessage = { id: newId(), role: "assistant", content: "" };
      const baseMessages = [...messages, userMsg];

      setState((s) => ({
        ...s,
        messages: [...baseMessages, placeholder],
        pending: true,
      }));

      // Build the API messages: system prompt + conversation history.
      const apiMessages: Message[] = [
        ...withPageContext(trimmedPage, "").slice(0, 1), // system only
        ...baseMessages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const inputTokens = apiMessages.reduce((sum, m) => sum + countTokens(m.content), 0);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await chat(apiMessages, { signal: controller.signal });
        let acc = "";
        for await (const chunk of result.stream) {
          acc += chunk;
          setState((s) => ({
            ...s,
            providerId: result.providerId,
            model: result.model,
            messages: s.messages.map((m) => (m.id === placeholder.id ? { ...m, content: acc } : m)),
          }));
        }
        const outputTokens = countTokens(acc);
        const finalMessages = [...baseMessages, { ...placeholder, content: acc }];
        setState((s) => ({
          ...s,
          messages: finalMessages,
          pending: false,
          inputTokens: s.inputTokens + inputTokens,
          outputTokens: s.outputTokens + outputTokens,
        }));
        await persist(finalMessages);
      } catch (err) {
        const errMsg: ChatMessage = {
          id: placeholder.id,
          role: "assistant",
          content: formatError(err),
          error: true,
        };
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) => (m.id === placeholder.id ? errMsg : m)),
          pending: false,
        }));
      } finally {
        abortRef.current = null;
      }
    },
    [page, persist],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => ({ ...s, pending: false }));
  }, []);

  const reset = useCallback(async () => {
    setState({ messages: [], pending: false, inputTokens: 0, outputTokens: 0 });
    await persist([]);
  }, [persist]);

  return { state, hydrated, send, stop, reset };
}

function formatError(err: unknown): string {
  if (err instanceof ProviderError) {
    switch (err.code) {
      case "no-key":
        return `${err.message} Open the options page from the extension menu.`;
      case "invalid-key":
        return "Your API key was rejected. Update it in settings.";
      case "rate-limited":
        return "Rate limited. Wait a moment and try again.";
      case "unavailable":
        return err.message;
      case "network":
        return "Couldn't reach the provider. Check your connection.";
      default:
        return err.message;
    }
  }
  if (err instanceof Error && err.name === "AbortError") return "Stopped.";
  return err instanceof Error ? err.message : "Something went wrong.";
}
