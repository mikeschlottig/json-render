import { useMemo, useState, useRef, useEffect } from "react";
import { groupByRecency, type Conversation } from "../lib/conversations";
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from "./icons";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  open: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const editInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editInput.current?.select();
  }, [editing]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? conversations.filter((conversation) =>
          conversation.title.toLowerCase().includes(needle),
        )
      : conversations;
    return groupByRecency(filtered);
  }, [conversations, query]);

  const commitRename = (id: string) => {
    const title = draft.trim();
    if (title) onRename(id, title);
    setEditing(null);
  };

  return (
    <aside className="sidebar" data-open={open ? "" : undefined}>
      <div className="sidebar-top">
        <button type="button" className="btn primary block" onClick={onCreate}>
          <PlusIcon />
          New chat
        </button>
        <button
          type="button"
          className="btn icon sidebar-close"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <XIcon />
        </button>
      </div>

      <div className="sidebar-search">
        <SearchIcon />
        <input
          type="search"
          value={query}
          placeholder="Search chats"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search conversations"
        />
      </div>

      <nav className="sidebar-list scroll" aria-label="Conversation history">
        {groups.length === 0 && (
          <p className="sidebar-empty">
            {query ? "No chats match that." : "No conversations yet."}
          </p>
        )}

        {groups.map((group) => (
          <section key={group.label} className="sidebar-group">
            <h2 className="sidebar-group-label">{group.label}</h2>
            <ul>
              {group.items.map((conversation) => {
                const isActive = conversation.id === activeId;
                const isEditing = editing === conversation.id;

                return (
                  <li
                    key={conversation.id}
                    className={`sidebar-item${isActive ? " active" : ""}`}
                  >
                    {isEditing ? (
                      <input
                        ref={editInput}
                        className="sidebar-rename"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => commitRename(conversation.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter")
                            commitRename(conversation.id);
                          if (event.key === "Escape") setEditing(null);
                        }}
                        aria-label="Conversation title"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="sidebar-link"
                          onClick={() => onSelect(conversation.id)}
                          title={conversation.title}
                        >
                          {conversation.title}
                        </button>

                        <span className="sidebar-actions">
                          <button
                            type="button"
                            className="btn icon tiny"
                            aria-label={`Rename ${conversation.title}`}
                            onClick={() => {
                              setDraft(conversation.title);
                              setEditing(conversation.id);
                            }}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className={`btn icon tiny${confirming === conversation.id ? " danger" : ""}`}
                            aria-label={
                              confirming === conversation.id
                                ? `Confirm delete ${conversation.title}`
                                : `Delete ${conversation.title}`
                            }
                            onClick={() => {
                              // Two-step rather than a modal: the first click
                              // arms, the second deletes, and moving away
                              // disarms.
                              if (confirming === conversation.id) {
                                onDelete(conversation.id);
                                setConfirming(null);
                              } else {
                                setConfirming(conversation.id);
                              }
                            }}
                            onMouseLeave={() => setConfirming(null)}
                          >
                            <TrashIcon />
                          </button>
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <footer className="sidebar-foot">
        <span>
          {conversations.length} chat{conversations.length === 1 ? "" : "s"}
        </span>
        <span className="sidebar-foot-note">stored in this browser</span>
      </footer>
    </aside>
  );
}
