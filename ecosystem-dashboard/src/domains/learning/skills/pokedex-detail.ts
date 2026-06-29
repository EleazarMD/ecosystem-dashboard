import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

export const pokedexDetailSkill: SkillModule = {
  id: 'pokedex_detail',
  label: 'Pokédex Detail',
  description: 'Get full details for a specific Pokémon by name: types, abilities, stats, species info (legendary, mythical, description), height, weight.',
  category: 'exploration',
  endpoint: '/api/child/pokedex',
  async execute(args): Promise<ToolExecutionResult> {
    const name = String(args.name || args.pokemonName || '');

    if (!name) {
      return { output: 'I need a Pokémon name to look up. Please provide one!', success: false };
    }

    const gqlQuery = `query Name($name: String!) {
      pokemonByName(name: $name) {
        id name pokedexNumber height weight baseExperience
        types
        abilities { id name isHidden }
        stats { stat baseValue }
        species { id name genus isLegendary isMythical isBaby captureRate color shape habitat description growthRate }
      }
    }`;

    try {
      const res = await fetch(`${POKEDEX_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POKEDEX_API_KEY}`,
        },
        body: JSON.stringify({ query: gqlQuery, variables: { name } }),
      });

      if (!res.ok) {
        return { output: 'The Pokédex graph is unavailable right now.', success: false };
      }

      const json = await res.json();
      if (json.errors?.length) {
        return { output: `Pokédex query error: ${json.errors[0]?.message}`, success: false };
      }

      const p = json.data?.pokemonByName;
      if (!p) {
        return { output: `I couldn't find a Pokémon named "${name}" in the Pokédex graph.`, success: true };
      }

      const statsStr = (p.stats || [])
        .map((s: { stat: string; baseValue: number }) => `${s.stat}: ${s.baseValue}`)
        .join(', ');
      const abilitiesStr = (p.abilities || [])
        .map((a: { name: string; isHidden: boolean }) =>
          `${a.name}${a.isHidden ? ' (hidden)' : ''}`)
        .join(', ');
      const species = p.species;
      const speciesStr = species
        ? `${species.genus || 'Pokémon'}${species.isLegendary ? ' · Legendary' : ''}${species.isMythical ? ' · Mythical' : ''}. ${species.description || ''}`
        : '';

      return {
        output: `#${p.pokedexNumber} ${p.name} (${(p.types || []).join('/')})\nAbilities: ${abilitiesStr}\nStats: ${statsStr}\n${speciesStr}`,
        success: true,
      };
    } catch {
      return { output: 'Could not reach the Pokédex graph service.', success: false };
    }
  },
};
