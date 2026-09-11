import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the Factor Weighting widget. Given a yes/no / either-or
// decision (e.g. "should I join a startup?"), it returns the factors that bear
// on it — each as a SPECTRUM with a neutral label and two OPPOSITE pole labels
// (left/right). The user then marks where they sit on each, so the model only
// names the dimensions and their opposing ends, it does not position them. The
// widget calls this on mount, and again (passing `existing`) for "generate more".

const FactorSchema = z.object({
  label: z
    .string()
    .describe(
      "the factor as a neutral dimension/axis name in 2-5 words, e.g. 'Organizational structure', 'Income stability', 'Day-to-day autonomy' — NOT phrased as a pro/con",
    ),
  left: z
    .string()
    .describe("the left pole: one extreme of this factor in 1-3 words, e.g. 'Bureaucratic'"),
  right: z
    .string()
    .describe(
      "the right pole: the OPPOSITE extreme on the same scale in 1-3 words, e.g. 'Freeform' (must be a true opposite of `left`)",
    ),
});

const SuggestSchema = z.object({
  factors: z
    .array(FactorSchema)
    .describe(
      "four to six factors that genuinely pull on this decision, each a spectrum between two opposing values",
    ),
});

export interface FactorScale {
  label: string;
  left: string;
  right: string;
}

export interface FactorsSuggestion {
  factors: FactorScale[];
}

export const factorsRouter = router({
  suggest: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        // Labels already on screen — pass for "generate more" so the model
        // returns NEW dimensions instead of repeating ones the user has.
        existing: z.array(z.string().max(120)).max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<FactorsSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const existing = (input.existing ?? []).map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: SuggestSchema,
          schemaName: "factors_suggestion",
          system:
            "You help people make a single yes/no or either-or decision by " +
            "surfacing the factors that bear on it. Express EACH factor as a " +
            "spectrum: a neutral dimension label plus two OPPOSITE poles (left and " +
            "right) that are genuine opposite values on the same scale (e.g. label " +
            "'Organizational structure', left 'Bureaucratic', right 'Freeform'). " +
            "Do not phrase factors as pros or cons, and do not say where the user " +
            "should land — they position themselves.",
          prompt:
            `Decision: ${input.question.trim()}\n\n` +
            (existing.length
              ? `Factors already listed (return DIFFERENT ones):\n${existing
                  .map((e) => `- ${e}`)
                  .join("\n")}\n\n`
              : "") +
            `Return ${existing.length ? "three to four more" : "four to six"} factors ` +
            `that genuinely pull on this decision. For each, give a neutral 2-5 word ` +
            `label and two opposite poles (1-3 words each) on the same scale. ` +
            `Example: { label: "Organizational structure", left: "Bureaucratic", ` +
            `right: "Freeform" }.`,
          temperature: 0.5,
          title: "factors-suggest",
        });

        const seen = new Set(existing.map((e) => e.toLowerCase()));
        const factors: FactorScale[] = [];
        for (const f of out.factors) {
          const label = f.label.trim();
          if (!label || seen.has(label.toLowerCase())) continue;
          seen.add(label.toLowerCase());
          factors.push({ label, left: f.left.trim(), right: f.right.trim() });
        }
        return { factors };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[factors.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate factors. Please try again.",
        });
      }
    }),
});
