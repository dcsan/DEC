import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeKind } from "../../../src/db/schema";

// Data carried on every canvas node. Callbacks are injected by Canvas.tsx so
// the node can drive expand/remove/details without prop-drilling refs.
export interface ConceptNodeData {
  title: string;
  description?: string | null;
  kind: NodeKind;
  dimmed?: boolean;
  onExpand: (id: string) => void;
  onRemove: (id: string) => void;
  [key: string]: unknown;
}

const KIND_COLOR: Record<NodeKind, string> = {
  option: "var(--dec-option)",
  concept: "var(--dec-concept)",
  framework: "var(--dec-framework)",
  merged: "var(--dec-merged)",
  note: "var(--dec-text-subtle)",
  // procon renders via ProConNode, but keep the map total for type-safety.
  procon: "var(--dec-framework)",
};

function ConceptNodeImpl({ id, data, selected }: NodeProps) {
  const d = data as ConceptNodeData;
  const [showDetails, setShowDetails] = useState(false);
  const accent = KIND_COLOR[d.kind];

  return (
    <div
      style={{
        minWidth: 150,
        maxWidth: 240,
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--dec-surface-2)",
        border: `1.5px solid ${selected ? accent : "var(--dec-border)"}`,
        boxShadow: selected ? `0 0 0 3px ${accent}33` : "0 1px 2px #0006",
        opacity: d.dimmed ? 0.25 : 1,
        transition: "opacity 120ms, border-color 120ms",
        color: "var(--dec-text)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: accent }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: accent,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
          {d.title}
        </span>
      </div>

      {showDetails && d.description && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 12,
            lineHeight: 1.4,
            color: "var(--dec-text-muted)",
          }}
        >
          {d.description}
        </p>
      )}

      {/* Controls — appear when the node is selected. */}
      {selected && (
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <NodeBtn onClick={() => d.onExpand(id)} title="Expand related ideas">
            ＋ expand
          </NodeBtn>
          {d.description && (
            <NodeBtn
              onClick={() => setShowDetails((s) => !s)}
              title="Toggle details"
            >
              {showDetails ? "▴" : "⤢"} details
            </NodeBtn>
          )}
          <NodeBtn onClick={() => d.onRemove(id)} title="Remove node" danger>
            ⨯
          </NodeBtn>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
    </div>
  );
}

function NodeBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      // stop the click from also selecting / dragging the node
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="nodrag"
      style={{
        fontSize: 11,
        padding: "3px 7px",
        borderRadius: 7,
        border: "1px solid var(--dec-border)",
        background: "var(--dec-surface)",
        color: danger ? "#ff8b8b" : "var(--dec-text-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export const ConceptNode = memo(ConceptNodeImpl);
