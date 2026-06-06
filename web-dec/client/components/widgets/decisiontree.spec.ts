// Decision tree — branch labels and outcomes as structured rows (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface DecisionBranch {
  /** Condition or fork label */
  condition: string;
  /** What happens on this branch */
  outcome: string;
  /** Optional probability or note */
  probability: string;
}

export interface DecisionTreeData {
  title: string;
  root: string;
  branches: DecisionBranch[];
}

export function blankDecisionTreeData(title: string): DecisionTreeData {
  return {
    title: title.trim() || "Decision tree",
    root: "",
    branches: [
      { condition: "", outcome: "", probability: "" },
      { condition: "", outcome: "", probability: "" },
    ],
  };
}

export const decisionTreeSpec: WidgetSpec<DecisionTreeData> = {
  type: "decisiontree",
  commands: ["dtree", "dectree", "decisiontree"],
  title: "Decision tree",
  description: "Root decision plus branches (condition → outcome, optional probability).",

  format: (data) => {
    const lines: string[] = [`**Decision tree — ${data.title}**`, ""];
    lines.push(`**Root:** ${data.root.trim() || "(empty)"}`);
    lines.push("");
    const filled = data.branches.filter((b) => b.condition.trim() || b.outcome.trim() || b.probability.trim());
    if (filled.length === 0) {
      lines.push("(no branches)");
      return lines.join("\n");
    }
    filled.forEach((b, i) => {
      lines.push(`${i + 1}. **If** ${b.condition.trim() || "…"} **→** ${b.outcome.trim() || "…"}`);
      if (b.probability.trim()) lines.push(`   _(${b.probability.trim()})_`);
    });
    return lines.join("\n");
  },
};
