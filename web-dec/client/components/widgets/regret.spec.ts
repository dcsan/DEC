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
  commands: ["rg", "regret", "minregret", "fwthinking", "10years"],
  title: "Regret minimisation",
  description: "Which choice would you regret least at the horizon you pick?",
  purpose: "Clarify values by comparing how you'd feel years later about each path.",
  example: "Would I regret it more in 10 years if I stayed or moved abroad?",

  format: (data) => {
    const y = data.horizonYears.trim() || "10";
    const lines: string[] = [
      `**Regret minimisation — ${data.title}**`,
      "",
      `The user compared anticipated regret **${y} years** out. Only paths where they wrote regret text are included.`,
    ];
    const pushPath = (pathLabel: string, regret: string) => {
      if (!regret.trim()) return;
      lines.push("", `### ${pathLabel}`);
      lines.push("**Possible regret:**", regret.trim());
    };
    pushPath(data.optionA.trim() || "Path A", data.regretIfA);
    pushPath(data.optionB.trim() || "Path B", data.regretIfB);
    return lines.join("\n");
  },
};
