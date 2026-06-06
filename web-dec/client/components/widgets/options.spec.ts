// Spec for the Options widget — choose between two options by checking, for each
// decision point, which option satisfies it. See ./types.ts for the contract.
// Pure & React-free: data shape, slash triggers, purpose, and the LLM-reader
// plain-text rendering.

import type { WidgetSpec } from "./types";

// One decision point (row): a criterion, plus whether each option satisfies it.
export interface OptionRow {
  text: string;
  a: boolean; // optionA satisfies / is favoured by this point
  b: boolean; // optionB satisfies / is favoured by this point
}

export interface OptionsData {
  question: string; // the decision, e.g. "Should I get a dog or cat?"
  optionA: string; // label for column A, e.g. "Dog"
  optionB: string; // label for column B, e.g. "Cat"
  rows: OptionRow[];
}

// A fresh widget seeds a few blank rows so there's a grid to fill in (or to
// replace with LLM-suggested points).
export function blankOptionsData(question: string): OptionsData {
  return {
    question: question.trim() || "",
    optionA: "",
    optionB: "",
    rows: Array.from({ length: 3 }, () => ({ text: "", a: false, b: false })),
  };
}

export const optionsSpec: WidgetSpec<OptionsData> = {
  type: "options",
  commands: ["ab", "opt", "options", "vs"],
  title: "Options A/B",
  description:
    "Compare two options point by point — tick which option each decision point favours.",
  purpose:
    "Choose between exactly two options by scoring them across the decision " +
    "points that matter — see at a glance which option wins on more counts.",

  // Output contract: name the two options, list each filled-in decision point
  // with which option(s) it favours, then a tally. Written for an LLM reader.
  format: (data) => {
    const a = data.optionA.trim() || "Option A";
    const b = data.optionB.trim() || "Option B";
    const filled = data.rows.filter((r) => r.text.trim() !== "");

    const lines: string[] = [
      `**Options — ${data.question.trim() || "untitled decision"}**`,
      "",
      `Comparing **${a}** vs **${b}**. For each decision point, ✓ marks the ` +
        `option(s) it favours:`,
      "",
    ];

    if (filled.length === 0) {
      lines.push("(no decision points filled in yet)");
      return lines.join("\n");
    }

    let scoreA = 0;
    let scoreB = 0;
    for (const r of filled) {
      if (r.a) scoreA++;
      if (r.b) scoreB++;
      const mark = (on: boolean) => (on ? "✓" : "·");
      lines.push(`- ${r.text.trim()} — ${a}: ${mark(r.a)} | ${b}: ${mark(r.b)}`);
    }

    lines.push("");
    lines.push(`Score — ${a}: ${scoreA}, ${b}: ${scoreB}`);
    if (scoreA !== scoreB) {
      lines.push(`Leaning towards **${scoreA > scoreB ? a : b}** on the points above.`);
    } else {
      lines.push("Tied on the points above.");
    }
    return lines.join("\n");
  },
};
