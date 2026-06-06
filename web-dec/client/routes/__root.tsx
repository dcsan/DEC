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
          borderBottom: "1px solid var(--dec-border-soft)",
          background: "var(--dec-surface)",
          flexShrink: 0,
        }}
      >
        <Link
          to="/"
          className="dec-display"
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--dec-text)",
            textDecoration: "none",
          }}
        >
          DEC
        </Link>
        <span style={{ color: "var(--dec-text-subtle)", fontSize: 13 }}>
          decide with AI
        </span>
      </header>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
