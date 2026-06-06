// Spec for the 2×2 drag-and-drop grid widget — see ./types.ts for the contract.
// Pure & React-free: data shape, slash triggers, and chat formatting.

import type { WidgetSpec } from "./types";

/** Row-major: top-left, top-right, bottom-left, bottom-right. */
export type TwoByTwoCells = readonly [string, string, string, string];

export interface TwoByTwoData {
  title: string;
  cells: TwoByTwoCells;
}

const QUADRANT_LABELS = ["Top-left", "Top-right", "Bottom-left", "Bottom-right"] as const;

export function blankTwoByTwoData(title: string): TwoByTwoData {
  return {
    title: title.trim() || "2×2 grid",
    cells: ["", "", "", ""] as TwoByTwoCells,
  };
}

function cellLine(label: string, value: string): string {
  const t = value.trim();
  return `- **${label}:** ${t || "(empty)"}`;
}

export const twoByTwoSpec: WidgetSpec<TwoByTwoData> = {
  type: "twobytwo",
  commands: ["22", "twobytwo", "two-by-two", "2x2", "grid2"],
  title: "2×2 grid",
  description:
    "Four quadrants you can label; drag the handle on any tile to swap it with another.",

  format: (data) => {
    const lines: string[] = [`**2×2 — ${data.title}**`, ""];
    for (let i = 0; i < 4; i++) {
      lines.push(cellLine(QUADRANT_LABELS[i]!, data.cells[i]!));
    }
    lines.push("");
    lines.push("Grid (TL | TR / BL | BR):");
    const [a, b, c, d] = data.cells;
    const esc = (s: string) => (s.trim() || "·").replace(/\|/g, "\\|");
    lines.push(`${esc(a)} | ${esc(b)}`);
    lines.push(`${esc(c)} | ${esc(d)}`);
    return lines.join("\n");
  },
};
