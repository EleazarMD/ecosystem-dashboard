/**
 * Natural Language to GraphQL query translator for the Pokemon knowledge graph.
 *
 * Uses the child-safe AI Gateway to convert plain English questions into
 * GraphQL queries against the pokedex-graph service, then executes the query
 * and returns both the generated query and the results.
 *
 * Follows the canonical child-services AI Gateway contract:
 * - POST ${AI_GATEWAY_URL}/api/v1/chat/completions
 * - Authorization: Bearer ${CHILD_SAFETY_API_KEY}
 * - metadata: { user_type: 'child', content_filter: 'strict' }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

const SCHEMA_CONTEXT = `
You are a helpful assistant that translates natural language questions about Pokemon
into GraphQL queries for a Pokemon knowledge graph.

Available GraphQL queries:
- pokemonByName(name: String!): Pokemon
- pokemonByDex(dex: Int!): Pokemon
- pokemonById(id: Int!): Pokemon
- searchPokemon(query: String, typeFilter: String, generation: Int, isLegendary: Boolean, limit: Int, offset: Int): [SearchResult]
- pokemonByType(typeName: String!, limit: Int): [SearchResult]
- evolutionChain(speciesId: Int!): [EvolutionNode]
- typeEffectiveness(typeName: String!): TypeEffectiveness
- pokemonMoves(pokemonId: Int!, learnMethod: String): [Move]
- pokemonForms(pokemonId: Int!): [Form]
- teamSuggest(types: [String!]!, limit: Int): [TeamSuggestion]
- teamWeakness(pokemonIds: [Int!]!): WeaknessCalc
- teamCoverage(pokemonIds: [Int!]!): TypeCoverage
- allTypes: [Type]
- allGenerations: [Generation]
- allNatures: [Nature]
- allItems(limit: Int, offset: Int): [Item]
- graphStats: Stats

Pokemon fields: id name pokedex_number height weight base_experience sprite_front sprite_back sprite_shiny official_artwork cries types abilities { id name is_hidden } stats { stat base_value } species { id name genus is_legendary is_mythical is_baby capture_rate color shape habitat description growth_rate }
SearchResult fields: id name pokedex_number sprite_front official_artwork types
TypeEffectiveness fields: type strong_against weak_against immune_to vulnerable_to resists_from
Move fields: id name type power pp accuracy damage_class effect level learn_method
Form fields: id name is_default is_battle_only form_order sprite_front sprite_back types
TeamSuggestion fields: id name pokedex_number sprite_front official_artwork total_stats types is_legendary is_mythical
WeaknessCalc fields: covered_types weak_to team_size
TypeCoverage fields: super_effective not_covered coverage_pct
Stats fields: total_nodes total_rels pokemon species types moves abilities items tcg_cards anime_episodes

Rules:
1. Return ONLY a valid GraphQL query string — no markdown, no explanation, no backticks.
2. Keep queries simple and safe.
3. For "show me" or "find" questions, use searchPokemon or pokemonByType.
4. For specific Pokemon questions, use pokemonByName or pokemonByDex.
5. For type questions, use typeEffectiveness or allTypes.
6. For stats/count questions, use graphStats.
7. For "what forms does X have" or "mega evolution" questions, use pokemonForms.
8. For "suggest a team with X and Y types" or "best pokemon for X type", use teamSuggest.
9. For "what is my team weak to" or "team weaknesses", use teamWeakness with pokemon IDs.
10. For "type coverage" or "what types can my team hit", use teamCoverage with pokemon IDs.
11. Limit results to 20 or fewer unless specifically asked for more.
`;

interface PokedexGraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  if (user.accountType !== 'child' && user.accountType !== 'parent' && user.accountType !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (question.length > 500) {
    return res.status(400).json({ error: 'Question too long (max 500 characters)' });
  }

  // Step 1: Translate natural language to GraphQL using AI Gateway
  let graphqlQuery = '';
  let aiSource = 'ai-gateway';

  try {
    const aiResponse = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
      },
      body: JSON.stringify({
        model: process.env.CHILD_AI_MODEL || 'qwen3-8b',
        messages: [
          { role: 'system', content: SCHEMA_CONTEXT },
          { role: 'user', content: question },
        ],
        temperature: 0.3,
        max_tokens: 300,
        metadata: {
          user_type: 'child',
          content_filter: 'strict',
        },
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      graphqlQuery = aiData.choices?.[0]?.message?.content?.trim() || '';
      // Strip markdown code fences if present
      graphqlQuery = graphqlQuery.replace(/^```(?:graphql?)?\s*/i, '').replace(/\s*```$/i, '');
    } else {
      aiSource = 'fallback';
    }
  } catch {
    aiSource = 'fallback';
  }

  // Fallback: simple pattern matching for common questions
  if (!graphqlQuery || aiSource === 'fallback') {
    graphqlQuery = generateFallbackQuery(question);
    aiSource = 'fallback';
  }

  // Step 2: Execute the GraphQL query against pokedex-graph
  let queryResult: PokedexGraphQLResponse | null = null;
  let queryError = '';

  try {
    const pokedexResponse = await fetch(`${POKEDEX_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${POKEDEX_API_KEY}`,
      },
      body: JSON.stringify({ query: graphqlQuery }),
    });

    if (pokedexResponse.ok) {
      queryResult = await pokedexResponse.json();
    } else {
      queryError = `Pokedex service returned ${pokedexResponse.status}`;
    }
  } catch (err) {
    queryError = err instanceof Error ? err.message : 'Pokedex service unavailable';
  }

  // Step 3: Return the translated query and results
  return res.status(200).json({
    question,
    graphqlQuery,
    source: aiSource,
    data: queryResult?.data || null,
    errors: queryResult?.errors || (queryError ? [{ message: queryError }] : []),
  });
}

/**
 * Simple pattern-based fallback query generator.
 * Handles common Pokemon questions without AI.
 */
function generateFallbackQuery(question: string): string {
  const q = question.toLowerCase().trim();

  // "show me all X type pokemon"
  const typeMatch = q.match(/(?:show|find|get|list)\s+(?:me\s+)?(?:all\s+)?(\w+)\s+type/);
  if (typeMatch) {
    const typeName = typeMatch[1];
    return `query { pokemonByType(typeName: "${typeName}", limit: 20) { id name pokedex_number sprite_front official_artwork types } }`;
  }

  // "what is X's type" / "tell me about X"
  const nameMatch = q.match(/(?:what|tell|show|find|about)\s+(?:me\s+)?(?:about\s+)?(\w+)/);
  if (nameMatch) {
    const name = nameMatch[1];
    if (name !== 'all' && name !== 'the' && name.length > 1) {
      return `query { pokemonByName(name: "${name}") { id name pokedex_number types abilities { id name is_hidden } stats { stat base_value } species { id name genus is_legendary is_mythical description } } }`;
    }
  }

  // "how many pokemon" / "graph stats" / "stats"
  if (q.includes('how many') || q.includes('stats') || q.includes('count') || q.includes('graph')) {
    return `query { graphStats { total_nodes total_rels pokemon species types moves abilities items tcg_cards anime_episodes } }`;
  }

  // "what types exist" / "all types"
  if (q.includes('types') && (q.includes('all') || q.includes('list') || q.includes('exist'))) {
    return `query { allTypes { id name } }`;
  }

  // "what forms does X have" / "mega evolution of X"
  const formsMatch = q.match(/(?:what|show|tell|find).*(?:forms?|mega|gigantamax|regional).*(?:of|does|for)?\s*(\w+)/);
  const formsMatch2 = q.match(/(\w+)\s+(?:forms?|mega|gigantamax)/);
  const formName = (formsMatch?.[1] || formsMatch2?.[1]);
  if (formName && formName !== 'all' && formName.length > 2) {
    return `query { pokemonByName(name: "${formName}") { id name } }`;
  }

  // "suggest a team with fire and flying" / "best water pokemon"
  const teamMatch = q.match(/(?:suggest|best|recommend|build).*(?:team|pokemon).*?(?:with|for|type)?\s*(\w+)(?:\s+(?:and|type)?\s*(\w+))?/);
  if (teamMatch && (q.includes('team') || q.includes('suggest') || q.includes('best') || q.includes('recommend'))) {
    const type1 = teamMatch[1];
    const type2 = teamMatch[2] || '';
    const types = type2 ? `["${type1}", "${type2}"]` : `["${type1}"]`;
    return `query { teamSuggest(types: ${types}, limit: 10) { id name pokedex_number sprite_front official_artwork total_stats types is_legendary is_mythical } }`;
  }

  // "type effectiveness" / "X strong against"
  const effMatch = q.match(/(\w+)\s+(?:strong|weak|effective|effectiveness)/);
  if (effMatch) {
    return `query { typeEffectiveness(typeName: "${effMatch[1]}") { type strong_against weak_against immune_to vulnerable_to resists_from } }`;
  }

  // Default: search by the first word
  const words = q.split(/\s+/).filter((w) => w.length > 2 && !['show', 'find', 'tell', 'about', 'the', 'all', 'me', 'what', 'how', 'many'].includes(w));
  if (words.length > 0) {
    return `query { searchPokemon(query: "${words[0]}", limit: 12) { id name pokedex_number sprite_front official_artwork types } }`;
  }

  return `query { graphStats { total_nodes total_rels pokemon species types moves abilities items tcg_cards anime_episodes } }`;
}
