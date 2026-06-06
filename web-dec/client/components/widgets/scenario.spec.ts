// Scenario planning — plausible futures and implications (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface ScenarioRow {
  name: string;
  implications: string;
  /** Likelihood this future occurs — free text ("30", "30%", "0.3"). */
  chance: string;
}

export interface ScenarioData {
  title: string;
  scenarios: ScenarioRow[];
}

export function blankScenarioData(title: string): ScenarioData {
  return {
    title: title.trim() || "Scenario planning",
    scenarios: [
      { name: "", implications: "", chance: "" },
      { name: "", implications: "", chance: "" },
    ],
  };
}

// Parse a `chance` field to a non-negative number (a relative weight). Accepts
// "30", "30%", "0.3". Returns null when blank/unparseable. Shared by the
// widget's Sankey chart and the format() likelihoods so both agree.
export function parseChance(s: string): number | null {
  const t = s.trim().replace("%", "").replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const scenarioSpec: WidgetSpec<ScenarioData> = {
  type: "scenario",
  commands: ["sc", "scenario", "scenarios", "futures", "whatif"],
  title: "Scenario planning",
  description: "Sketch plausible futures and what each would imply.",
  purpose: "Stress-test decisions by naming futures and spelling out what each would imply.",
  example: "What futures should I prepare for if I quit to go freelance?",

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
    // Normalise chances into likelihood shares (so they read as % of the whole).
    const weights = filled.map((s) => parseChance(s.chance));
    const total = weights.reduce<number>((sum, w) => sum + (w ?? 0), 0);
    filled.forEach((s, i) => {
      const n = s.name.trim() || `Future ${i + 1}`;
      const w = weights[i];
      const pct = w != null && total > 0 ? ` — likelihood ~${Math.round((w / total) * 100)}%` : "";
      lines.push(`### ${n}${pct}`);
      if (s.implications.trim()) lines.push(s.implications.trim());
      lines.push("");
    });
    return lines.join("\n").trimEnd();
  },
};
