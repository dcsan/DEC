import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODEL = "gemini-2.5-pro";

export interface TranscribeInput {
  apiKey: string;
  audio: ArrayBuffer;
  mimeType: string;
  model?: string;
}

export async function transcribeAudio(opts: TranscribeInput): Promise<string> {
  if (!opts.apiKey) throw new Error("transcribeAudio: missing apiKey");

  const ai = new GoogleGenAI({ apiKey: opts.apiKey });

  const base64 = arrayBufferToBase64(opts.audio);

  const response = await ai.models.generateContent({
    model: opts.model ?? DEFAULT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: opts.mimeType,
              data: base64,
            },
          },
          { text: "Transcribe this audio exactly. Output only the transcription text, no commentary." },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned no text for audio transcription");
  }
  return text.trim();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
