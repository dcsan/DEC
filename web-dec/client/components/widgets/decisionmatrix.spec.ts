// Decision matrix / weighted scoring — options × criteria (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface Criterion {
  name: string;
  /** Weight as text so users can type decimals; parsed in format when possible. */
  weight: string;
}

export interface MatrixOption {
  name: string;
  /** One score per criterion column (same order as criteria). */
  scores: string[];
}

export interface DecisionMatrixData {
  title: string;
  criteria: Criterion[];
  options: MatrixOption[];
}

export function blankDecisionMatrixData(title: string): DecisionMatrixData {
  return {
    title: title.trim() || "Decision matrix",
    criteria: [
      { name: "", weight: "1" },
      { name: "", weight: "1" },
    ],
    options: [
      { name: "", scores: ["", ""] },
      { name: "", scores: ["", ""] },
    ],
  };
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export const decisionMatrixSpec: WidgetSpec<DecisionMatrixData> = {
  type: "decisionmatrix",
  commands: ["dmatrix", "scores", "weightmatrix", "decisionmatrix"],
  title: "Decision matrix",
  description: "Score options against weighted criteria; weighted totals computed when numbers parse.",
  purpose: "Compare multiple options numerically against criteria you can weight.",

  format: (data) => {
    const lines: string[] = [`**Decision matrix — ${data.title}**`, ""];
    const critEntries = data.criteria
      .map((c, col) => ({ name: c.name.trim(), weight: c.weight, col }))
      .filter((c) => c.name !== "");
    const opts = data.options.filter((o) => o.name.trim() !== "");
    if (critEntries.length === 0 || opts.length === 0) {
      lines.push("Add at least one named criterion and one named option to summarise.");
      return lines.join("\n");
    }

    lines.push("### Criteria (weight)");
    critEntries.forEach((c) => {
      lines.push(`- ${c.name} — weight ${c.weight.trim() || "1"}`);
    });
    lines.push("");
    lines.push("### Weighted scores");

    opts.forEach((o) => {
      let total = 0;
      let ok = true;
      const parts: string[] = [];
      critEntries.forEach((c) => {
        const raw = o.scores[c.col] ?? "";
        const sc = parseNum(raw);
        const w = parseNum(c.weight) ?? 1;
        if (sc === null) ok = false;
        else total += sc * w;
        parts.push(`${c.name}: ${raw.trim() || "—"}`);
      });
      lines.push(`**${o.name.trim()}**`);
      lines.push(parts.join("; "));
      lines.push(ok ? `→ weighted sum: **${total.toFixed(2)}**` : "→ weighted sum: (needs numeric scores)");
      lines.push("");
    });

    return lines.join("\n").trimEnd();
  },
};
