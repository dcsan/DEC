// Router eval harness — exercises the REAL convo router (src/trpc/routers/chat.ts
// → route()) against a fixed question set and reports which widget it chose vs
// the expected one. This is not a unit test of a copy: it imports and calls the
// same `route()` the /chat endpoint uses, with the same WIDGET_REGISTRY.
//
// Run:  just eval-router        (or)  pnpm tsx test/routerEval.ts
//
// Needs OPENROUTER_API_KEY (from .dev.vars or the environment). Without it the
// router falls back to the keyless heuristic — the harness still runs and
// labels the mode so you know which path you measured.
//
// Flags:
//   --concurrency=N   parallel router calls (default 6)
//   --quiet           summary only, no per-case lines

import { readFileSync } from "node:fs";
import { route } from "../src/trpc/routers/chat";
import { WIDGET_REGISTRY } from "../src/services/widgetRegistry";
import { ROUTER_CASES, type RouterCase } from "./routerCases";

// --- key loading: env first, then parse .dev.vars (dotenv-ish) -------------
function loadApiKey(): string | undefined {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const raw = readFileSync(".dev.vars", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*OPENROUTER_API_KEY\s*=\s*(.*)\s*$/);
      if (m) {
        const v = m[1].trim().replace(/^["']|["']$/g, "");
        if (v) return v;
      }
    }
  } catch {
    /* no .dev.vars — fine, run keyless */
  }
  return undefined;
}

// --- tiny arg parsing ------------------------------------------------------
const argv = process.argv.slice(2);
const quiet = argv.includes("--quiet");
const concArg = argv.find((a) => a.startsWith("--concurrency="));
const concurrency = Math.max(1, Number(concArg?.split("=")[1]) || 6);

// --- colors (cheap, no deps) ----------------------------------------------
const useColor = process.stdout.isTTY;
const c = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s: string) => c("32", s);
const red = (s: string) => c("31", s);
const yellow = (s: string) => c("33", s);
const dim = (s: string) => c("2", s);

interface Outcome {
  case: RouterCase;
  got: string | null;
  ok: boolean;
  acceptable: boolean; // matched an `accept` alternate, not the primary
  error?: string;
}

async function runCase(rc: RouterCase, apiKey: string | undefined): Promise<Outcome> {
  try {
    const res = await route(apiKey, [], rc.question, WIDGET_REGISTRY);
    const got = res.widget;
    const primary = got === rc.expect;
    const alt = !primary && !!got && (rc.accept ?? []).includes(got);
    return { case: rc, got, ok: primary || alt, acceptable: alt };
  } catch (err) {
    return {
      case: rc,
      got: null,
      ok: false,
      acceptable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Run with a bounded concurrency pool, preserving input order in results.
async function runPool(
  cases: RouterCase[],
  apiKey: string | undefined,
  limit: number,
): Promise<Outcome[]> {
  const results: Outcome[] = new Array(cases.length);
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const i = next++;
      results[i] = await runCase(cases[i], apiKey);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, cases.length) }, worker));
  return results;
}

async function main() {
  const apiKey = loadApiKey();
  const mode = apiKey ? "LLM (OpenRouter)" : "HEURISTIC (no key)";
  console.log(
    `\nRouter eval — ${ROUTER_CASES.length} cases · mode: ${apiKey ? green(mode) : yellow(mode)} · concurrency ${concurrency}\n`,
  );
  if (!apiKey) {
    console.log(
      yellow(
        "  No OPENROUTER_API_KEY found — measuring the keyless heuristic fallback,\n" +
          "  not the production LLM router. Set it in .dev.vars for a real eval.\n",
      ),
    );
  }

  const results = await runPool(ROUTER_CASES, apiKey, concurrency);

  let pass = 0;
  let altPass = 0;
  for (const r of results) {
    if (r.ok) {
      pass++;
      if (r.acceptable) altPass++;
    }
    if (quiet) continue;

    const mark = r.ok ? green("PASS") : red("FAIL");
    const expectStr =
      r.case.accept?.length ? `${r.case.expect}|${r.case.accept.join("|")}` : r.case.expect;
    const gotStr = r.error ? red(`error: ${r.error.slice(0, 60)}`) : r.got ?? "(chat)";
    const altTag = r.acceptable ? dim(" (alt)") : "";
    console.log(`${mark}  ${r.case.question}`);
    console.log(
      `      ${dim("expect")} ${expectStr}   ${dim("got")} ${r.ok ? green(gotStr) : red(gotStr)}${altTag}`,
    );
  }

  const fails = results.length - pass;
  const pct = ((pass / results.length) * 100).toFixed(0);
  console.log(
    `\n${pass === results.length ? green("✓") : red("✗")} ${pass}/${results.length} passed (${pct}%)` +
      (altPass ? dim(`  · ${altPass} via accepted alternate`) : "") +
      (fails ? red(`  · ${fails} failed`) : "") +
      "\n",
  );

  process.exit(fails > 0 ? 1 : 0);
}

void main();
