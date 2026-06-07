import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { makeHoncho, getSessionContext, USER_PEER } from "../../services/honcho";

// Session-context endpoints for the /context command. A user attaches a
// plain-text document to the current chat; we store it in Honcho as a "batch
// upload" so later turns (the convo router, /research) can retrieve it via
// Honcho's get-context API. Text only for now — no file conversion.

// Cap the document size so a stray paste/upload can't blow up a request.
const MAX_CHARS = 200_000;

function requireKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Context storage needs Honcho. Set HONCHO_API_KEY in .dev.vars to enable /context.",
    });
  }
  return apiKey;
}

export const contextRouter = router({
  // Store a text document as session context. Tries Honcho's file upload (which
  // chunks the doc into messages server-side — the real "batch upload"), and
  // falls back to a single tagged message if the upload path isn't available.
  add: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1).max(200),
        filename: z.string().min(1).max(300),
        text: z.string().min(1).max(MAX_CHARS),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ chars: number; messages: number }> => {
      const apiKey = requireKey(ctx.env.HONCHO_API_KEY);

      try {
        const honcho = makeHoncho(apiKey);
        const session = await honcho.session(input.sessionId);
        const peer = await honcho.peer(USER_PEER);
        const metadata = { kind: "context", filename: input.filename };

        let messages;
        try {
          messages = await session.uploadFile(
            {
              filename: input.filename,
              content: new TextEncoder().encode(input.text),
              content_type: "text/plain",
            },
            peer,
            { metadata },
          );
        } catch (uploadErr) {
          console.error("[context] uploadFile failed, falling back to addMessages", uploadErr);
          messages = await session.addMessages([peer.message(input.text, { metadata })]);
        }

        console.log(
          `[context] stored ${input.filename} (${input.text.length} chars) → ${messages.length} message(s) in session ${input.sessionId}`,
        );
        return { chars: input.text.length, messages: messages.length };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[context.add] failed", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not store the context. Please try again.",
        });
      }
    }),

  // Retrieve the session's context blend (summary + recent messages) as text.
  // Used for verification and by the /research tie-in.
  get: publicProcedure
    .input(
      z.object({
        sessionId: z.string().min(1).max(200),
        tokens: z.number().int().positive().max(8000).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<{ text: string }> => {
      const apiKey = requireKey(ctx.env.HONCHO_API_KEY);
      const text = await getSessionContext(apiKey, input.sessionId, input.tokens);
      return { text };
    }),
});
