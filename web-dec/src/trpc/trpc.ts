import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { withLlmTrace } from "../services/llm/trace";
import { LLM_TRACE_KEY, type LlmCallTrace } from "../services/llm/traceTypes";

// superjson keeps Date/Map/Set intact over the wire, so server `Date` columns
// stay `Date` on the client (must match the client link transformer).
const t = initTRPC.context<Context>().create({ transformer: superjson });

// LLM call tracing for the /chat 🧠 prompts sidebar. When the request opted in
// (ctx.traceLlm, via the x-llm-trace header), collect every `structuredChat`
// call the procedure makes and ship them back alongside its output as
// `{ __llmTrace: calls, data }`. The client's llmTraceLink unwraps that before
// any hook sees it, so procedure output types are unaffected.
const llmTrace = t.middleware(async ({ ctx, type, next }) => {
  if (!ctx.traceLlm || type === "subscription") return next();
  const calls: LlmCallTrace[] = [];
  const result = await withLlmTrace(calls, () => next());
  if (!result.ok || calls.length === 0) return result;
  return { ...result, data: { [LLM_TRACE_KEY]: calls, data: result.data } };
});

export const router = t.router;
export const publicProcedure = t.procedure.use(llmTrace);
