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
  draft: true,
  title: "OODA / first principles",
  description: "Observe–Orient–Decide–Act plus a space to strip the problem to first principles.",
  purpose: "Break a stuck decision by cycling facts, models, commitment, and action—and by reframing from basics.",
  example: "I'm stuck on a big decision — help me think it through from first principles.",
  help:
    "Work a stuck decision by cycling through Observe, Orient, Decide, Act — and by reframing it from first principles. Fill each stage with what you know, the models that apply, your commitment, and the next action. On send, the loop goes to chat.",

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
