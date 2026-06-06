// Expected value — outcome × probability × value (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface ExpectedValueRow {
  outcome: string;
  probability: string;
  value: string;
}

export interface ExpectedValueData {
  title: string;
  rows: ExpectedValueRow[];
}

export function blankExpectedValueData(title: string): ExpectedValueData {
  return {
    title: title.trim() || "Expected value",
    rows: [
      { outcome: "", probability: "", value: "" },
      { outcome: "", probability: "", value: "" },
    ],
  };
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.trim().replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

export const expectedValueSpec: WidgetSpec<ExpectedValueData> = {
  type: "expectedvalue",
  commands: ["evtable", "expvalue", "expectedvalue"],
  title: "Expected value",
  description: "Rows of outcome, probability, and value; EV sum when numbers parse.",
  purpose: "Weight uncertain outcomes by probability for risk-return style comparisons.",

  format: (data) => {
    const lines: string[] = [`**Expected value — ${data.title}**`, ""];
    const filled = data.rows.filter((r) => r.outcome.trim() || r.probability.trim() || r.value.trim());
    if (filled.length === 0) {
      lines.push("(no rows)");
      return lines.join("\n");
    }

    const probs = filled.map((r) => parseNum(r.probability));
    const vals = filled.map((r) => parseNum(r.value));
    const sumP = probs.reduce((a, p) => a + (p ?? 0), 0);
    const asPercent = probs.every((p) => p !== null) && sumP > 1.01 && sumP <= 100;

    let ev = 0;
    let ok = true;
    filled.forEach((r, i) => {
      const pRaw = probs[i];
      const v = vals[i];
      lines.push(
        `- **${r.outcome.trim() || `Outcome ${i + 1}`}** — P=${r.probability.trim() || "—"}, V=${r.value.trim() || "—"}`,
      );
      if (pRaw === null || v === null) ok = false;
      else {
        const p = asPercent ? pRaw / 100 : pRaw;
        ev += p * v;
      }
    });
    lines.push("");
    lines.push(ok ? `**E[value] ≈ ${ev.toFixed(3)}**` : "**E[value]** — fill numeric probability and value on each row to compute.");
    return lines.join("\n");
  },
};
