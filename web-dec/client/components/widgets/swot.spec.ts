// SWOT — strengths, weaknesses, opportunities, threats (docs/plan/overview.md).
// format() groups by human meaning; skips empty quadrants so the agent sees signal only.

import type { WidgetSpec } from "./types";
import type { Quadrant4Data } from "./quadrant4Types";
import { emptyFourCells } from "./quadrant4Types";

export type SwotData = Quadrant4Data;

const NAMES = ["Strengths", "Weaknesses", "Opportunities", "Threats"] as const;

export function blankSwotData(title: string): SwotData {
  return {
    title: title.trim() || "SWOT",
    cells: emptyFourCells(),
  };
}

export const swotSpec: WidgetSpec<SwotData> = {
  type: "swot",
  commands: ["swot", "s-w-o-t", "swotmatrix"],
  title: "SWOT analysis",
  description: "Strengths / weaknesses / opportunities / threats in a 2×2 you can reorder by drag.",
  purpose: "Contrast internal strengths and weaknesses with external opportunities and threats.",
  example: "What's the SWOT of launching my side project as a business?",

  format: (data) => {
    const lines: string[] = [
      `**SWOT — ${data.title}**`,
      "",
      "Structured as internal (S/W) vs external (O/T). Only filled quadrants appear below.",
    ];
    for (let i = 0; i < 4; i++) {
      const t = data.cells[i]!.trim();
      if (t) {
        lines.push(`### ${NAMES[i]}`);
        lines.push(t);
        lines.push("");
      }
    }
    const esc = (s: string) => (s.trim() || "·").replace(/\|/g, "\\|");
    lines.push("Matrix snapshot (S | W / O | T):");
    lines.push(`${esc(data.cells[0]!)} | ${esc(data.cells[1]!)}`);
    lines.push(`${esc(data.cells[2]!)} | ${esc(data.cells[3]!)}`);
    return lines.join("\n");
  },
};
