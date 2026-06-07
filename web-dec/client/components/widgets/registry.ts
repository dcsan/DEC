// Widget registry — pairs each widget's spec (trigger + output contract) with
// its React component. The chat view consults this to (a) match a slash command
// to a widget and (b) render a widget instance by its `type`.
//
// To add a widget: create `<name>.spec.ts` + `<name>Widget.tsx`, then append an
// entry below. Nothing else in the chat view needs to change.
//
// Frameworks align with docs/plan/overview.md (Eisenhower, SWOT, scenario,
// decision matrix, pros/cons, cost–benefit, 2×2, pre-mortem, decision tree,
// expected value, OODA, regret minimisation).

import type { ComponentType } from "react";
import type { WidgetProps, WidgetSpec } from "./types";
import { costBenefitSpec } from "./costbenefit.spec";
import { CostBenefitWidget } from "./CostBenefitWidget";
import { decisionMatrixSpec } from "./decisionmatrix.spec";
import { DecisionMatrixWidget } from "./DecisionMatrixWidget";
import { decisionTreeSpec } from "./decisiontree.spec";
import { DecisionTreeWidget } from "./DecisionTreeWidget";
import { eisenhowerSpec } from "./eisenhower.spec";
import { EisenhowerWidget } from "./EisenhowerWidget";
import { expectedValueSpec } from "./expectedvalue.spec";
import { ExpectedValueWidget } from "./ExpectedValueWidget";
import { oodaSpec } from "./ooda.spec";
import { OodaWidget } from "./OodaWidget";
import { premortemSpec } from "./premortem.spec";
import { PremortemWidget } from "./PremortemWidget";
import { factorsSpec } from "./factors.spec";
import { FactorsWidget } from "./FactorsWidget";
import { regretSpec } from "./regret.spec";
import { RegretWidget } from "./RegretWidget";
import { scenarioSpec } from "./scenario.spec";
import { ScenarioWidget } from "./ScenarioWidget";
import { swotSpec } from "./swot.spec";
import { SwotWidget } from "./SwotWidget";
import { twoByTwoSpec } from "./twobytwo.spec";
import { TwoByTwoWidget } from "./TwoByTwoWidget";

export interface WidgetEntry {
  spec: WidgetSpec;
  component: ComponentType<WidgetProps>;
}

/**
 * Order: first match wins — keep commands disjoint across specs.
 * Put more specific triggers before generic ones (e.g. `/dmatrix` before any
 * hypothetical `/matrix` overlap); Eisenhower uses `/eis` and `/matrix` on main.
 */
export const WIDGETS: WidgetEntry[] = [
  { spec: factorsSpec as WidgetSpec, component: FactorsWidget },
  { spec: twoByTwoSpec as WidgetSpec, component: TwoByTwoWidget },
  { spec: eisenhowerSpec as WidgetSpec, component: EisenhowerWidget },
  { spec: swotSpec as WidgetSpec, component: SwotWidget },
  { spec: scenarioSpec as WidgetSpec, component: ScenarioWidget },
  { spec: decisionMatrixSpec as WidgetSpec, component: DecisionMatrixWidget },
  { spec: costBenefitSpec as WidgetSpec, component: CostBenefitWidget },
  { spec: premortemSpec as WidgetSpec, component: PremortemWidget },
  { spec: decisionTreeSpec as WidgetSpec, component: DecisionTreeWidget },
  { spec: expectedValueSpec as WidgetSpec, component: ExpectedValueWidget },
  { spec: oodaSpec as WidgetSpec, component: OodaWidget },
  { spec: regretSpec as WidgetSpec, component: RegretWidget },
];

// Parse a composer line. Returns the matched widget (and the trailing args,
// e.g. "/pc move to Berlin" → args "move to Berlin") or null if it isn't a
// recognised "/command".
export function matchWidgetCommand(
  input: string,
): { entry: WidgetEntry; args: string } | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  const key = word.toLowerCase();
  const entry = WIDGETS.find((w) => w.spec.commands.includes(key));
  if (!entry) return null;
  return { entry, args: rest.join(" ") };
}

// Parse a "use <widget> …" line — a natural-language way to force a specific
// widget, bypassing the LLM router (e.g. "use sc to plan what to do next" →
// scenario widget, question "plan what to do next"). The word after `use`
// (an optional leading article aside) must be a known widget command; anything
// else (e.g. "use my judgment") is left for the router. The remainder becomes
// the prefill question, with a leading connector ("to"/"for"/":"/"-") trimmed.
export function matchUseCommand(
  input: string,
): { entry: WidgetEntry; args: string } | null {
  if (input.startsWith("/")) return null;
  const tokens = input.trim().split(/\s+/);
  if (tokens[0]?.toLowerCase() !== "use") return null;

  // Optionally skip a leading article ("use the scenario tool …").
  let i = 1;
  if (tokens[i]?.toLowerCase() === "the" || tokens[i]?.toLowerCase() === "a") i += 1;

  const key = tokens[i]?.toLowerCase();
  if (!key) return null;
  const entry = WIDGETS.find((w) => w.spec.commands.includes(key));
  if (!entry) return null;

  let args = tokens.slice(i + 1).join(" ").trim();
  // Strip leading connectors/nouns ("tool to …", "for …", ": …") repeatedly so
  // "scenario tool for my move" and "sc to my move" both yield "my move".
  let prev: string;
  do {
    prev = args;
    args = args.replace(/^(to|for|tool|widget)\b[\s:.-]*/i, "").replace(/^[\s:.-]+/, "").trim();
  } while (args !== prev);
  return { entry, args };
}

