import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation } from "../lib/conversations";
import { copyToClipboard, download, type ExportFormat } from "../lib/export";
import { CheckIcon, ChevronDownIcon, DownloadIcon } from "./icons";

const FORMATS: Array<{ format: ExportFormat; label: string; note: string }> = [
  { format: "markdown", label: "Markdown", note: "Readable, specs folded in" },
  { format: "json", label: "JSON", note: "Lossless, includes every spec" },
  { format: "text", label: "Plain text", note: "Prose only" },
];

interface ExportMenuProps {
  conversation: Conversation;
  disabled?: boolean;
}

export function ExportMenu({ conversation, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const flash = useCallback((label: string) => {
    setDone(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 1600);
  }, []);

  const empty = conversation.messages.length === 0;

  return (
    <div className="menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="btn ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || empty}
        onClick={() => setOpen((o) => !o)}
        title={empty ? "Nothing to export yet" : "Export this conversation"}
      >
        <DownloadIcon />
        <span className="btn-label">Export</span>
        <ChevronDownIcon
          className={open ? "picker-caret open" : "picker-caret"}
        />
      </button>

      {open && (
        <div className="menu-panel" role="menu">
          {FORMATS.map(({ format, label, note }) => (
            <div key={format} className="menu-row">
              <span className="menu-row-body">
                <span className="menu-row-label">{label}</span>
                <span className="menu-row-note">{note}</span>
              </span>
              <span className="menu-row-actions">
                <button
                  type="button"
                  role="menuitem"
                  className="btn tiny-text"
                  onClick={() => {
                    void copyToClipboard(conversation, format).then(() =>
                      flash(`copy-${format}`),
                    );
                  }}
                >
                  {done === `copy-${format}` ? <CheckIcon /> : null}
                  Copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="btn tiny-text"
                  onClick={() => {
                    download(conversation, format);
                    setOpen(false);
                  }}
                >
                  Download
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
