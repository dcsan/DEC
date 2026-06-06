// Eisenhower matrix (urgent × important) — aligns with docs/plan/overview.md.
// Cell order (row-major): urgent+important, urgent+!important, !urgent+important, !urgent+!important.

import type { WidgetSpec } from "./types";
import type { Quadrant4Data } from "./quadrant4Types";
import { emptyFourCells } from "./quadrant4Types";

export type EisenhowerData = Quadrant4Data;

const NAMES = [
  "Do first (urgent & important)",
  "Delegate (urgent, not important)",
  "Schedule (important, not urgent)",
  "Eliminate (neither)",
] as const;

export function blankEisenhowerData(title: string): EisenhowerData {
  return {
    title: title.trim() || "Eisenhower matrix",
    cells: emptyFourCells(),
  };
}

function cellLine(i: number, value: string): string {
  const t = value.trim();
  return `- **${NAMES[i]!}:** ${t || "(empty)"}`;
}

export const eisenhowerSpec: WidgetSpec<EisenhowerData> = {
  type: "eisenhower",
  commands: ["eisenhower", "eih", "ike", "urgent-important", "priority2x2"],
  title: "Eisenhower matrix",
  description: "Urgent vs important 2×2 for prioritisation (Do / Schedule / Delegate / Eliminate).",

  format: (data) => {
    const lines: string[] = [`**Eisenhower — ${data.title}**`, ""];
    for (let i = 0; i < 4; i++) lines.push(cellLine(i, data.cells[i]!));
    lines.push("");
    lines.push("| Do first | Delegate |");
    const esc = (s: string) => (s.trim() || "·").replace(/\|/g, "\\|");
    lines.push(`| ${esc(data.cells[0]!)} | ${esc(data.cells[1]!)} |`);
    lines.push("| Schedule | Eliminate |");
    lines.push(`| ${esc(data.cells[2]!)} | ${esc(data.cells[3]!)} |`);
    return lines.join("\n");
  },
};
