// Scenario planning — a branching tree of plausible futures (docs/plan/overview.md).
//
// A scenario is no longer a flat list with prose: it's a tree. The decision
// branches into top-level futures, and each future can branch again (a → b → c)
// into follow-on events. Every node carries a likelihood (relative weight among
// its siblings) and an `outcome` tag — good / bad / neutral — so a whole
// root→leaf path reads as a story that ends well or badly.

import type { WidgetSpec } from "./types";

export type Outcome = "good" | "bad" | "neutral";

export interface ScenarioNode {
  /** Stable id for React keys + tree edits. */
  id: string;
  name: string;
  /** Likelihood of this branch among its siblings — free text ("30", "30%", "0.3"). */
  chance: string;
  /** Whether landing on this branch is a good, bad, or neutral outcome. */
  outcome: Outcome;
  /** Follow-on branches (a → b → c). */
  children: ScenarioNode[];
}

export interface ScenarioData {
  title: string;
  tree: ScenarioNode[];
}

const uid = () => crypto.randomUUID();

/** Create a scenario node, with optional overrides (id is always fresh). */
export function makeNode(partial?: Partial<Omit<ScenarioNode, "id">>): ScenarioNode {
  return {
    id: uid(),
    name: partial?.name ?? "",
    chance: partial?.chance ?? "",
    outcome: partial?.outcome ?? "neutral",
    children: partial?.children ?? [],
  };
}

export function blankScenarioData(title: string): ScenarioData {
  return {
    title: title.trim() || "Scenario planning",
    tree: [makeNode(), makeNode()],
  };
}

// Parse a `chance` field to a non-negative number (a relative weight). Accepts
// "30", "30%", "0.3". Returns null when blank/unparseable. Shared by the
// widget's tree chart and the format() likelihoods so both agree.
export function parseChance(s: string): number | null {
  const t = s.trim().replace("%", "").replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Does the tree have any named branch? Drives the send button + format. */
export function hasNamedBranch(nodes: ScenarioNode[]): boolean {
  return nodes.some((n) => n.name.trim() || hasNamedBranch(n.children));
}

const OUTCOME_TAG: Record<Outcome, string> = { good: " ✅ good", bad: " ❌ bad", neutral: "" };

export const scenarioSpec: WidgetSpec<ScenarioData> = {
  type: "scenario",
  commands: ["sc", "scenario", "scenarios", "futures", "whatif"],
  title: "Scenario planning",
  description: "Map plausible futures as a branching tree of events and outcomes.",
  purpose:
    "Stress-test a decision by mapping how it could unfold — branching chains of events (a → b → c), each ending in a good or bad outcome.",
  example: "What futures should I prepare for if I quit to go freelance?",
  help:
    "The decision fans out into possible futures; each can branch again into follow-on events. Give every branch a likelihood (%) and mark it good ✓ or bad ✗. Use ↳ to add a follow-on and ✨ generate more for fresh futures. On send, the scenario tree goes to chat.",

  format: (data) => {
    const lines: string[] = [
      `**Scenario planning — ${data.title}**`,
      "",
      "Branching futures the user mapped (indent = a follow-on event; ✅/❌ mark good/bad outcomes). Use the paths and likelihoods when reasoning about risk and next steps:",
    ];

    // Walk the tree depth-first, indenting children, normalising chances into
    // likelihood shares *within each sibling group* so they read as percentages.
    const walk = (nodes: ScenarioNode[], depth: number) => {
      const named = nodes.filter((n) => n.name.trim() || hasNamedBranch(n.children));
      if (named.length === 0) return;
      const weights = named.map((n) => parseChance(n.chance));
      const total = weights.reduce<number>((sum, w) => sum + (w ?? 0), 0);
      named.forEach((n, i) => {
        const name = n.name.trim() || `Branch ${i + 1}`;
        const w = weights[i];
        const pct = w != null && total > 0 ? ` — ~${Math.round((w / total) * 100)}%` : "";
        lines.push(`${"  ".repeat(depth)}- ${name}${pct}${OUTCOME_TAG[n.outcome]}`);
        walk(n.children, depth + 1);
      });
    };

    if (!hasNamedBranch(data.tree)) {
      lines.push("(no scenario content captured)");
      return lines.join("\n");
    }
    walk(data.tree, 0);
    return lines.join("\n").trimEnd();
  },
};
