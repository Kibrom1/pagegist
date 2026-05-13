// ChatPanel — composes the message list, composer, and session footer.
// App.tsx owns layout (header, quick actions); ChatPanel owns the chat body.

import type { ChatMessage } from "../hooks/useChat";
import type { PageState } from "../hooks/usePage";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { TokenCounter } from "./TokenCounter";

export function ChatPanel({
  messages,
  pending,
  pageState,
  inputTokens,
  outputTokens,
  model,
  showCounter,
  onSend,
  onStop,
}: {
  messages: ChatMessage[];
  pending: boolean;
  pageState: PageState;
  inputTokens: number;
  outputTokens: number;
  model?: string;
  showCounter: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const body = (() => {
    if (pageState.status === "error") {
      return (
        <div className="messages">
          <div className="empty-state">
            <h2>Can't read this page</h2>
            <p>{pageState.message}</p>
          </div>
        </div>
      );
    }
    if (pageState.status === "loading") {
      return (
        <div className="messages">
          <div className="empty-state">
            <p className="loading-label">Reading page…</p>
          </div>
        </div>
      );
    }
    return <MessageList messages={messages} pending={pending} />;
  })();

  return (
    <>
      {body}

      <Composer
        pending={pending}
        onSend={onSend}
        onStop={onStop}
        disabled={pageState.status !== "ready"}
      />

      {showCounter && (inputTokens > 0 || outputTokens > 0) && (
        <footer className="footer">
          <TokenCounter inputTokens={inputTokens} outputTokens={outputTokens} model={model} />
        </footer>
      )}
    </>
  );
}
