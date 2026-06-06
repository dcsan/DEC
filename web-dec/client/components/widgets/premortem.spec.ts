// Pre-mortem — imagine failure and work backwards (docs/plan/overview.md).

import type { WidgetSpec } from "./types";

export interface PremortemData {
  title: string;
  decision: string;
  /** e.g. "12 months from now" */
  horizon: string;
  imaginedFailure: string;
  /** Causes / chain working backwards from the failure */
  causes: string;
}

export function blankPremortemData(title: string): PremortemData {
  return {
    title: title.trim() || "Pre-mortem",
    decision: "",
    horizon: "",
    imaginedFailure: "",
    causes: "",
  };
}

export const premortemSpec: WidgetSpec<PremortemData> = {
  type: "premortem",
  commands: ["premortem", "premort", "failureprep"],
  title: "Pre-mortem",
  description: "Assume the decision failed; describe how and trace causes backwards.",

  format: (data) => {
    const lines: string[] = [`**Pre-mortem — ${data.title}**`, ""];
    lines.push(`**Decision:** ${data.decision.trim() || "(not stated)"}`);
    lines.push(`**Horizon:** ${data.horizon.trim() || "(not stated)"}`);
    lines.push("");
    lines.push("### Imagined failure");
    lines.push(data.imaginedFailure.trim() || "(empty)");
    lines.push("");
    lines.push("### Causes (working backwards)");
    lines.push(data.causes.trim() || "(empty)");
    return lines.join("\n");
  },
};
