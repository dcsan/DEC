import { buildTranscript, clip, toAgentStep } from "./helpers";
import type { ChatCommand } from "./types";

// `/reflect` — rate the proposed solution against what the user said, review
// the agent's process (this session's traced LLM calls) and suggest how to
// improve it. The transcript includes widgets and what was sent from them,
// which toHistory() leaves out. The critique is kept for /apply.
const command: ChatCommand = {
  names: ["reflect", "retro", "critique"],
  title: "Reflect",
  description: "critique the answer and my process",
  help: "rate the proposed solution and critique how I got there",
  order: 310,
  run: async (ctx) => {
    const transcript = buildTranscript(ctx.items);
    const steps = ctx.trace.callsSince(ctx.trace.sessionMark).slice(-30).map(toAgentStep);
    ctx.echo("/reflect");
    const res = await ctx.busy(
      "Reflecting",
      () => ctx.api.reflect.run.mutate({ transcript: clip(transcript, 39000), steps }),
      "Could not reflect. Please try again.",
    );
    if (!res) return;
    const content =
      "empty" in res
        ? res.empty
        : [
            `## Reflection — ${res.rating}/10`,
            "",
            `**${res.verdict}**`,
            "",
            "**The solution**",
            "",
            res.solutionReview,
            "",
            "**The process**",
            "",
            res.processReview,
            "",
            "**How to improve it**",
            "",
            ...res.improvements.map((s) => `- ${s}`),
            "",
            "**A better answer, knowing what I know now**",
            "",
            res.betterSolution,
          ].join("\n");
    if (!("empty" in res)) ctx.scratch.lastReflection = content;
    ctx.say(content, { markdown: true });
  },
};

export default command;
