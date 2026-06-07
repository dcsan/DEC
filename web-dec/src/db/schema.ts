import { pgTable, text, doublePrecision, timestamp, jsonb, index } from "drizzle-orm/pg-core";

// Drizzle is the single source of truth: these table definitions generate both
// the Postgres (Neon) DDL and the TypeScript types shared across server + client
// (the `$inferSelect` exports at the bottom). Backend is Neon Postgres, reached
// over DATABASE_URL — see src/db/client.ts.

// The decision types from docs/plan/overview.md. `unknown` until the AI (or
// the user) classifies the decision.
export type DecisionType =
  | "binary"
  | "multi_option"
  | "future_planning"
  | "risk_tradeoff"
  | "prioritisation"
  | "resource_allocation"
  | "reversibility"
  | "group"
  | "values"
  | "unknown";

// A single decision session — one chat + one canvas.
export const boards = pgTable("boards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull().default("Untitled decision"),
  decisionType: text("decision_type")
    .$type<DecisionType>()
    .notNull()
    .default("unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Canvas node kinds. `option` = a choice; `concept` = an idea pulled in via
// search/expand; `framework` = a thinking-framework label; `merged` = the
// product of dragging two nodes together; `note` = freeform; `procon` = the
// pros/cons matrix widget (its rows live in `data`).
export type NodeKind =
  | "option"
  | "concept"
  | "framework"
  | "merged"
  | "note"
  | "procon";

// Shape stored in nodes.data for a `procon` widget. One row = one item the
// user can mark as a pro and/or a con.
export interface ProConItem {
  text: string;
  pro: boolean;
  con: boolean;
}
export interface ProConData {
  items: ProConItem[];
}

export const nodes = pgTable(
  "nodes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull(),
    kind: text("kind").$type<NodeKind>().notNull().default("concept"),
    title: text("title").notNull(),
    // Longer one-paragraph description — hidden in the UI until expanded.
    description: text("description"),
    x: doublePrecision("x").notNull().default(0),
    y: doublePrecision("y").notNull().default(0),
    // Escape hatch for kind-specific extras (e.g. framework template, colour).
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ boardIdx: index("nodes_board_idx").on(t.boardId) }),
);

export const edges = pgTable(
  "edges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull(),
    source: text("source").notNull(),
    target: text("target").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ boardIdx: index("edges_board_idx").on(t.boardId) }),
);

export type MessageRole = "user" | "assistant" | "system";

export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull(),
    role: text("role").$type<MessageRole>().notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ boardIdx: index("messages_board_idx").on(t.boardId) }),
);

// A widget result captured in a chat log row: which widget it was, the
// structured payload it produced, and the plain-text rendering sent to chat.
export interface ChatLogWidget {
  type: string;
  data: unknown;
  text: string;
}

// Append-only log of every chat-view message (the /chat surface, keyed by the
// client session id — distinct from `messages`, which belongs to the board
// canvas). Widget submissions carry their structured + plain-text payload in
// the `widget` JSONB column.
export const chatLogs = pgTable(
  "chat_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull(),
    role: text("role").$type<MessageRole>().notNull(),
    content: text("content").notNull(),
    // Null for plain-text turns; set when the message is a widget result.
    widget: jsonb("widget").$type<ChatLogWidget>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ sessionIdx: index("chat_logs_session_idx").on(t.sessionId) }),
);

export type Board = typeof boards.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Edge = typeof edges.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ChatLog = typeof chatLogs.$inferSelect;
export type NewChatLog = typeof chatLogs.$inferInsert;
