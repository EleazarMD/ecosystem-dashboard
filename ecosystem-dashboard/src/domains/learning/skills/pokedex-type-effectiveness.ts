import { SkillModule, ToolContext, ToolExecutionResult } from '../shared/skill-module';

const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

export const pokedexTypeEffectivenessSkill: SkillModule = {
  id: 'pokedex_type_effectiveness',
  label: 'Type Effectiveness',
  description: 'Look up type effectiveness for a Pokémon type: what it is strong/weak against, immune to, and vulnerable to.',
  category: 'exploration',
  endpoint: '/api/child/pokedex',
  async execute(args): Promise<ToolExecutionResult> {
    const typeName = String(args.typeName || args.type || '');

    if (!typeName) {
      return { output: 'I need a type name (e.g. "fire", "water") to look up effectiveness.', success: false };
    }

    const gqlQuery = `query TypeEff($typeName: String!) {
      typeEffectiveness(typeName: $typeName) {
        type strongAgainst weakAgainst vulnerableTo resistsFrom
      }
    }`;

    const immuneQuery = `query Immune($typeName: String!) {
      typeEffectiveness(typeName: $typeName) {
        immuneTo
      }
    }`;

    try {
      const res = await fetch(`${POKEDEX_URL}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POKEDEX_API_KEY}`,
        },
        body: JSON.stringify({ query: gqlQuery, variables: { typeName } }),
      });

      if (!res.ok) {
        return { output: 'The Pokédex graph is unavailable right now.', success: false };
      }

      const json = await res.json();
      if (json.errors?.length) {
        return { output: `Pokédex query error: ${json.errors[0]?.message}`, success: false };
      }

      const eff = json.data?.typeEffectiveness;
      if (!eff) {
        return { output: `I couldn't find type effectiveness for "${typeName}".`, success: true };
      }

      // Fetch immuneTo separately — it can be null for types with no immunities
      // (schema declares it NON_NULL but the API returns null, causing a GraphQL error)
      let immuneTo: string[] = [];
      try {
        const immuneRes = await fetch(`${POKEDEX_URL}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${POKEDEX_API_KEY}`,
          },
          body: JSON.stringify({ query: immuneQuery, variables: { typeName } }),
        });
        if (immuneRes.ok) {
          const immuneJson = await immuneRes.json();
          if (!immuneJson.errors?.length) {
            immuneTo = immuneJson.data?.typeEffectiveness?.immuneTo || [];
          }
        }
      } catch {}

      const lines = [
        `Type: ${eff.type}`,
        `Strong against: ${(eff.strongAgainst || []).join(', ') || 'none'}`,
        `Weak against: ${(eff.weakAgainst || []).join(', ') || 'none'}`,
        `Immune to: ${immuneTo.join(', ') || 'none'}`,
        `Vulnerable to: ${(eff.vulnerableTo || []).join(', ') || 'none'}`,
        `Resists: ${(eff.resistsFrom || []).join(', ') || 'none'}`,
      ];

      return { output: lines.join('\n'), success: true };
    } catch {
      return { output: 'Could not reach the Pokédex graph service.', success: false };
    }
  },
};
