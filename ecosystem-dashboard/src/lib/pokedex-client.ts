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
  sprite_dream_world: string;
  cries: string;
  anime_artwork: string | null;
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
  sprite_dream_world: string;
  anime_artwork: string | null;
  types: string[];
}

export interface EvolutionNode {
  species_id: number;
  species_name: string;
  pokemon_id: number | null;
  pokemon_name: string | null;
  sprite_front: string | null;
  artwork: string | null;
  anime_artwork: string | null;
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

export interface TcgCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  supertype: string;
  subtypes: string;
  image_small: string;
  image_large: string;
  set_name: string;
  set_series: string;
  hp: string | null;
  card_types: string[];
  evolves_from: string | null;
}

export interface AnimeEpisode {
  id: string;
  title: string;
  episode_number: number;
  synopsis: string;
  air_date: string;
  series_name: string;
  season: number;
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

export interface PokemonForm {
  id: number;
  name: string;
  is_default: boolean;
  is_battle_only: boolean;
  form_order: number;
  sprite_front: string | null;
  sprite_back: string | null;
  types: string[];
}

export interface TeamSuggestion {
  id: number;
  name: string;
  pokedex_number: number;
  sprite_front: string | null;
  official_artwork: string | null;
  anime_artwork: string | null;
  sprite_dream_world: string | null;
  total_stats: number;
  types: string[];
  is_legendary: boolean;
  is_mythical: boolean;
}

export interface WeaknessCalc {
  covered_types: string[];
  weak_to: string[];
  team_size: number;
}

export interface TypeCoverage {
  super_effective: string[];
  not_covered: string[];
  coverage_pct: number;
}

export interface DailyPokemon {
  id: number;
  name: string;
  pokedex_number: number;
  sprite_dream_world: string | null;
  official_artwork: string | null;
  anime_artwork: string | null;
  cries: string | null;
  types: string[];
  genus: string;
  description: string;
  is_legendary: boolean;
  is_mythical: boolean;
  height: number;
  weight: number;
  base_experience: number;
  stats: { stat: string; base_value: number }[];
}

export interface StatComparison {
  pokemon1_id: number;
  pokemon1_name: string;
  pokemon1_types: string[];
  pokemon1_sprite: string | null;
  pokemon1_stats: { stat: string; base_value: number }[];
  pokemon1_total: number;
  pokemon2_id: number;
  pokemon2_name: string;
  pokemon2_types: string[];
  pokemon2_sprite: string | null;
  pokemon2_stats: { stat: string; base_value: number }[];
  pokemon2_total: number;
}

export interface MovePokemon {
  id: number;
  name: string;
  pokedex_number: number;
  sprite_front: string | null;
  sprite_dream_world: string | null;
  types: string[];
  learn_method: string;
  level: number;
}

export interface AbilityPokemon {
  id: number;
  name: string;
  pokedex_number: number;
  sprite_front: string | null;
  sprite_dream_world: string | null;
  types: string[];
  is_hidden: boolean;
}

export interface EggGroup {
  id: number;
  name: string;
  species_count: number;
}

export interface Encounter {
  id: number;
  method: string;
  min_level: number;
  max_level: number;
  chance: number;
  version: string;
  conditions: string[];
  area_name: string;
  location_name: string;
  region_name: string;
}

const POKEDEX_PROXY = '/api/child/pokedex';

/** Convert a pokedex-graph /assets/... URL to the proxied dashboard URL. */
function toProxiedAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/assets/')) {
    return `/api/child/pokedex-asset?path=${encodeURIComponent(url.slice('/assets/'.length))}`;
  }
  return url;
}

/** Recursively convert all object keys from camelCase to snake_case. */
function camelToSnakeKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnakeKeys);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = camelToSnakeKeys(value);
    }
    return result;
  }
  return obj;
}

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
  // Transform nested object keys to snake_case, but preserve top-level
  // GraphQL field names (e.g. "searchPokemon") that the client code accesses.
  const transformed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json.data as Record<string, unknown>)) {
    transformed[key] = camelToSnakeKeys(value);
  }
  return transformed as T;
}

