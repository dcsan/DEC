import { uid } from "./helpers";
import type { ChatCommand } from "./types";

// `/research [decision]` — web-augmented deep research on the decision
// (explicit args win, else the current decision) using the full chat history;
// appends the sourced advice.
const command: ChatCommand = {
  names: ["research", "res", "deep"],
  title: "Research",
  description: "web-sourced deeper advice",
  help: "web-sourced deeper advice on your current decision",
  order: 200,
  run: async (ctx, { args }) => {
    const question = args.trim() || ctx.lastDecision();
    if (!question) {
      ctx.say("Tell me what to research — describe a decision first, or run `/research <your decision>`.");
      return;
    }
    ctx.echo(`/research ${question}`);
    const res = await ctx.busy(
      "Researching",
      () =>
        ctx.api.research.run.mutate({ question, history: ctx.toHistory(), sessionId: ctx.sessionId }),
      "Research failed. Please try again.",
    );
    if (res) ctx.append({ kind: "research", id: uid(), advice: res.advice, sources: res.sources });
  },
};

export default command;
