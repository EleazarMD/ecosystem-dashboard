/**
 * PokemonCardLibrary — Interactive Pokemon card collection for kids
 *
 * Features:
 * - Searchable, filterable grid of Pokemon cards
 * - Each card shows artwork, name, type, HP bar, moves, evolution stage
 * - Tap to flip between front (stats) and back (fun facts)
 * - Type-colored card frames with rarity styling
 * - Collection progress tracking (localStorage)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Badge,
  Spinner,
  SimpleGrid,
  Wrap,
  WrapItem,
  Image,
  Progress,
  useToast,
} from '@chakra-ui/react';
import {
  SearchIcon,
  ChevronLeftIcon,
} from '@chakra-ui/icons';
import { keyframes } from '@emotion/react';
import {
  pokedexClient,
  getTypeColor,
  getTypeEmoji,
  titleCase,
  PokemonDetail,
  PokemonSearchResult,
  PokemonMove,
  EvolutionNode,
} from '@/lib/pokedex-client';

// ─── Animation keyframes ──────────────────────────────────────────────────

const flipIn = keyframes`
  0% { transform: rotateY(90deg); opacity: 0; }
  100% { transform: rotateY(0deg); opacity: 1; }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
`;

// ─── Card rarity helpers ──────────────────────────────────────────────────

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

function getRarity(pokemon: PokemonDetail): Rarity {
  const isLegendary = pokemon.species?.is_legendary;
  const isMythical = pokemon.species?.is_mythical;
  if (isLegendary || isMythical) return 'legendary';
  const totalStats = pokemon.stats.reduce((sum, s) => sum + s.base_value, 0);
  if (totalStats >= 500) return 'epic';
  if (totalStats >= 400) return 'rare';
  return 'common';
}

const RARITY_STYLES: Record<Rarity, {
  label: string;
  emoji: string;
  borderColor: string;
  glow: string;
  bgGradient: string;
}> = {
  common: {
    label: 'Common',
    emoji: '⭐',
    borderColor: 'rgba(200,200,200,0.4)',
    glow: 'none',
    bgGradient: 'linear(145deg, rgba(40,40,60,0.95), rgba(25,25,40,0.95))',
  },
  rare: {
    label: 'Rare',
    emoji: '🌟',
    borderColor: 'rgba(100,180,255,0.6)',
    glow: '0 0 20px rgba(100,180,255,0.25)',
    bgGradient: 'linear(145deg, rgba(30,50,80,0.95), rgba(20,30,55,0.95))',
  },
  epic: {
    label: 'Epic',
    emoji: '💫',
    borderColor: 'rgba(200,120,255,0.7)',
    glow: '0 0 24px rgba(200,120,255,0.3)',
    bgGradient: 'linear(145deg, rgba(50,30,70,0.95), rgba(35,20,55,0.95))',
  },
  legendary: {
    label: 'Legendary',
    emoji: '👑',
    borderColor: 'rgba(255,200,60,0.8)',
    glow: '0 0 30px rgba(255,200,60,0.4)',
    bgGradient: 'linear(145deg, rgba(60,50,20,0.95), rgba(45,35,15,0.95))',
  },
};

// ─── Fun facts generator ──────────────────────────────────────────────────

function getFunFact(pokemon: PokemonDetail): string {
  const facts: string[] = [];

  if (pokemon.species?.genus) {
    facts.push(`It's called the "${pokemon.species.genus}" Pokemon!`);
  }
  if (pokemon.height) {
    facts.push(`It's ${pokemon.height / 10} meters tall.`);
  }
  if (pokemon.weight) {
    facts.push(`It weighs ${pokemon.weight / 10} kg.`);
  }
  if (pokemon.species?.color) {
    facts.push(`Its color is ${pokemon.species.color}.`);
  }
  if (pokemon.species?.habitat) {
    facts.push(`It lives in the ${pokemon.species.habitat}.`);
  }
  if (pokemon.base_experience && pokemon.base_experience > 200) {
    facts.push(`It's very experienced — ${pokemon.base_experience} XP!`);
  }
  if (pokemon.species?.growth_rate) {
    facts.push(`It grows ${pokemon.species.growth_rate.replace(/-/g, ' ')}.`);
  }

  return facts[Math.floor(Math.random() * facts.length)] || 'A mysterious Pokemon!';
}

// ─── HP bar color ─────────────────────────────────────────────────────────

function hpColor(hp: number): string {
  if (hp >= 80) return '#00b894';
  if (hp >= 50) return '#fdcb6e';
  if (hp >= 30) return '#e17055';
  return '#d63031';
}

// ─── Pokemon Card (single card, flippable) ────────────────────────────────

interface PokemonCardProps {
  pokemon: PokemonDetail;
  moves: PokemonMove[];
  evolution: EvolutionNode[];
  isCollected: boolean;
  onCollect: (id: number) => void;
  onSelect: (pokemon: PokemonDetail) => void;
}

function PokemonCard({ pokemon, moves, evolution, isCollected, onCollect, onSelect }: PokemonCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [funFact, setFunFact] = useState(() => getFunFact(pokemon));
  const rarity = getRarity(pokemon);
  const rarityStyle = RARITY_STYLES[rarity];
  const primaryType = pokemon.types[0] || 'normal';
  const typeColor = getTypeColor(primaryType);
  const typeEmoji = getTypeEmoji(primaryType);

  const hpStat = pokemon.stats.find((s) => s.stat === 'hp');
  const hp = hpStat?.base_value ?? 50;
  const maxHp = 255;

  const topMoves = moves.slice(0, 2);

  const handleFlip = () => {
    setFlipped((f) => !f);
    if (!flipped) setFunFact(getFunFact(pokemon));
  };

  return (
    <Box
      position="relative"
      w="220px"
      h="320px"
      cursor="pointer"
      onClick={handleFlip}
      transition="transform 0.3s ease"
      _hover={{ transform: 'scale(1.05)' }}
      style={{ perspective: '1000px' }}
    >
      <Box
        position="absolute"
        inset={0}
        borderRadius="xl"
        border="2px solid"
        borderColor={rarityStyle.borderColor}
        bgGradient={rarityStyle.bgGradient}
        boxShadow={rarityStyle.glow}
        overflow="hidden"
        animation={`${flipIn} 0.4s ease`}
        style={{ backfaceVisibility: 'hidden' }}
      >
        {/* Type-colored top bar */}
        <Box
          h="40px"
          bg={`${typeColor}40`}
          borderTopRadius="xl"
          borderBottom="2px solid"
          borderColor={`${typeColor}80`}
          position="relative"
        >
          <HStack justify="space-between" px={3} h="40px">
            <HStack spacing={1}>
              {pokemon.types.map((t) => (
                <Text key={t} fontSize="sm" title={t}>
                  {getTypeEmoji(t)}
                </Text>
              ))}
            </HStack>
            <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.900">
              #{pokemon.pokedex_number.toString().padStart(3, '0')}
            </Text>
          </HStack>
        </Box>

        {!flipped ? (
          /* ─── FRONT: Stats & Moves ─── */
          <VStack spacing={1} align="stretch" p={2} h="calc(100% - 40px)">
            {/* Name + Rarity */}
            <HStack justify="space-between" px={1}>
              <Text fontSize="md" fontWeight="extrabold" color="white" isTruncated>
                {titleCase(pokemon.name)}
              </Text>
              <Text fontSize="xs" title={rarityStyle.label} cursor="help" animation={rarity === 'legendary' ? `${sparkle} 2s ease-in-out infinite` : undefined}>
                  {rarityStyle.emoji}
                </Text>
            </HStack>

            {/* Artwork */}
            <Box
              flex={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
              minH="100px"
            >
              <Image
                src={pokemon.anime_artwork || pokemon.official_artwork || pokemon.sprite_front}
                alt={pokemon.name}
                maxH="110px"
                maxW="180px"
                objectFit="contain"
                filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))"
                animation={`${float} 4s ease-in-out infinite`}
                fallbackSrc={pokemon.sprite_front}
              />
              {rarity === 'legendary' && (
                <Box
                  position="absolute"
                  top={0}
                  right={0}
                  fontSize="16px"
                  animation={`${sparkle} 2s ease-in-out infinite`}
                >
                  ✨
                </Box>
              )}
            </Box>

            {/* HP Bar */}
            <Box px={1}>
              <HStack justify="space-between" mb={0.5}>
                <Text fontSize="2xs" fontWeight="bold" color="whiteAlpha.700">❤️ HP</Text>
                <Text fontSize="2xs" fontWeight="bold" color={hpColor(hp)}>{hp}</Text>
              </HStack>
              <Progress
                value={(hp / maxHp) * 100}
                colorScheme={hp >= 80 ? 'green' : hp >= 50 ? 'yellow' : 'red'}
                size="xs"
                borderRadius="full"
                bg="whiteAlpha.200"
              />
            </Box>

            {/* Moves (1-2) */}
            <VStack spacing={0.5} align="stretch" px={1}>
              {topMoves.map((move, i) => (
                <HStack key={i} spacing={1} justify="space-between">
                  <HStack spacing={1} minW={0} flex={1}>
                    <Text fontSize="2xs">{getTypeEmoji(move.type)}</Text>
                    <Text fontSize="2xs" color="whiteAlpha.800" isTruncated>
                      {titleCase(move.name)}
                    </Text>
                  </HStack>
                  {move.power && (
                    <Text fontSize="2xs" fontWeight="bold" color={getTypeColor(move.type)}>
                      {move.power}
                    </Text>
                  )}
                </HStack>
              ))}
              {topMoves.length === 0 && (
                <Text fontSize="2xs" color="whiteAlpha.500" fontStyle="italic">
                  No moves loaded
                </Text>
              )}
            </VStack>

            {/* Evolution stage indicator */}
            {evolution.length > 0 && (
              <HStack spacing={1} px={1} justify="center">
                {evolution.map((evo, i) => (
                  <Box
                    key={i}
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg={evo.species_id === pokemon.species?.id ? typeColor : 'whiteAlpha.300'}
                  />
                ))}
                <Text fontSize="2xs" color="whiteAlpha.500" ml={1}>
                  {evolution.length > 1 ? `${evolution.length} stages` : '1 stage'}
                </Text>
              </HStack>
            )}

            {/* Collect button */}
            <HStack justify="space-between" px={1} pt={0.5}>
              <Text
                fontSize="2xs"
                color={isCollected ? 'green.300' : 'whiteAlpha.400'}
                fontWeight="bold"
              >
                {isCollected ? '✓ Collected!' : 'Tap to collect'}
              </Text>
              <Text fontSize="2xs" color="whiteAlpha.400">
                Flip ↻
              </Text>
            </HStack>
          </VStack>
        ) : (
          /* ─── BACK: Fun Facts & Evolution ─── */
          <VStack spacing={2} align="stretch" p={3} h="calc(100% - 40px)">
            <Text fontSize="sm" fontWeight="bold" color={typeColor} textAlign="center">
              {titleCase(pokemon.name)} Fun Facts
            </Text>

            {/* Fun fact */}
            <Box
              bg="whiteAlpha.100"
              borderRadius="md"
              p={2}
              borderLeft="3px solid"
              borderColor={typeColor}
            >
              <Text fontSize="xs" color="whiteAlpha.800" lineHeight={1.4}>
                💡 {funFact}
              </Text>
            </Box>

            {/* Types */}
            <Box>
              <Text fontSize="2xs" fontWeight="bold" color="whiteAlpha.600" mb={1}>Type:</Text>
              <HStack spacing={1}>
                {pokemon.types.map((t) => (
                  <Badge
                    key={t}
                    fontSize="2xs"
                    bg={`${getTypeColor(t)}30`}
                    color={getTypeColor(t)}
                    borderRadius="full"
                    px={2}
                  >
                    {getTypeEmoji(t)} {titleCase(t)}
                  </Badge>
                ))}
              </HStack>
            </Box>

            {/* Abilities */}
            {pokemon.abilities.length > 0 && (
              <Box>
                <Text fontSize="2xs" fontWeight="bold" color="whiteAlpha.600" mb={1}>Abilities:</Text>
                <Wrap spacing={1}>
                  {pokemon.abilities.slice(0, 3).map((a) => (
                    <WrapItem key={a.id}>
                      <Badge fontSize="2xs" bg="whiteAlpha.100" color="whiteAlpha.700" borderRadius="full" px={2}>
                        {titleCase(a.name)}{a.is_hidden ? ' ✨' : ''}
                      </Badge>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}

            {/* Evolution chain */}
            {evolution.length > 0 && (
              <Box>
                <Text fontSize="2xs" fontWeight="bold" color="whiteAlpha.600" mb={1}>Evolution:</Text>
                <HStack spacing={1} flexWrap="wrap">
                  {evolution.map((evo, i) => (
                    <HStack key={i} spacing={0.5}>
                      {i > 0 && <Text fontSize="2xs" color="whiteAlpha.400">→</Text>}
                      <Text
                        fontSize="2xs"
                        color={evo.species_id === pokemon.species?.id ? typeColor : 'whiteAlpha.600'}
                        fontWeight={evo.species_id === pokemon.species?.id ? 'bold' : 'normal'}
                      >
                        {titleCase(evo.species_name)}
                      </Text>
                    </HStack>
                  ))}
                </HStack>
              </Box>
            )}

            {/* Collect + Detail buttons */}
            <HStack justify="center" spacing={2} mt="auto" pt={2}>
              <Button
                size="xs"
                variant={isCollected ? 'solid' : 'outline'}
                colorScheme={isCollected ? 'green' : 'purple'}
                onClick={(e) => {
                  e.stopPropagation();
                  onCollect(pokemon.id);
                }}
              >
                {isCollected ? '✓ Collected' : '+ Collect'}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(pokemon);
                }}
              >
                Details →
              </Button>
            </HStack>
          </VStack>
        )}
      </Box>
    </Box>
  );
}

