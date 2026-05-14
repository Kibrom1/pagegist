import { QUICK_ACTIONS, type QuickActionId } from "../../lib/prompts";

export function QuickActions({
  onRun,
  disabled,
  hasMessages,
}: {
  onRun: (id: QuickActionId) => void;
  disabled?: boolean;
  hasMessages?: boolean;
}) {
  return (
    <div className="quick-actions">
      {QUICK_ACTIONS.map((a) => {
        // After a summary exists, relabel to signal this reruns the action.
        const label = a.id === "summarize" && hasMessages ? "Re-summarize" : a.label;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onRun(a.id)}
            disabled={disabled}
            title={a.description}
            aria-label={label}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ width: 13, height: 13, flexShrink: 0 }}
            >
              <path d={a.icon} />
            </svg>
            {label}
          </button>
        );
      })}
    </div>
  );
}
