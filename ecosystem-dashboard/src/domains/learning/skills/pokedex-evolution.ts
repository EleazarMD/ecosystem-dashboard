import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

export const pokedexEvolutionSkill: SkillModule = {
  id: 'pokedex_evolution',
  label: 'Evolution Chain',
  description: 'Get the full evolution chain for a Pokémon species by species ID or Pokémon name. Returns each stage with evolution trigger and conditions.',
  category: 'exploration',
  endpoint: '/api/child/pokedex',
  async execute(args): Promise<ToolExecutionResult> {
    const speciesId = typeof args.speciesId === 'number'
      ? args.speciesId
      : undefined;
    const pokemonName = String(args.name || args.pokemonName || '');

    if (!speciesId && !pokemonName) {
      return { output: 'I need a Pokémon name or species ID to look up evolutions.', success: false };
    }

    // If we have a name but no speciesId, first resolve the name to get speciesId
    let resolvedSpeciesId = speciesId;
    if (!resolvedSpeciesId && pokemonName) {
      const nameQuery = `query Name($name: String!) {
        pokemonByName(name: $name) { id species { id } }
      }`;
      try {
        const nameRes = await fetch(`${POKEDEX_URL}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${POKEDEX_API_KEY}`,
          },
          body: JSON.stringify({ query: nameQuery, variables: { name: pokemonName } }),
        });
        if (nameRes.ok) {
          const nameJson = await nameRes.json();
          resolvedSpeciesId = nameJson.data?.pokemonByName?.species?.id;
        }
      } catch {}
    }

    if (!resolvedSpeciesId) {
      return { output: `Could not find species ID for "${pokemonName}". Try the exact name.`, success: false };
    }

    const gqlQuery = `query Evo($speciesId: Int!) {
      evolutionChain(speciesId: $speciesId) {
        speciesName pokemonName evolveTrigger evolveConditions evolveMinLevel evolveItem evolvesToName
      }
    }`;

    try {
      const res = await fetch(`${POKEDEX_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POKEDEX_API_KEY}`,
        },
        body: JSON.stringify({ query: gqlQuery, variables: { speciesId: resolvedSpeciesId } }),
      });

      if (!res.ok) {
        return { output: 'The Pokédex graph is unavailable right now.', success: false };
      }

      const json = await res.json();
      if (json.errors?.length) {
        return { output: `Pokédex query error: ${json.errors[0]?.message}`, success: false };
      }

      const chain = json.data?.evolutionChain || [];
      if (chain.length === 0) {
        return { output: `No evolution chain found for species ID ${resolvedSpeciesId}.`, success: true };
      }

      const chainStr = chain
        .map((e: { speciesName: string; pokemonName: string | null; evolveTrigger: string | null; evolveConditions: string | null; evolvesToName: string | null }) => {
          const trigger = e.evolveTrigger ? ` via ${e.evolveTrigger}` : '';
          const conditions = e.evolveConditions ? ` (${e.evolveConditions})` : '';
          return `${e.speciesName}${e.pokemonName ? ` [${e.pokemonName}]` : ''}${trigger}${conditions}${e.evolvesToName ? ` → ${e.evolvesToName}` : ''}`;
        })
        .join('\n');

      return { output: `Evolution chain:\n${chainStr}`, success: true };
    } catch {
      return { output: 'Could not reach the Pokédex graph service.', success: false };
    }
  },
};
