import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// Standalone chat endpoint for the /chat view. Messages (typed or sent from a
// widget) carry a plain-text rendering plus an optional structured payload so
// the server can act on the data, not just the text. For now it simply logs
// what it received and echoes it back.
export const chatRouter = router({
  send: publicProcedure
    .input(
      z.object({
        // Human-readable text — the spec's formatted output for widgets.
        text: z.string().min(1).max(8000),
        // Structured payload when the message came from a widget.
        widget: z
          .object({
            type: z.string(),
            data: z.unknown(),
          })
          .optional(),
      }),
    )
    .mutation(({ input }) => {
      // Log the received message server-side.
      if (input.widget) {
        console.log(
          `[chat] received ${input.widget.type} widget:`,
          JSON.stringify(input.widget.data),
        );
      }
      console.log("[chat] received text:", input.text);

      return { reply: `you said: ${input.text}` };
    }),
});
