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

export function blankDecisionMatrixData(
  title: string,
  items: string[] = [],
): DecisionMatrixData {
  // Seed one option (row) per router-extracted item; fall back to two blanks.
  const names = items.map((s) => s.trim()).filter(Boolean);
  const options =
    names.length > 0
      ? names.map((name) => ({ name, scores: ["", ""] }))
      : [
          { name: "", scores: ["", ""] },
          { name: "", scores: ["", ""] },
        ];
  return {
    title: title.trim() || "Decision matrix",
    criteria: [
      { name: "", weight: "1" },
      { name: "", weight: "1" },
    ],
    options,
  };
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export const decisionMatrixSpec: WidgetSpec<DecisionMatrixData> = {
  type: "decisionmatrix",
  commands: ["dm", "dmatrix", "scores", "weightmatrix", "decisionmatrix"],
  title: "Decision matrix",
  description: "Score options against weighted criteria; weighted totals computed when numbers parse.",
  purpose:
    "Score three or more options numerically against several explicit criteria you can weight, producing weighted totals. Use only when the user wants to rate options on criteria; for a simple either/or choice prefer Factor Weighting.",
  example: "Compare three apartments on rent, commute, and size.",

  format: (data) => {
    const lines: string[] = [`**Decision matrix — ${data.title}**`, ""];
    const critEntries = data.criteria
      .map((c, col) => ({ name: c.name.trim(), weight: c.weight, col }))
      .filter((c) => c.name !== "");
    const opts = data.options.filter((o) => o.name.trim() !== "");
    if (critEntries.length === 0 || opts.length === 0) {
      lines.push("The user did not name at least one criterion and one option; nothing to score.");
      return lines.join("\n");
    }

    lines.push(
      "Weighted decision matrix: each option has a score per criterion; weights scale scores before summing (numeric scores required for totals).",
      "",
    );
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
