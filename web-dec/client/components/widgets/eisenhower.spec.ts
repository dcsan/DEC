// Spec file for the Eisenhower (important/urgent) matrix widget.
// Pure & React-free: data shape, slash triggers, purpose, and the template that
// turns the structured entries into agent-friendly plain text.

import type { WidgetSpec } from "./types";

// One task, classified by the two Eisenhower axes. 1 = yes, 0 = no.
export interface EisenhowerEntry {
  text: string;
  important: 0 | 1;
  urgent: 0 | 1;
}

export interface EisenhowerData {
  title: string;
  entries: EisenhowerEntry[];
}

export const eisenhowerSpec: WidgetSpec<EisenhowerData> = {
  type: "eisenhower",
  commands: ["eis", "eisenhower", "em", "matrix"],
  title: "Eisenhower Matrix",
  description: "Sort tasks into the important/urgent 2×2 matrix.",
  purpose:
    "Prioritise tasks by importance and urgency to decide what to do next — " +
    "do now, schedule, delegate, or drop.",

  // Group by quadrant in plain language; omit empty buckets. Title gives context
  // for the agent without seeing the widget.
  format: (data) => {
    const pick = (important: 0 | 1, urgent: 0 | 1) =>
      data.entries
        .filter((e) => e.important === important && e.urgent === urgent)
        .map((e) => e.text.trim())
        .filter(Boolean);

    const groups: Array<[string, string[]]> = [
      ["Do now (important and urgent)", pick(1, 1)],
      ["Schedule (important, not urgent)", pick(1, 0)],
      ["Delegate (urgent, not important)", pick(0, 1)],
      ["Drop or defer (neither)", pick(0, 0)],
    ];

    const lines: string[] = [
      `**Eisenhower — ${data.title.trim() || "Matrix"}**`,
      "",
      "Tasks the user placed in each priority bucket:",
    ];
    for (const [label, items] of groups) {
      if (items.length) lines.push(`${label}: ${items.join(", ")}`);
    }
    return lines.join("\n");
  },
};
