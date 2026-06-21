/**
 * Pokedex Graph Client
 *
 * Lightweight client for talking to the pokedex-graph GraphQL service
 * (services/pokedex-graph) through our /api/child/pokedex proxy route.
 *
 * The pokedex-graph service stores a Pokemon knowledge graph in Neo4j with
 * nodes for Pokemon, Species, Type, Ability, Move, Item, Nature, Generation,
 * Region, Location, EvolutionChain, Stat, TcgCard, AnimeEpisode and more.
 */

export interface PokemonType {
  id: number;
  name: string;
}

export interface PokemonStat {
  stat: string;
  base_value: number;
}

export interface PokemonAbility {
  id: number;
  name: string;
  is_hidden: boolean;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  genus: string;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  capture_rate: number;
  color: string;
  shape: string;
  habitat: string;
  description: string;
  growth_rate: string;
}

export interface PokemonDetail {
  id: number;
  name: string;
  pokedex_number: number;
  height: number;
  weight: number;
  base_experience: number;
  sprite_front: string;
  sprite_back: string;
  sprite_shiny: string;
  official_artwork: string;
  cries: string;
  types: string[];
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  species: PokemonSpecies | null;
}

export interface PokemonSearchResult {
  id: number;
  name: string;
  pokedex_number: number;
  sprite_front: string;
  official_artwork: string;
  types: string[];
}

export interface EvolutionNode {
  species_id: number;
  species_name: string;
  pokemon_id: number | null;
  pokemon_name: string | null;
  sprite_front: string | null;
  artwork: string | null;
  evolve_trigger: string | null;
  evolve_conditions: string | null;
  evolve_min_level: number | null;
  evolve_item: string | null;
  evolves_to_id: number | null;
  evolves_to_name: string | null;
}

export interface TypeEffectiveness {
  type: string;
  strong_against: string[];
  weak_against: string[];
  immune_to: string[];
  vulnerable_to: string[];
  resists_from: string[];
}

export interface PokemonMove {
  id: number;
  name: string;
  type: string;
  power: number | null;
  pp: number | null;
  accuracy: number | null;
  damage_class: string;
  effect: string;
  level: number | null;
  learn_method: string;
}

export interface GraphStats {
  total_nodes: number;
  total_rels: number;
  pokemon: number;
  species: number;
  types: number;
  moves: number;
  abilities: number;
  items: number;
  tcg_cards: number;
  anime_episodes: number;
}

export interface GenerationInfo {
  id: number;
  name: string;
  region: string;
}

const POKEDEX_PROXY = '/api/child/pokedex';

async function gqlQuery<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(POKEDEX_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pokedex request failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'GraphQL error');
  }
  return json.data as T;
}

const POKEMON_FIELDS = `
  id name pokedex_number height weight base_experience
  sprite_front sprite_back sprite_shiny official_artwork cries
  types
  abilities { id name is_hidden }
  stats { stat base_value }
  species {
    id name genus is_legendary is_mythical is_baby
    capture_rate color shape habitat description growth_rate
  }
`;

