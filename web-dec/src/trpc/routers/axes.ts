import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";

// LLM endpoint for the 2×2 axes/scatter widget. Given a decision and the options
// being compared (e.g. "should I buy a car or a motorbike", ["car", "motorbike"]),
// it derives the TWO axes most useful for comparing them — each with a label and
// its two poles (the meaning at 0 and at 100). The user then drags each option
// onto the plane and the position becomes a 0-100 score per axis. The widget
// calls this from its "suggest axes" button (and once on mount when routed in).

const AxisSchema = z.object({
  label: z
    .string()
    .describe("the axis name — a single dimension to compare on, 1-3 words, e.g. 'Cost', 'Safety'"),
  low: z
    .string()
    .describe("what the LOW end (score 0) of this axis means, 1-2 words, e.g. 'Cheap', 'Risky'"),
  high: z
    .string()
    .describe("what the HIGH end (score 100) of this axis means, 1-2 words, e.g. 'Expensive', 'Safe'"),
});

const AxesSchema = z.object({
  xAxis: AxisSchema.describe("the horizontal axis"),
  yAxis: AxisSchema.describe("the vertical axis — must be a DIFFERENT dimension from xAxis"),
});

export interface AxesSuggestion {
  xAxis: { label: string; low: string; high: string };
  yAxis: { label: string; low: string; high: string };
}

// A list of candidate dimensions the user can pick from to re-plot the grid.
const AxesOptionsSchema = z.object({
  options: z
    .array(AxisSchema)
    .describe("five distinct, decision-relevant dimensions to compare the options on"),
});

// One option scored on the two active axes (0-100 each).
const ScoredItemSchema = z.object({
  name: z.string().describe("the option's name, copied EXACTLY as given"),
  x: z.number().min(0).max(100).describe("score on the X axis, 0-100"),
  y: z.number().min(0).max(100).describe("score on the Y axis, 0-100"),
});

// Re-score result: the (poles-filled) axes plus a score per option.
const ScoreSchema = z.object({
  xAxis: AxisSchema.describe("the X axis, with poles filled in if they were blank"),
  yAxis: AxisSchema.describe("the Y axis, with poles filled in if they were blank"),
  scores: z.array(ScoredItemSchema).describe("one entry per option, scored on both axes"),
});

// Explain result: a markdown write-up of a single option and how it ranks.
const ExplainSchema = z.object({
  explanation: z
    .string()
    .describe(
      "a concise markdown explanation: what the option is, how it ranks on each " +
        "axis and why it sits where it does, and how it compares to the others",
    ),
});

// Generate result: the shared category plus new, similar options already scored.
const GenerateSchema = z.object({
  category: z.string().describe("what the given options have in common, 1-4 words, e.g. 'fruit', 'transport'"),
  items: z
    .array(ScoredItemSchema)
    .describe("3-5 NEW options (not already listed) in that same category, each scored on the two axes"),
});

// An axis as it arrives from the client — a label is required, but the poles may
// be blank (e.g. a custom axis the user typed), and the LLM fills them in.
const InputAxisSchema = z.object({
  label: z.string().max(80),
  low: z.string().max(80).optional().default(""),
  high: z.string().max(80).optional().default(""),
});

export interface ScoredItem {
  name: string;
  x: number;
  y: number;
}

