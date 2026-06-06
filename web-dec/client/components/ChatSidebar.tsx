import { useState } from "react";
import { trpc } from "../lib/trpc";
import { ConceptSearch } from "./ConceptSearch";
import { matchSlashCommand } from "../lib/slashCommands";
import type { Message, ProConData } from "../../src/db/schema";

// A fresh pros/cons widget seeds 4 blank rows (per the spec).
function blankProCon(): ProConData {
  return { items: Array.from({ length: 4 }, () => ({ text: "", pro: false, con: false })) };
}

// Natural-language fallback so "pros and cons" in plain chat also drops the
// widget, in addition to the /pc slash command.
const PROS_CONS_PHRASE = /\bpros?\s*(?:and|&|\/|,)?\s*cons\b/i;

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
  const createNode = trpc.node.create.useMutation({ onSuccess: onChanged });

  // Drop a pros/cons matrix widget onto the canvas.
  const addProCon = (title: string) => {
    createNode.mutate({
      boardId,
      kind: "procon",
      title: title || "Pros & Cons",
      x: 120,
      y: 120,
      data: blankProCon() as unknown as Record<string, unknown>,
    });
    setDraft("");
  };

  const submit = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;

    // 1. Slash command? Handle locally, don't send to the server.
    const slash = matchSlashCommand(content);
    if (slash) {
      slash.command.run({ args: slash.args, addProCon });
      return;
    }

    // 2. Natural-language "pros and cons" → drop the widget too.
    if (PROS_CONS_PHRASE.test(content)) {
      addProCon("Pros & Cons");
      return;
    }

    // 3. Otherwise it's a normal chat turn.
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
          placeholder="Type a message…  (/pc for pros & cons)"
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
