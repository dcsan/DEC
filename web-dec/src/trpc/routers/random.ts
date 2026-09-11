import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// `/random` — a random short decision question to kick off a fresh chat, so you
// can watch the whole system work without typing one. The LLM writes it, seeded
// with a randomly picked life area (asked for "something random", models keep
// returning the same few dilemmas). No key / a failed call → a canned question.

const AREAS = [
  "career",
  "money",
  "a big purchase",
  "housing",
  "moving city",
  "relationships",
  "friendship",
  "family",
  "health and fitness",
  "education",
  "a side project",
  "starting a business",
  "travel",
  "time and priorities",
  "a hobby",
  "pets",
  "technology choices",
  "hiring",
];

const FALLBACK_QUESTIONS = [
  "Should I take the job offer in Tokyo or stay in Berlin?",
  "Should I buy a car or keep using public transport?",
  "Should I go back to school for a master's degree?",
  "Rent or buy a flat this year?",
  "Should I quit my job to work on my startup full-time?",
  "Should we get a dog now or wait a year?",
  "Should I learn Rust or Go next?",
  "Should I move closer to my parents?",
  "Freelance or join an agency?",
  "Should I spend my savings on a sabbatical?",
];

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

const RandomQuestionSchema = z.object({
  question: z
    .string()
    .describe(
      "one short, specific, first-person decision question, under 15 words, ending with a question mark",
    ),
});

export const randomRouter = router({
  question: publicProcedure.mutation(async ({ ctx }): Promise<{ question: string }> => {
    const apiKey = ctx.env.OPENROUTER_API_KEY;
    if (apiKey) {
      const area = pick(AREAS);
      try {
        const out = await structuredChat({
          apiKey,
          schema: RandomQuestionSchema,
          schemaName: "random_question",
          system:
            "You write realistic dilemmas that people bring to a decision-making " +
            "assistant: concrete, everyday, with a real trade-off.",
          prompt:
            `Write one decision question someone might be weighing about ${area}. ` +
            `First person, specific, under 15 words — e.g. "Should I …?" or "X or Y?". ` +
            `Only the question.`,
          temperature: 1,
          title: "random-question",
        });
        const question = out.question.trim();
        if (question) return { question };
      } catch (err) {
        console.error("[random.question] failed, using fallback", err);
      }
    }
    return { question: pick(FALLBACK_QUESTIONS) };
  }),
});
