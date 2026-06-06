// Spec file for the Pros & Cons widget — see ./types.ts for the contract.
// Pure & React-free: it defines the widget's data shape, its slash triggers,
// and how its result is formatted when sent back into the chat.

import type { WidgetSpec } from "./types";

// One row of the matrix: a thing the user can mark as a pro and/or a con.
export interface ProConItem {
  text: string;
  pro: boolean;
  con: boolean;
}

export interface ProConData {
  title: string;
  items: ProConItem[];
}

// A fresh widget seeds a few blank rows so there's something to fill in.
export function blankProConData(title: string): ProConData {
  return {
    title: title || "Pros & Cons",
    items: Array.from({ length: 3 }, () => ({ text: "", pro: false, con: false })),
  };
}

export const proConSpec: WidgetSpec<ProConData> = {
  type: "procon",
  commands: ["pc", "procon", "proscons", "pros-cons"],
  title: "Pros & Cons",
  description: "Weigh a decision by listing items and marking each as a pro and/or con.",

  // Output contract: a compact markdown summary. Only filled-in rows are
  // included; a row can land in both lists if marked pro AND con.
  format: (data) => {
    const filled = data.items.filter((it) => it.text.trim() !== "");
    const pros = filled.filter((it) => it.pro).map((it) => `- ${it.text.trim()}`);
    const cons = filled.filter((it) => it.con).map((it) => `- ${it.text.trim()}`);

    const lines: string[] = [`**Pros & Cons — ${data.title}**`, ""];
    lines.push(`Pros (${pros.length}):`);
    lines.push(pros.length ? pros.join("\n") : "- (none)");
    lines.push("");
    lines.push(`Cons (${cons.length}):`);
    lines.push(cons.length ? cons.join("\n") : "- (none)");

    return lines.join("\n");
  },
};
