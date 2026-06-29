import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

const NEXAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export const pokedexNlQuerySkill: SkillModule = {
  id: 'pokedex_nl_query',
  label: 'Pokédex Q&A',
  description: 'Ask a natural-language question about Pokémon and get an answer grounded in the Pokédex knowledge graph. Use this for any free-form Pokémon question (e.g. "What is Pikachu\'s type?", "Show me all dragon-type Pokémon", "What is Fire strong against?").',
  category: 'exploration',
  endpoint: '/api/child/pokedex-nl',
  async execute(args, ctx: ToolContext): Promise<ToolExecutionResult> {
    const question = String(args.question || args.query || '');

    if (!question) {
      return { output: 'I need a question to ask the Pokédex!', success: false };
    }

    try {
      const res = await fetch(`${NEXAUTH_URL}/api/child/pokedex-nl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        return { output: 'The Pokédex Q&A service is unavailable right now.', success: false };
      }

      const data = await res.json();

      if (data.errors?.length) {
        return { output: `Pokédex query failed: ${data.errors[0]?.message}`, success: false };
      }

      if (!data.data) {
        return { output: `I couldn't find an answer to "${question}" in the Pokédex graph.`, success: true };
      }

      // Summarize the graph data as a readable string
      const dataStr = JSON.stringify(data.data, null, 2);
      // Truncate very long results
      const truncated = dataStr.length > 2000
        ? dataStr.slice(0, 2000) + '\n... (truncated)'
        : dataStr;

      return {
        output: `Pokédex Q&A: "${question}"\nSource: ${data.source || 'ai-gateway'}\nGraphQL: ${data.graphqlQuery || '(generated)'}\n\nResult:\n${truncated}`,
        success: true,
      };
    } catch {
      return { output: 'Could not reach the Pokédex Q&A service.', success: false };
    }
  },
};
