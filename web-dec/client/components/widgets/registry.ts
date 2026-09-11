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

// Chat commands that aren't widgets (/help, /ex, /research, /new, …) live in
// ../commands/, one file each — see ../commands/index.ts.

// Detailed how-to for one widget — its title, the spec's `help` guide, all the
// slash commands that open it, and an example prompt. Shown by `/help <name>`.
// Markdown-formatted (commands as inline code).
export function widgetHelpDetail(entry: WidgetEntry): string {
  const { spec } = entry;
  return [
    `## \`/${spec.commands[0]}\` — ${spec.title}`,
    "",
    spec.help,
    "",
    `- **Commands:** ${spec.commands.map((c) => `\`/${c}\``).join(", ")}`,
    `- **Example:** "${spec.example}"`,
  ].join("\n");
}

// Quick questions — the `/ex` example decisions, numbered in `/ex` list order:
// `/q1` is the first core widget's example, `/q2` the second, and so on. `/q1`
// or bare `q1` sends the full question through the router exactly as if the
// user had typed it (see ../commands/quick.ts).
export const QUICK_QUESTIONS: Record<string, string> = Object.fromEntries(
  WIDGETS.filter((w) => !w.spec.draft).map((w, i) => [`q${i + 1}`, w.spec.example]),
);