export const axesRouter = router({
  suggest: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        items: z.array(z.string().max(200)).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<AxesSuggestion> => {
      const apiKey = ctx.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
        });
      }

      const items = (input.items ?? []).map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: AxesSchema,
          schemaName: "axes_suggestion",
          system:
            "You help people compare options visually on a 2×2 plane. Given a " +
            "decision and the options being compared, pick the TWO most decision-" +
            "relevant, INDEPENDENT dimensions to plot them on. Name each axis and " +
            "its two poles concretely. The poles must be opposites and oriented so " +
            "low = 0 and high = 100.",
          prompt:
            `Decision: ${input.question.trim()}\n` +
            (items.length ? `Options to compare: ${items.join(", ")}\n\n` : "\n") +
            `Pick two distinct axes that best separate these options (e.g. for ` +
            `"car or motorbike": x = Cost (low "Cheap" → high "Expensive"), ` +
            `y = Safety (low "Risky" → high "Safe")). Keep labels 1-3 words and ` +
            `poles 1-2 words.`,
          temperature: 0.4,
          title: "axes-suggest",
        });

        return { xAxis: out.xAxis, yAxis: out.yAxis };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[axes.suggest] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate axes. Please try again.",
        });
      }
    }),

  // Offer FIVE candidate dimensions to compare the current options on, so the
  // user can re-plot the grid against axes they find more useful. Backs the
  // "redo axes" settings panel. Each option is a full axis (label + poles).
  options: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        items: z.array(z.string().max(200)).max(20).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ options: AxesSuggestion["xAxis"][] }> => {
      const apiKey = requireKey(ctx.env.OPENROUTER_API_KEY);
      const items = (input.items ?? []).map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: AxesOptionsSchema,
          schemaName: "axes_options",
          system:
            "You help people compare options on a 2×2 plane. Given a decision and " +
            "the options being compared, propose FIVE distinct, decision-relevant, " +
            "INDEPENDENT dimensions they could plot the options against. Each must " +
            "be a single dimension with concrete opposite poles oriented low = 0, " +
            "high = 100.",
          prompt:
            `Decision: ${input.question.trim()}\n` +
            (items.length ? `Options to compare: ${items.join(", ")}\n\n` : "\n") +
            `Give five different ways to compare these options. Keep each label ` +
            `1-3 words and each pole 1-2 words. Make the five genuinely distinct.`,
          temperature: 0.6,
          title: "axes-options",
        });
        return { options: out.options.slice(0, 5) };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[axes.options] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate axis options. Please try again.",
        });
      }
    }),

  // Re-score the current options against two chosen axes (used after the user
  // picks new axes in the "redo axes" panel). Fills in poles for any axis the
  // user typed by hand, and returns a 0-100 position per option.
  score: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        items: z.array(z.string().max(200)).min(1).max(30),
        xAxis: InputAxisSchema,
        yAxis: InputAxisSchema,
      }),
    )
    .mutation(
      async ({ ctx, input }): Promise<{ xAxis: AxesSuggestion["xAxis"]; yAxis: AxesSuggestion["yAxis"]; scores: ScoredItem[] }> => {
        const apiKey = requireKey(ctx.env.OPENROUTER_API_KEY);
        const items = input.items.map((s) => s.trim()).filter(Boolean);

        try {
          const out = await structuredChat({
            apiKey,
            schema: ScoreSchema,
            schemaName: "axes_score",
            system:
              "You place options on a 2×2 plane. Given a decision, the two axes, " +
              "and a list of options, score each option 0-100 on each axis (0 = the " +
              "low pole, 100 = the high pole). If an axis is missing its pole labels, " +
              "fill them in with concrete opposites. Return a score for EVERY option, " +
              "copying each name exactly.",
            prompt:
              `Decision: ${input.question.trim()}\n` +
              `X axis: ${axisLine(input.xAxis)}\n` +
              `Y axis: ${axisLine(input.yAxis)}\n\n` +
              `Options: ${items.join(", ")}\n\n` +
              `Score each option 0-100 on both axes based on how it really compares.`,
            temperature: 0.3,
            title: "axes-score",
          });
          return { xAxis: out.xAxis, yAxis: out.yAxis, scores: out.scores };
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.error("[axes.score] failed", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not score the options. Please try again.",
          });
        }
      },
    ),

  // Suggest MORE options like the ones already on the grid: infer the shared
  // category (e.g. fruit, transport), propose 3-5 new members of it, and score
  // them on the two active axes so the UI can pre-place them. Backs "generate".
  generate: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        items: z.array(z.string().max(200)).min(1).max(30),
        xAxis: InputAxisSchema,
        yAxis: InputAxisSchema,
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ category: string; items: ScoredItem[] }> => {
      const apiKey = requireKey(ctx.env.OPENROUTER_API_KEY);
      const items = input.items.map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: GenerateSchema,
          schemaName: "axes_generate",
          system:
            "You expand a comparison with more options. First infer what the given " +
            "options have in common (their category), then propose 3-5 NEW options " +
            "in that same category that aren't already listed, and score each 0-100 " +
            "on the two axes given. Be concrete and relevant to the decision.",
          prompt:
            `Decision: ${input.question.trim()}\n` +
            `X axis: ${axisLine(input.xAxis)}\n` +
            `Y axis: ${axisLine(input.yAxis)}\n\n` +
            `Existing options: ${items.join(", ")}\n\n` +
            `What do these have in common? Suggest 3-5 more options in that same ` +
            `category (not already listed) and score each on both axes.`,
          temperature: 0.7,
          title: "axes-generate",
        });
        const existing = new Set(items.map((s) => s.toLowerCase()));
        const fresh = out.items.filter((it) => it.name.trim() && !existing.has(it.name.trim().toLowerCase()));
        return { category: out.category, items: fresh };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[axes.generate] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not generate more options. Please try again.",
        });
      }
    }),

  // Explain ONE option in the context of the comparison: what it is, how it ranks
  // on each of the two active axes (and why it sits where its score puts it), and
  // how it stacks up against the other options. Backs the per-item ⓘ button — the
  // widget renders the returned markdown as a chat message below itself. `x`/`y`
  // are the option's 0-100 scores, or null if it's still unplaced in the tray.
  explain: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        name: z.string().min(1).max(200),
        x: z.number().min(0).max(100).nullable().optional(),
        y: z.number().min(0).max(100).nullable().optional(),
        xAxis: InputAxisSchema,
        yAxis: InputAxisSchema,
        others: z.array(z.string().max(200)).max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ explanation: string }> => {
      const apiKey = requireKey(ctx.env.OPENROUTER_API_KEY);
      const others = (input.others ?? []).map((s) => s.trim()).filter(Boolean);

      try {
        const out = await structuredChat({
          apiKey,
          schema: ExplainSchema,
          schemaName: "axes_explain",
          system:
            "You explain how a single option sits within a 2×2 comparison. Given " +
            "the decision, the two axes (with their poles), the option's 0-100 score " +
            "on each axis, and the other options, write a short, concrete explanation " +
            "of what the option is, how it ranks on each axis and WHY it sits where " +
            "its score puts it, and how it compares to the alternatives. Be specific " +
            "and useful to a decision-maker, and stay concise.\n" +
            "FORMATTING: the chat renders only **bold** and `inline code`, line by " +
            "line — no headings, tables, or markdown bullets. Start with the option " +
            "name in **bold** on its own line, then a couple of short lines or " +
            "paragraphs separated by a blank line. If you list points, prefix each " +
            'line with "• " (do NOT use "#", "-", or "*").',
          prompt:
            `Decision: ${input.question.trim()}\n` +
            `Option: ${input.name.trim()}\n` +
            `${scoreLine("X axis", input.xAxis, input.x)}\n` +
            `${scoreLine("Y axis", input.yAxis, input.y)}\n` +
            (others.length ? `Other options on the grid: ${others.join(", ")}\n` : "") +
            `\nExplain "${input.name.trim()}": what it is, how it ranks on each axis ` +
            `and why, and how it compares with the other options.`,
          temperature: 0.4,
          title: "axes-explain",
        });
        return { explanation: out.explanation };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[axes.explain] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load more info on that option. Please try again.",
        });
      }
    }),
});

// Shared no-key guard — mirrors `suggest`'s behaviour for the sibling endpoints.
function requireKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Suggestions need an LLM. Set OPENROUTER_API_KEY in .dev.vars to enable this.",
    });
  }
  return apiKey;
}

// Render an axis for a prompt, tolerating blank poles (custom axes).
function axisLine(axis: { label: string; low?: string; high?: string }): string {
  const label = axis.label.trim() || "(unnamed)";
  const lo = (axis.low ?? "").trim();
  const hi = (axis.high ?? "").trim();
  return lo || hi ? `${label} (low = ${lo || "?"} → high = ${hi || "?"})` : `${label} (you choose the poles)`;
}

// Render an option's position on one axis for the explain prompt; the score may
// be null when the option is still in the tray (not yet placed on the plane).
function scoreLine(
  which: string,
  axis: { label: string; low?: string; high?: string },
  score: number | null | undefined,
): string {
  const base = `${which} — ${axisLine(axis)}`;
  return score == null ? `${base}: not yet placed` : `${base}: ${Math.round(score)}/100`;
}
