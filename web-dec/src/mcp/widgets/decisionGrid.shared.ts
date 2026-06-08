// Shared data contract for the "decision grid" MCP App widget.
//
// Pure & dependency-free (no React, no zod, no Node) so it can be imported from
// THREE places without dragging anything along:
//   1. src/mcp/server.ts        — the Worker tool builds this shape + text.
//   2. DecisionGridApp.tsx      — the React widget renders + edits it.
//   3. scripts/build-widgets.mjs bundles (2), which transitively pulls this in.
//
// It mirrors the DEC chat-view 2×2 widget shape
// (client/components/widgets/twobytwo.spec.ts) so the same decision model is
// reused across both surfaces. Keep this the single source of truth for the
// grid's structuredContent.

/** One axis: a dimension with its two poles. `low` = score 0, `high` = score 100. */
export interface Axis {
  label: string;
  low: string;
  high: string;
}

/** One option on the plane. `x`/`y` are 0-100; `null` until placed. */
export interface PlacedItem {
  name: string;
  x: number | null;
  y: number | null;
}

/** The tool's `structuredContent` — exactly what the widget reads. */
export interface DecisionGridData {
  title: string;
  /** The decision being compared — carried for context. */
  question: string;
  xAxis: Axis;
  yAxis: Axis;
  items: PlacedItem[];
}

/** Describe where a 0-100 score sits relative to an axis's poles. */
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

/**
 * Structured grid → agent-readable plain text. Used as the tool's `content`
 * narration AND by the widget when it sends the user's placements back to chat,
 * so the model reads the same rendering in both directions.
 */
export function formatDecisionGrid(data: DecisionGridData): string {
  const x = data.xAxis;
  const y = data.yAxis;
  const lines: string[] = [
    `**2×2 decision — ${data.title.trim() || "Untitled"}**`,
    "",
    `Axes: X = ${axisHeader(x, "X")}; Y = ${axisHeader(y, "Y")}.`,
    "",
  ];

  const placed = data.items.filter(
    (it) => it.x != null && it.y != null && it.name.trim(),
  );
  const unplaced = data.items.filter(
    (it) => (it.x == null || it.y == null) && it.name.trim(),
  );

  if (placed.length === 0) {
    lines.push("(no options placed on the plane yet)");
  } else {
    lines.push("Each option's position (scores 0-100 per axis):");
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
}
