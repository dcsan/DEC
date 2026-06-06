import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { router, publicProcedure } from "../trpc";
import { boards, nodes, edges, type NodeKind } from "../../db/schema";
import { structuredChat } from "../../services/llm/openrouter";
import { ConceptListSchema, MergeResultSchema } from "../../services/llm/schemas";

const NODE_KINDS: NodeKind[] = [
  "option",
  "concept",
  "framework",
  "merged",
  "note",
  "procon",
];

// Bump a board's updatedAt whenever its canvas changes, so the board list
// stays sorted by recency.
async function touchBoard(db: import("../../db/client").Db, boardId: string) {
  await db.update(boards).set({ updatedAt: new Date() }).where(eq(boards.id, boardId));
}

export const nodeRouter = router({
  create: publicProcedure
    .input(
      z.object({
        boardId: z.string(),
        kind: z.enum(NODE_KINDS as [string, ...string[]]).default("concept"),
        title: z.string().min(1).max(120),
        description: z.string().optional(),
        x: z.number().default(0),
        y: z.number().default(0),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [node] = await ctx.db
        .insert(nodes)
        .values({
          boardId: input.boardId,
          kind: input.kind as NodeKind,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          x: input.x,
          y: input.y,
          data: input.data ?? null,
        })
        .returning();
      await touchBoard(ctx.db, input.boardId);
      return node;
    }),

  // Lightweight position save — fired on drag-stop, so kept separate from the
  // heavier content update.
  updatePosition: publicProcedure
    .input(z.object({ id: z.string(), x: z.number(), y: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(nodes)
        .set({ x: input.x, y: input.y })
        .where(eq(nodes.id, input.id));
      return { ok: true as const };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(120).optional(),
        description: z.string().optional(),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [node] = await ctx.db
        .update(nodes)
        .set({
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() || null }
            : {}),
          ...(input.data !== undefined ? { data: input.data } : {}),
        })
        .where(eq(nodes.id, input.id))
        .returning();
      return node;
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Drop any edges touching this node, too.
      const [node] = await ctx.db.select().from(nodes).where(eq(nodes.id, input.id));
      await ctx.db.delete(nodes).where(eq(nodes.id, input.id));
      const boardEdges = await ctx.db
        .select()
        .from(edges)
        .where(eq(edges.boardId, node?.boardId ?? ""));
      const toDrop = boardEdges
        .filter((e) => e.source === input.id || e.target === input.id)
        .map((e) => e.id);
      if (toDrop.length) await ctx.db.delete(edges).where(inArray(edges.id, toDrop));
      return { ok: true as const };
    }),

  // Auto-mindmap: ask the LLM for related concepts, add them as child nodes
  // arranged in an arc around the parent, and link each back to it.
  expand: publicProcedure
    .input(z.object({ id: z.string(), count: z.number().min(1).max(8).default(4) }))
    .mutation(async ({ ctx, input }) => {
      const [parent] = await ctx.db.select().from(nodes).where(eq(nodes.id, input.id));
      if (!parent) throw new Error("Node not found");

      const related = await relatedConcepts(
        ctx.env.OPENROUTER_API_KEY,
        parent.title,
        input.count,
      );

      // Lay children out in an arc below/around the parent.
      const radius = 220;
      const created = await Promise.all(
        related.map(async (concept, i) => {
          const angle =
            (Math.PI / (related.length + 1)) * (i + 1) + Math.PI / 4;
          const [child] = await ctx.db
            .insert(nodes)
            .values({
              boardId: parent.boardId,
              kind: "concept",
              title: concept.title,
              description: concept.description ?? null,
              x: parent.x + Math.cos(angle) * radius,
              y: parent.y + radius * 0.8 + Math.sin(angle) * 40,
            })
            .returning();
          const [edge] = await ctx.db
            .insert(edges)
            .values({ boardId: parent.boardId, source: parent.id, target: child.id })
            .returning();
          return { node: child, edge };
        }),
      );

      await touchBoard(ctx.db, parent.boardId);
      return {
        nodes: created.map((c) => c.node),
        edges: created.map((c) => c.edge),
      };
    }),

  // Drag-to-merge: fuse two nodes into a new `merged` node at their midpoint,
  // linked back to both sources.
  merge: publicProcedure
    .input(z.object({ sourceId: z.string(), targetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const both = await ctx.db
        .select()
        .from(nodes)
        .where(inArray(nodes.id, [input.sourceId, input.targetId]));
      const a = both.find((n) => n.id === input.sourceId);
      const b = both.find((n) => n.id === input.targetId);
      if (!a || !b) throw new Error("Both nodes must exist");

      const fused = await fuseConcepts(ctx.env.OPENROUTER_API_KEY, a.title, b.title);

      const [merged] = await ctx.db
        .insert(nodes)
        .values({
          boardId: a.boardId,
          kind: "merged",
          title: fused.title,
          description: fused.description,
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2 + 140,
        })
        .returning();

      const newEdges = await ctx.db
        .insert(edges)
        .values([
          { boardId: a.boardId, source: a.id, target: merged.id, label: "merge" },
          { boardId: a.boardId, source: b.id, target: merged.id, label: "merge" },
        ])
        .returning();

      await touchBoard(ctx.db, a.boardId);
      return { node: merged, edges: newEdges };
    }),
});

// ---- LLM helpers + deterministic fallbacks --------------------------------

interface Concept {
  title: string;
  description?: string;
}

async function relatedConcepts(
  apiKey: string | undefined,
  topic: string,
  count: number,
): Promise<Concept[]> {
  if (apiKey) {
    try {
      const out = await structuredChat({
        apiKey,
        schema: ConceptListSchema,
        schemaName: "concept_list",
        system: "You are a decision-coaching assistant. Be concise and concrete.",
        prompt:
          `List ${count} concepts closely related to "${topic}" that would help ` +
          `someone think it through.`,
        temperature: 0.5,
        title: `expand/${topic}`,
      });
      if (out.concepts.length) return out.concepts.slice(0, count);
    } catch (err) {
      console.error("[expand] LLM failed, using fallback", err);
    }
  }

  // Fallback stub — no key or the call failed.
  return Array.from({ length: count }, (_, i) => ({
    title: `${topic} · aspect ${i + 1}`,
    description: `A related angle on "${topic}" to explore (LLM unavailable — add OPENROUTER_API_KEY).`,
  }));
}

async function fuseConcepts(
  apiKey: string | undefined,
  a: string,
  b: string,
): Promise<{ title: string; description: string }> {
  if (apiKey) {
    try {
      const out = await structuredChat({
        apiKey,
        schema: MergeResultSchema,
        schemaName: "merge_result",
        system: "You synthesize two concepts into a sharper combined idea.",
        prompt: `Combine the ideas "${a}" and "${b}" into one new idea.`,
        temperature: 0.6,
        title: `merge/${a}+${b}`,
      });
      return out;
    } catch (err) {
      console.error("[merge] LLM failed, using fallback", err);
    }
  }

  return {
    title: `${a} × ${b}`,
    description: `A combination of "${a}" and "${b}" (LLM unavailable — add OPENROUTER_API_KEY to synthesize a real merge).`,
  };
}
