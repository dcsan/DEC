// Server-rendered OAuth consent page for the ChatGPT Connect flow.
//
// Better Auth's authorize step calls this (via mcp → oidcConfig.getConsentHTML)
// when a dynamically-registered client (ChatGPT) needs the user to approve the
// requested scopes. The page POSTs the decision to /api/auth/oauth2/consent
// (JSON { accept, consent_code }) and follows the returned { redirectURI } back
// to the client. Self-contained HTML so it works without the SPA bundle.

interface ConsentArgs {
  scopes: string[];
  clientName?: string | null;
  clientIcon?: string | null;
  clientId?: string | null;
  code: string;
}

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  profile: "Read your basic profile",
  email: "Read your email address",
  offline_access: "Stay connected when you're away",
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export function consentHTML({ scopes, clientName, code }: ConsentArgs): string {
  const app = esc(clientName || "An application");
  const items = scopes
    .map((s) => `<li>${esc(SCOPE_LABELS[s] ?? s)}</li>`)
    .join("");

  return /* html */ `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Authorize ${app} — DEC</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background:#0b0c0e; color:#f3f4f6; }
  .card { width:min(92vw,420px); background:#16181c; border:1px solid #2a2d33;
    border-radius:16px; padding:28px; }
  h1 { font-size:18px; margin:0 0 6px; }
  p.sub { color:#9ca3af; font-size:13.5px; margin:0 0 18px; }
  ul { list-style:none; padding:0; margin:0 0 22px; }
  li { padding:10px 12px; background:#1e2127; border-radius:10px; margin-bottom:8px; font-size:13.5px; }
  .row { display:flex; gap:10px; }
  button { flex:1; padding:11px 14px; border-radius:10px; border:1px solid #2a2d33;
    font-size:14px; font-weight:600; cursor:pointer; }
  .allow { background:#4f46e5; border-color:#4f46e5; color:#fff; }
  .deny { background:transparent; color:#cbd5e1; }
  .err { color:#f87171; font-size:13px; min-height:18px; margin-top:10px; }
  button[disabled]{ opacity:.6; cursor:default; }
</style></head>
<body>
  <div class="card">
    <h1>Authorize ${app}</h1>
    <p class="sub"><strong>${app}</strong> wants to connect to your DEC account and:</p>
    <ul>${items}</ul>
    <div class="row">
      <button class="deny" id="deny">Deny</button>
      <button class="allow" id="allow">Allow</button>
    </div>
    <div class="err" id="err"></div>
  </div>
  <script>
    var CODE = ${JSON.stringify(code)};
    function decide(accept, btn) {
      document.getElementById("allow").disabled = true;
      document.getElementById("deny").disabled = true;
      document.getElementById("err").textContent = "";
      fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ accept: accept, consent_code: CODE })
      }).then(function(r){ return r.json(); }).then(function(d){
        if (d && d.redirectURI) { window.location.href = d.redirectURI; }
        else { throw new Error(d && d.message || "Consent failed"); }
      }).catch(function(e){
        document.getElementById("err").textContent = String(e.message || e);
        document.getElementById("allow").disabled = false;
        document.getElementById("deny").disabled = false;
      });
    }
    document.getElementById("allow").addEventListener("click", function(){ decide(true); });
    document.getElementById("deny").addEventListener("click", function(){ decide(false); });
  </script>
</body></html>`;
}
