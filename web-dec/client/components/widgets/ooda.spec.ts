// OODA loop + first-principles prompts (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface OodaData {
  title: string;
  observe: string;
  orient: string;
  decide: string;
  act: string;
  firstPrinciples: string;
}

export function blankOodaData(title: string): OodaData {
  return {
    title: title.trim() || "OODA / first principles",
    observe: "",
    orient: "",
    decide: "",
    act: "",
    firstPrinciples: "",
  };
}

const SECTIONS: Array<[keyof OodaData, string]> = [
  ["observe", "Observe"],
  ["orient", "Orient"],
  ["decide", "Decide"],
  ["act", "Act"],
  ["firstPrinciples", "First principles"],
];

export const oodaSpec: WidgetSpec<OodaData> = {
  type: "ooda",
  commands: ["ooda", "loop", "firstprinciples", "first-principles"],
  title: "OODA / first principles",
  description: "Observe–Orient–Decide–Act plus a space to strip the problem to first principles.",
  purpose: "Break a stuck decision by cycling facts, models, commitment, and action—and by reframing from basics.",

  format: (data) => {
    const lines: string[] = [
      `**OODA / first principles — ${data.title}**`,
      "",
      "Structured thinking pass the user completed (only non-empty sections are included):",
    ];
    for (const [key, label] of SECTIONS) {
      const body = String(data[key]).trim();
      if (body) {
        lines.push("", `### ${label}`, body);
      }
    }
    return lines.join("\n").trimEnd();
  },
};
