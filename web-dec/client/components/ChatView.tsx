// Standalone chat view. A plain message stream with the composer pinned to the
// bottom. Typing a widget slash command (e.g. `/pc`) drops that widget inline
// into the stream; sending its result (or a typed message) posts to the server,
// which echoes a reply that's shown back in the stream.

import { useEffect, useRef, useState } from "react";
import { trpc } from "../lib/trpc";
import { getWidget, matchWidgetCommand } from "./widgets/registry";
import type { WidgetOutput } from "./widgets/types";

type ChatItem =
  // A text message — from the user, a widget, or the assistant (server reply).
  | { kind: "message"; id: string; role: "user" | "widget" | "assistant"; content: string }
  // An inline interactive widget instance, rendered by its registry component.
  | { kind: "widget"; id: string; type: string };

const uid = () => crypto.randomUUID();

export function ChatView() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const send = trpc.chat.send.useMutation();

  // Keep the latest item in view as the stream grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  const append = (item: ChatItem) => setItems((cur) => [...cur, item]);

  // Post a message to the server and show its reply in the stream.
  const post = async (text: string, widget?: WidgetOutput) => {
    const res = await send.mutateAsync({
      text,
      widget: widget ? { type: widget.type, data: widget.data } : undefined,
    });
    append({ kind: "message", id: uid(), role: "assistant", content: res.reply });
  };

  const submit = () => {
    const content = draft.trim();
    if (!content || send.isPending) return;

    // Slash command → drop the matching widget into the stream.
    const match = matchWidgetCommand(content);
    if (match) {
      append({ kind: "widget", id: uid(), type: match.entry.spec.type });
      setDraft("");
      return;
    }

    // Otherwise it's an ordinary chat message → echo it, then send to server.
    append({ kind: "message", id: uid(), role: "user", content });
    setDraft("");
    void post(content);
  };

  const removeItem = (id: string) =>
    setItems((cur) => cur.filter((it) => it.id !== id));

  // A widget sending its result posts to the server (structured + text). The
  // widget itself stays in place, so we only show the server's reply — no
  // duplicate echo of the widget output.
  const sendFromWidget = (_widgetId: string, output: WidgetOutput) =>
    void post(output.text, output);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Message stream */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          {items.length === 0 && (
            <p style={{ color: "var(--dec-text-subtle)", fontSize: 14, marginTop: 24 }}>
              Type a message to start. Try <code>/pc</code> for pros &amp; cons or{" "}
              <code>/22</code> for a 2×2 drag-and-drop grid.
            </p>
          )}

          {items.map((it) => {
            if (it.kind === "message") {
              return <MessageBubble key={it.id} role={it.role} content={it.content} />;
            }
            const entry = getWidget(it.type);
            if (!entry) return null;
            const Widget = entry.component;
            return (
              <div key={it.id} style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                <Widget
                  onSend={(output) => sendFromWidget(it.id, output)}
                  onRemove={() => removeItem(it.id)}
                />
              </div>
            );
          })}
          {send.isPending && <MessageBubble role="assistant" content="…" />}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer pinned to the bottom */}
      <div style={{ borderTop: "1px solid var(--dec-border-soft)", background: "var(--dec-surface)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: 12, display: "flex", gap: 8 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type a message…  (/pc pros & cons, /22 2×2 grid)"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "10px 12px",
              fontSize: 14,
              borderRadius: 10,
              border: "1px solid var(--dec-border)",
              background: "var(--dec-surface-2)",
              color: "var(--dec-text)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            style={{
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 10,
              border: "none",
              background: draft.trim() ? "var(--dec-accent)" : "var(--dec-border)",
              color: draft.trim() ? "#0f1115" : "var(--dec-text-subtle)",
              cursor: draft.trim() ? "pointer" : "not-allowed",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "widget" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "9px 12px",
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          background: isUser ? "var(--dec-accent-soft)" : "var(--dec-surface-2)",
          color: "var(--dec-text)",
          border: "1px solid var(--dec-border-soft)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
