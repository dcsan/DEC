import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

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
export const boards = sqliteTable("boards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull().default("Untitled decision"),
  decisionType: text("decision_type")
    .$type<DecisionType>()
    .notNull()
    .default("unknown"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
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

export const nodes = sqliteTable(
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
    x: real("x").notNull().default(0),
    y: real("y").notNull().default(0),
    // Escape hatch for kind-specific extras (e.g. framework template, colour).
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ boardIdx: index("nodes_board_idx").on(t.boardId) }),
);

export const edges = sqliteTable(
  "edges",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull(),
    source: text("source").notNull(),
    target: text("target").notNull(),
    label: text("label"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ boardIdx: index("edges_board_idx").on(t.boardId) }),
);

export type MessageRole = "user" | "assistant" | "system";

export const messages = sqliteTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text("board_id").notNull(),
    role: text("role").$type<MessageRole>().notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ boardIdx: index("messages_board_idx").on(t.boardId) }),
);

export type Board = typeof boards.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Edge = typeof edges.$inferSelect;
export type Message = typeof messages.$inferSelect;