const POKEMON_FIELDS = `
  id name pokedexNumber height weight baseExperience
  spriteFront spriteBack spriteShiny officialArtwork spriteDreamWorld cries
  animeArtwork
  types
  abilities { id name isHidden }
  stats { stat baseValue }
  species {
    id name genus isLegendary isMythical isBaby
    captureRate color shape habitat description growthRate
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
          id name pokedexNumber spriteFront officialArtwork spriteDreamWorld animeArtwork types
        }
      }`,
      { query, typeFilter, generation, isLegendary, limit, offset },
    );
    return data.searchPokemon.map((p) => ({
      ...p,
      anime_artwork: toProxiedAssetUrl(p.anime_artwork),
    }));
  },

  async pokemonByName(name: string): Promise<PokemonDetail | null> {
    const data = await gqlQuery<{ pokemonByName: PokemonDetail | null }>(
      `query Name($name: String!) {
        pokemonByName(name: $name) { ${POKEMON_FIELDS} }
      }`,
      { name },
    );
    return data.pokemonByName ? { ...data.pokemonByName, anime_artwork: toProxiedAssetUrl(data.pokemonByName.anime_artwork) } : null;
  },

  async pokemonByDex(dex: number): Promise<PokemonDetail | null> {
    const data = await gqlQuery<{ pokemonByDex: PokemonDetail | null }>(
      `query Dex($dex: Int!) {
        pokemonByDex(dex: $dex) { ${POKEMON_FIELDS} }
      }`,
      { dex },
    );
    return data.pokemonByDex ? { ...data.pokemonByDex, anime_artwork: toProxiedAssetUrl(data.pokemonByDex.anime_artwork) } : null;
  },

  async pokemonByType(typeName: string, limit = 50): Promise<PokemonSearchResult[]> {
    const data = await gqlQuery<{ pokemonByType: PokemonSearchResult[] }>(
      `query ByType($typeName: String!, $limit: Int!) {
        pokemonByType(typeName: $typeName, limit: $limit) {
          id name pokedexNumber spriteFront officialArtwork spriteDreamWorld animeArtwork types
        }
      }`,
      { typeName, limit },
    );
    return data.pokemonByType.map((p) => ({
      ...p,
      anime_artwork: toProxiedAssetUrl(p.anime_artwork),
    }));
  },

  async evolutionChain(speciesId: number): Promise<EvolutionNode[]> {
    const data = await gqlQuery<{ evolutionChain: EvolutionNode[] }>(
      `query Evo($speciesId: Int!) {
        evolutionChain(speciesId: $speciesId) {
          speciesId speciesName pokemonId pokemonName spriteFront artwork animeArtwork
          evolveTrigger evolveConditions evolveMinLevel evolveItem
          evolvesToId evolvesToName
        }
      }`,
      { speciesId },
    );
    return data.evolutionChain.map((e) => ({
      ...e,
      anime_artwork: toProxiedAssetUrl(e.anime_artwork),
      artwork: toProxiedAssetUrl(e.artwork),
    }));
  },

  async typeEffectiveness(typeName: string): Promise<TypeEffectiveness | null> {
    const data = await gqlQuery<{ typeEffectiveness: TypeEffectiveness | null }>(
      `query TypeEff($typeName: String!) {
        typeEffectiveness(typeName: $typeName) {
          type strongAgainst weakAgainst immuneTo vulnerableTo resistsFrom
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
          id name type power pp accuracy damageClass effect level learnMethod
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
      `query GraphStats { graphStats { totalNodes totalRels pokemon species types moves abilities items tcgCards animeEpisodes } }`,
    );
    return data.graphStats;
  },

  async pokemonForms(pokemonId: number): Promise<PokemonForm[]> {
    const data = await gqlQuery<{ pokemonForms: PokemonForm[] }>(
      `query Forms($pokemonId: Int!) {
        pokemonForms(pokemonId: $pokemonId) {
          id name isDefault isBattleOnly formOrder spriteFront spriteBack types
        }
      }`,
      { pokemonId },
    );
    return data.pokemonForms;
  },

  async teamSuggest(types: string[], limit = 10): Promise<TeamSuggestion[]> {
    const data = await gqlQuery<{ teamSuggest: TeamSuggestion[] }>(
      `query TeamSuggest($types: [String!]!, $limit: Int!) {
        teamSuggest(types: $types, limit: $limit) {
          id name pokedexNumber spriteFront officialArtwork animeArtwork spriteDreamWorld totalStats types isLegendary isMythical
        }
      }`,
      { types, limit },
    );
    return data.teamSuggest.map((p) => ({
      ...p,
      anime_artwork: toProxiedAssetUrl(p.anime_artwork),
    }));
  },

  async teamWeakness(pokemonIds: number[]): Promise<WeaknessCalc> {
    const data = await gqlQuery<{ teamWeakness: WeaknessCalc }>(
      `query TeamWeakness($pokemonIds: [Int!]!) {
        teamWeakness(pokemonIds: $pokemonIds) {
          coveredTypes weakTo teamSize
        }
      }`,
      { pokemonIds },
    );
    return data.teamWeakness;
  },

  async teamCoverage(pokemonIds: number[]): Promise<TypeCoverage> {
    const data = await gqlQuery<{ teamCoverage: TypeCoverage }>(
      `query TeamCoverage($pokemonIds: [Int!]!) {
        teamCoverage(pokemonIds: $pokemonIds) {
          superEffective notCovered coveragePct
        }
      }`,
      { pokemonIds },
    );
    return data.teamCoverage;
  },

  // ─── New enrichment queries ────────────────────────────────────────────────

  async dailyPokemon(seed?: number): Promise<DailyPokemon> {
    const data = await gqlQuery<{ dailyPokemon: DailyPokemon }>(
      `query Daily($seed: Int) {
        dailyPokemon(seed: $seed) {
          id name pokedexNumber spriteDreamWorld officialArtwork animeArtwork cries
          types genus description isLegendary isMythical
          height weight baseExperience
          stats { stat baseValue }
        }
      }`,
      { seed: seed ?? 0 },
    );
    return data.dailyPokemon ? { ...data.dailyPokemon, anime_artwork: toProxiedAssetUrl(data.dailyPokemon.anime_artwork) } : data.dailyPokemon;
  },

  async comparePokemon(id1: number, id2: number): Promise<StatComparison> {
    const data = await gqlQuery<{ comparePokemon: StatComparison }>(
      `query Compare($id1: Int!, $id2: Int!) {
        comparePokemon(id1: $id1, id2: $id2) {
          pokemon1Id pokemon1Name pokemon1Types pokemon1Sprite pokemon1Total
          pokemon1Stats { stat baseValue }
          pokemon2Id pokemon2Name pokemon2Types pokemon2Sprite pokemon2Total
          pokemon2Stats { stat baseValue }
        }
      }`,
      { id1, id2 },
    );
    return data.comparePokemon;
  },

  async pokemonByDualType(type1: string, type2: string, limit = 50): Promise<PokemonSearchResult[]> {
    const data = await gqlQuery<{ pokemonByDualType: PokemonSearchResult[] }>(
      `query DualType($type1: String!, $type2: String!, $limit: Int!) {
        pokemonByDualType(type1: $type1, type2: $type2, limit: $limit) {
          id name pokedexNumber spriteFront officialArtwork spriteDreamWorld animeArtwork types
        }
      }`,
      { type1, type2, limit },
    );
    return data.pokemonByDualType.map((p) => ({
      ...p,
      anime_artwork: toProxiedAssetUrl(p.anime_artwork),
    }));
  },

  async fuzzySearchPokemon(query: string, limit = 20): Promise<PokemonSearchResult[]> {
    const data = await gqlQuery<{ fuzzySearchPokemon: PokemonSearchResult[] }>(
      `query Fuzzy($query: String!, $limit: Int!) {
        fuzzySearchPokemon(query: $query, limit: $limit) {
          id name pokedexNumber spriteFront officialArtwork spriteDreamWorld animeArtwork types
        }
      }`,
      { query, limit },
    );
    return data.fuzzySearchPokemon.map((p) => ({
      ...p,
      anime_artwork: toProxiedAssetUrl(p.anime_artwork),
    }));
  },

  async pokemonByMove(moveId: number, limit = 50): Promise<MovePokemon[]> {
    const data = await gqlQuery<{ pokemonByMove: MovePokemon[] }>(
      `query ByMove($moveId: Int!, $limit: Int!) {
        pokemonByMove(moveId: $moveId, limit: $limit) {
          id name pokedexNumber spriteFront spriteDreamWorld types learnMethod level
        }
      }`,
      { moveId, limit },
    );
    return data.pokemonByMove;
  },

  async pokemonByAbility(abilityId: number, limit = 50): Promise<AbilityPokemon[]> {
    const data = await gqlQuery<{ pokemonByAbility: AbilityPokemon[] }>(
      `query ByAbility($abilityId: Int!, $limit: Int!) {
        pokemonByAbility(abilityId: $abilityId, limit: $limit) {
          id name pokedexNumber spriteFront spriteDreamWorld types isHidden
        }
      }`,
      { abilityId, limit },
    );
    return data.pokemonByAbility;
  },

  async allEggGroups(): Promise<EggGroup[]> {
    const data = await gqlQuery<{ allEggGroups: EggGroup[] }>(
      `query EggGroups { allEggGroups { id name speciesCount } }`,
    );
    return data.allEggGroups;
  },

  async pokemonEncounters(pokemonId: number, limit = 20): Promise<Encounter[]> {
    const data = await gqlQuery<{ pokemonEncounters: Encounter[] }>(
      `query Encounters($pokemonId: Int!, $limit: Int!) {
        pokemonEncounters(pokemonId: $pokemonId, limit: $limit) {
          id method minLevel maxLevel chance version conditions
          areaName locationName regionName
        }
      }`,
      { pokemonId, limit },
    );
    return data.pokemonEncounters;
  },

  async searchTcgCards(
    query = '', rarity = '', supertype = '', setName = '',
    limit = 50, offset = 0,
  ): Promise<TcgCard[]> {
    const data = await gqlQuery<{ searchTcgCards: TcgCard[] }>(
      `query SearchTCG($query: String, $rarity: String, $supertype: String, $setName: String, $limit: Int, $offset: Int) {
        searchTcgCards(query: $query, rarity: $rarity, supertype: $supertype, setName: $setName, limit: $limit, offset: $offset) {
          id name number rarity supertype subtypes imageSmall imageLarge setName setSeries hp cardTypes evolvesFrom
        }
      }`,
      { query, rarity, supertype, setName, limit, offset },
    );
    return data.searchTcgCards;
  },

  async animeEpisodesByPokemon(pokemonName: string, limit = 20): Promise<AnimeEpisode[]> {
    const data = await gqlQuery<{ animeEpisodesByPokemon: AnimeEpisode[] }>(
      `query AnimeByPokemon($pokemonName: String!, $limit: Int!) {
        animeEpisodesByPokemon(pokemonName: $pokemonName, limit: $limit) {
          id title episodeNumber synopsis airDate seriesName season
        }
      }`,
      { pokemonName, limit },
    );
    return data.animeEpisodesByPokemon;
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
    hp: '❤️ Health',
    attack: '⚔️ Attack',
    defense: '🛡️ Defense',
    'special-attack': '✨ Sp. Attack',
    'special-defense': '🛡️ Sp. Defense',
    speed: '💨 Speed',
  };
  return labels[stat] || stat;
}

export function kidDamageClass(cls: string): string {
  const labels: Record<string, string> = {
    physical: '👊 Physical',
    special: '🌟 Special',
    status: '🔄 Status',
  };
  return labels[cls?.toLowerCase()] || cls || '';
}

export function kidEvolutionTrigger(trigger: string | null): string {
  if (!trigger) return '';
  const labels: Record<string, string> = {
    'level-up': 'Gets stronger!',
    'use-item': 'Use a special item!',
    trade: 'Trade with a friend!',
  };
  return labels[trigger?.toLowerCase()] || trigger;
}

export function kidEdgeLabel(label: string): string {
  const labels: Record<string, string> = {
    HAS_TYPE: 'is type',
    HAS_ABILITY: 'has power',
    HAS_STAT: 'has stat',
    BELONGS_TO: 'belongs to',
    CAN_LEARN: 'can learn',
    EVOLVES_INTO: 'evolves into',
  };
  return labels[label] || label.replace(/_/g, ' ').toLowerCase();
}

export function titleCase(str: string): string {
  return str.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatHeight(height: number): string {
  const meters = height / 10;
  const feet = meters * 3.28084;
  const ft = Math.floor(feet);
  const inches = Math.round((feet - ft) * 12);
  return `${meters.toFixed(1)} m (${ft}'${inches}")`;
}

export function formatWeight(weight: number): string {
  const kg = weight / 10;
  const lbs = kg * 2.20462;
  return `${kg.toFixed(1)} kg (${lbs.toFixed(1)} lbs)`;
}
