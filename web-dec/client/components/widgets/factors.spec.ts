// Spec for the Factor Weighting widget — see ./types.ts for the contract.
// Pure & React-free: data shape, slash triggers, purpose, and the LLM-reader
// plain-text rendering.
//
// An either/or or yes/no decision (e.g. "should I get a dog or a cat?", "should
// I join a startup?") is broken into the factors that pull on it — both ways
// (e.g. "Freedom from corporate life" vs "Steady paycheck"). The user ranks how
// much each factor matters to them on a 1-5 slider. There are no option columns
// and no auto verdict: the ranked factors are sent to chat, and the assistant
// weighs them into a recommendation.

import type { WidgetSpec } from "./types";

// One factor (row): a statement plus how much it matters to the user (1-5).
export interface Factor {
  text: string;
  importance: number; // how much this matters to me: 1 (low) – 5 (high)
}

export interface FactorsData {
  question: string; // the yes/no decision, e.g. "Should I join a startup?"
  factors: Factor[];
}

// A fresh widget seeds a few blank factors (importance centred at 3) so there's
// a list to fill in (or to replace with LLM-suggested factors).
export function blankFactorsData(question: string): FactorsData {
  return {
    question: question.trim() || "",
    factors: Array.from({ length: 3 }, () => ({ text: "", importance: 3 })),
  };
}

export const factorsSpec: WidgetSpec<FactorsData> = {
  type: "factors",
  commands: ["rc", "factors", "ready", "fit"],
  title: "Factor Weighting",
  description: "Weight how much each factor matters to you (1–5) for an either/or or yes/no decision.",
  purpose:
    "Decide between two options, or a single yes/no choice (e.g. should I get a " +
    "dog or a cat, buy or rent, join a startup or stay), by surfacing the factors " +
    "that pull on the decision and ranking how much each one matters to YOU on a " +
    "1-5 scale. You don't score each option — you weight the factors — so the " +
    "trade-off is explicit. This is the default tool for an either/or personal " +
    "decision; prefer it over the decision matrix unless the user explicitly " +
    "wants to score several options on numeric criteria.",
  example: "Should I get a dog or a cat?",
  help:
    "For an either/or or yes/no decision, the AI lists the factors that pull on it. Rate each by how important it is to YOU on the 1–5 slider — you weight the factors, you don't score the options. Use ✨ generate more to add factors. On send, the ranked factors go to chat for a recommendation.",

  // Output contract: name the decision, then list each filled factor sorted by
  // how much it matters, with its 1-5 weight. Written for an LLM reader so it
  // can weigh the factors into a recommendation without seeing the widget.
  format: (data) => {
    const filled = data.factors.filter((f) => f.text.trim() !== "");

    const lines: string[] = [`**${data.question.trim() || "Decision"}**`, ""];

    if (filled.length === 0) {
      lines.push("(no factors ranked yet)");
      return lines.join("\n");
    }

    lines.push("Factors that matter, ranked by how important each is to me (1 low – 5 high):");
    const sorted = [...filled].sort((a, b) => b.importance - a.importance);
    for (const f of sorted) {
      lines.push(`- ${f.text.trim()} — importance ${f.importance}/5`);
    }
    return lines.join("\n");
  },
};
