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
    const lines: string[] = [`**Scenario planning — ${data.title}**`, ""];
    if (filled.length === 0) {
      lines.push("(no scenarios filled in)");
      return lines.join("\n");
    }
    filled.forEach((s, i) => {
      lines.push(`### Scenario ${i + 1}: ${s.name.trim() || "(untitled)"}`);
      lines.push(s.implications.trim() || "(no implications yet)");
      lines.push("");
    });
    return lines.join("\n").trimEnd();
  },
};
