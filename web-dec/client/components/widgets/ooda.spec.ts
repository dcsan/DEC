// OODA loop + first-principles prompts (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface OodaData {
  title: string;
  observe: string;
  orient: string;
  decide: string;
  act: string;
  firstPrinciples: string;
}

export function blankOodaData(title: string): OodaData {
  return {
    title: title.trim() || "OODA / first principles",
    observe: "",
    orient: "",
    decide: "",
    act: "",
    firstPrinciples: "",
  };
}

export const oodaSpec: WidgetSpec<OodaData> = {
  type: "ooda",
  commands: ["ooda", "loop", "firstprinciples", "first-principles"],
  title: "OODA / first principles",
  description: "Observe–Orient–Decide–Act plus a space to strip the problem to first principles.",

  format: (data) => {
    const sec = (name: string, body: string) => [`### ${name}`, body.trim() || "(empty)", ""];
    const lines: string[] = [`**OODA / first principles — ${data.title}**`, "", ...sec("Observe", data.observe), ...sec("Orient", data.orient), ...sec("Decide", data.decide), ...sec("Act", data.act), ...sec("First principles", data.firstPrinciples)];
    return lines.join("\n").trimEnd();
  },
};
