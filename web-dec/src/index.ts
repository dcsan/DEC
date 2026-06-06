import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";
import type { Bindings } from "./env";

const app = new Hono<{ Bindings: Bindings }>();

// Structured JSON for any unhandled error (instead of an opaque 500).
app.onError((err, c) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[onError] ${c.req.method} ${c.req.path}: ${message}`);
  return c.json({ error: `Unhandled server error: ${message}` }, 500);
});

app.get("/api/health", (c) => c.json({ status: "ok" }));

// tRPC — every procedure is mounted under /trpc/*.
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) =>
      createContext(c as never) as unknown as Record<string, unknown>,
  }),
);

// SPA fallback — let the client router handle every other path.
app.get("*", async (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/";
  return c.env.ASSETS.fetch(new Request(url, c.req.raw));
});

export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
