// Scenario planning — plausible futures and implications (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface ScenarioRow {
  name: string;
  implications: string;
}

export interface ScenarioData {
  title: string;
  scenarios: ScenarioRow[];
}

export function blankScenarioData(title: string): ScenarioData {
  return {
    title: title.trim() || "Scenario planning",
    scenarios: [
      { name: "", implications: "" },
      { name: "", implications: "" },
    ],
  };
}

export const scenarioSpec: WidgetSpec<ScenarioData> = {
  type: "scenario",
  commands: ["scenario", "scenarios", "futures", "whatif"],
  title: "Scenario planning",
  description: "Sketch plausible futures and what each would imply.",
  purpose: "Stress-test decisions by naming futures and spelling out what each would imply.",

  format: (data) => {
    const filled = data.scenarios.filter((s) => s.name.trim() || s.implications.trim());
    const lines: string[] = [
      `**Scenario planning — ${data.title}**`,
      "",
      "Plausible futures the user sketched. Use implications when reasoning about risk and next steps:",
    ];
    if (filled.length === 0) {
      lines.push("(no scenario content captured)");
      return lines.join("\n");
    }
    filled.forEach((s, i) => {
      const n = s.name.trim() || `Future ${i + 1}`;
      lines.push(`### ${n}`);
      if (s.implications.trim()) lines.push(s.implications.trim());
      lines.push("");
    });
    return lines.join("\n").trimEnd();
  },
};
