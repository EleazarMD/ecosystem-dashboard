import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

export const pokedexSearchSkill: SkillModule = {
  id: 'pokedex_search',
  label: 'Pokédex Search',
  description: 'Search for Pokémon by name, type, generation, or legendary status. Returns matching Pokémon with id, name, types, and sprite.',
  category: 'exploration',
  endpoint: '/api/child/pokedex',
  async execute(args): Promise<ToolExecutionResult> {
    const query = String(args.query || '');
    const typeFilter = String(args.typeFilter || args.type || '');
    const generation = typeof args.generation === 'number' ? args.generation : undefined;
    const isLegendary = args.isLegendary === true ? true : undefined;
    const limit = Math.min(Number(args.limit) || 20, 50);

    const gqlQuery = `query Search($query: String!, $typeFilter: String!, $generation: Int, $isLegendary: Boolean, $limit: Int!, $offset: Int!) {
      searchPokemon(query: $query, typeFilter: $typeFilter, generation: $generation, isLegendary: $isLegendary, limit: $limit, offset: $offset) {
        id name pokedexNumber types
      }
    }`;

    try {
      const res = await fetch(`${POKEDEX_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POKEDEX_API_KEY}`,
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: { query, typeFilter, generation, isLegendary, limit, offset: 0 },
        }),
      });

      if (!res.ok) {
        return { output: 'The Pokédex graph is unavailable right now.', success: false };
      }

      const json = await res.json();
      if (json.errors?.length) {
        return { output: `Pokédex query error: ${json.errors[0]?.message}`, success: false };
      }

      const pokemon = json.data?.searchPokemon || [];
      if (pokemon.length === 0) {
        return { output: `No Pokémon found matching "${query}"${typeFilter ? ` with type ${typeFilter}` : ''}.`, success: true };
      }

      const list = pokemon
        .map((p: { name: string; pokedexNumber: number; types: string[] }) =>
          `#${p.pokedexNumber} ${p.name} (${p.types.join('/')})`)
        .join('\n');

      return {
        output: `Found ${pokemon.length} Pokémon:\n${list}`,
        success: true,
      };
    } catch {
      return { output: 'Could not reach the Pokédex graph service.', success: false };
    }
  },
};