export function getWidget(type: string): WidgetEntry | null {
  return WIDGETS.find((w) => w.spec.type === type) ?? null;
}

// One entry in the composer's slash-command autocomplete (the `/`-popup).
export interface SlashCommandInfo {
  command: string;
  title: string;
  description: string;
}

// Non-widget chat actions, shown in the slash popup alongside the widgets.
const ACTION_SLASH_COMMANDS: SlashCommandInfo[] = [
  { command: "help", title: "Help", description: "list commands, or /help <name>" },
  { command: "ex", title: "Examples", description: "example decisions to try" },
  { command: "research", title: "Research", description: "web-sourced deeper advice" },
  { command: "viz", title: "Visualise", description: "diagram the current decision" },
  { command: "summary", title: "Summary", description: "recap what you're deciding" },
  { command: "facts", title: "Facts", description: "what I've learned about you" },
  { command: "diff", title: "Perspective diff", description: "my view of you vs. your self-view" },
  { command: "context", title: "Add context", description: "attach a document" },
  { command: "session", title: "Session", description: "show the current session id" },
  { command: "new", title: "New chat", description: "start a fresh conversation" },
];

// Every slash command for the composer autocomplete: each widget's canonical
// command plus the chat actions. Built from WIDGETS so it can't drift.
export function allSlashCommands(): SlashCommandInfo[] {
  const widgets = WIDGETS.map((w) => ({
    command: w.spec.commands[0],
    title: w.spec.title,
    description: w.spec.description,
  }));
  return [...widgets, ...ACTION_SLASH_COMMANDS];
}

// `/research` (and aliases) — not a widget but a chat action: web-augmented
// deeper advice on the current decision. Returns the trailing args (an explicit
// decision to research, e.g. `/research should I move to Berlin`) or null if it
// isn't a research command. Bare `/research` (empty args) is still a match.
const RESEARCH_COMMANDS = ["research", "res", "deep"];

export function matchResearchCommand(input: string): { args: string } | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  if (!RESEARCH_COMMANDS.includes(word?.toLowerCase() ?? "")) return null;
  return { args: rest.join(" ") };
}

// `/new` (and aliases) — not a widget but a chat action: start a fresh session
// (clears the stream and rotates the session id) so the server tracks a new
// conversation. Returns {} on a match, else null.
const NEW_COMMANDS = ["new", "newchat", "reset"];

export function matchNewCommand(input: string): Record<string, never> | null {
  if (!input.startsWith("/")) return null;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return NEW_COMMANDS.includes(word ?? "") ? {} : null;
}

// `/facts` (and aliases) — not a widget but a chat action: list what Honcho has
// concluded about the user this session. Returns {} on a match, else null.
const FACTS_COMMANDS = ["facts", "fact", "memory", "remember"];

export function matchFactsCommand(input: string): Record<string, never> | null {
  if (!input.startsWith("/")) return null;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return FACTS_COMMANDS.includes(word ?? "") ? {} : null;
}

// `/diff` (and aliases) — not a widget but a chat action: compare DEC's
// conclusions about the user against the user's self-conclusions, showing where
// the two perspectives agree and diverge. Returns {} on a match, else null.
const DIFF_COMMANDS = ["diff", "perspective", "perspectives"];

export function matchDiffCommand(input: string): Record<string, never> | null {
  if (!input.startsWith("/")) return null;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return DIFF_COMMANDS.includes(word ?? "") ? {} : null;
}

// `/summary` (and aliases) — not a widget but a chat action: recall the session
// from Honcho and write a short summary of the decision. Returns {} else null.
const SUMMARY_COMMANDS = ["summary", "summarise", "summarize", "recap"];

export function matchSummaryCommand(input: string): Record<string, never> | null {
  if (!input.startsWith("/")) return null;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return SUMMARY_COMMANDS.includes(word ?? "") ? {} : null;
}

// `/session` (and aliases) — not a widget but a chat action: show the current
// client session id, so you can look the conversation up in Honcho. Returns {}
// on a match, else null.
const SESSION_COMMANDS = ["session", "sid", "sessionid"];

export function matchSessionCommand(input: string): Record<string, never> | null {
  if (!input.startsWith("/")) return null;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return SESSION_COMMANDS.includes(word ?? "") ? {} : null;
}

// `/viz` (and aliases) — not a widget but a chat action: generate an on-the-fly
// SVG diagram of the current decision from the conversation. Returns the trailing
// args (an explicit decision to visualise) or null. Bare `/viz` is still a match.
const VIZ_COMMANDS = ["viz", "visualize", "visualise", "diagram"];

