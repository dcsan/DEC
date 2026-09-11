import { useSyncExternalStore } from "react";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AppRouter } from "../../src/trpc/router";
import {
  LLM_TRACE_KEY,
  isLlmTraceEnvelope,
  type LlmCallTrace,
} from "../../src/services/llm/traceTypes";

// Client side of LLM call tracing. The server wraps a traced procedure's output
// in `{ __llmTrace: [...calls], data }` (src/trpc/trpc.ts); `llmTraceLink`
// unwraps it before any hook sees the result — so procedure types are untouched
// — and files the calls in this store, which the /chat 🧠 sidebar renders.

export interface TraceEntry extends LlmCallTrace {
  id: string;
  /** The tRPC procedure that made the call, e.g. "chat.send". */
  path: string;
}

// Oldest first; capped so a long session can't grow it without bound.
const MAX_ENTRIES = 200;
let entries: TraceEntry[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearLlmTrace() {
  entries = [];
  emit();
}

export function useLlmTrace(): TraceEntry[] {
  return useSyncExternalStore(subscribe, () => entries);
}

// Whether the 🧠 prompts sidebar is open. Lives here because the toggle sits in
// the top navbar (routes/__root.tsx) while the sidebar renders inside ChatView.
// Remembered per-browser.
const OPEN_KEY = "vt-llm-trace-open";
let open = (() => {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
})();

export function setLlmTraceOpen(next: boolean) {
  open = next;
  try {
    localStorage.setItem(OPEN_KEY, next ? "1" : "0");
  } catch {
    // storage blocked — the sidebar just won't remember its state
  }
  emit();
}

export function useLlmTraceOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open);
}

export const llmTraceLink: TRPCLink<AppRouter> = () => ({ op, next }) =>
  observable((observer) => {
    const sub = next(op).subscribe({
      next(value) {
        const result = value.result;
        if ("data" in result && isLlmTraceEnvelope(result.data)) {
          const calls = result.data[LLM_TRACE_KEY];
          entries = [
            ...entries,
            ...calls.map((c) => ({ ...c, id: crypto.randomUUID(), path: op.path })),
          ].slice(-MAX_ENTRIES);
          emit();
          observer.next({
            ...value,
            result: { ...result, data: result.data.data } as typeof result,
          });
          return;
        }
        observer.next(value);
      },
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    });
    return () => sub.unsubscribe();
  });
