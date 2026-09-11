import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the SWOT widget. Given a decision/subject (e.g. "launching my
// side project as a business"), it pre-fills all four quadrants with a few
// concise points each — internal Strengths and Weaknesses, external
// Opportunities and Threats — so the user reacts to a populated grid instead of
// a blank one. The widget calls this once on mount when routed in with a
// question. No key → PRECONDITION_FAILED (the widget then stays blank).

const SwotSchema = z.object({
  strengths: z
    .array(z.string().describe("an internal strength, concise (3-9 words)"))
    .describe("2-4 internal strengths — advantages you already have"),
  weaknesses: z
    .array(z.string().describe("an internal weakness, concise (3-9 words)"))
    .describe("2-4 internal weaknesses — internal limits or gaps"),
  opportunities: z
    .array(z.string().describe("an external opportunity, concise (3-9 words)"))
    .describe("2-4 external opportunities — favourable outside factors"),
  threats: z
    .array(z.string().describe("an external threat, concise (3-9 words)"))
    .describe("2-4 external threats — outside risks or headwinds"),
});

export interface SwotSuggestion {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// Explain result: a short markdown write-up of why one item sits in its quadrant.
const SwotExplainSchema = z.object({
  explanation: z
    .string()
    .describe(
      "a concise markdown explanation of why this item belongs in its SWOT " +
        "quadrant for this subject, and what it implies for the decision",
    ),
});

export const swotRouter = router({
  suggest: publicProcedure
    .input(z.object({ question: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }): Promise<SwotSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      try {
        const out = await structuredChat({
          apiKey,
          schema: SwotSchema,
          schemaName: "swot_suggestion",
          system:
            "You draft a SWOT analysis for a decision or venture. Strengths and " +
            "Weaknesses are INTERNAL (under the person's control); Opportunities " +
            "and Threats are EXTERNAL (the market, environment, competitors). Give " +
            "a few concrete, concise points per quadrant — a realistic starting " +
            "draft the user can edit, not an exhaustive list.",
          prompt:
            `Subject of the SWOT: ${input.question.trim()}\n\n` +
            `Fill all four quadrants with 2-4 concrete points each. Keep internal ` +
            `vs external straight: Strengths/Weaknesses are internal; ` +
            `Opportunities/Threats are external. Keep each point to 3-9 words.`,
          temperature: 0.6,
          title: "swot-suggest",
        });

        const clean = (xs: string[]) => xs.map((s) => s.trim()).filter(Boolean);
        return {
          strengths: clean(out.strengths),
          weaknesses: clean(out.weaknesses),
          opportunities: clean(out.opportunities),
          threats: clean(out.threats),
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[swot.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not draft the SWOT. Please try again.",
        });
      }
    }),

  // Explain ONE item: why it belongs in its quadrant (Strength / Weakness /
  // Opportunity / Threat) for this subject, and what it means for the decision.
  // Backs the per-bubble ⓘ button — the widget posts the markdown into the chat.
  explain: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        item: z.string().min(1).max(400),
        quadrant: z.enum(["Strengths", "Weaknesses", "Opportunities", "Threats"]),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ explanation: string }> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const internal = input.quadrant === "Strengths" || input.quadrant === "Weaknesses";
      const singular = {
        Strengths: "strength",
        Weaknesses: "weakness",
        Opportunities: "opportunity",
        Threats: "threat",
      }[input.quadrant];
      try {
        const out = await structuredChat({
          apiKey,
          schema: SwotExplainSchema,
          schemaName: "swot_explain",
          system:
            "You explain one entry in a SWOT analysis. Strengths and Weaknesses " +
            "are INTERNAL (under the person's control); Opportunities and Threats " +
            "are EXTERNAL (market, environment, competitors). Given the subject, " +
            "the item, and which quadrant it's in, write a short, concrete " +
            "explanation of WHY it sits in that quadrant and what it implies for " +
            "the decision. Start with the item in **bold**, then 2-4 sentences. " +
            "Be specific and useful; markdown, concise.",
          prompt:
            `Subject of the SWOT: ${input.question.trim()}\n` +
            `Quadrant: ${input.quadrant} (${internal ? "internal" : "external"})\n` +
            `Item: ${input.item.trim()}\n\n` +
            `Explain why "${input.item.trim()}" is a ${singular} ` +
            `for this subject, and what it means for the decision.`,
          temperature: 0.4,
          title: "swot-explain",
        });
        return { explanation: out.explanation };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[swot.explain] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not explain that item. Please try again.",
        });
      }
    }),
});
