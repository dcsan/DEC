import type { ChatCommand } from "./types";

// `/facts` — ask Honcho what it has concluded about the user in this session
// and list each fact.
const command: ChatCommand = {
  names: ["facts", "fact", "memory", "remember"],
  title: "Facts",
  description: "what I've learned about you",
  help: "what I've learned about you this session",
  order: 400,
  run: async (ctx) => {
    ctx.echo("/facts");
    const res = await ctx.busy(
      "Recalling",
      () => ctx.api.facts.list.mutate({ sessionId: ctx.sessionId }),
      "Could not fetch facts. Please try again.",
    );
    if (!res) return;
    const body = res.facts.length
      ? ["**What I know so far (this session)**", "", ...res.facts.map((f) => `• ${f}`)].join("\n")
      : "I haven't learned any facts about you yet — chat a bit and I'll start to.";
    ctx.say(body, { markdown: true });
  },
};

export default command;
