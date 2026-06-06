import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react";
import { trpc } from "../lib/trpc";
import { ConceptNode, type ConceptNodeData } from "./nodes/ConceptNode";
import type { Node as DbNode, Edge as DbEdge } from "../../src/db/schema";

const nodeTypes = { concept: ConceptNode };

interface Props {
  boardId: string;
  nodes: DbNode[];
  edges: DbEdge[];
  onChanged: () => void;
}

export function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

function Flow({ boardId, nodes: dbNodes, edges: dbEdges, onChanged }: Props) {
  const utils = trpc.useUtils();
  const { getIntersectingNodes } = useReactFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const expand = trpc.node.expand.useMutation({ onSuccess: onChanged });
  const remove = trpc.node.remove.useMutation({ onSuccess: onChanged });
  const merge = trpc.node.merge.useMutation({ onSuccess: onChanged });
  const move = trpc.node.updatePosition.useMutation();
  const createEdge = trpc.edge.create.useMutation({ onSuccess: onChanged });

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  // Which nodes are within 2 degrees of the selected node — the rest dim out.
  const focusSet = useMemo(() => {
    if (!selectedId) return null;
    const adj = new Map<string, Set<string>>();
    for (const e of dbEdges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set());
      if (!adj.has(e.target)) adj.set(e.target, new Set());
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
    const within = new Set<string>([selectedId]);
    let frontier = [selectedId];
    for (let depth = 0; depth < 2; depth++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const n of adj.get(id) ?? []) {
          if (!within.has(n)) {
            within.add(n);
            next.push(n);
          }
        }
      }
      frontier = next;
    }
    return within;
  }, [selectedId, dbEdges]);

  // Sync server state → react-flow state. Re-runs whenever the board data or
  // the focus set changes.
  useEffect(() => {
    setRfNodes(
      dbNodes.map((n) => ({
        id: n.id,
        type: "concept",
        position: { x: n.x, y: n.y },
        data: {
          title: n.title,
          description: n.description,
          kind: n.kind,
          dimmed: focusSet ? !focusSet.has(n.id) : false,
          onExpand: (id: string) => expand.mutate({ id }),
          onRemove: (id: string) => remove.mutate({ id }),
        } satisfies ConceptNodeData,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbNodes, focusSet]);

  useEffect(() => {
    setRfEdges(
      dbEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label ?? undefined,
        style: { stroke: "var(--dec-border)" },
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbEdges]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      createEdge.mutate({ boardId, source: c.source, target: c.target });
    },
    [boardId, createEdge],
  );

  // Persist position on drag-stop; if dropped onto another node, merge instead.
  const onNodeDragStop = useCallback<NodeMouseHandler>(
    (_event, node) => {
      const hits = getIntersectingNodes(node).filter((n) => n.id !== node.id);
      if (hits.length > 0) {
        merge.mutate({ sourceId: node.id, targetId: hits[0].id });
        return;
      }
      move.mutate({ id: node.id, x: node.position.x, y: node.position.y });
    },
    [getIntersectingNodes, merge, move],
  );

  const onNodeClick = useCallback<NodeMouseHandler>((_e, node) => {
    setSelectedId((cur) => (cur === node.id ? null : node.id));
  }, []);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      onPaneClick={() => setSelectedId(null)}
      onEdgesDelete={(deleted) =>
        deleted.forEach((e) => utils.client.edge.remove.mutate({ id: e.id }).then(onChanged))
      }
      fitView
      proOptions={{ hideAttribution: true }}
      style={{ background: "var(--dec-bg)" }}
    >
      <Background color="#2a2f3a" gap={20} />
      <Controls />
      <MiniMap
        pannable
        zoomable
        style={{ background: "var(--dec-surface)" }}
        nodeColor="#3a4150"
      />
    </ReactFlow>
  );
}
