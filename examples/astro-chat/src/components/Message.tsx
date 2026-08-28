import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { useJsonRenderMessage, type DataPart } from "@json-render/react";

import { Markdown } from "./Markdown";
import { SpecRenderer } from "../render/SpecRenderer";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshIcon,
  SparkIcon,
} from "./icons";

interface MessageProps {
  message: UIMessage;
  /** True only for the assistant message currently being streamed. */
  streaming?: boolean;
  /** True for the last assistant message, which is the one you can retry. */
  last?: boolean;
  onRetry?: () => void;
  onEdit?: (text: string) => void;
}

export const Message = memo(function Message({
  message,
  streaming,
  last,
  onRetry,
  onEdit,
}: MessageProps) {
  const { spec, text, hasSpec } = useJsonRenderMessage(
    (message.parts ?? []) as DataPart[],
  );
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    });
  }, [text]);

  if (message.role === "user") {
    return (
      <article className="msg user">
        <div className="msg-bubble">
          <Markdown content={text} />
        </div>
        <div className="msg-tools user-tools">
          <button
            type="button"
            className="btn icon tiny"
            onClick={copy}
            aria-label="Copy message"
            title="Copy"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          {onEdit && (
            <button
              type="button"
              className="btn icon tiny"
              onClick={() => onEdit(text)}
              aria-label="Edit and resend"
              title="Edit and resend"
            >
              <PencilIcon />
            </button>
          )}
        </div>
      </article>
    );
  }

  const empty = !text.trim() && !hasSpec;

  return (
    <article className="msg assistant">
      <div className="msg-avatar" aria-hidden="true">
        <SparkIcon />
      </div>

      <div className="msg-content">
        {empty && streaming && <ThinkingLine />}

        {text.trim() && <Markdown content={text} streaming={streaming} />}

        {hasSpec && spec && (
          <div className="msg-spec">
            <SpecRenderer spec={spec} loading={streaming} />
          </div>
        )}

        {streaming && !empty && <span className="caret" aria-hidden="true" />}

        {!streaming && !empty && (
          <div className="msg-tools">
            <button
              type="button"
              className="btn icon tiny"
              onClick={copy}
              aria-label="Copy response"
              title="Copy"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
            {last && onRetry && (
              <button
                type="button"
                className="btn icon tiny"
                onClick={onRetry}
                aria-label="Regenerate response"
                title="Regenerate"
              >
                <RefreshIcon />
              </button>
            )}
            {hasSpec && (
              <span className="msg-badge" title="Rendered by json-render">
                generated UI
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

/** Shown between "request sent" and "first token", which is a real wait. */
function ThinkingLine() {
  return (
    <p className="thinking" aria-live="polite">
      <span>Thinking</span>
      <span className="dots">
        <i />
        <i />
        <i />
      </span>
    </p>
  );
}
