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
import { readinessSpec } from "./readiness.spec";
import { ReadinessWidget } from "./ReadinessWidget";
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
  { spec: readinessSpec as WidgetSpec, component: ReadinessWidget },
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

export function getWidget(type: string): WidgetEntry | null {
  return WIDGETS.find((w) => w.spec.type === type) ?? null;
}

// `/help` (and aliases) — list every widget's shortcut. Handled in the composer.
const HELP_COMMANDS = ["help", "h", "?", "commands"];

export function isHelpCommand(input: string): boolean {
  if (!input.startsWith("/")) return false;
  const word = input.slice(1).trim().split(/\s+/)[0]?.toLowerCase();
  return HELP_COMMANDS.includes(word ?? "");
}

// Render the shortcut list straight from WIDGETS, so it can never drift from the
// registered widgets. Canonical (first) command per spec, plus its title.
export function widgetHelpText(): string {
  const rows = WIDGETS.map(
    (w) => `  /${w.spec.commands[0]} — ${w.spec.title}: ${w.spec.description}`,
  );
  return [
    "Widget shortcuts:",
    ...rows,
    "",
    "Or just describe a decision and I'll pick a tool. Type /help anytime.",
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
