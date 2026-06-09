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

// One factor (row): a named spectrum between two OPPOSITE poles, plus where the
// user sits on it. `left`/`right` are opposite values on the same scale (e.g.
// label "Organizational structure", left "Bureaucratic", right "Freeform"), and
// `value` (1-5) is the user's position — 1 = fully left, 3 = neutral, 5 = fully
// right. This makes an otherwise-ambiguous factor's slider direction concrete.
export interface Factor {
  label: string; // the dimension, e.g. "Organizational structure"
  left: string; // the left pole, e.g. "Bureaucratic"
  right: string; // the opposite right pole, e.g. "Freeform"
  value: number; // where the user sits: 1 (left) – 5 (right), 3 = neutral
}

export interface FactorsData {
  question: string; // the yes/no decision, e.g. "Should I join a startup?"
  factors: Factor[];
}

// A fresh widget seeds a few blank factors (slider centred at 3 = neutral) so
// there's a list to fill in (or to replace with LLM-suggested factors).
export function blankFactorsData(question: string): FactorsData {
  return {
    question: question.trim() || "",
    factors: Array.from({ length: 3 }, () => ({ label: "", left: "", right: "", value: 3 })),
  };
}

export const factorsSpec: WidgetSpec<FactorsData> = {
  type: "factors",
  commands: ["factors", "fa"],
  title: "Factor Weighting",
  description: "Place yourself on each factor's spectrum (between two opposite poles) for an either/or or yes/no decision.",
  purpose:
    "Decide between two options, or a single yes/no choice (e.g. should I get a " +
    "dog or a cat, buy or rent, join a startup or stay), by surfacing the factors " +
    "that pull on the decision. Each factor is a SPECTRUM between two opposing " +
    "values (e.g. 'Organizational structure' from 'Bureaucratic' to 'Freeform'), " +
    "and you mark where you sit or what you prefer on each — so the trade-offs are " +
    "explicit. This is the default tool for an either/or personal decision; prefer " +
    "it over the decision matrix unless the user explicitly wants to score several " +
    "options on numeric criteria.",
  example: "Should I get a dog or a cat?",
  help:
    "For an either/or or yes/no decision, the AI lists the factors that pull on it — each as a spectrum between two opposite labels (e.g. Bureaucratic ↔ Freeform). Slide each toward the side you prefer or that fits you. Use ✨ generate more to add factors. On send, your positions go to chat for a recommendation.",

  // Output contract: name the decision, then list each filled factor as its
  // spectrum and where the user landed. Written for an LLM reader so it can weigh
  // the user's leanings into a recommendation without seeing the widget.
  format: (data) => {
    const filled = data.factors.filter((f) => f.label.trim() !== "");

    const lines: string[] = [`**${data.question.trim() || "Decision"}**`, ""];

    if (filled.length === 0) {
      lines.push("(no factors set yet)");
      return lines.join("\n");
    }

    lines.push("Factors as spectrums, with where I sit on each (1 = left … 5 = right):");
    for (const f of filled) {
      const left = f.left.trim() || "left";
      const right = f.right.trim() || "right";
      const lean =
        f.value < 3
          ? `leans toward "${left}"`
          : f.value > 3
            ? `leans toward "${right}"`
            : "balanced";
      lines.push(`- ${f.label.trim()}: ${left} ←→ ${right} — ${lean} (${f.value}/5)`);
    }
    return lines.join("\n");
  },
};
