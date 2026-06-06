import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { structuredChat } from "../../services/llm/openrouter";
import { ConceptListSchema } from "../../services/llm/schemas";

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
  if (apiKey) {
    try {
      const out = await structuredChat({
        apiKey,
        schema: ConceptListSchema,
        schemaName: "concept_list",
        system: "You surface the most useful related concepts for a topic, concisely.",
        prompt:
          `Research the topic "${query}" and return 5-7 key sub-concepts. ` +
          `Titles should be short (one or two words) and addable as canvas nodes.`,
        temperature: 0.4,
        title: `search/${query}`,
      });
      if (out.concepts.length) return out.concepts.slice(0, 7);
    } catch (err) {
      console.error("[concept.search] LLM failed, using fallback", err);
    }
  }

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
