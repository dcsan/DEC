import { clip, toAgentStep } from "./helpers";
import type { ChatCommand } from "./types";

// `/explain` — what went into the answer to the last question (typed or sent
// from a widget), what came out, and the reasoning in between — built from
// that question's traced chat.send calls.
const command: ChatCommand = {
  names: ["explain", "why"],
  title: "Explain",
  description: "input, output and reasoning of my last answer",
  help: "what went into my last answer, what came out, and why",
  order: 320,
  run: async (ctx) => {
    ctx.echo("/explain");
    const ask = ctx.trace.lastAsk;
    if (!ask) {
      ctx.say("Nothing to explain yet — ask me a question first.");
      return;
    }
    const calls = ctx.trace.callsSince(ask.mark, "chat.send").slice(0, 10);
    const res = await ctx.busy(
      "Explaining",
      () =>
        ctx.api.explain.run.mutate({
          question: clip(ask.question, 3900),
          steps: calls.map(toAgentStep),
        }),
      "Could not explain. Please try again.",
    );
    if (!res) return;
    const content = [
      `## How I answered "${clip(ask.question.split("\n")[0], 80)}"`,
      "",
      calls.length
        ? `**Calls:** ${calls
            .map((c) => `\`${c.title ?? c.path}\` (${c.model}, ${(c.ms / 1000).toFixed(1)}s)`)
            .join(" → ")}`
        : "**Calls:** none — answered by the built-in fallback",
      "",
      "**Input**",
      "",
      res.input,
      "",
      "**Output**",
      "",
      res.output,
      "",
      "**Reasoning**",
      "",
      res.reasoning,
      ...(res.steps.length ? ["", "**Step by step**", "", ...res.steps.map((s) => `- ${s}`)] : []),
      "",
      "_Full prompts and responses are in the 🧠 prompts sidebar._",
    ].join("\n");
    ctx.say(content, { markdown: true });
  },
};

export default command;
