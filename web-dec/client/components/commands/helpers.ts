// Helpers shared by several commands and ChatView (not a command itself —
// excluded from discovery in ./index.ts). Conversation helpers are pure
// functions of the stream, so any command can use them without ChatView changes.

import type { TraceEntry } from "../../lib/llmTrace";
import type { ChatItem } from "./types";

export const uid = () => crypto.randomUUID();

export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

// A traced LLM call → the clipped step payload /reflect and /explain send.
export const toAgentStep = (t: TraceEntry) => ({
  title: t.title,
  path: t.path,
  prompt: clip(t.prompt, 3900),
  response: t.response ? clip(t.response, 3900) : undefined,
});

// The whole stream as a plain transcript, for /reflect and /apply — unlike
// toHistory() it includes the widgets and what was sent from them.
export const buildTranscript = (items: ChatItem[]) =>
  items
    .map((it) => {
      switch (it.kind) {
        case "message":
          return `${it.role === "assistant" ? "AI" : it.role === "widget" ? "Widget" : "User"}: ${it.content}`;
        case "widget":
          return (
            `[AI opened the ${it.type} tool${it.init?.question ? ` for "${it.init.question}"` : ""}]` +
            (it.submitted ? `\nUser sent from ${it.type}: ${it.submitted}` : "")
          );
        case "research":
          return `AI (research): ${it.advice}`;
        case "viz":
          return `[AI drew a diagram: ${it.title}]`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");

// The question this session is about: the first user message that isn't a
// slash command (a /q1 shortcut is already expanded to its question).
export const openingQuestion = (items: ChatItem[]): string | undefined =>
  items.find(
    (it): it is Extract<ChatItem, { kind: "message" }> =>
      it.kind === "message" && it.role === "user" && !it.content.startsWith("/"),
  )?.content;

// The qualifying (probing) questions the agent asked before surfacing a tool:
// assistant bubbles ending in "?" ahead of the first widget.
export const qualifyingQuestions = (items: ChatItem[]): string[] => {
  const firstWidget = items.findIndex((it) => it.kind === "widget");
  return items
    .slice(0, firstWidget === -1 ? items.length : firstWidget)
    .filter(
      (it): it is Extract<ChatItem, { kind: "message" }> =>
        it.kind === "message" && it.role === "assistant" && it.content.trim().endsWith("?"),
    )
    .map((it) => it.content.trim());
};
