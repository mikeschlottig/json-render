import type { UIMessage } from "ai";
import { DEFAULT_MODEL_ID } from "./models";

/**
 * Conversation history, persisted to localStorage.
 *
 * Deliberately not a server store: this example has no auth and no database,
 * and a per-browser history is the honest scope for that. Everything is keyed
 * under one namespace so clearing it is a single `removeItem`.
 */

const KEY = "astro-chat/conversations/v1";
const ACTIVE_KEY = "astro-chat/active/v1";
const MAX_CONVERSATIONS = 200;

export interface Conversation {
  id: string;
  title: string;
  /** Set once the user renames it, so auto-titling stops overwriting them. */
  titleLocked?: boolean;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyConversation(modelId = DEFAULT_MODEL_ID): Conversation {
  const now = Date.now();
  return {
    id: newId(),
    title: "New chat",
    modelId,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function safeParse(raw: string | null): Conversation[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    // A corrupt entry should not brick the app; start clean instead.
    return [];
  }
}

export function loadConversations(): Conversation[] {
  if (typeof localStorage === "undefined") return [];
  return safeParse(localStorage.getItem(KEY)).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof localStorage === "undefined") return;
  const trimmed = [...conversations]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded — drop the oldest half rather than lose the recent ones.
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(trimmed.slice(0, Math.ceil(trimmed.length / 2))),
      );
    } catch {
      /* give up silently; history is a convenience, not the product */
    }
  }
}

export function loadActiveId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* non-fatal */
  }
}

/** Group conversations into the buckets the sidebar renders under headings. */
export function groupByRecency(
  conversations: Conversation[],
): Array<{ label: string; items: Conversation[] }> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 7 * 86_400_000;
  const startOfMonth = startOfToday - 30 * 86_400_000;

  const buckets: Array<{ label: string; items: Conversation[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conversation of conversations) {
    const at = conversation.updatedAt;
    const index =
      at >= startOfToday
        ? 0
        : at >= startOfYesterday
          ? 1
          : at >= startOfWeek
            ? 2
            : at >= startOfMonth
              ? 3
              : 4;
    buckets[index]!.items.push(conversation);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}
