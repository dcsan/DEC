import { z } from "zod";

// The agent's internal LLM calls, as the chat view sends them to /reflect and
// /explain — taken from the client's trace store (the 🧠 prompts sidebar), with
// prompt and response clipped to keep the request small.

export const AgentStep = z.object({
  title: z.string().max(100).optional(),
  path: z.string().max(100),
  prompt: z.string().max(4000),
  response: z.string().max(4000).optional(),
});

export type AgentStepInput = z.infer<typeof AgentStep>;

/** Render steps for an LLM prompt, oldest first. */
export function formatAgentSteps(steps: AgentStepInput[]): string {
  return steps
    .map(
      (s, i) =>
        `### Step ${i + 1}: ${s.title ?? s.path} (${s.path})\n` +
        `Prompt:\n${s.prompt}\n\nResponse:\n${s.response ?? "(none)"}`,
    )
    .join("\n\n");
}
