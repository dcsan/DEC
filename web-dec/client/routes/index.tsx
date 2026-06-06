import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const boards = trpc.board.list.useQuery();
  const create = trpc.board.create.useMutation({
    onSuccess: (board) => navigate({ to: "/b/$boardId", params: { boardId: board.id } }),
  });

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
        Chat through a decision on the left; map options, frameworks and ideas on
        an infinite canvas on the right.
      </p>

      <button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate({})}
        style={{
          marginTop: 24,
          padding: "12px 20px",
          fontSize: 15,
          fontWeight: 600,
          color: "#0f1115",
          background: "var(--dec-accent)",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        {create.isPending ? "Creating…" : "+ New decision"}
      </button>

      <h2
        style={{
          marginTop: 48,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--dec-text-subtle)",
        }}
      >
        Recent
      </h2>

      {boards.isLoading && (
        <p style={{ color: "var(--dec-text-subtle)" }}>Loading…</p>
      )}
      {boards.data?.length === 0 && (
        <p style={{ color: "var(--dec-text-subtle)" }}>
          No decisions yet — start one above.
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {boards.data?.map((b) => (
          <li key={b.id}>
            <Link
              to="/b/$boardId"
              params={{ boardId: b.id }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--dec-border-soft)",
                marginBottom: 8,
                color: "var(--dec-text)",
                textDecoration: "none",
                background: "var(--dec-surface)",
              }}
            >
              <span>{b.title}</span>
              <span style={{ color: "var(--dec-text-subtle)", fontSize: 13 }}>
                {b.decisionType !== "unknown" ? b.decisionType.replace(/_/g, " ") : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
