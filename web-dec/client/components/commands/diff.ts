import type { ChatCommand } from "./types";

// `/diff` — compare ViziThink's conclusions about the user with the user's own
// self-conclusions, grouped into shared / ViziThink-only / self-only.
const command: ChatCommand = {
  names: ["diff", "perspective", "perspectives"],
  title: "Perspective diff",
  description: "my view of you vs. your self-view",
  order: 410,
  run: async (ctx) => {
    ctx.echo("/diff");
    const res = await ctx.busy(
      "Comparing",
      () => ctx.api.facts.diff.mutate({ sessionId: ctx.sessionId }),
      "Could not compare perspectives. Please try again.",
    );
    if (!res) return;
    const sections: string[] = [];
    if (res.both.length)
      sections.push("**Both ViziThink and you**", ...res.both.map((f) => `• ${f}`), "");
    if (res.onlyDec.length)
      sections.push("**Only ViziThink infers about you**", ...res.onlyDec.map((f) => `• ${f}`), "");
    if (res.onlySelf.length)
      sections.push("**Only your self-view**", ...res.onlySelf.map((f) => `• ${f}`), "");
    const body = sections.length
      ? ["**Perspective diff (this session)**", "", ...sections].join("\n").trimEnd()
      : "No conclusions on either side yet — chat a bit and I'll start to form a view of you.";
    ctx.say(body, { markdown: true });
  },
};

export default command;
