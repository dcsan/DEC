// Cost–benefit — lists with optional numeric hints (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface CostBenefitLine {
  label: string;
  amount: string;
}

export interface CostBenefitData {
  title: string;
  costs: CostBenefitLine[];
  benefits: CostBenefitLine[];
  notes: string;
}

export function blankCostBenefitData(title: string): CostBenefitData {
  return {
    title: title.trim() || "Cost–benefit",
    costs: [
      { label: "", amount: "" },
      { label: "", amount: "" },
    ],
    benefits: [
      { label: "", amount: "" },
      { label: "", amount: "" },
    ],
    notes: "",
  };
}

function parseMoney(s: string): number | null {
  const t = s.trim().replace(/[$€£,]/g, "");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export const costBenefitSpec: WidgetSpec<CostBenefitData> = {
  type: "costbenefit",
  commands: ["costbenefit", "cba", "cost-benefit"],
  title: "Cost–benefit",
  description: "List costs and benefits; amounts are summed when they parse as numbers.",

  format: (data) => {
    const lines: string[] = [`**Cost–benefit — ${data.title}**`, ""];
    const costLines = data.costs.filter((x) => x.label.trim() || x.amount.trim());
    const benLines = data.benefits.filter((x) => x.label.trim() || x.amount.trim());

    lines.push("### Costs");
    let costSum = 0;
    let costOk = true;
    costLines.forEach((c) => {
      const a = parseMoney(c.amount);
      if (c.amount.trim() && a === null) costOk = false;
      if (a !== null) costSum += a;
      lines.push(`- ${c.label.trim() || "(item)"}${c.amount.trim() ? ` — ${c.amount.trim()}` : ""}`);
    });
    if (costLines.length === 0) lines.push("- (none)");
    lines.push(costOk && costLines.some((c) => c.amount.trim()) ? `**Costs subtotal:** ${costSum}` : "");
    lines.push("");
    lines.push("### Benefits");
    let benSum = 0;
    let benOk = true;
    benLines.forEach((b) => {
      const a = parseMoney(b.amount);
      if (b.amount.trim() && a === null) benOk = false;
      if (a !== null) benSum += a;
      lines.push(`- ${b.label.trim() || "(item)"}${b.amount.trim() ? ` — ${b.amount.trim()}` : ""}`);
    });
    if (benLines.length === 0) lines.push("- (none)");
    lines.push(benOk && benLines.some((b) => b.amount.trim()) ? `**Benefits subtotal:** ${benSum}` : "");
    if (data.notes.trim()) {
      lines.push("");
      lines.push("### Notes");
      lines.push(data.notes.trim());
    }
    return lines.filter((l) => l !== "").join("\n");
  },
};
