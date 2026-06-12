import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

// Admin view over the chat_logs table: every /chat session on the left (newest
// activity first, labelled by the first question that started it), and the
// selected session's full back-and-forth as plain text on the right — oldest
// first, so it reads down like the conversation happened.
//
// `?session=<id>` preselects a session — /admin/users links here per session.
export const Route = createFileRoute("/admin/logs")({
  validateSearch: (search: Record<string, unknown>): { session?: string } => {
    const session = typeof search.session === "string" ? search.session.trim() : "";
    return session ? { session } : {};
  },
  component: AdminLogs,
});

function AdminLogs() {
  const { session } = Route.useSearch();
  const [selected, setSelected] = useState<string | null>(session ?? null);
  const sessions = trpc.chatLog.sessions.useQuery({});
  const log = trpc.chatLog.get.useQuery(
    { sessionId: selected ?? "" },
    { enabled: !!selected },
  );

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Session list */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          overflowY: "auto",
          padding: 12,
          borderRight: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
        }}
      >
        <div
          style={{
            padding: "4px 8px 10px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--vizithink-text-muted)",
          }}
        >
          Chat sessions {sessions.data ? `(${sessions.data.length})` : ""}
        </div>
        {sessions.isLoading && (
          <div style={{ padding: 8, fontSize: 13, color: "var(--vizithink-text-subtle)" }}>
            Loading…
          </div>
        )}
        {sessions.error && (
          <div style={{ padding: 8, fontSize: 13, color: "var(--vizithink-text-subtle)" }}>
            Couldn't load sessions: {sessions.error.message}
          </div>
        )}
        {sessions.data?.length === 0 && (
          <div style={{ padding: 8, fontSize: 13, color: "var(--vizithink-text-subtle)" }}>
            No logged sessions yet.
          </div>
        )}
        {sessions.data?.map((s) => (
          <button
            key={s.sessionId}
            type="button"
            onClick={() => setSelected(s.sessionId)}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 10px",
              marginBottom: 4,
              textAlign: "left",
              borderRadius: 8,
              border: "1px solid transparent",
              cursor: "pointer",
              background:
                s.sessionId === selected ? "var(--vizithink-accent-soft)" : "transparent",
              color: "var(--vizithink-text)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.firstMessage || "(no user message)"}
              </div>
              {/* Badge: number of chat_logs rows in this session */}
              <span
                style={{
                  flexShrink: 0,
                  minWidth: 28,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 700,
                  textAlign: "center",
                  background: "var(--vizithink-accent)",
                  color: "#0f1115",
                }}
              >
                {s.messageCount}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)", marginTop: 2 }}>
              {/* createdAt comes over as `timestamptz::text` — minutes is enough here */}
              {s.lastAt.slice(0, 16)}
            </div>
          </button>
        ))}
      </div>

      {/* Transcript — plain text, oldest at the top */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "16px 24px" }}>
        {!selected && (
          <div style={{ fontSize: 14, color: "var(--vizithink-text-subtle)" }}>
            Select a session to read its conversation.
          </div>
        )}
        {selected && log.isLoading && (
          <div style={{ fontSize: 14, color: "var(--vizithink-text-subtle)" }}>Loading…</div>
        )}
        {selected && log.data && (
          <>
            <div
              style={{
                marginBottom: 14,
                fontSize: 12,
                color: "var(--vizithink-text-subtle)",
                fontFamily: "monospace",
              }}
            >
              session {selected}
            </div>
            {log.data.map((row) => (
              <div key={row.id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)", marginBottom: 2 }}>
                  {row.role}
                  {row.widget ? ` · ${row.widget.type} widget` : ""} ·{" "}
                  {row.createdAt.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    color: "var(--vizithink-text)",
                  }}
                >
                  {row.content}
                </div>
              </div>
            ))}
            {log.data.length === 0 && (
              <div style={{ fontSize: 14, color: "var(--vizithink-text-subtle)" }}>
                No messages logged for this session.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
