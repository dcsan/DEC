import type { Db } from "../db/client";
import { chatLogs, type ChatLogWidget, type MessageRole } from "../db/schema";

// Append chat-view turns to the `chat_logs` table. One row per message, keyed by
// the client session id, with widget submissions carrying their structured +
// plain-text payload in the JSONB `widget` column.
//
// Best-effort: the caller runs this via `ctx.waitUntil` and we swallow errors so
// a logging hiccup never breaks a chat reply.

export interface ChatLogEntry {
  role: MessageRole;
  content: string;
  widget?: ChatLogWidget | null;
}

export async function logChatTurns(
  db: Db,
  sessionId: string,
  entries: ChatLogEntry[],
  userId?: string,
): Promise<void> {
  const rows = entries
    .filter((e) => e.content.trim() || e.widget)
    .map((e) => ({
      sessionId,
      userId: userId ?? null,
      role: e.role,
      content: e.content,
      widget: e.widget ?? null,
    }));
  if (rows.length === 0) return;
  try {
    await db.insert(chatLogs).values(rows);
  } catch (err) {
    console.error("[chatlog] insert failed", err);
  }
}
