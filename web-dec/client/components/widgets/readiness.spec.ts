// Spec for the Decision Factors widget — see ./types.ts for the contract.
// Pure & React-free: data shape, slash triggers, purpose, and the LLM-reader
// plain-text rendering.
//
// A single yes/no life decision (e.g. "should I join a startup?") is broken into
// the factors that pull on it — both ways (e.g. "Freedom from corporate life"
// vs "Steady paycheck"). The user ranks how much each factor matters to them on
// a 1-5 slider. There are no option columns and no auto verdict: the ranked
// factors are sent to chat, and the assistant weighs them into a recommendation.

import type { WidgetSpec } from "./types";

// One factor (row): a statement plus how much it matters to the user (1-5).
export interface ReadinessFactor {
  text: string;
  importance: number; // how much this matters to me: 1 (low) – 5 (high)
}

export interface ReadinessData {
  question: string; // the yes/no decision, e.g. "Should I join a startup?"
  factors: ReadinessFactor[];
}

// A fresh widget seeds a few blank factors (importance centred at 3) so there's
// a list to fill in (or to replace with LLM-suggested factors).
export function blankReadinessData(question: string): ReadinessData {
  return {
    question: question.trim() || "",
    factors: Array.from({ length: 3 }, () => ({ text: "", importance: 3 })),
  };
}

export const readinessSpec: WidgetSpec<ReadinessData> = {
  type: "readiness",
  commands: ["rc", "readiness", "ready", "fit"],
  title: "Decision Factors",
  description: "Rank how much each factor matters to you (1–5) for a yes/no decision.",
  purpose:
    "Work through a single yes/no / go-no-go life decision (e.g. should I join a " +
    "startup, take the job, make the leap) by surfacing the factors that pull on " +
    "it — both ways — and ranking how much each one matters to you (1-5), so the " +
    "trade-off is explicit.",
  example: "Should I join a startup or stay at my corporate job?",

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
