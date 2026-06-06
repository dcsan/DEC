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
  purpose: "Surface failure modes before you commit—especially for hard-to-reverse choices.",

  format: (data) => {
    const lines: string[] = [`**Pre-mortem — ${data.title}**`, "", "Working assumption: the decision has already failed at the horizon below. Use this to stress-test the plan."];
    if (data.decision.trim()) lines.push("", `**Decision:** ${data.decision.trim()}`);
    if (data.horizon.trim()) lines.push(`**Horizon:** ${data.horizon.trim()}`);
    if (data.imaginedFailure.trim()) {
      lines.push("", "### Imagined failure", data.imaginedFailure.trim());
    }
    if (data.causes.trim()) {
      lines.push("", "### Causes (working backwards from that failure)", data.causes.trim());
    }
    return lines.join("\n").trimEnd();
  },
};
