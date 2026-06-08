import { createFileRoute } from "@tanstack/react-router";
import { useState, type CSSProperties, type FormEvent } from "react";
import { authClient } from "../lib/authClient";

// The login page Better Auth redirects to during the OAuth/Connect flow
// (`loginPage: "/sign-in"`). It receives the original authorize query string;
// after the user signs in (or up), we resume the flow by sending them back to
// the authorization endpoint with those same params. Outside the OAuth flow
// (no params) it just signs the user in and sends them home.
export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

// Where Better Auth's MCP authorize endpoint lives. Resuming here (with the
// preserved query) continues the OAuth flow now that a session cookie exists.
const AUTHORIZE_PATH = "/api/auth/mcp/authorize";

function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Did Better Auth send us here mid-OAuth? (client_id present in the query.)
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isOAuth = new URLSearchParams(search).has("client_id");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === "signup"
          ? await authClient.signUp.email({ email, password, name: name || email })
          : await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Authentication failed");
        setBusy(false);
        return;
      }
      // Session cookie is set. Resume the OAuth flow (full nav so the cookie is
      // sent and the server continues to consent → redirect back to ChatGPT),
      // or go home if this wasn't an OAuth login.
      window.location.href = isOAuth ? `${AUTHORIZE_PATH}${search}` : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={onSubmit}>
        <h1 style={styles.h1}>{mode === "signup" ? "Create your DEC account" : "Sign in to DEC"}</h1>
        {isOAuth && (
          <p style={styles.sub}>to connect your account to the app requesting access.</p>
        )}
        {mode === "signup" && (
          <input
            style={styles.input}
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} type="submit" disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          style={styles.toggle}
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
        >
          {mode === "signup" ? "Have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "var(--dec-bg, #0b0c0e)",
  },
  card: {
    width: "min(92vw, 380px)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 28,
    borderRadius: 16,
    background: "var(--dec-surface, #16181c)",
    border: "1px solid var(--dec-border, #2a2d33)",
  },
  h1: { fontSize: 18, fontWeight: 650, margin: "0 0 2px", color: "var(--dec-text, #f3f4f6)" },
  sub: { fontSize: 13, color: "var(--dec-text-muted, #9ca3af)", margin: "0 0 8px" },
  input: {
    padding: "11px 12px",
    borderRadius: 10,
    border: "1px solid var(--dec-border, #2a2d33)",
    background: "var(--dec-bg, #0b0c0e)",
    color: "var(--dec-text, #f3f4f6)",
    fontSize: 14,
  },
  button: {
    marginTop: 4,
    padding: "11px 14px",
    borderRadius: 10,
    border: "none",
    background: "var(--dec-accent, #4f46e5)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  toggle: {
    background: "transparent",
    border: "none",
    color: "var(--dec-text-muted, #9ca3af)",
    fontSize: 13,
    cursor: "pointer",
    padding: 4,
  },
  error: { color: "#f87171", fontSize: 13 },
};
