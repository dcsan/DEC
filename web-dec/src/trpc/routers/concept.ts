import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { llmJSON } from "../../lib/llm";

// Concept search for the chat sidebar: the user types a topic ("game theory")
// and we return a small tree of one/two-word key concepts they can click to
// add to the canvas. See docs/plan/overview.md → "Adding ideas".
export const conceptRouter = router({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const tree = await searchConcepts(ctx.env.OPENROUTER_API_KEY, input.query);
      return { query: input.query, concepts: tree };
    }),
});

interface ConceptNode {
  title: string;
  description: string;
}

async function searchConcepts(
  apiKey: string | undefined,
  query: string,
): Promise<ConceptNode[]> {
  const out = await llmJSON<{ concepts: ConceptNode[] }>(
    apiKey,
    `Research the topic "${query}" and return 5-7 key sub-concepts as JSON ` +
      `{"concepts":[{"title":"one or two words","description":"one sentence"}]}. ` +
      `Titles should be short and addable as canvas nodes.`,
    { system: "You surface the most useful related concepts for a topic, concisely." },
  );
  if (out?.concepts?.length) return out.concepts.slice(0, 7);

  // Deterministic fallback so the UI works without a key.
  return [
    { title: query, description: `The core topic: ${query}.` },
    { title: `${query} · basics`, description: `Foundational ideas in ${query}.` },
    { title: `${query} · risks`, description: `Where ${query} can go wrong.` },
    {
      title: `${query} · examples`,
      description: `Concrete cases of ${query} (add OPENROUTER_API_KEY for real research).`,
    },
  ];
}
