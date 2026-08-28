import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { tokenize, normalizeLanguage } from "../lib/highlight";
import { CheckIcon, CopyIcon, WrapIcon } from "./icons";

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Shell",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  css: "CSS",
  html: "HTML",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  rs: "Rust",
  astro: "Astro",
  svelte: "Svelte",
};

function label(language?: string | null): string {
  if (!language) return "text";
  const key = language.trim().toLowerCase();
  return LANGUAGE_LABELS[key] ?? key;
}

interface CodeBlockProps {
  code: string;
  language?: string | null;
  filename?: string | null;
  /** True while the fence is still being streamed and may be incomplete. */
  streaming?: boolean;
}

export function CodeBlock({
  code,
  language,
  filename,
  streaming,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    });
  }, [code]);

  // Re-tokenising on every streamed chunk is the cost here; memoising on the
  // exact source keeps it to one pass per chunk rather than one per render.
  const tokens = useMemo(
    () => tokenize(code, normalizeLanguage(language)),
    [code, language],
  );

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  return (
    <figure className="code" data-streaming={streaming ? "" : undefined}>
      <figcaption className="code-bar">
        <span className="code-lang">{filename ?? label(language)}</span>
        <span className="code-actions">
          {lineCount > 6 && (
            <button
              type="button"
              className="code-btn"
              onClick={() => setWrap((w) => !w)}
              aria-pressed={wrap}
              title={wrap ? "Disable soft wrap" : "Enable soft wrap"}
            >
              <WrapIcon />
              <span className="sr-only">Toggle soft wrap</span>
            </button>
          )}
          <button
            type="button"
            className="code-btn"
            onClick={copy}
            title="Copy code"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="code-btn-text">{copied ? "Copied" : "Copy"}</span>
          </button>
        </span>
      </figcaption>

      <pre className="code-pre scroll" data-wrap={wrap ? "" : undefined}>
        <code>
          {tokens.map((token, index) =>
            token.kind === "plain" ? (
              token.value
            ) : (
              // eslint-disable-next-line react/no-array-index-key -- token stream is positional
              <span key={index} className={`tk tk-${token.kind}`}>
                {token.value}
              </span>
            ),
          )}
        </code>
      </pre>
    </figure>
  );
}
