// Regret minimisation — compare regrets for each path (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface RegretData {
  title: string;
  horizonYears: string;
  optionA: string;
  optionB: string;
  regretIfA: string;
  regretIfB: string;
}

export function blankRegretData(title: string): RegretData {
  return {
    title: title.trim() || "Regret check",
    horizonYears: "10",
    optionA: "",
    optionB: "",
    regretIfA: "",
    regretIfB: "",
  };
}

export const regretSpec: WidgetSpec<RegretData> = {
  type: "regret",
  commands: ["regret", "minregret", "fwthinking", "10years"],
  title: "Regret minimisation",
  description: "Which choice would you regret least at the horizon you pick?",

  format: (data) => {
    const y = data.horizonYears.trim() || "10";
    const lines: string[] = [
      `**Regret minimisation — ${data.title}**`,
      "",
      `**Horizon:** ${y} years`,
      "",
      `### Option A: ${data.optionA.trim() || "(unnamed)"}`,
      "**If you choose A, your regret might be:**",
      data.regretIfA.trim() || "(empty)",
      "",
      `### Option B: ${data.optionB.trim() || "(unnamed)"}`,
      "**If you choose B, your regret might be:**",
      data.regretIfB.trim() || "(empty)",
    ];
    return lines.join("\n");
  },
};
