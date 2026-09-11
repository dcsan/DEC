// Types for the chat's slash commands. Each command is one file in this folder
// (see ./index.ts); ChatView builds a CommandContext and hands it to whichever
// command matched the composer line.

import type { trpc } from "../../lib/trpc";
import type { TraceEntry } from "../../lib/llmTrace";
import type { WidgetInit } from "../widgets/types";

export type ChatItem =
  // A text message — from the user, a widget, or the assistant (server reply).
  // `markdown` opts the bubble into basic markdown rendering (bold + inline code).
  | { kind: "message"; id: string; role: "user" | "widget" | "assistant"; content: string; markdown?: boolean }
  // An inline interactive widget instance, optionally prefilled by the router.
  // `submitted` is the widget's last sent plain-text output (for /reflect).
  | { kind: "widget"; id: string; type: string; init?: WidgetInit; submitted?: string }
  // A /research result: Markdown advice plus clickable web sources.
  | { kind: "research"; id: string; advice: string; sources: { title: string; url: string }[] }
  // A /viz result: an LLM-drawn SVG system diagram of the current decision.
  | { kind: "viz"; id: string; title: string; svg: string }
  // An "Add context" panel: attach a text document to the session (→ Honcho).
  | { kind: "context"; id: string }
  // A system note (e.g. /apply's "new questions applied"). Rendered like an
  // assistant bubble but, not being a `message`, never sent as chat history.
  | { kind: "notice"; id: string; content: string };

export type HistoryMessage = { role: "user" | "assistant"; content: string };

/** Typed tRPC client — commands run outside React, so they can't use hooks. */
export type ApiClient = ReturnType<typeof trpc.useUtils>["client"];

/** Per-session scratch space commands share; reset by newSession(). */
export interface SessionScratch {
  /** The latest /reflect critique (markdown) — /apply builds on it. */
  lastReflection?: string;
}

/** What ChatView gives a command to work with. */
export interface CommandContext {
  /** The stream as it was when the command ran. */
  items: ChatItem[];
  append(item: ChatItem): void;
  /** Append an assistant bubble. */
  say(content: string, opts?: { markdown?: boolean }): void;
  /** Append a user bubble (e.g. echo the command that was run). */
  echo(content: string): void;
  /** Echo `question` as the user's message and send it through the convo router. */
  ask(question: string): Promise<void>;
  /**
   * Start a fresh conversation: clear the stream, rotate the session id. With
   * `then`, show its notice (if any) and ask its question once the fresh
   * session has rendered — asking in the same tick would still use the old
   * session id and history.
   */
  newSession(then?: { question: string; notice?: string }): void;
  /** Text messages so far, as router history. */
  toHistory(): HistoryMessage[];
  /** The decision being worked on: the latest widget's question, else the last user message. */
  lastDecision(): string | undefined;
  sessionId: string;
  userId: string;
  api: ApiClient;
  /**
   * Run `fn` with the thinking bubble showing `label` and the composer blocked.
   * A thrown error becomes an assistant bubble (its message, else `failMessage`)
   * and resolves to undefined.
   */
  busy<T>(label: string, fn: () => Promise<T>, failMessage?: string): Promise<T | undefined>;
  trace: {
    /** LLM calls since `mark` (all of them if it was evicted), optionally for one procedure, minus /reflect + /explain calls. */
    callsSince(mark: string | null, path?: string): TraceEntry[];
    /** Newest trace id when this session began. */
    sessionMark: string | null;
    /** The user's last question (typed or sent from a widget) and the trace id when it was asked. */
    lastAsk: { question: string; mark: string | null } | null;
  };
  /** Mutable, shared by all commands for the current session. */
  scratch: SessionScratch;
  /** Every registered command (for /help). */
  commands: ChatCommand[];
}

/** One row in the composer's `/` autocomplete popup. */
export interface SlashRow {
  command: string;
  title: string;
  description: string;
}

export interface ChatCommand {
  /** Triggers as `/<name> [args]`, case-insensitive. The first is canonical. */
  names: string[];
  title: string;
  /** One line for the slash popup (and /help, unless `help` is set). */
  description: string;
  /** Longer line for the /help list. Defaults to `description`. */
  help?: string;
  /** Sort key for the popup and /help — lower first, default 100; ties keep file-name order. */
  order?: number;
  /** Leave out of /help's chat-command list. */
  hideFromHelp?: boolean;
  /** Custom popup rows. Defaults to one row for names[0]; `() => []` hides it. */
  slash?: () => SlashRow[];
  /**
   * Custom trigger for lines `names` can't express (widget commands, "use sc …",
   * bare "q1"). Returns the args, or null for no match. Tried only after no
   * command claimed the line by name.
   */
  match?: (line: string) => string | null;
  run(ctx: CommandContext, input: { args: string; line: string }): void | Promise<void>;
}
