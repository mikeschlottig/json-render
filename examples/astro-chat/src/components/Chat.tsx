import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

import { Sidebar } from "./Sidebar";
import { Composer } from "./Composer";
import { Message } from "./Message";
import { ModelPicker } from "./ModelPicker";
import { ExportMenu } from "./ExportMenu";
import { MoonIcon, PanelIcon, SparkIcon, SunIcon } from "./icons";
import { toPlainText } from "./Markdown";

import {
  emptyConversation,
  loadActiveId,
  loadConversations,
  saveActiveId,
  saveConversations,
  type Conversation,
} from "../lib/conversations";
import { DEFAULT_MODEL_ID } from "../lib/models";
import { registerSender } from "../lib/chat-bridge";
import { getTextFromParts } from "@json-render/react";
import type { DataPart } from "@json-render/react";

import "../styles/chat.css";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const STARTERS = [
  "Compare Astro islands with Next.js server components",
  "Show me the 2024 release cadence of the major JS frameworks as a chart",
  "Write a debounce hook in TypeScript and explain the cleanup",
  "What should I benchmark before switching a site to SSR?",
];

export function Chat() {
  // ---------------------------------------------------------------- history

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  // localStorage is read after mount so the server-rendered shell and the
  // first client render agree; otherwise React would report a mismatch.
  useEffect(() => {
    const stored = loadConversations();
    if (stored.length > 0) {
      const wanted = loadActiveId();
      const active = stored.find((c) => c.id === wanted) ?? stored[0]!;
      setConversations(stored);
      setActiveId(active.id);
    } else {
      const fresh = emptyConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    }
    setHydrated(true);
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  );

  // ------------------------------------------------------------------- chat

  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [seed, setSeed] = useState<string | undefined>(undefined);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
    stop,
    regenerate,
  } = useChat({ transport, id: activeId || "boot" });

  const busy = status === "submitted" || status === "streaming";

  // Load the active conversation's transcript into the chat when it changes.
  const loadedFor = useRef<string>("");
  useEffect(() => {
    if (!active || loadedFor.current === active.id) return;
    loadedFor.current = active.id;
    setMessages(active.messages);
    setModelId(active.modelId);
  }, [active, setMessages]);

  // Persist the transcript back. Titles are derived from the first user
  // message unless the user renamed the chat.
  useEffect(() => {
    if (!hydrated || !activeId || busy) return;
    setConversations((previous) => {
      const index = previous.findIndex((c) => c.id === activeId);
      if (index === -1) return previous;

      const current = previous[index]!;
      const sameLength = current.messages.length === messages.length;
      if (sameLength && current.modelId === modelId) return previous;

      const firstUser = messages.find((m) => m.role === "user");
      const derived = firstUser
        ? toPlainText(
            getTextFromParts((firstUser.parts ?? []) as DataPart[]),
          ).slice(0, 64) || "New chat"
        : "New chat";

      const next = [...previous];
      next[index] = {
        ...current,
        messages: messages as UIMessage[],
        modelId,
        title: current.titleLocked ? current.title : derived,
        updatedAt: messages.length > 0 ? Date.now() : current.updatedAt,
      };
      return next;
    });
  }, [messages, modelId, activeId, hydrated, busy]);

  useEffect(() => {
    if (hydrated) saveConversations(conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    if (hydrated && activeId) saveActiveId(activeId);
  }, [activeId, hydrated]);

  // ---------------------------------------------------------------- actions

  const send = useCallback(
    (text: string) => {
      void sendMessage({ text }, { body: { model: modelId } });
    },
    [sendMessage, modelId],
  );

  // Generated UI dispatches `ask` through this.
  useEffect(() => {
    registerSender((prompt) => {
      if (!busy) send(prompt);
    });
    return () => registerSender(null);
  }, [send, busy]);

  const createConversation = useCallback(() => {
    const fresh = emptyConversation(modelId);
    setConversations((previous) => [fresh, ...previous]);
    setActiveId(fresh.id);
    setSidebarOpen(false);
  }, [modelId]);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((previous) => {
        const next = previous.filter((c) => c.id !== id);
        if (next.length === 0) {
          const fresh = emptyConversation(modelId);
          setActiveId(fresh.id);
          return [fresh];
        }
        if (id === activeId) setActiveId(next[0]!.id);
        return next;
      });
    },
    [activeId, modelId],
  );

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((previous) =>
      previous.map((c) =>
        c.id === id ? { ...c, title, titleLocked: true } : c,
      ),
    );
  }, []);

  /**
   * Editing a user message truncates the transcript at that point and drops
   * the text back into the composer — the conversation continues from there
   * rather than forking into a tree we would then have to render.
   */
  const editMessage = useCallback(
    (index: number, text: string) => {
      setMessages(messages.slice(0, index));
      setSeed(`${text}`);
    },
    [messages, setMessages],
  );

  // ------------------------------------------------------------------- view

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [atBottom, setAtBottom] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => {
      const next = previous === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("astro-chat/theme", next);
      } catch {
        /* non-fatal */
      }
      return next;
    });
  }, []);

  // Follow the stream only while the user is already at the bottom, so
  // scrolling up to read does not get yanked back down.
  useEffect(() => {
    if (atBottom) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, atBottom]);

  const onScroll = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAtBottom(distance < 80);
  }, []);

  // Cmd/Ctrl+K opens a new chat; Cmd/Ctrl+B toggles the sidebar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === "k") {
        event.preventDefault();
        createConversation();
      }
      if (event.key === "b") {
        event.preventDefault();
        setSidebarOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createConversation]);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]!.role === "assistant") return messages[i]!.id;
    }
    return null;
  }, [messages]);

  const conversationForExport: Conversation = useMemo(
    () =>
      active
        ? { ...active, messages: messages as UIMessage[], modelId }
        : { ...emptyConversation(modelId), messages: messages as UIMessage[] },
    [active, messages, modelId],
  );

  return (
    <div className="app" data-sidebar={sidebarOpen ? "open" : undefined}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onCreate={createConversation}
        onRename={renameConversation}
        onDelete={deleteConversation}
        onClose={() => setSidebarOpen(false)}
      />

      <button
        type="button"
        className="scrim"
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
      />

      <main className="main">
        <header className="header">
          <button
            type="button"
            className="btn icon"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar (Ctrl+B)"
          >
            <PanelIcon />
          </button>

          <h1 className="header-title">{active?.title ?? "New chat"}</h1>

          <div className="header-right">
            <ModelPicker
              value={modelId}
              onChange={setModelId}
              disabled={busy}
            />
            <ExportMenu conversation={conversationForExport} />
            <button
              type="button"
              className="btn icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        <div className="thread scroll" ref={scroller} onScroll={onScroll}>
          <div className="thread-inner">
            {messages.length === 0 && !busy && (
              <section className="empty">
                <span className="empty-mark" aria-hidden="true">
                  <SparkIcon />
                </span>
                <h2>What should we work on?</h2>
                <p>
                  Answers arrive as prose, and as rendered UI when the shape of
                  the answer calls for it.
                </p>
                <div className="starters">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      className="starter"
                      onClick={() => send(starter)}
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {messages.map((message, index) => (
              <Message
                key={message.id}
                message={message as UIMessage}
                streaming={busy && message.id === lastAssistant}
                last={message.id === lastAssistant}
                onRetry={
                  message.id === lastAssistant && !busy
                    ? () => void regenerate()
                    : undefined
                }
                onEdit={
                  message.role === "user" && !busy
                    ? (text) => editMessage(index, text)
                    : undefined
                }
              />
            ))}

            {error && (
              <div className="error" role="alert">
                <strong>Request failed.</strong>
                <span>{error.message}</span>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => void regenerate()}
                >
                  Try again
                </button>
              </div>
            )}

            <div ref={bottom} className="thread-end" />
          </div>
        </div>

        {!atBottom && (
          <button
            type="button"
            className="jump"
            onClick={() => {
              setAtBottom(true);
              bottom.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            }}
          >
            Jump to latest
          </button>
        )}

        <div className="composer-wrap">
          <Composer onSend={send} onStop={stop} busy={busy} seed={seed} />
        </div>
      </main>
    </div>
  );
}
