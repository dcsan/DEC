import { getProbePlan } from "../../lib/probePlans";
import { openingQuestion, qualifyingQuestions } from "./helpers";
import type { ChatCommand } from "./types";

// `/review` — a very short local recap (no LLM): the question asked, the
// qualifying questions put to the user, and the updates made to the system for
// this question (/apply's saved probing plan).
const command: ChatCommand = {
  names: ["review"],
  title: "Review",
  description: "your question, my questions, and what changed",
  help: "short recap: your question, my qualifying questions, and what was updated",
  order: 340,
  run: (ctx) => {
    ctx.echo("/review");
    const question = openingQuestion(ctx.items);
    if (!question) {
      ctx.say("Nothing to review yet — ask me a question first.");
      return;
    }
    const asked = qualifyingQuestions(ctx.items);
    const plan = getProbePlan(question);
    ctx.say(
      [
        "## Session review",
        "",
        `**You asked:** ${question}`,
        "",
        "**My qualifying questions:**",
        "",
        ...(asked.length ? asked.map((q) => `- ${q}`) : ["- None — I went straight to a tool."]),
        "",
        "**Updates to the system:**",
        "",
        ...(plan
          ? [
              `- \`/apply\` saved new probing questions for this question (${new Date(plan.appliedAt).toLocaleString()}):`,
              ...plan.questions.map((q) => `  - ${q}`),
              ...(plan.previous.length
                ? [`- They replace: ${plan.previous.map((q) => `"${q}"`).join(", ")}`]
                : []),
            ]
          : ["- None yet — run `/reflect`, then `/apply` to improve my questions for this decision."]),
      ].join("\n"),
      { markdown: true },
    );
  },
};

export default command;
