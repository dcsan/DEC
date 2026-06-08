/**
 * Honcho client + session-context helpers (worker-compatible).
 *
 * Honcho (https://honcho.dev) is the conversational-memory store the chat view
 * uses to keep per-session context — uploaded documents (the /context command)
 * and, in future, mirrored chat turns. Retrieval is via Honcho's get-context
 * API (https://honcho.dev/docs/v3/documentation/features/get-context).
 *
 * Conventions follow openrouter.ts:
 *   - No env reads inside the lib — the caller passes `apiKey`.
 *   - The SDK is pure `fetch`/ESM, so this runs in the Cloudflare Worker.
 */
import { Honcho } from "@honcho-ai/sdk";
import { HONCHO_WORKSPACE } from "../config";

/** The single human participant in a chat session. */
export const USER_PEER = "user";
/** The assistant participant — ViziThink's replies are authored by this peer. */
export const ASSISTANT_PEER = "dec";

/** Construct a workspace-scoped Honcho client for the given API key. */
export function makeHoncho(apiKey: string): Honcho {
  return new Honcho({ apiKey, workspaceId: HONCHO_WORKSPACE });
}

/**
 * Mirror chat turns into the Honcho session so it's a complete record (the
 * convo arrives from the client as `history`, but persisting it lets Honcho
 * build session memory/representations over time). Best-effort: swallows errors
 * so a Honcho hiccup never breaks a chat reply.
 */
export async function recordTurns(
  apiKey: string,
  sessionId: string,
  turns: { role: "user" | "assistant"; content: string }[],
): Promise<void> {
  const usable = turns.filter((t) => t.content.trim());
  if (usable.length === 0) return;
  try {
    const honcho = makeHoncho(apiKey);
    const session = await honcho.session(sessionId);
    const user = await honcho.peer(USER_PEER);
    const assistant = await honcho.peer(ASSISTANT_PEER);
    await session.addMessages(
      usable.map((t) =>
        (t.role === "user" ? user : assistant).message(t.content, {
          metadata: { kind: "turn" },
        }),
      ),
    );
  } catch (err) {
    console.error("[honcho] recordTurns failed", err);
  }
}

/**
 * Retrieve only the documents the user attached via /context (messages tagged
 * `metadata.kind === "context"`), joined as text and capped at `maxChars`.
 *
 * This is deliberately NOT the full get-context blend: the live conversation
 * already reaches the LLM as `history`, so prompts only need the attached docs
 * on top of that — folding in the blend would duplicate the transcript. Iterates
 * all pages so a chunked upload is fully captured. Returns "" on any failure.
 */
export async function getAttachedContext(
  apiKey: string,
  sessionId: string,
  maxChars = 8000,
): Promise<string> {
  try {
    const honcho = makeHoncho(apiKey);
    const session = await honcho.session(sessionId);
    const page = await session.messages({ filters: { metadata: { kind: "context" } } });

    const parts: string[] = [];
    let used = 0;
    for await (const m of page) {
      // Guard client-side too, in case the server filter is ignored.
      if ((m.metadata as { kind?: string } | undefined)?.kind !== "context") continue;
      const piece = m.content.trim();
      if (!piece) continue;
      if (used + piece.length > maxChars) {
        parts.push(piece.slice(0, maxChars - used));
        break;
      }
      parts.push(piece);
      used += piece.length;
    }
    return parts.join("\n\n").trim();
  } catch (err) {
    console.error("[honcho] getAttachedContext failed", err);
    return "";
  }
}

/**
 * Fetch the get-context blend (summary + recent messages) for a session as a
 * single plain-text string. Returns "" on any failure or when there's nothing
 * stored yet — callers treat context as best-effort enrichment, never required.
 */
export async function getSessionContext(
  apiKey: string,
  sessionId: string,
  tokens = 2000,
): Promise<string> {
  try {
    const honcho = makeHoncho(apiKey);
    const session = await honcho.session(sessionId);
    const ctx = await session.context({ tokens, summary: true });
    return ctx.toString().trim();
  } catch (err) {
    console.error("[honcho] getSessionContext failed", err);
    return "";
  }
}
