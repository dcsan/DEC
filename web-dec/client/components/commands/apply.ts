import { clearProbePlan, saveProbePlan } from "../../lib/probePlans";
import { buildTranscript, clip, openingQuestion, qualifyingQuestions, toAgentStep } from "./helpers";
import type { ChatCommand } from "./types";

// `/apply` — turn a review of this conversation (plus the last /reflect
// critique, if any) into better probing questions for its opening question,
// save them for that question (client/lib/probePlans.ts; chat.send picks them
// up), and re-run it in a fresh session so the new questions are asked
// straight away. `/apply clear` drops the saved plan.
const command: ChatCommand = {
  names: ["apply", "improve"],
  title: "Apply",
  description: "improve my questions for this decision and re-run",
  help: "rewrite my probing questions for this decision and re-run it (`/apply clear` to undo)",
  order: 330,
  run: async (ctx, { args: rawArgs }) => {
    const args = rawArgs.trim().toLowerCase();
    ctx.echo(args ? `/apply ${args}` : "/apply");
    const question = openingQuestion(ctx.items);
    if (!question) {
      ctx.say("Nothing to apply yet — ask me a question first.");
      return;
    }
    if (["clear", "reset", "off", "undo"].includes(args)) {
      ctx.say(
        clearProbePlan(question)
          ? `Removed the improved questions for "${question}" — I'm back to my default probing.`
          : `There are no saved questions for "${question}".`,
      );
      return;
    }
    const reflection = ctx.scratch.lastReflection;
    const plan = await ctx.busy(
      "Improving my questions",
      () =>
        ctx.api.applyPlan.run.mutate({
          question: clip(question, 1990),
          transcript: clip(buildTranscript(ctx.items), 39000),
          reflection: reflection ? clip(reflection, 7900) : undefined,
          steps: ctx.trace.callsSince(ctx.trace.sessionMark).slice(-30).map(toAgentStep),
        }),
      "Could not apply. Please try again.",
    );
    if (!plan) return;
    saveProbePlan(question, { ...plan, previous: qualifyingQuestions(ctx.items), appliedAt: Date.now() });
    ctx.newSession({
      question,
      notice: [
        "**Applied — new questions for this decision**",
        "",
        ...plan.questions.map((q, i) => `${i + 1}. ${q}`),
        "",
        `_${plan.rationale}_`,
        "",
        "Re-running your question with them now. `/apply clear` undoes this.",
      ].join("\n"),
    });
  },
};

export default command;