// ─── Main Card Library Component ──────────────────────────────────────────

interface PokemonCardLibraryProps {
  onBack: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}

const STORAGE_KEY = 'pokemon-card-collection';
const FETCH_LIMIT = 60;

export function PokemonCardLibrary({ onBack, onPokemonSelect }: PokemonCardLibraryProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState<Rarity | ''>('');
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allTypes, setAllTypes] = useState<{ id: number; name: string }[]>([]);
  const [cardDetails, setCardDetails] = useState<Map<number, { pokemon: PokemonDetail; moves: PokemonMove[]; evolution: EvolutionNode[] }>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(12);
  const toast = useToast();

  const HIDDEN_TYPES = new Set(['unknown', 'stellar', 'shadow']);

  // Load collection from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCollected(new Set(JSON.parse(stored) as number[]));
      }
    } catch { /* ignore */ }
  }, []);

  // Load all types
  useEffect(() => {
    pokedexClient
      .allTypes()
      .then((d) => setAllTypes((d ?? []).filter((t) => !HIDDEN_TYPES.has(t.name.toLowerCase()))))
      .catch(() => {});
  }, []);

  // Search
  const doSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    setVisibleCount(12);
    setCardDetails(new Map());
    try {
      let data: PokemonSearchResult[] | null = null;

      if (query.trim()) {
        data = await pokedexClient.searchPokemon(query.trim(), typeFilter, undefined, undefined, FETCH_LIMIT).catch(() => null);
        if (!data || data.length === 0) {
          data = await pokedexClient.fuzzySearchPokemon(query.trim(), FETCH_LIMIT).catch(() => null);
        }
        if (data && typeFilter) {
          data = data.filter((p) => p.types.some((t) => t.toLowerCase() === typeFilter.toLowerCase()));
        }
      } else if (typeFilter) {
        data = await pokedexClient.pokemonByType(typeFilter, FETCH_LIMIT).catch(() => null);
      } else {
        data = await pokedexClient.searchPokemon('', '', undefined, undefined, FETCH_LIMIT).catch(() => null);
      }

      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  // Initial load + type filter changes
  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  // Load full details for visible cards
  const ensureCardDetails = useCallback(async (pokemonId: number) => {
    if (cardDetails.has(pokemonId) || loadingDetails.has(pokemonId)) return;

    setLoadingDetails((prev) => new Set(prev).add(pokemonId));
    try {
      const pokemon = await pokedexClient.pokemonByName(
        results.find((r) => r.id === pokemonId)?.name || ''
      );
      if (!pokemon) return;

      const [moves, evolution] = await Promise.all([
        pokedexClient.pokemonMoves(pokemon.id, '').catch(() => []),
        pokedexClient.evolutionChain(pokemon.species?.id ?? pokemon.id).catch(() => []),
      ]);

      setCardDetails((prev) => {
        const next = new Map(prev);
        next.set(pokemonId, { pokemon, moves, evolution });
        return next;
      });
    } catch { /* ignore */ } finally {
      setLoadingDetails((prev) => {
        const next = new Set(prev);
        next.delete(pokemonId);
        return next;
      });
    }
  }, [cardDetails, loadingDetails, results]);

  // Load details for visible results
  useEffect(() => {
    const visible = results.slice(0, visibleCount);
    visible.forEach((r) => ensureCardDetails(r.id));
  }, [results, visibleCount, ensureCardDetails]);

  // Collect / uncollect
  const handleCollect = useCallback((id: number) => {
    setCollected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        toast({
          title: 'Card collected!',
          description: 'Added to your binder!',
          status: 'success',
          duration: 1500,
          isClosable: true,
          variant: 'solid',
        });
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch { /* ignore */ }
      return next;
    });
  }, [toast]);

  // Filter by rarity (client-side, needs details)
  const filteredResults = useMemo(() => {
    if (!rarityFilter) return results.slice(0, visibleCount);
    return results.filter((r) => {
      const details = cardDetails.get(r.id);
      if (!details) return false;
      return getRarity(details.pokemon) === rarityFilter;
    }).slice(0, visibleCount);
  }, [results, visibleCount, rarityFilter, cardDetails]);

  const totalCollected = collected.size;
  const totalDiscovered = results.length;

  return (
    <VStack spacing={3} align="stretch" maxW="1100px" mx="auto" w="full" pb={{ base: 28, md: 24 }}>
      {/* Header */}
      <HStack justify="space-between">
        <Button leftIcon={<ChevronLeftIcon />} variant="ghost" size="sm" onClick={onBack}>
          Back to Lab
        </Button>
        <Badge colorScheme="yellow" fontSize="xs">🃏 Card Library</Badge>
      </HStack>

      <HStack spacing={4} align="center">
        <Text fontSize="xl" fontWeight="bold">
          🃏 Pokemon Card Library
        </Text>
        <Badge colorScheme="green" fontSize="xs" borderRadius="full" px={3}>
          {totalCollected} collected
        </Badge>
      </HStack>

      {/* Search bar */}
      <HStack>
        <InputGroup>
          <InputLeftElement>
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search for a Pokemon... (try pikachu!)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            bg="rgba(255,255,255,0.05)"
            borderColor="whiteAlpha.200"
          />
        </InputGroup>
        <Button colorScheme="purple" onClick={doSearch} isLoading={loading}>
          Search
        </Button>
      </HStack>

      {/* Type filter chips */}
      <Wrap spacing={1}>
        <WrapItem>
          <Button
            size="xs"
            onClick={() => setTypeFilter('')}
            bg={typeFilter === '' ? 'purple.500' : 'whiteAlpha.100'}
            color={typeFilter === '' ? 'white' : 'gray.400'}
            borderRadius="full"
          >
            All Types
          </Button>
        </WrapItem>
        {allTypes.map((t) => (
          <WrapItem key={t.id}>
            <Button
              size="xs"
              onClick={() => setTypeFilter(t.name)}
              bg={typeFilter === t.name ? getTypeColor(t.name) : `${getTypeColor(t.name)}30`}
              color={typeFilter === t.name ? 'white' : getTypeColor(t.name)}
              borderRadius="full"
            >
              {getTypeEmoji(t.name)} {t.name}
            </Button>
          </WrapItem>
        ))}
      </Wrap>

      {/* Rarity filter chips */}
      <HStack spacing={1}>
        <Text fontSize="xs" color="gray.400" fontWeight="bold">Rarity:</Text>
        {(['', 'common', 'rare', 'epic', 'legendary'] as const).map((r) => (
          <Button
            key={r}
            size="xs"
            variant={rarityFilter === r ? 'solid' : 'ghost'}
            colorScheme={rarityFilter === r ? 'purple' : undefined}
            onClick={() => setRarityFilter(r)}
            fontSize="xs"
            borderRadius="full"
          >
            {r === '' ? 'All' : `${RARITY_STYLES[r].emoji} ${RARITY_STYLES[r].label}`}
          </Button>
        ))}
      </HStack>

      {/* Results */}
      {loading ? (
        <VStack justify="center" h="300px">
          <Spinner color="purple.400" size="lg" />
          <Text fontSize="sm" color="gray.400">Loading cards...</Text>
        </VStack>
      ) : filteredResults.length === 0 ? (
        <VStack justify="center" h="300px">
          <Text fontSize="4xl">🔍</Text>
          <Text fontSize="sm" color="gray.400">
            {hasSearched ? 'No cards found. Try a different search!' : 'Search for Pokemon to see cards!'}
          </Text>
        </VStack>
      ) : (
        <>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4} justifyItems="center">
            {filteredResults.map((result) => {
              const details = cardDetails.get(result.id);
              if (!details) {
                // Loading placeholder card
                return (
                  <Box
                    key={result.id}
                    w="220px"
                    h="320px"
                    borderRadius="xl"
                    border="2px solid"
                    borderColor="whiteAlpha.100"
                    bg="rgba(20,20,30,0.6)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <VStack spacing={2}>
                      <Spinner color="purple.400" size="sm" />
                      <Text fontSize="xs" color="gray.500">Loading...</Text>
                    </VStack>
                  </Box>
                );
              }
              return (
                <PokemonCard
                  key={result.id}
                  pokemon={details.pokemon}
                  moves={details.moves}
                  evolution={details.evolution}
                  isCollected={collected.has(result.id)}
                  onCollect={handleCollect}
                  onSelect={onPokemonSelect}
                />
              );
            })}
          </SimpleGrid>

          {/* Load more */}
          {visibleCount < results.length && (
            <HStack justify="center" pt={2}>
              <Button
                size="sm"
                variant="outline"
                colorScheme="purple"
                onClick={() => setVisibleCount((v) => v + 12)}
              >
                Load more cards ({results.length - visibleCount} remaining)
              </Button>
            </HStack>
          )}

          {/* Collection progress */}
          <Box
            bg="rgba(168,85,247,0.1)"
            borderRadius="md"
            p={3}
            border="1px solid"
            borderColor="purple.400"
          >
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" fontWeight="bold" color="purple.300">
                📒 Your Collection
              </Text>
              <Text fontSize="xs" color="gray.400">
                {totalCollected} / {totalDiscovered || FETCH_LIMIT} cards collected
              </Text>
            </HStack>
            <Progress
              value={totalDiscovered > 0 ? (totalCollected / totalDiscovered) * 100 : 0}
              colorScheme="purple"
              size="sm"
              borderRadius="full"
              bg="whiteAlpha.200"
            />
          </Box>
        </>
      )}
    </VStack>
  );
}
