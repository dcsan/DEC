import { useState } from "react";
import { trpc } from "../lib/trpc";

// Sidebar concept search: type a topic → get a tree of key concepts → click
// "+" to drop one onto the canvas. See docs/plan/overview.md → "Adding ideas".
export function ConceptSearch({
  boardId,
  onAdded,
}: {
  boardId: string;
  onAdded: () => void;
}) {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");

  const search = trpc.concept.search.useQuery(
    { query: term },
    { enabled: term.length > 0 },
  );
  const createNode = trpc.node.create.useMutation({ onSuccess: onAdded });

  return (
    <div
      style={{
        borderTop: "1px solid var(--vizithink-border-soft)",
        padding: 12,
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(input.trim());
        }}
        style={{ display: "flex", gap: 6 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="🔍 search a concept…"
          style={inputStyle}
        />
      </form>

      {search.isFetching && (
        <p style={{ fontSize: 12, color: "var(--vizithink-text-subtle)", marginTop: 8 }}>
          Researching…
        </p>
      )}

      {search.data && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          <li
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--vizithink-text-muted)",
              marginBottom: 4,
            }}
          >
            {search.data.query}
          </li>
          {search.data.concepts.map((c, i) => (
            <li
              key={i}
              title={c.description}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 6px 5px 12px",
                fontSize: 13,
                borderRadius: 7,
              }}
            >
              <span style={{ color: "var(--vizithink-text)" }}>{c.title}</span>
              <button
                type="button"
                title="Add to canvas"
                onClick={() =>
                  createNode.mutate({
                    boardId,
                    kind: "concept",
                    title: c.title,
                    description: c.description,
                    // scatter so new nodes don't stack exactly
                    x: 80 + (i % 3) * 60,
                    y: 80 + i * 30,
                  })
                }
                style={addBtnStyle}
              >
                +
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  fontSize: 13,
  borderRadius: 8,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-text)",
  outline: "none",
};

const addBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 6,
  border: "1px solid var(--vizithink-border)",
  background: "var(--vizithink-surface-2)",
  color: "var(--vizithink-accent)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
};
