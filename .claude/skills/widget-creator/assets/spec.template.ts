// Spec file for the <Name> widget — see ./types.ts for the contract.
// Pure & React-free: it defines the widget's data shape, its slash triggers,
// and how its result is formatted when sent back into the chat.
//
// Rename this file to `<name>.spec.ts` and replace every <Name>/<name>/foo.

import type { WidgetSpec } from "./types";

// One unit of the widget's data. Keep it minimal — just what the agent needs.
export interface FooItem {
  text: string;
  // ...the fields your interaction produces, e.g. flags, scores, a category.
}

export interface FooData {
  title: string;
  items: FooItem[];
}

// Optional: a seed factory so the component and any caller agree on the
// initial state. Drop this if the widget starts empty.
export function blankFooData(title: string): FooData {
  return {
    title: title || "Foo",
    items: Array.from({ length: 3 }, () => ({ text: "" })),
  };
}

export const fooSpec: WidgetSpec<FooData> = {
  type: "foo",                                  // stable id (matches registry)
  commands: ["foo", "foobar"],                  // slash triggers, no leading /
  title: "Foo",                                 // human label
  description: "One-line description for menus.",
  purpose:
    "What decision this widget helps with — the one-sentence reason a user " +
    "would reach for it.",
  // A concrete decision this is the obvious tool for, in a user's own words.
  // Shown by `/ex` and used as the prefill for `/ex foo`. Make it route here.
  example: "Should I do X or Y?",

  // Pure template: structured data -> agent-friendly plain text.
  // Group/label by MEANING, omit empty entries, no React, no randomness.
  format: (data) => {
    const filled = data.items.filter((it) => it.text.trim() !== "");
    const lines: string[] = [`**Foo — ${data.title}**`, ""];
    for (const it of filled) {
      lines.push(`- ${it.text.trim()}`);
    }
    return lines.join("\n");
  },
};
