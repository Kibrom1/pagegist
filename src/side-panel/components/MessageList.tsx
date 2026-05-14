import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import type { ChatMessage } from "../hooks/useChat";

export function MessageList({
  messages,
  pending,
}: {
  messages: ChatMessage[];
  pending?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages length/content drives scrollHeight
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages">
        <div className="empty-state">
          {pending ? (
            // Auto-summarize is in flight — show a skeleton rather than the
            // static copy so users know something is happening.
            <>
              <div className="skeleton-line" style={{ width: "80%" }} />
              <div className="skeleton-line" style={{ width: "60%", marginTop: 10 }} />
              <div className="skeleton-line" style={{ width: "70%", marginTop: 6 }} />
            </>
          ) : (
            <>
              <h2>Ask anything about this page</h2>
              <p>Or pick a quick action above.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="messages" ref={ref} aria-live="polite" aria-label="Conversation">
      {messages.map((m) => (
        <div key={m.id} className={`msg msg-${m.role}${m.error ? " msg-error" : ""}`}>
          {/* Human-readable role labels instead of API terms */}
          <div className="msg-role">{m.role === "user" ? "You" : "PageGist"}</div>
          <div className="msg-body">
            {m.role === "assistant" ? (
              m.content ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <span className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </span>
              )
            ) : (
              m.displayText || m.content
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
