import { Fragment, type ReactNode } from "react";
import { CodeBlock } from "./CodeBlock";

/**
 * A compact Markdown renderer sized for chat output.
 *
 * It is streaming-aware: an unterminated fence renders as a code block that is
 * still filling, and an unterminated `**` or `` ` `` renders as literal text
 * rather than swallowing the rest of the message. That is the property a chat
 * transcript needs and a general-purpose parser does not give you for free.
 */

interface MarkdownProps {
  content: string;
  /** True while this message is still being streamed. */
  streaming?: boolean;
}

export function Markdown({ content, streaming }: MarkdownProps) {
  return <>{renderBlocks(content, streaming ?? false)}</>;
}

// =============================================================================
// Block level
// =============================================================================

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+#-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const UL_ITEM = /^(\s*)[-*+]\s+(.*)$/;
const OL_ITEM = /^(\s*)(\d+)[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

function renderBlocks(source: string, streaming: boolean): ReactNode[] {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code --------------------------------------------------------
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const language = fence[2] || null;
      const body: string[] = [];
      i += 1;
      let closed = false;

      while (i < lines.length) {
        const current = lines[i]!;
        if (current.trimStart().startsWith(marker) && FENCE.test(current)) {
          closed = true;
          i += 1;
          break;
        }
        body.push(current);
        i += 1;
      }

      out.push(
        <CodeBlock
          key={key++}
          code={body.join("\n")}
          language={language}
          streaming={!closed && streaming}
        />,
      );
      continue;
    }

    // Blank ---------------------------------------------------------------
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Rule ----------------------------------------------------------------
    if (HR.test(line)) {
      out.push(<hr key={key++} className="md-hr" />);
      i += 1;
      continue;
    }

    // Heading -------------------------------------------------------------
    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(heading[1]!.length, 6);
      const Tag = `h${level === 1 ? 2 : level}` as
        "h2" | "h3" | "h4" | "h5" | "h6";
      out.push(
        <Tag key={key++} className={`md-h md-h${level}`}>
          {renderInline(heading[2]!)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    // Table ---------------------------------------------------------------
    if (line.includes("|") && TABLE_SEP.test(lines[i + 1] ?? "")) {
      const header = splitRow(line);
      const aligns = splitRow(lines[i + 1]!).map((cell) =>
        cell.trim().endsWith(":") && !cell.trim().startsWith(":")
          ? "right"
          : cell.trim().startsWith(":") && cell.trim().endsWith(":")
            ? "center"
            : "left",
      );
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes("|") && lines[i]!.trim()) {
        rows.push(splitRow(lines[i]!));
        i += 1;
      }
      out.push(
        <div key={key++} className="md-table-wrap scroll">
          <table className="md-table">
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th
                    key={index}
                    style={{ textAlign: aligns[index] ?? "left" }}
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      style={{ textAlign: aligns[index] ?? "left" }}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote ----------------------------------------------------------
    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]!)) {
        body.push(QUOTE.exec(lines[i]!)![1]!);
        i += 1;
      }
      out.push(
        <blockquote key={key++} className="md-quote">
          {renderBlocks(body.join("\n"), streaming)}
        </blockquote>,
      );
      continue;
    }

    // Lists ---------------------------------------------------------------
    if (UL_ITEM.test(line) || OL_ITEM.test(line)) {
      const [node, next] = renderList(lines, i, streaming, key++);
      out.push(node);
      i = next;
      continue;
    }

    // Paragraph -----------------------------------------------------------
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !FENCE.test(lines[i]!) &&
      !HEADING.test(lines[i]!) &&
      !QUOTE.test(lines[i]!) &&
      !HR.test(lines[i]!) &&
      !UL_ITEM.test(lines[i]!) &&
      !OL_ITEM.test(lines[i]!)
    ) {
      para.push(lines[i]!);
      i += 1;
    }
    out.push(
      <p key={key++} className="md-p">
        {renderInline(para.join("\n"))}
      </p>,
    );
  }

  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Consume one list, including nested sublists, starting at `start`.
 * Returns the node and the index of the first line after the list.
 */
