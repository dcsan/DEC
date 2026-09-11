// Per-request collection of LLM calls. The tRPC middleware (src/trpc/trpc.ts)
// opens a scope for requests that opted in; `structuredChat` records into
// whatever scope it's running under — so no call site has to thread a tracer
// through. Outside a scope (untraced requests, the eval harness) it's a no-op.
import { AsyncLocalStorage } from "node:async_hooks";
import type { LlmCallTrace } from "./traceTypes";

const scope = new AsyncLocalStorage<LlmCallTrace[]>();

/** Run `fn` with every LLM call it makes appended to `calls`. */
export function withLlmTrace<R>(calls: LlmCallTrace[], fn: () => R): R {
  return scope.run(calls, fn);
}

export function recordLlmCall(call: LlmCallTrace): void {
  scope.getStore()?.push(call);
}
