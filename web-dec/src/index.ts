import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { trpcServer } from "@hono/trpc-server";
import { StreamableHTTPTransport } from "@hono/mcp";
import {
  withMcpAuth,
  oAuthDiscoveryMetadata,
  oAuthProtectedResourceMetadata,
} from "better-auth/plugins";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";
import { createMcpServer } from "./mcp/server";
import { createAuth } from "./auth";
import type { Bindings } from "./env";

const app = new Hono<{ Bindings: Bindings }>();

// Structured JSON for any unhandled error (instead of an opaque 500).
app.onError((err, c) => {
  // The MCP transport (@hono/mcp) signals protocol errors as HTTPExceptions that
  // carry their own JSON-RPC Response (correct status + body). Pass those through
  // untouched — otherwise every MCP error collapses to an opaque 500 with an
  // empty message (HTTPException.message is blank).
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
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
    // tRPC catches procedure errors and returns them in the response body, so
    // Hono's app.onError never sees them — log here or they're invisible in
    // `wrangler tail`. Include the full stack so it's actionable.
    onError: ({ error, path, type }) => {
      console.error(
        `[trpc] ${type} ${path ?? "<no-path>"} failed: ${error.message}`,
        error.stack ?? error,
      );
    },
  }),
);

// Better Auth (Phase 5c) — the OAuth/OIDC server for the ChatGPT App Connect
// flow. Mounted at /api/auth/* (sign-in, OAuth authorize/token, DCR /register,
// JWKS). Built per-request from c.env since the Workers runtime has no env at
// module load.
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// OAuth discovery at the ROOT well-known paths (ChatGPT probes these, not the
// /api/auth-prefixed ones). Served from Better Auth's metadata helpers.
app.get("/.well-known/oauth-authorization-server", (c) =>
  oAuthDiscoveryMetadata(createAuth(c.env))(c.req.raw),
);
app.get("/.well-known/openid-configuration", (c) =>
  oAuthDiscoveryMetadata(createAuth(c.env))(c.req.raw),
);
// Protected-resource metadata (RFC 9728) — both the root and the /mcp-suffixed
// path clients may probe for the resource at /mcp.
app.get("/.well-known/oauth-protected-resource", (c) =>
  oAuthProtectedResourceMetadata(createAuth(c.env))(c.req.raw),
);
app.get("/.well-known/oauth-protected-resource/mcp", (c) =>
  oAuthProtectedResourceMetadata(createAuth(c.env))(c.req.raw),
);
// Any other .well-known probe: 404 (don't fall through to the SPA HTML).
app.get("/.well-known/*", (c) => c.notFound());

// MCP server for the DEC ChatGPT App (Apps SDK), Streamable HTTP at /mcp.
// Protected by withMcpAuth: unauthenticated requests get a 401 + WWW-Authenticate
// challenge (pointing at the protected-resource metadata) so ChatGPT shows
// Connect; authenticated requests run the stateless MCP server. Stateless: a
// fresh server + transport per request.
app.all("/mcp", (c) => {
  const auth = createAuth(c.env);
  return withMcpAuth(auth, async (_req, _session) => {
    // _session has the access-token record (userId + scopes). Per-user scoping
    // of tool data lands in 5d; for now the tools return shared sample data.
    const server = createMcpServer();
    const transport = new StreamableHTTPTransport();
    await server.connect(transport);
    return (await transport.handleRequest(c)) ?? c.body(null, 500);
  })(c.req.raw);
});

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