export function matchVizCommand(input: string): { args: string } | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  if (!VIZ_COMMANDS.includes(word?.toLowerCase() ?? "")) return null;
  return { args: rest.join(" ") };
}

// `/context` (and aliases) — not a widget but a chat action: drops an "Add
// context" panel into the stream to attach a text document to the session
// (stored in Honcho, retrievable later). Returns {} on a match, else null.
const CONTEXT_COMMANDS = ["context", "ctx", "doc"];

export function matchContextCommand(input: string): Record<string, never> | null {
  if (!input.startsWith("/")) return null;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return CONTEXT_COMMANDS.includes(word ?? "") ? {} : null;
}

// `/help` (and aliases) — list every widget's shortcut, or `/help <name>` for
// one widget's how-to. Handled in the composer.
const HELP_COMMANDS = ["help", "h", "?", "commands"];

export type HelpMatch = { kind: "list" } | { kind: "widget"; entry: WidgetEntry };

// Parse a `/help` line. Returns null if it isn't a help command; `{ kind: "list" }`
// for bare `/help`; or `{ kind: "widget" }` when an argument names a known widget
// (by command or type). An unknown argument falls back to the list.
export function matchHelpCommand(input: string): HelpMatch | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  if (!HELP_COMMANDS.includes(word?.toLowerCase() ?? "")) return null;
  const key = rest[0]?.toLowerCase();
  if (!key) return { kind: "list" };
  const entry = WIDGETS.find((w) => w.spec.commands.includes(key) || w.spec.type === key);
  return entry ? { kind: "widget", entry } : { kind: "list" };
}

// Render the shortcut list straight from WIDGETS, so it can never drift from the
// registered widgets. Markdown: each canonical command as inline `code`, its
// title in bold, no dash bullets — just a plain list of items.
export function widgetHelpText(): string {
  const rows = WIDGETS.map(
    (w) => `\`/${w.spec.commands[0]}\` — **${w.spec.title}**: ${w.spec.description}`,
  );
  return [
    "**Widget shortcuts**",
    "",
    ...rows,
    "",
    "`/research` — web-sourced deeper advice on your current decision",
    "`/viz` — visualise the current decision as a diagram",
    "`/summary` — recap what you're deciding so far",
    "`/context` — attach a text document as context for this chat",
    "`/facts` — what I've learned about you this session",
    "`/new` — start a fresh conversation",
    "",
    "Or just describe a decision and I'll pick a tool. Force one with " +
      "`use <name>` (e.g. `use sc to plan what to do next`). Type " +
      "`/help <name>` (e.g. `/help sc`) for a specific tool.",
  ].join("\n");
}

// Detailed how-to for one widget — its title, the spec's `help` guide, all the
// slash commands that open it, and an example prompt. Shown by `/help <name>`.
// Markdown-formatted (commands as inline code).
export function widgetHelpDetail(entry: WidgetEntry): string {
  const { spec } = entry;
  return [
    `**\`/${spec.commands[0]}\` — ${spec.title}**`,
    "",
    spec.help,
    "",
    `**Commands:** ${spec.commands.map((c) => `\`/${c}\``).join(", ")}`,
    `**Example:** "${spec.example}"`,
  ].join("\n");
}

// `/ex` (and aliases) — example prompts. Bare `/ex` lists one example decision
// per widget; `/ex <command>` runs that widget's example through the router (so
// it gets a real LLM answer and surfaces the widget). Handled in the composer.
const EXAMPLE_COMMANDS = ["ex", "example", "examples", "eg"];

export type ExampleMatch =
  | { kind: "list" }
  | { kind: "run"; entry: WidgetEntry; example: string };

// Parse an `/ex` line. Returns null if it isn't an example command at all, a
// "list" request for bare `/ex`, or a "run" with the chosen widget + its example
// when an argument names a known widget (by command or type). An unknown
// argument falls back to "list" so the user sees the menu.
export function matchExampleCommand(input: string): ExampleMatch | null {
  if (!input.startsWith("/")) return null;
  const [word, ...rest] = input.slice(1).trim().split(/\s+/);
  if (!EXAMPLE_COMMANDS.includes(word?.toLowerCase() ?? "")) return null;

  const key = rest[0]?.toLowerCase();
  if (!key) return { kind: "list" };
  const entry = WIDGETS.find(
    (w) => w.spec.commands.includes(key) || w.spec.type === key,
  );
  return entry ? { kind: "run", entry, example: entry.spec.example } : { kind: "list" };
}

// Render the example list from WIDGETS so it can't drift. Canonical command per
// spec, its title, and the example decision it's the obvious tool for.
export function widgetExampleText(): string {
  const rows = WIDGETS.map(
    (w) => `  /${w.spec.commands[0]} — ${w.spec.title}: "${w.spec.example}"`,
  );
  return [
    "Example decisions — type /ex <name> to run one (e.g. /ex eis), or just",
    "describe your own:",
    "",
    ...rows,
  ].join("\n");
}
