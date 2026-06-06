import { useState } from "react";
import { trpc } from "../lib/trpc";
import { ConceptSearch } from "./ConceptSearch";
import type { Message } from "../../src/db/schema";

export function ChatSidebar({
  boardId,
  messages,
  onChanged,
}: {
  boardId: string;
  messages: Message[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState("");
  const send = trpc.message.send.useMutation({
    onSuccess: () => {
      setDraft("");
      onChanged();
    },
  });

  const submit = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;
    send.mutate({ boardId, content });
  };

  return (
    <aside
      style={{
        width: 360,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--dec-border-soft)",
        background: "var(--dec-surface)",
        minHeight: 0,
      }}
    >
      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {send.isPending && (
          <MessageBubble role="assistant" content="…" muted />
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: 12, borderTop: "1px solid var(--dec-border-soft)" }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message…  (Enter to send)"
          rows={2}
          style={{
            width: "100%",
            resize: "none",
            padding: "8px 10px",
            fontSize: 13,
            borderRadius: 8,
            border: "1px solid var(--dec-border)",
            background: "var(--dec-surface-2)",
            color: "var(--dec-text)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      <ConceptSearch boardId={boardId} onAdded={onChanged} />
    </aside>
  );
}

function MessageBubble({
  role,
  content,
  muted,
}: {
  role: Message["role"];
  content: string;
  muted?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "8px 11px",
          borderRadius: 12,
          fontSize: 13,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          background: isUser ? "var(--dec-accent-soft)" : "var(--dec-surface-2)",
          color: muted ? "var(--dec-text-subtle)" : "var(--dec-text)",
          border: "1px solid var(--dec-border-soft)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
