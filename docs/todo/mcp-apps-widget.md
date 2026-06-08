> **Implemented (2026-06-07).** `plot_decision` MCP tool + a **real React**
> decision-grid widget, rendered in ChatGPT via MCP Apps. When the user weighs
> options, the tool derives two axes, places each option (0–100), and ChatGPT
> renders an interactive 2×2 the user can drag and send back to chat.
>
> Files:
> - `web-dec/src/mcp/widgets/DecisionGridApp.tsx` — React component; reads
>   ChatGPT's `window.openai.toolOutput`, drag-to-place, "send to chat" via
>   `window.openai.sendFollowUpMessage`.
> - `web-dec/src/mcp/widgets/decisionGrid.shared.ts` — pure data shape +
>   `formatDecisionGrid()` text (single source of truth, mirrors the chat-view 2×2).
> - `web-dec/scripts/build-widgets.mjs` — esbuild bundles the .tsx **with React
>   inlined** into one self-contained HTML string → `decisionGrid.generated.ts`
>   (no runtime FS, no CDN → empty CSP). Run via `pnpm run build:widgets`
>   (wired into `build` / `deploy` / `dev:server`).
> - `web-dec/src/mcp/server.ts` — registers the `plot_decision` tool +
>   `ui://dec/decision-grid-v1.html` resource (alongside the existing
>   `list_decision_frameworks`).
> - `web-dec/src/index.ts` — `onError` now passes `HTTPException` through, so MCP
>   protocol errors return their real status instead of an opaque `500 {"error":""}`.
>
> Verified locally (`wrangler dev`): `tools/list` shows `plot_decision` with
> `_meta.ui.resourceUri`; `tools/call` returns structuredContent + narration;
> `resources/read` returns the 200KB React widget (`text/html;profile=mcp-app`).
> `pnpm run typecheck` + `pnpm run build` pass. To bundle: `pnpm run build:widgets`.

---

implement the MCP apps framework

so that when the user asks a question we respond with a visual widget.

a react component provided to the chatGPT front end via MCP APPS

review the
https://modelcontextprotocol.io/extensions/apps/build

and use the installed plugin for ext-apps
https://github.com/modelcontextprotocol/ext-apps

and the chatGPT SDK

create a basic framework example so we can show a widget in response to a user's decision question

