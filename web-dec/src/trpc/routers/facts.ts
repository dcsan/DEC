import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { makeHoncho, USER_PEER, ASSISTANT_PEER } from "../../services/honcho";
import type { ConclusionScope } from "@honcho-ai/sdk";

// `/facts` + `/diff` endpoints for the chat view. Both read what Honcho has
// concluded about the user via the conclusions API (POST /conclusions/list).
//
// Conclusions are stored per (observer → observed) pair, so there are two views
// of "facts about the user":
//   • dec.conclusionsOf(user) — what the assistant (ViziThink) inferred about the user
//     while talking to them. This is where derived facts usually land.
//   • user.conclusions         — the user peer's self-conclusions.
// `/facts` merges them; `/diff` keeps them apart so you can see where ViziThink's model
// of the user and the user's self-model agree or diverge. Note Honcho derives
// conclusions in a background queue, so facts appear a little after the messages
// that produced them, not instantly.

const MAX_FACTS = 100;

function requireKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This needs Honcho. Set HONCHO_API_KEY in .dev.vars to enable it.",
    });
  }
  return apiKey;
}

// Pull every conclusion in a scope (scoped to this session), de-duped by content
// and capped. Per-scope failures are swallowed so one missing scope (e.g. no
// self-conclusions) never blanks the result.
async function collectConclusions(
  scope: ConclusionScope,
  sessionId: string,
  max = MAX_FACTS,
): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  try {
    const page = await scope.list({ session: sessionId });
    for await (const c of page) {
      const text = c.content?.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push(text);
      if (out.length >= max) break;
    }
  } catch (err) {
    console.error("[facts] collect scope failed", err);
  }
  return out;
}

export const factsRouter = router({
  list: publicProcedure
    .input(z.object({ sessionId: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }): Promise<{ facts: string[] }> => {
      const apiKey = requireKey(ctx.env.HONCHO_API_KEY);

      try {
        const honcho = makeHoncho(apiKey);
        const user = await honcho.peer(USER_PEER);
        const dec = await honcho.peer(ASSISTANT_PEER);

        // ViziThink's view first (where derived facts usually land), then the user's
        // self-view, merged + de-duped across both.
        const decFacts = await collectConclusions(dec.conclusionsOf(user), input.sessionId);
        const selfFacts = await collectConclusions(user.conclusions, input.sessionId);

        const facts: string[] = [];
        const seen = new Set<string>();
        for (const f of [...decFacts, ...selfFacts]) {
          if (seen.has(f)) continue;
          seen.add(f);
          facts.push(f);
          if (facts.length >= MAX_FACTS) break;
        }

        return { facts };
      } catch (err) {
        console.error("[facts.list] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not fetch facts. Please try again.",
        });
      }
    }),

  // `/diff` — compare the two perspectives on the user: what ViziThink concluded about
  // them vs. their own self-conclusions. Returns the overlap and each side's
  // exclusive facts (exact-content set difference).
  diff: publicProcedure
    .input(z.object({ sessionId: z.string().min(1).max(200) }))
    .mutation(
      async ({
        ctx,
        input,
      }): Promise<{ both: string[]; onlyDec: string[]; onlySelf: string[] }> => {
        const apiKey = requireKey(ctx.env.HONCHO_API_KEY);

        try {
          const honcho = makeHoncho(apiKey);
          const user = await honcho.peer(USER_PEER);
          const dec = await honcho.peer(ASSISTANT_PEER);

          const decFacts = await collectConclusions(dec.conclusionsOf(user), input.sessionId);
          const selfFacts = await collectConclusions(user.conclusions, input.sessionId);

          const decSet = new Set(decFacts);
          const selfSet = new Set(selfFacts);

          return {
            both: decFacts.filter((f) => selfSet.has(f)),
            onlyDec: decFacts.filter((f) => !selfSet.has(f)),
            onlySelf: selfFacts.filter((f) => !decSet.has(f)),
          };
        } catch (err) {
          console.error("[facts.diff] failed", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not compare perspectives. Please try again.",
          });
        }
      },
    ),
});
