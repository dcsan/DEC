// MCP server for the ViziThink ChatGPT App (Apps SDK).
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
import { DECISION_GRID_HTML } from "./widgets/decisionGrid.generated";
import {
  type DecisionGridData,
  formatDecisionGrid,
} from "./widgets/decisionGrid.shared";

// URI the tool points at (`_meta.ui.resourceUri`) and the resource registers as.
const FRAMEWORKS_WIDGET_URI = "ui://dec/frameworks.html";
// Versioned URI for the React decision-grid widget (bump on breaking changes so
// hosts don't serve a stale cached resource).
const DECISION_GRID_WIDGET_URI = "ui://dec/decision-grid-v1.html";

// zod shape for one axis (a dimension + its two poles).
const AXIS_SHAPE = {
  label: z.string().describe("Name of the dimension, e.g. 'Cost' or 'Impact'."),
  low: z.string().describe("Label for the low end (score 0), e.g. 'Cheap'."),
  high: z.string().describe("Label for the high end (score 100), e.g. 'Expensive'."),
};
const ZERO_TO_100 = z.number().min(0).max(100);

// Sample/static data for now — real, per-user data arrives in Phase 5c once the
// token resolves to a ViziThink userId. Mirrors ViziThink's own widget catalogue.
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
    "ViziThink decision frameworks",
    FRAMEWORKS_WIDGET_URI,
    {
      description: "Card list of ViziThink's decision-making frameworks.",
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
      title: "List ViziThink decision frameworks",
      description:
        "List the decision-making frameworks available in ViziThink (2×2 matrix, " +
        "Eisenhower, SWOT, cost/benefit, decision matrix, pre-mortem, and more) " +
        "with what each is best for. Use when the user asks what ViziThink can do or " +
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
              `ViziThink offers ${frameworks.length} decision frameworks:\n` +
              frameworks.map((f) => `• ${f.title} — ${f.purpose}`).join("\n"),
          },
        ],
      };
    },
  );

  // ---- The decision-grid React widget (the "ask a question → get a widget"
  // framework example). A single self-contained HTML bundle (React inlined), so
  // CSP allowlists stay empty. ----
  registerAppResource(
    server,
    "ViziThink decision grid",
    DECISION_GRID_WIDGET_URI,
    {
      description: "Interactive 2×2 grid for plotting decision options on two axes.",
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
          uri: DECISION_GRID_WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: DECISION_GRID_HTML,
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "plot_decision",
    {
      title: "Plot a decision on a 2×2 grid",
      description:
        "Visualise a decision by plotting its options on a 2×2 grid in an " +
        "interactive widget. Use this whenever the user is weighing two or more " +
        "concrete options/choices and it would help to see them compared on two " +
        "dimensions (e.g. cost vs benefit, impact vs effort, risk vs reward). " +
        "Derive the two axes from the decision, list the options, and place each " +
        "where you judge it sits (x/y are 0-100); the user can then drag them to " +
        "refine and send the result back.",
      inputSchema: {
        question: z
          .string()
          .describe("The decision being made, e.g. 'Should I buy a car or a motorbike?'"),
        title: z.string().optional().describe("Short title for the grid; defaults to the question."),
        xAxis: z.object(AXIS_SHAPE).describe("The horizontal dimension."),
        yAxis: z.object(AXIS_SHAPE).describe("The vertical dimension."),
        items: z
          .array(
            z.object({
              name: z.string().describe("The option's name."),
              x: ZERO_TO_100.nullable().optional().describe("0-100 along xAxis, or null if unsure."),
              y: ZERO_TO_100.nullable().optional().describe("0-100 along yAxis, or null if unsure."),
            }),
          )
          .describe("The options to compare, with your best initial placement."),
      },
      outputSchema: {
        title: z.string(),
        question: z.string(),
        xAxis: z.object(AXIS_SHAPE),
        yAxis: z.object(AXIS_SHAPE),
        items: z.array(
          z.object({ name: z.string(), x: ZERO_TO_100.nullable(), y: ZERO_TO_100.nullable() }),
        ),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: { ui: { resourceUri: DECISION_GRID_WIDGET_URI } },
    },
    async (args) => {
      const data: DecisionGridData = {
        title: (args.title ?? args.question).trim(),
        question: args.question.trim(),
        xAxis: args.xAxis,
        yAxis: args.yAxis,
        items: args.items.map((it) => ({
          name: it.name,
          x: it.x ?? null,
          y: it.y ?? null,
        })),
      };
      return {
        // Spread to a fresh object literal so it satisfies the SDK's index-
        // signature `structuredContent` type (a bare typed interface doesn't).
        structuredContent: { ...data },
        content: [{ type: "text", text: formatDecisionGrid(data) }],
      };
    },
  );

  return server;
}