export const pokedexClient = {
  async searchPokemon(
    query = '',
    typeFilter = '',
    generation?: number,
    isLegendary?: boolean,
    limit = 20,
    offset = 0,
  ): Promise<PokemonSearchResult[]> {
    const data = await gqlQuery<{ searchPokemon: PokemonSearchResult[] }>(
      `query Search($query: String!, $typeFilter: String!, $generation: Int, $isLegendary: Boolean, $limit: Int!, $offset: Int!) {
        searchPokemon(query: $query, typeFilter: $typeFilter, generation: $generation, isLegendary: $isLegendary, limit: $limit, offset: $offset) {
          id name pokedex_number sprite_front official_artwork types
        }
      }`,
      { query, typeFilter, generation, isLegendary, limit, offset },
    );
    return data.searchPokemon;
  },

  async pokemonByName(name: string): Promise<PokemonDetail | null> {
    const data = await gqlQuery<{ pokemonByName: PokemonDetail | null }>(
      `query Name($name: String!) {
        pokemonByName(name: $name) { ${POKEMON_FIELDS} }
      }`,
      { name },
    );
    return data.pokemonByName;
  },

  async pokemonByDex(dex: number): Promise<PokemonDetail | null> {
    const data = await gqlQuery<{ pokemonByDex: PokemonDetail | null }>(
      `query Dex($dex: Int!) {
        pokemonByDex(dex: $dex) { ${POKEMON_FIELDS} }
      }`,
      { dex },
    );
    return data.pokemonByDex;
  },

  async pokemonByType(typeName: string, limit = 50): Promise<PokemonSearchResult[]> {
    const data = await gqlQuery<{ pokemonByType: PokemonSearchResult[] }>(
      `query ByType($typeName: String!, $limit: Int!) {
        pokemonByType(typeName: $typeName, limit: $limit) {
          id name pokedex_number sprite_front official_artwork types
        }
      }`,
      { typeName, limit },
    );
    return data.pokemonByType;
  },

  async evolutionChain(speciesId: number): Promise<EvolutionNode[]> {
    const data = await gqlQuery<{ evolutionChain: EvolutionNode[] }>(
      `query Evo($speciesId: Int!) {
        evolutionChain(speciesId: $speciesId) {
          species_id species_name pokemon_id pokemon_name sprite_front artwork
          evolve_trigger evolve_conditions evolve_min_level evolve_item
          evolves_to_id evolves_to_name
        }
      }`,
      { speciesId },
    );
    return data.evolutionChain;
  },

  async typeEffectiveness(typeName: string): Promise<TypeEffectiveness | null> {
    const data = await gqlQuery<{ typeEffectiveness: TypeEffectiveness | null }>(
      `query TypeEff($typeName: String!) {
        typeEffectiveness(typeName: $typeName) {
          type strong_against weak_against immune_to vulnerable_to resists_from
        }
      }`,
      { typeName },
    );
    return data.typeEffectiveness;
  },

  async pokemonMoves(pokemonId: number, learnMethod = ''): Promise<PokemonMove[]> {
    const data = await gqlQuery<{ pokemonMoves: PokemonMove[] }>(
      `query Moves($pokemonId: Int!, $learnMethod: String!) {
        pokemonMoves(pokemonId: $pokemonId, learnMethod: $learnMethod) {
          id name type power pp accuracy damage_class effect level learn_method
        }
      }`,
      { pokemonId, learnMethod },
    );
    return data.pokemonMoves;
  },

  async allTypes(): Promise<PokemonType[]> {
    const data = await gqlQuery<{ allTypes: PokemonType[] }>(
      `query AllTypes { allTypes { id name } }`,
    );
    return data.allTypes;
  },

  async allGenerations(): Promise<GenerationInfo[]> {
    const data = await gqlQuery<{ allGenerations: GenerationInfo[] }>(
      `query AllGens { allGenerations { id name region } }`,
    );
    return data.allGenerations;
  },

  async graphStats(): Promise<GraphStats> {
    const data = await gqlQuery<{ graphStats: GraphStats }>(
      `query GraphStats { graphStats { total_nodes total_rels pokemon species types moves abilities items tcg_cards anime_episodes } }`,
    );
    return data.graphStats;
  },
};

// ─── Type metadata helpers ────────────────────────────────────────────────

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A878',
  fire: '#F08030',
  water: '#6890F0',
  electric: '#F8D030',
  grass: '#78C850',
  ice: '#98D8D8',
  fighting: '#C03028',
  poison: '#A040A0',
  ground: '#E0C068',
  flying: '#A890F0',
  psychic: '#F85888',
  bug: '#A8B820',
  rock: '#B8A038',
  ghost: '#705898',
  dragon: '#7038F8',
  dark: '#705848',
  steel: '#B8B8D0',
  fairy: '#EE99AC',
};

export const TYPE_EMOJIS: Record<string, string> = {
  normal: '⭐',
  fire: '🔥',
  water: '💧',
  electric: '⚡',
  grass: '🌿',
  ice: '❄️',
  fighting: '🥊',
  poison: '☠️',
  ground: '⛰️',
  flying: '🪽',
  psychic: '🔮',
  bug: '🐛',
  rock: '🪨',
  ghost: '👻',
  dragon: '🐉',
  dark: '🌙',
  steel: '⚙️',
  fairy: '🧚',
};

export function getTypeColor(typeName: string): string {
  return TYPE_COLORS[typeName.toLowerCase()] || '#68A090';
}

export function getTypeEmoji(typeName: string): string {
  return TYPE_EMOJIS[typeName.toLowerCase()] || '❓';
}

export function statColor(value: number): string {
  if (value >= 120) return '#00b894';
  if (value >= 90) return '#00cec9';
  if (value >= 60) return '#fdcb6e';
  if (value >= 40) return '#e17055';
  return '#d63031';
}

export function statLabel(stat: string): string {
  const labels: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
  };
  return labels[stat] || stat;
}

export function formatHeight(height: number): string {
  const meters = height / 10;
  return `${meters.toFixed(1)} m`;
}

export function formatWeight(weight: number): string {
  const kg = weight / 10;
  return `${kg.toFixed(1)} kg`;
}
