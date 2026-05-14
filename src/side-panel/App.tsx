import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUICK_ACTIONS, type QuickActionId } from "../lib/prompts";
import { getSettings } from "../lib/storage";
import { ChatPanel } from "./components/ChatPanel";
import { Icon } from "./components/Icon";
import { ProviderBadge } from "./components/ProviderBadge";
import { QuickActions } from "./components/QuickActions";
import { useChat } from "./hooks/useChat";
import { getSelection, usePage } from "./hooks/usePage";

export function App() {
  const { state: pageState, refresh, tabId } = usePage();
  const page = pageState.status === "ready" ? pageState.page : undefined;
  const { state: chat, hydrated, send, stop, reset } = useChat(page);
  const [showCounter, setShowCounter] = useState(true);
  // Always-current refs so the auto-summarize effect never reads stale values.
  const sendRef = useRef(send);
  const chatRef = useRef(chat);
  useEffect(() => {
    sendRef.current = send;
    chatRef.current = chat;
  });
  // Track which URLs have already been auto-summarized this session so we
  // don't re-fire after the user manually clears the conversation.
  const autoSummarizedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void getSettings().then((s) => setShowCounter(s.showTokenCounter));
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if ("pagegist:settings" in changes) {
        const next = changes["pagegist:settings"]?.newValue as
          | { showTokenCounter?: boolean }
          | undefined;
        if (next && typeof next.showTokenCounter === "boolean")
          setShowCounter(next.showTokenCounter);
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  // Auto-summarize the page when the panel opens to a fresh conversation.
  // Deps are intentionally just [hydrated, page?.url]: we read the latest
  // chat state and send via refs so we never capture stale closures.
  // Fires once per URL per session (autoSummarizedRef) so re-opening or
  // clearing the conversation doesn't re-trigger it.
  useEffect(() => {
    if (!hydrated || !page?.url) return;
    if (autoSummarizedRef.current.has(page.url)) return;
    const { messages, pending } = chatRef.current;
    if (messages.length > 0 || pending) return;
    autoSummarizedRef.current.add(page.url);
    const summarize = QUICK_ACTIONS.find((a) => a.id === "summarize");
    if (summarize) {
      sendRef.current(summarize.buildUserMessage({}), "Summarize");
    }
  }, [hydrated, page?.url]);

  const onQuickAction = useCallback(
    async (id: QuickActionId) => {
      const action = QUICK_ACTIONS.find((a) => a.id === id);
      if (!action || !page || !tabId) return;
      const selection = await getSelection(tabId);
      await send(action.buildUserMessage({ selection: selection || undefined }), action.label);
    },
    [page, tabId, send],
  );

  const openOptions = () => chrome.runtime.openOptionsPage();

  const disabled = pageState.status !== "ready" || chat.pending;
  const hasMessages = chat.messages.length > 0;
  const headerTitle = useMemo(() => page?.title ?? "PageGist", [page]);

  return (
    <div className="app">
      <header className="header">
        <h1 title={page?.url}>{headerTitle}</h1>
        <ProviderBadge />
        <button type="button" onClick={refresh} title="Re-read page" aria-label="Re-read page">
          <Icon name="refresh" size={15} />
        </button>
        <button
          type="button"
          onClick={() => void reset()}
          title="Clear conversation"
          aria-label="Clear conversation"
          className="btn-danger"
        >
          <Icon name="trash" size={15} />
        </button>
        <button type="button" onClick={openOptions} title="Settings" aria-label="Open settings">
          <Icon name="settings" size={15} />
        </button>
      </header>

      <QuickActions onRun={onQuickAction} disabled={disabled} hasMessages={hasMessages} />

      <ChatPanel
        messages={chat.messages}
        pending={chat.pending}
        pageState={pageState}
        inputTokens={chat.inputTokens}
        outputTokens={chat.outputTokens}
        model={chat.model}
        showCounter={showCounter}
        onSend={send}
        onStop={stop}
      />
    </div>
  );
}
