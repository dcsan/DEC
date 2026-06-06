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

  // Template: group entries by quadrant and emit one labelled line each, so an
  // AI agent can read the priorities directly. Empty quadrants are omitted.
  format: (data) => {
    const pick = (important: 0 | 1, urgent: 0 | 1) =>
      data.entries
        .filter((e) => e.important === important && e.urgent === urgent)
        .map((e) => e.text.trim())
        .filter(Boolean);

    const groups: Array<[string, string[]]> = [
      ["Important and urgent tasks", pick(1, 1)],
      ["Important but not urgent tasks", pick(1, 0)],
      ["Urgent but not important tasks", pick(0, 1)],
      ["Neither important nor urgent tasks", pick(0, 0)],
    ];

    const lines = ["Here is a list of tasks"];
    for (const [label, items] of groups) {
      if (items.length) lines.push(`${label}: ${items.join(", ")}`);
    }
    return lines.join("\n");
  },
};
