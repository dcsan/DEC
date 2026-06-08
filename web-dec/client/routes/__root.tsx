import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid var(--vizithink-border-soft)",
          background: "var(--vizithink-surface)",
          flexShrink: 0,
        }}
      >
        <Link
          to="/"
          className="vizithink-display"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--vizithink-text)",
            textDecoration: "none",
          }}
        >
          <img src="/logo.svg" alt="" width={26} height={26} style={{ display: "block" }} />
          ViziThink.com
        </Link>
        <span style={{ color: "var(--vizithink-text-subtle)", fontSize: 13 }}>
          Decide with AI
        </span>
        <Link
          to="/chat"
          style={{
            marginLeft: "auto",
            fontSize: 13,
            color: "var(--vizithink-text-muted)",
            textDecoration: "none",
          }}
        >
          Chat
        </Link>
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
