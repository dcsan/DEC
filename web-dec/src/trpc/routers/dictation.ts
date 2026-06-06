import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { transcribeAudio } from "../../services/llm/gemini";

export const dictationRouter = router({
  transcribe: publicProcedure
    .input(
      z.object({
        audio: z.string().min(1),
        mimeType: z.string().default("audio/webm"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const apiKey = ctx.env.GOOGLE_GEMINI_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_GEMINI_KEY is not configured");
      }

      const buffer = base64ToArrayBuffer(input.audio);
      const text = await transcribeAudio({
        apiKey,
        audio: buffer,
        mimeType: input.mimeType,
      });

      return { text };
    }),
});

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
