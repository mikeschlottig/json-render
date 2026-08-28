import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SendIcon, StopIcon } from "./icons";

const MAX_ROWS_PX = 240;

interface ComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  /** Seeded when the user edits an earlier message. */
  seed?: string;
  placeholder?: string;
}

export function Composer({
  onSend,
  onStop,
  busy,
  seed,
  placeholder = "Ask anything. Shift+Enter for a new line.",
}: ComposerProps) {
  const [value, setValue] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to a cap, then scroll. Measured before paint so
  // the box never flashes at the wrong height.
  useLayoutEffect(() => {
    const node = textarea.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_PX)}px`;
    node.style.overflowY = node.scrollHeight > MAX_ROWS_PX ? "auto" : "hidden";
  }, [value]);

  useEffect(() => {
    if (seed === undefined) return;
    setValue(seed);
    textarea.current?.focus();
  }, [seed]);

  // "/" focuses the composer from anywhere that is not already a text field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      textarea.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  }, [value, busy, onSend]);

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="composer-box">
        <textarea
          ref={textarea}
          className="composer-input scroll"
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          aria-label="Message"
        />

        {busy ? (
          <button
            type="button"
            className="composer-send stop"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop generating"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="submit"
            className="composer-send"
            disabled={!value.trim()}
            aria-label="Send message"
            title="Send"
          >
            <SendIcon />
          </button>
        )}
      </div>

      <p className="composer-hint">
        Responses can be wrong. Generated UI is rendered by json-render from a
        streamed spec.
      </p>
    </form>
  );
}