function renderList(
  lines: string[],
  start: number,
  streaming: boolean,
  key: number,
): [ReactNode, number] {
  const first = OL_ITEM.exec(lines[start]!) ?? UL_ITEM.exec(lines[start]!);
  const ordered = OL_ITEM.test(lines[start]!);
  const baseIndent = (first?.[1] ?? "").length;

  // Each item accumulates its own children, so a sublist can be appended to
  // the item that owns it rather than re-wrapping an already-rendered <li>.
  const items: ReactNode[][] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i]!;
    const ol = OL_ITEM.exec(line);
    const ul = UL_ITEM.exec(line);

    if (!ol && !ul) {
      // A blank line inside a list is allowed if the list continues after it.
      if (!line.trim() && isListLine(lines[i + 1])) {
        i += 1;
        continue;
      }
      break;
    }

    const indent = (ol?.[1] ?? ul?.[1] ?? "").length;
    if (indent < baseIndent) break;

    if (indent > baseIndent) {
      const [nested, next] = renderList(lines, i, streaming, 0);
      const owner = items[items.length - 1];
      if (owner) owner.push(<Fragment key={owner.length}>{nested}</Fragment>);
      else items.push([nested]);
      i = next;
      continue;
    }

    const text = ol?.[3] ?? ul?.[2] ?? "";
    items.push([renderInline(text)]);
    i += 1;
  }

  const Tag = ordered ? "ol" : "ul";
  return [
    <Tag key={key} className={`md-list ${ordered ? "md-ol" : "md-ul"}`}>
      {items.map((children, index) => (
        <li key={index} className="md-li">
          {children}
        </li>
      ))}
    </Tag>,
    i,
  ];
}

function isListLine(line: string | undefined): boolean {
  if (line === undefined) return false;
  return UL_ITEM.test(line) || OL_ITEM.test(line);
}

// =============================================================================
// Inline level
// =============================================================================

/**
 * Ordered by precedence. Inline code wins over emphasis so `**` inside a code
 * span stays literal.
 */
const INLINE = [
  { kind: "code", re: /`([^`\n]+)`/ },
  { kind: "image", re: /!\[([^\]]*)\]\(([^)\s]+)\)/ },
  { kind: "link", re: /\[([^\]]+)\]\(([^)\s]+)\)/ },
  { kind: "bold", re: /\*\*([^*]+)\*\*/ },
  { kind: "boldalt", re: /__([^_]+)__/ },
  { kind: "strike", re: /~~([^~]+)~~/ },
  { kind: "italic", re: /(?<![*\w])\*([^*\n]+)\*(?!\*)/ },
  { kind: "italicalt", re: /(?<![_\w])_([^_\n]+)_(?![_\w])/ },
  { kind: "autolink", re: /\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?]/ },
] as const;

export function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let rest = text;
  let key = 0;
  let guard = 0;

  while (rest && guard++ < 5000) {
    let bestIndex = Infinity;
    let best: { kind: string; match: RegExpExecArray } | null = null;

    for (const rule of INLINE) {
      const match = rule.re.exec(rest);
      if (match && match.index < bestIndex) {
        bestIndex = match.index;
        best = { kind: rule.kind, match };
      }
    }

    if (!best) break;

    const { kind, match } = best;
    if (match.index > 0) nodes.push(rest.slice(0, match.index));

    switch (kind) {
      case "code":
        nodes.push(
          <code key={key++} className="md-code">
            {match[1]}
          </code>,
        );
        break;
      case "image":
        nodes.push(
          <img
            key={key++}
            className="md-img"
            src={match[2]}
            alt={match[1] ?? ""}
            loading="lazy"
          />,
        );
        break;
      case "link":
        nodes.push(
          <a
            key={key++}
            className="md-link"
            href={match[2]}
            target="_blank"
            rel="noreferrer noopener"
          >
            {renderInline(match[1]!)}
          </a>,
        );
        break;
      case "autolink":
        nodes.push(
          <a
            key={key++}
            className="md-link"
            href={match[0]}
            target="_blank"
            rel="noreferrer noopener"
          >
            {match[0]}
          </a>,
        );
        break;
      case "bold":
      case "boldalt":
        nodes.push(<strong key={key++}>{renderInline(match[1]!)}</strong>);
        break;
      case "italic":
      case "italicalt":
        nodes.push(<em key={key++}>{renderInline(match[1]!)}</em>);
        break;
      case "strike":
        nodes.push(<s key={key++}>{renderInline(match[1]!)}</s>);
        break;
      default:
        nodes.push(match[0]);
    }

    rest = rest.slice(match.index + match[0].length);
  }

  if (rest) nodes.push(rest);
  return nodes.length === 1 ? nodes[0] : nodes;
}

/** Strip markdown to plain text — used for conversation titles and previews. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
