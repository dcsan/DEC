import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

// Admin view of unique users, derived from the temp user id each browser
// stores in localStorage and stamps on its chat_logs rows (see
// docs/todo/TempUserId.md). Left bar lists users (newest activity first) with
// a session-count badge; clicking one shows all their sessions, each linking
// to its transcript on /admin/logs. Rows logged before user tagging existed
// group under "(no user id)".
export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

// `undefined` = nothing selected; `null` = the "(no user id)" group.
type Selected = string | null | undefined;

function AdminUsers() {
  const [selected, setSelected] = useState<Selected>(undefined);
  const users = trpc.chatLog.users.useQuery();
  const sessions = trpc.chatLog.sessions.useQuery(
    { userId: selected ?? null },
    { enabled: selected !== undefined },
  );

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* User list */}
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
          Users {users.data ? `(${users.data.length})` : ""}
        </div>
        {users.isLoading && (
          <div style={{ padding: 8, fontSize: 13, color: "var(--vizithink-text-subtle)" }}>
            Loading…
          </div>
        )}
        {users.error && (
          <div style={{ padding: 8, fontSize: 13, color: "var(--vizithink-text-subtle)" }}>
            Couldn't load users: {users.error.message}
          </div>
        )}
        {users.data?.length === 0 && (
          <div style={{ padding: 8, fontSize: 13, color: "var(--vizithink-text-subtle)" }}>
            No logged chats yet.
          </div>
        )}
        {users.data?.map((u) => {
          const isSelected = selected !== undefined && selected === u.userId;
          return (
            <button
              key={u.userId ?? "(none)"}
              type="button"
              onClick={() => setSelected(u.userId)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 10px",
                marginBottom: 4,
                textAlign: "left",
                borderRadius: 8,
                border: "1px solid transparent",
                cursor: "pointer",
                background: isSelected ? "var(--vizithink-accent-soft)" : "transparent",
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
                    fontFamily: u.userId ? "monospace" : "inherit",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {u.userId ?? "(no user id)"}
                </div>
                {/* Badge: number of distinct sessions for this user */}
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
                  {u.sessionCount}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)", marginTop: 2 }}>
                {u.lastSeen.slice(0, 16)} · {u.messageCount} messages
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected user's sessions */}
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "16px 24px" }}>
        {selected === undefined && (
          <div style={{ fontSize: 14, color: "var(--vizithink-text-subtle)" }}>
            Select a user to see their sessions.
          </div>
        )}
        {selected !== undefined && sessions.isLoading && (
          <div style={{ fontSize: 14, color: "var(--vizithink-text-subtle)" }}>Loading…</div>
        )}
        {selected !== undefined && sessions.data && (
          <>
            <div
              style={{
                marginBottom: 14,
                fontSize: 12,
                color: "var(--vizithink-text-subtle)",
                fontFamily: "monospace",
              }}
            >
              user {selected ?? "(no user id)"} · {sessions.data.length} sessions
            </div>
            {sessions.data.map((s) => (
              <Link
                key={s.sessionId}
                to="/admin/logs"
                search={{ session: s.sessionId }}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: "1px solid var(--vizithink-border)",
                  background: "var(--vizithink-surface)",
                  textDecoration: "none",
                  color: "var(--vizithink-text)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {s.firstMessage || "(no user message)"}
                </div>
                <div style={{ fontSize: 11, color: "var(--vizithink-text-subtle)", marginTop: 3 }}>
                  {s.lastAt.slice(0, 16)} · {s.messageCount} messages · {s.sessionId}
                </div>
              </Link>
            ))}
            {sessions.data.length === 0 && (
              <div style={{ fontSize: 14, color: "var(--vizithink-text-subtle)" }}>
                No sessions for this user.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
