import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      <h1 className="dec-display" style={{ fontSize: 34, margin: 0 }}>
        What are you deciding?
      </h1>
      <p style={{ color: "var(--dec-text-muted)", marginTop: 8, fontSize: 15 }}>
        Talk through a decision in chat. Type <code>/pc</code> to drop in a
        pros &amp; cons widget and send the result back into the conversation.
      </p>

      <Link
        to="/chat"
        style={{
          display: "inline-block",
          marginTop: 24,
          padding: "12px 20px",
          fontSize: 15,
          fontWeight: 600,
          color: "#0f1115",
          background: "var(--dec-accent)",
          border: "none",
          borderRadius: 10,
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        Start a decision →
      </Link>
    </div>
  );
}
