// Spec for the generic 2×2 drag-and-drop grid — see ./types.ts for the contract.
// format() is written for an LLM reader: labels by meaning, omits empty quadrants.

import type { WidgetSpec } from "./types";
import type { FourCells, Quadrant4Data } from "./quadrant4Types";
import { emptyFourCells } from "./quadrant4Types";

export type TwoByTwoCells = FourCells;
export type TwoByTwoData = Quadrant4Data;

const QUADRANT_LABELS = ["Top-left", "Top-right", "Bottom-left", "Bottom-right"] as const;

export function blankTwoByTwoData(title: string): TwoByTwoData {
  return {
    title: title.trim() || "2×2 grid",
    cells: emptyFourCells(),
  };
}

export const twoByTwoSpec: WidgetSpec<TwoByTwoData> = {
  type: "twobytwo",
  commands: ["22", "twobytwo", "two-by-two", "2x2", "grid2"],
  title: "2×2 grid",
  description:
    "Four quadrants you can label; drag the handle on any tile to swap it with another.",
  purpose: "Place ideas in four buckets on two axes; swap quadrant text when your framing shifts.",
  example: "Help me sort my project ideas by impact and effort.",

  format: (data) => {
    const lines: string[] = [
      `**2×2 — ${data.title}**`,
      "",
      "The user organised notes into four quadrants (reading order: top-left, top-right, bottom-left, bottom-right). Only non-empty cells are listed:",
    ];
    for (let i = 0; i < 4; i++) {
      const t = data.cells[i]!.trim();
      if (t) lines.push(`- **${QUADRANT_LABELS[i]}:** ${t}`);
    }
    const esc = (s: string) => (s.trim() || "·").replace(/\|/g, "\\|");
    const [a, b, c, d] = data.cells;
    lines.push("", "Compact grid (same positions):");
    lines.push(`${esc(a)} | ${esc(b)}`);
    lines.push(`${esc(c)} | ${esc(d)}`);
    return lines.join("\n");
  },
};
