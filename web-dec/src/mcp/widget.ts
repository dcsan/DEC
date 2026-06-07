// Self-contained HTML for the DEC "decision frameworks" Apps SDK widget.
//
// Inlined as a string (not read from disk) so it works on the Cloudflare
// Workers runtime, which has no filesystem. The widget renders inside ChatGPT's
// sandboxed iframe and reads its data from `window.openai.toolOutput` — the
// `structuredContent` returned by the `list_decision_frameworks` tool. It makes
// no network calls, so the resource's CSP allowlists stay empty (see server.ts).
//
// Apps SDK host contract used here:
//   - `window.openai.toolOutput`   → the tool's structuredContent
//   - `openai:set_globals` event   → fired when the host updates those globals
// Both are read defensively so the widget degrades to a friendly empty state.

export const WIDGET_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --fg: #1a1a1a;
    --muted: #6b7280;
    --card: #ffffff;
    --border: #e5e7eb;
    --accent: #4f46e5;
    --bg: transparent;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --fg: #f3f4f6;
      --muted: #9ca3af;
      --card: #1f2023;
      --border: #34363b;
      --accent: #8b8bf5;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--fg);
    background: var(--bg);
    padding: 12px;
  }
  .head { display: flex; align-items: baseline; gap: 8px; margin: 0 2px 12px; }
  .head h1 { font-size: 15px; font-weight: 650; margin: 0; }
  .head .count { font-size: 12px; color: var(--muted); }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .card {
    border: 1px solid var(--border);
    background: var(--card);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .card .title { font-size: 13.5px; font-weight: 600; margin: 0 0 4px; }
  .card .purpose { font-size: 12.5px; line-height: 1.45; color: var(--muted); margin: 0; }
  .empty { color: var(--muted); font-size: 13px; padding: 16px 4px; }
</style>
</head>
<body>
  <div id="root"><div class="empty">Loading decision frameworks…</div></div>
  <script>
    function readFrameworks() {
      try {
        var out = (window.openai && window.openai.toolOutput) || null;
        return (out && Array.isArray(out.frameworks)) ? out.frameworks : null;
      } catch (e) { return null; }
    }
    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }
    function render() {
      var root = document.getElementById("root");
      var fw = readFrameworks();
      if (!fw) {
        root.innerHTML = '<div class="empty">No frameworks available yet.</div>';
        return;
      }
      var cards = fw.map(function (f) {
        return '<div class="card"><p class="title">' + esc(f.title) +
          '</p><p class="purpose">' + esc(f.purpose) + "</p></div>";
      }).join("");
      root.innerHTML =
        '<div class="head"><h1>DEC decision frameworks</h1>' +
        '<span class="count">' + fw.length + " available</span></div>" +
        '<div class="grid">' + cards + "</div>";
    }
    window.addEventListener("openai:set_globals", render);
    render();
  </script>
</body>
</html>`;
