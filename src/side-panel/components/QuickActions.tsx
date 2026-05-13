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
            {label}
          </button>
        );
      })}
    </div>
  );
}
