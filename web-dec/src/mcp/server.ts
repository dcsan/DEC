// MCP server for the DEC ChatGPT App (Apps SDK).
//
// Phase 5a/5b of docs/todo/Auth.md: a minimal, **no-auth** Apps SDK app that
// exposes one read-only tool plus an HTML widget so we can connect it in
// ChatGPT developer mode and confirm the widget renders. Auth (the "Connect"
// flow) is deliberately deferred to Phase 5c — without an OAuth challenge,
// ChatGPT connects with no sign-in.
//
// Built on the core MCP SDK (`McpServer`) wrapped by the Apps SDK server
// helpers (`registerAppTool` / `registerAppResource`), which attach the UI
// metadata that makes a plain MCP server render as an app. The transport
// (Streamable HTTP, Workers-compatible) is wired in src/index.ts via @hono/mcp.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { WIDGET_HTML } from "./widget";

// URI the tool points at (`_meta.ui.resourceUri`) and the resource registers as.
const FRAMEWORKS_WIDGET_URI = "ui://dec/frameworks.html";

// Sample/static data for now — real, per-user data arrives in Phase 5c once the
// token resolves to a DEC userId. Mirrors DEC's own widget catalogue.
const FRAMEWORKS = [
  { id: "twobytwo", title: "2×2 Matrix", purpose: "Plot options on two axes (e.g. impact vs effort) to see trade-offs at a glance." },
  { id: "eisenhower", title: "Eisenhower Matrix", purpose: "Sort tasks by urgent vs important to decide what to do, schedule, delegate, or drop." },
  { id: "swot", title: "SWOT", purpose: "Weigh Strengths, Weaknesses, Opportunities, and Threats for a single option." },
  { id: "costbenefit", title: "Cost / Benefit", purpose: "List and weigh the costs against the benefits of a course of action." },
  { id: "decisionmatrix", title: "Decision Matrix", purpose: "Score multiple options against weighted criteria to find the best overall pick." },
  { id: "premortem", title: "Pre-mortem", purpose: "Imagine the decision failed, then work backwards to surface and de-risk the causes." },
  { id: "regret", title: "Regret Minimization", purpose: "Choose the option you'll least regret looking back years from now." },
  { id: "expectedvalue", title: "Expected Value", purpose: "Weigh outcomes by their probability to compare uncertain options numerically." },
] as const;

const FRAMEWORK_SHAPE = {
  id: z.string(),
  title: z.string(),
  purpose: z.string(),
};

/**
 * Build a fresh MCP server instance. Called per request by the /mcp handler so
 * the app stays stateless (no shared session state across Worker invocations).
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "dec", version: "0.0.1" });

  // The HTML widget the tool renders. Self-contained, no network → empty CSP
  // allowlists (the secure default).
  registerAppResource(
    server,
    "DEC decision frameworks",
    FRAMEWORKS_WIDGET_URI,
    {
      description: "Card list of DEC's decision-making frameworks.",
      _meta: {
        ui: {
          csp: { connectDomains: [], resourceDomains: [] },
          prefersBorder: true,
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: FRAMEWORKS_WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: WIDGET_HTML,
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "list_decision_frameworks",
    {
      title: "List DEC decision frameworks",
      description:
        "List the decision-making frameworks available in DEC (2×2 matrix, " +
        "Eisenhower, SWOT, cost/benefit, decision matrix, pre-mortem, and more) " +
        "with what each is best for. Use when the user asks what DEC can do or " +
        "which framework fits their decision.",
      inputSchema: {},
      outputSchema: { frameworks: z.array(z.object(FRAMEWORK_SHAPE)) },
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: FRAMEWORKS_WIDGET_URI } },
    },
    async () => {
      const frameworks = FRAMEWORKS.map((f) => ({ ...f }));
      return {
        structuredContent: { frameworks },
        content: [
          {
            type: "text",
            text:
              `DEC offers ${frameworks.length} decision frameworks:\n` +
              frameworks.map((f) => `• ${f.title} — ${f.purpose}`).join("\n"),
          },
        ],
      };
    },
  );

  return server;
}
