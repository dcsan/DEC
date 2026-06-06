import { z } from "zod";

// Zod schemas are the single source of truth for every structured LLM call.
// They are (a) converted to JSON Schema and sent to the model as the
// `response_format`, and (b) used to validate + type the response. Never
// hand-write a parallel TS type — derive it with z.infer.
//
// Fields are kept required (use .nullable() rather than .optional()) so the
// schemas stay friendly to strict structured-output mode across providers.

// ---- concept search / expand ---------------------------------------------

export const ConceptSchema = z.object({
  title: z.string().describe("one to three words, addable as a canvas node"),
  description: z.string().describe("one concise sentence"),
});

export const ConceptListSchema = z.object({
  concepts: z.array(ConceptSchema),
});
export type ConceptList = z.infer<typeof ConceptListSchema>;

// ---- drag-to-merge --------------------------------------------------------

export const MergeResultSchema = z.object({
  title: z.string().describe("one to three word title for the combined idea"),
  description: z.string().describe("one short paragraph describing the merge"),
});
export type MergeResult = z.infer<typeof MergeResultSchema>;

// ---- chat coach -----------------------------------------------------------

export const CoachReplySchema = z.object({
  reply: z.string().describe("the coach's message: one sharp follow-up or a framework suggestion"),
  suggestFramework: z
    .string()
    .nullable()
    .describe("a thinking framework to plot on the canvas (e.g. SWOT), or null"),
  suggestReason: z
    .string()
    .nullable()
    .describe("one line on why that framework fits, or null"),
});
export type CoachReply = z.infer<typeof CoachReplySchema>;
