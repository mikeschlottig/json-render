import type { UIMessage } from "ai";
import { getTextFromParts, buildSpecFromParts } from "@json-render/react";
import type { Conversation } from "./conversations";
import { findModel } from "./models";

/**
 * Conversation export.
 *
 * Markdown is for reading and pasting; JSON is the lossless form — it keeps the
 * generated specs, which Markdown can only gesture at. Both go through the same
 * download path.
 */

export type ExportFormat = "markdown" | "json" | "text";

function stamp(at: number): string {
  return new Date(at).toISOString().replace(/\.\d+Z$/, "Z");
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "conversation"
  );
}

export function toMarkdown(conversation: Conversation): string {
  const model = findModel(conversation.modelId);
  const lines: string[] = [
    `# ${conversation.title}`,
    "",
    `- Model: ${model.name} (\`${model.id}\`)`,
    `- Started: ${stamp(conversation.createdAt)}`,
    `- Updated: ${stamp(conversation.updatedAt)}`,
    `- Messages: ${conversation.messages.length}`,
    "",
    "---",
    "",
  ];

  for (const message of conversation.messages) {
    const parts = (message.parts ?? []) as Parameters<
      typeof getTextFromParts
    >[0];
    const text = getTextFromParts(parts).trim();
    const spec = buildSpecFromParts(parts);

    lines.push(message.role === "user" ? "## User" : "## Assistant", "");

    if (text) lines.push(text, "");

    if (spec) {
      lines.push(
        "<details><summary>Generated UI (json-render spec)</summary>",
        "",
        "```json",
        JSON.stringify(spec, null, 2),
        "```",
        "",
        "</details>",
        "",
      );
    }

    if (!text && !spec) lines.push("_(no content)_", "");
  }

  return lines.join("\n");
}

export function toPlainText(conversation: Conversation): string {
  return conversation.messages
    .map((message) => {
      const parts = (message.parts ?? []) as Parameters<
        typeof getTextFromParts
      >[0];
      const who = message.role === "user" ? "You" : "Assistant";
      return `${who}:\n${getTextFromParts(parts).trim()}`;
    })
    .join("\n\n");
}

export function toJson(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2);
}

export function serialize(
  conversation: Conversation,
  format: ExportFormat,
): { body: string; filename: string; mime: string } {
  const base = `${slug(conversation.title)}-${new Date(conversation.updatedAt)
    .toISOString()
    .slice(0, 10)}`;

  switch (format) {
    case "json":
      return {
        body: toJson(conversation),
        filename: `${base}.json`,
        mime: "application/json",
      };
    case "text":
      return {
        body: toPlainText(conversation),
        filename: `${base}.txt`,
        mime: "text/plain",
      };
    case "markdown":
    default:
      return {
        body: toMarkdown(conversation),
        filename: `${base}.md`,
        mime: "text/markdown",
      };
  }
}

export function download(
  conversation: Conversation,
  format: ExportFormat,
): void {
  const { body, filename, mime } = serialize(conversation, format);
  const url = URL.createObjectURL(
    new Blob([body], { type: `${mime};charset=utf-8` }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick — Safari needs the URL alive through the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function copyToClipboard(
  conversation: Conversation,
  format: ExportFormat,
): Promise<void> {
  await navigator.clipboard.writeText(serialize(conversation, format).body);
}
