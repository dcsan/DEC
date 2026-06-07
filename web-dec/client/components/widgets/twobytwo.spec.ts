// Spec for the 2×2 axes/scatter widget — see ./types.ts for the contract.
// Pure & React-free: data shape, slash triggers, purpose, and the LLM-reader
// plain-text rendering.
//
// The user compares two or more options by positioning them anywhere on a plane
// whose two axes are derived (by the LLM) from the decision — e.g. "car vs
// motorbike" → x: Cost (Cheap→Expensive), y: Safety (Risky→Safe). Each placed
// item's position becomes a 0-100 score on each axis. format() reports those
// scores so the assistant can interpret them; unplaced items are listed apart.

import type { WidgetSpec } from "./types";

/** One axis: a dimension with its two poles. `low` = score 0, `high` = score 100. */
export interface Axis {
  label: string;
  low: string;
  high: string;
}

/** One option on the plane. `x`/`y` are 0-100; null until the user places it. */
export interface PlacedItem {
  name: string;
  x: number | null;
  y: number | null;
}

export interface AxesGridData {
  title: string;
  /** The decision being compared — carried for context / re-suggesting axes. */
  question: string;
  xAxis: Axis;
  yAxis: Axis;
  items: PlacedItem[];
}

function blankAxis(): Axis {
  return { label: "", low: "", high: "" };
}

/** Seed the widget: blank axes (the LLM fills them) and one item per name. */
export function blankAxesGridData(
  title: string,
  question: string,
  names: string[] = [],
): AxesGridData {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  return {
    title: title.trim() || "2×2 comparison",
    question: question.trim() || title.trim() || "",
    xAxis: blankAxis(),
    yAxis: blankAxis(),
    items: clean.map((name) => ({ name, x: null, y: null })),
  };
}

// Describe where a 0-100 score sits relative to an axis's poles, so the LLM
// reader isn't left guessing what a bare number means.
function pole(axis: Axis, score: number): string {
  const lowName = axis.low.trim() || "low";
  const highName = axis.high.trim() || "high";
  if (score >= 67) return `toward ${highName}`;
  if (score <= 33) return `toward ${lowName}`;
  return "middle";
}

function axisHeader(axis: Axis, fallback: string): string {
  const label = axis.label.trim() || fallback;
  const lo = axis.low.trim();
  const hi = axis.high.trim();
  return lo || hi ? `${label} (0 = ${lo || "low"} → 100 = ${hi || "high"})` : label;
}

export const twoByTwoSpec: WidgetSpec<AxesGridData> = {
  type: "twobytwo",
  commands: ["22", "twobytwo", "two-by-two", "2x2", "axes", "grid2"],
  title: "2×2 comparison",
  description:
    "Plot options on two axes the AI derives from your decision; drag each anywhere and they're scored 0–100.",
  purpose:
    "Compare two or more concrete options by positioning them on two automatically-" +
    "derived axes (e.g. cost vs safety, impact vs effort) and scoring each 0-100 on " +
    "both. Use when the user wants to visualise or plot options against dimensions; " +
    "for weighing how much factors matter to them prefer Factor Weighting.",
  example: "Compare a car and a motorbike on cost and safety.",
  help:
    "Compare options on two axes the AI derives from your decision (e.g. cost vs safety). Drag each option from the tray onto the grid — anywhere, not just the corners — and its position becomes a 0–100 score on each axis. Once you have a couple of options, ‘⚙ redo axes’ offers five other ways to compare them (pick up to two, or type your own) and re-scores everything on the new axes; ‘✨ generate’ suggests more options in the same category, scored and pre-placed. Edit axis labels/poles inline; double-click a placed item to send it back to the tray. On send, the scored positions go to chat.",

  format: (data) => {
    const x = data.xAxis;
    const y = data.yAxis;
    const lines: string[] = [
      `**2×2 comparison — ${data.title.trim() || "Untitled"}**`,
      "",
      `Axes: X = ${axisHeader(x, "X")}; Y = ${axisHeader(y, "Y")}.`,
      "",
    ];

    const placed = data.items.filter((it) => it.x != null && it.y != null && it.name.trim());
    const unplaced = data.items.filter((it) => (it.x == null || it.y == null) && it.name.trim());

    if (placed.length === 0) {
      lines.push("(no options placed on the plane yet)");
    } else {
      lines.push("The user positioned each option (scores 0-100 per axis):");
      for (const it of placed) {
        const xs = Math.round(it.x as number);
        const ys = Math.round(it.y as number);
        lines.push(
          `- **${it.name.trim()}** — ${x.label.trim() || "X"}: ${xs}/100 (${pole(x, xs)}); ` +
            `${y.label.trim() || "Y"}: ${ys}/100 (${pole(y, ys)})`,
        );
      }
    }

    if (unplaced.length > 0) {
      lines.push("", `Not yet placed: ${unplaced.map((it) => it.name.trim()).join(", ")}.`);
    }

    return lines.join("\n");
  },
};
