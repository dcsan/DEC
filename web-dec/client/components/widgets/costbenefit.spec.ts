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
  purpose: "Make tradeoffs explicit—especially when you can attach rough numbers to each side.",

  format: (data) => {
    const lines: string[] = [`**Cost–benefit — ${data.title}**`, "", "Side-by-side costs vs benefits the user listed:"];
    const costLines = data.costs.filter((x) => x.label.trim() || x.amount.trim());
    const benLines = data.benefits.filter((x) => x.label.trim() || x.amount.trim());

    if (costLines.length > 0) {
      lines.push("", "### Costs");
      let costSum = 0;
      let costOk = true;
      costLines.forEach((c) => {
        const a = parseMoney(c.amount);
        if (c.amount.trim() && a === null) costOk = false;
        if (a !== null) costSum += a;
        lines.push(`- ${c.label.trim() || "(item)"}${c.amount.trim() ? ` — ${c.amount.trim()}` : ""}`);
      });
      if (costOk && costLines.some((c) => c.amount.trim())) lines.push(`**Costs subtotal (parsed):** ${costSum}`);
    } else {
      lines.push("", "### Costs");
      lines.push("- (none listed)");
    }

    if (benLines.length > 0) {
      lines.push("", "### Benefits");
      let benSum = 0;
      let benOk = true;
      benLines.forEach((b) => {
        const a = parseMoney(b.amount);
        if (b.amount.trim() && a === null) benOk = false;
        if (a !== null) benSum += a;
        lines.push(`- ${b.label.trim() || "(item)"}${b.amount.trim() ? ` — ${b.amount.trim()}` : ""}`);
      });
      if (benOk && benLines.some((b) => b.amount.trim())) lines.push(`**Benefits subtotal (parsed):** ${benSum}`);
    } else {
      lines.push("", "### Benefits");
      lines.push("- (none listed)");
    }

    if (data.notes.trim()) {
      lines.push("", "### Notes", data.notes.trim());
    }
    return lines.join("\n");
  },
};
