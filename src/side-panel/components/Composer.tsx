import { useEffect, useRef, useState } from "react";

export function Composer({
  pending,
  onSend,
  onStop,
  disabled,
}: {
  pending: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to a cap. `value` IS the trigger — biome can't see that
  // scrollHeight depends on the controlled value, so we ignore the warning.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value drives scrollHeight
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || pending || disabled) return;
    onSend(value);
    setValue("");
    // Return focus to textarea so keyboard users can immediately type again.
    requestAnimationFrame(() => ref.current?.focus());
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={disabled ? "Open a web page first" : "Ask about this page…"}
        disabled={disabled}
        aria-label="Message input"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {pending ? (
        <button
          type="button"
          onClick={onStop}
          title="Stop generation"
          aria-label="Stop generating"
          className="btn-stop"
        >
          ■
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          title="Send (Enter)"
        >
          →
        </button>
      )}
    </form>
  );
}
