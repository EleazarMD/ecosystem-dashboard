/**
 * SkillMap — Narrative island map projecting skills + prerequisites.
 *
 * Replaces the linear trail with an explorable world map (§3.B):
 * - Each domain becomes an "island" (Counting Island, Shapes Forest, etc.)
 * - Skills within a domain are nodes on the island
 * - Mastery restores color/scene (greyed = unexplored, colored = explored)
 * - Prerequisite edges show as dotted paths between islands
 * - Tapping an island launches the relevant path or studio
 *
 * Contract: docs/LEARNING_PATH_STUDIO_REVIEW_2026-06.md §3.B
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, Spinner, Center,
  SimpleGrid, Tooltip, Circle, useBreakpointValue, IconButton, Collapse,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { keyframes } from '@emotion/react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useChildTheme } from '../ChildThemeProvider';
import { useLearningSounds } from '@/hooks/useLearningSounds';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillMapSkill {
  skillCode: string;
  skillName: string;
  currentScore: number;
  assessmentsCount: number;
}

export interface SkillMapDomain {
  domainCode: string;
  domainName: string;
  avgScore: number;
  skillsCount: number;
  skillsProficient: number;
  skills: SkillMapSkill[];
}

export interface SkillMapData {
  childId: string;
  childName?: string;
  overallScore: number;
  domains: SkillMapDomain[];
}

// ---------------------------------------------------------------------------
// Domain → island theme mapping
// ---------------------------------------------------------------------------

interface IslandTheme {
  emoji: string;
  color: string;
  description: string;
  route: string;
}

const DOMAIN_ISLANDS: Record<string, IslandTheme> = {
  math: {
    emoji: '🌋',
    color: '#805ad5',
    description: 'Counting Island — where numbers come alive!',
    route: '/child/learn',
  },
  reading: {
    emoji: '📚',
    color: '#3182ce',
    description: 'Story Forest — adventures in every book!',
    route: '/child/book-explorer',
  },
  writing: {
    emoji: '✒️',
    color: '#d69e2e',
    description: 'Inkwell Peninsula — craft your own stories!',
    route: '/child/journal',
  },
  analytical: {
    emoji: '🧩',
    color: '#38a169',
    description: 'Logic Lagoon — puzzles and patterns!',
    route: '/child/pokemon-lab',
  },
  science: {
    emoji: '🔬',
    color: '#dd6b20',
    description: 'Discovery Bay — explore the wonders of science!',
    route: '/child/learn',
  },
  social: {
    emoji: '🌍',
    color: '#d53f8c',
    description: 'Community Cove — people and places!',
    route: '/child/learn',
  },
  art: {
    emoji: '🎨',
    color: '#e53e3e',
    description: 'Creative Cape — express yourself!',
    route: '/child/art-studio',
  },
};

const DEFAULT_ISLAND: IslandTheme = {
  emoji: '🏝️',
  color: '#9f7aea',
  description: 'A mysterious island waiting to be explored!',
  route: '/child/learn',
};

function getIslandTheme(domainCode: string): IslandTheme {
  return DOMAIN_ISLANDS[domainCode] || DEFAULT_ISLAND;
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 8px currentColor; }
  50% { box-shadow: 0 0 16px currentColor; }
`;

const shimmer = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 0.7; }
  100% { opacity: 0.4; }
`;

// ---------------------------------------------------------------------------
// Island card
// ---------------------------------------------------------------------------

interface IslandCardProps {
  domain: SkillMapDomain;
  isSelected?: boolean;
  onSelect: (domain: SkillMapDomain) => void;
  onClose: () => void;
}

function IslandCard({ domain, isSelected, onSelect, onClose }: IslandCardProps) {
  const { colors } = useChildTheme();
  const sounds = useLearningSounds();
  const theme = getIslandTheme(domain.domainCode);
  const isExplored = domain.skillsProficient > 0;
  const isMastered = domain.avgScore >= 0.7;
  const isStarted = domain.skills.some((s) => s.assessmentsCount > 0);

  const masteryPct = Math.round(domain.avgScore * 100);

  return (
    <Box>
      <Box
        position="relative"
        borderRadius="2xl"
        overflow="hidden"
        p={5}
        textAlign="center"
        bg={isExplored ? `linear-gradient(135deg, ${theme.color}25 0%, ${theme.color}08 100%)` : colors.backgroundSecondary}
        border="2px solid"
        borderColor={isSelected ? theme.color : isExplored ? `${theme.color}50` : colors.border}
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        _hover={{
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: `0 8px 24px ${theme.color}30`,
          borderColor: theme.color,
        }}
        _active={{ transform: 'translateY(-1px) scale(1.01)' }}
        animation={isExplored ? `${float} 3s ease-in-out infinite` : undefined}
      >
        {/* Magnifying glass trigger */}
        <Tooltip label={`Learn more about ${domain.domainName}`} placement="top" hasArrow openDelay={400}>
          <IconButton
            aria-label={`Learn more about ${domain.domainName}`}
            icon={<SearchIcon />}
            size="xs"
            variant="ghost"
            colorScheme="blue"
            position="absolute"
            top={2}
            right={2}
            opacity={0.7}
            _hover={{ opacity: 1, transform: 'scale(1.1)' }}
            transition="all 0.15s ease"
            onClick={(e) => {
              e.stopPropagation();
              sounds.play('click');
              onSelect(domain);
            }}
          />
        </Tooltip>

        {/* Island emoji */}
        <Box
          as="button"
          w="full"
          onClick={() => {
            sounds.play('click');
            onSelect(domain);
          }}
          cursor="pointer"
        >
          <Center mb={3}>
            <Circle
              size="64px"
              bg={isExplored ? `${theme.color}20` : `${colors.border}20`}
              animation={isMastered ? `${glow} 2s ease-in-out infinite` : undefined}
              color={theme.color}
            >
              <Text fontSize="3xl" opacity={isExplored ? 1 : 0.4} filter={isExplored ? 'none' : 'grayscale(1)'}>
                {theme.emoji}
              </Text>
            </Circle>
          </Center>

          {/* Island name */}
          <Text
            fontWeight="800"
            fontSize="sm"
            color={isExplored ? colors.text : colors.textSecondary}
            letterSpacing="-0.01em"
            mb={1}
          >
            {domain.domainName}
          </Text>

          {/* Mastery indicator */}
          {isStarted ? (
            <VStack spacing={1}>
              <Text fontSize="2xs" color={colors.textSecondary} fontWeight="600">
                {masteryPct}% mastered
              </Text>
              <HStack spacing={1} justify="center">
                <Badge fontSize="2xs" colorScheme="green" variant="subtle" borderRadius="full" px={2}>
                  {domain.skillsProficient}/{domain.skillsCount} ⭐
                </Badge>
              </HStack>
            </VStack>
          ) : (
            <Badge fontSize="2xs" colorScheme="gray" variant="subtle" borderRadius="full" px={2}>
              Unexplored
            </Badge>
          )}
        </Box>

        {/* Fog overlay for unexplored islands */}
        {!isExplored && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg={colors.backgroundSecondary}
            opacity={0.3}
            animation={`${shimmer} 4s ease-in-out infinite`}
            pointerEvents="none"
          />
        )}
      </Box>

      {/* Inline skill detail panel at eye level */}
      <Collapse in={isSelected}>
        <SkillDetailPanel domain={domain} onClose={onClose} />
      </Collapse>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Skill detail popover
// ---------------------------------------------------------------------------

function SkillDetailPanel({ domain, onClose }: { domain: SkillMapDomain; onClose: () => void }) {
  const { colors } = useChildTheme();
  const router = useRouter();
  const sounds = useLearningSounds();
  const theme = getIslandTheme(domain.domainCode);

  const handleExplore = () => {
    sounds.play('whoosh');
    router.push(theme.route);
  };

  return (
    <Box
      bg={colors.background}
      borderRadius="xl"
      p={4}
      mt={3}
      border="2px solid"
      borderColor={`${theme.color}40`}
      boxShadow="md"
      w="full"
    >
      <VStack spacing={3} align="stretch">
        {/* Header */}
        <HStack spacing={3} justify="space-between">
          <HStack spacing={3}>
            <Circle size="40px" bg={`${theme.color}20`}>
              <Text fontSize="xl">{theme.emoji}</Text>
            </Circle>
            <VStack align="start" spacing={0}>
              <Text fontWeight="800" fontSize="md" color={colors.text}>
                {domain.domainName}
              </Text>
              <Text fontSize="2xs" color={colors.textSecondary}>
                {theme.description}
              </Text>
            </VStack>
          </HStack>
          <IconButton
            aria-label="Close"
            icon={<Text fontSize="sm">✕</Text>}
            size="xs"
            variant="ghost"
            onClick={onClose}
          />
        </HStack>

        {/* Stats */}
        <HStack spacing={3} justify="center">
          <Badge colorScheme="green" variant="subtle" borderRadius="full" px={3}>
            {domain.skillsProficient}/{domain.skillsCount} mastered
          </Badge>
          <Badge colorScheme="blue" variant="subtle" borderRadius="full" px={3}>
            {Math.round(domain.avgScore * 100)}% avg
          </Badge>
        </HStack>

        {/* Skill list */}
        <VStack spacing={2} align="stretch" maxH="180px" overflowY="auto">
          {domain.skills.map((skill) => (
            <HStack key={skill.skillCode} justify="space-between" px={3} py={2} borderRadius="lg" bg={colors.backgroundSecondary}>
              <Text fontSize="xs" color={colors.text} fontWeight="600">
                {skill.skillName}
              </Text>
              <HStack spacing={2}>
                <Box
                  w="60px"
                  h="6px"
                  borderRadius="full"
                  bg={colors.border}
                  overflow="hidden"
                >
                  <Box
                    h="full"
                    w={`${Math.round(skill.currentScore * 100)}%`}
                    bg={skill.currentScore >= 0.7 ? 'green.400' : skill.currentScore >= 0.4 ? 'yellow.400' : 'red.400'}
                    borderRadius="full"
                    transition="width 0.5s"
                  />
                </Box>
                <Text fontSize="2xs" color={colors.textSecondary} fontWeight="700" w="30px" textAlign="right">
                  {Math.round(skill.currentScore * 100)}%
                </Text>
              </HStack>
            </HStack>
          ))}
        </VStack>

        {/* CTA */}
        <Button
          colorScheme="purple"
          size="sm"
          borderRadius="full"
          leftIcon={<Text>🚀</Text>}
          onClick={handleExplore}
        >
          Explore {domain.domainName}!
        </Button>
      </VStack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main SkillMap component
// ---------------------------------------------------------------------------

interface SkillMapProps {
  childId?: string;
  /** Compact mode — fewer details, smaller islands. */
  compact?: boolean;
}

export function SkillMap({ childId, compact = false }: SkillMapProps) {
  const { colors } = useChildTheme();
  const { data: session } = useSession();
  const sounds = useLearningSounds();
  const effectiveChildId = childId || session?.user?.id;
  const [data, setData] = useState<SkillMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<SkillMapDomain | null>(null);

  const loadMap = useCallback(async () => {
    if (!effectiveChildId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/child/stats?childId=${encodeURIComponent(effectiveChildId)}`);
      if (res.ok) {
        const stats = await res.json();
        // Transform stats into SkillMapData shape
        let domains: SkillMapDomain[] = (stats.focusSkills || []).map((s: any) => ({
          domainCode: s.domainCode || s.skillCode?.split('.')[0] || 'default',
          domainName: s.domainName || s.name || s.skillCode || 'Unknown',
          avgScore: s.mastery || 0,
          skillsCount: s.skillsCount || 1,
          skillsProficient: s.mastery >= 0.7 ? 1 : 0,
          skills: [{
            skillCode: s.skillCode || s.name,
            skillName: s.name || s.skillCode,
            currentScore: s.mastery || 0,
            assessmentsCount: s.assessmentsCount || 0,
          }],
        }));

        // If we have domain-level data from the stats endpoint, use it
        if (stats.domains && Array.isArray(stats.domains)) {
          domains = stats.domains;
        }

        setData({
          childId: effectiveChildId,
          childName: stats.childName,
          overallScore: stats.overallScore || 0,
          domains,
        });
      }
    } catch {
      // Silent fallback
    } finally {
      setLoading(false);
    }
  }, [effectiveChildId]);

  React.useEffect(() => {
    loadMap();
  }, [loadMap]);

  const gridCols = useBreakpointValue({ base: 2, sm: 3, md: 4 }) || 3;

  if (loading) {
    return (
      <Box
        borderRadius="2xl"
        p={8}
        bg={colors.backgroundSecondary}
        border="2px solid"
        borderColor={colors.border}
        minH="200px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={3}>
          <Spinner size="lg" color={colors.primary} />
          <Text fontSize="sm" color={colors.textSecondary}>Mapping your islands...</Text>
        </VStack>
      </Box>
    );
  }

  if (!data || data.domains.length === 0) {
    return (
      <Box
        borderRadius="2xl"
        p={8}
        bg={colors.backgroundSecondary}
        border="2px solid"
        borderColor={colors.border}
        textAlign="center"
      >
        <Text fontSize="4xl" mb={2}>🗺️</Text>
        <Text fontWeight="700" fontSize="md" color={colors.text} mb={1}>
          Your adventure map is waiting!
        </Text>
        <Text fontSize="sm" color={colors.textSecondary}>
          Start a learning activity to discover your first island.
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" w="full">
      {/* Map header */}
      <HStack justify="space-between" px={1}>
        <HStack spacing={2}>
          <Text fontSize="2xl">🗺️</Text>
          <Box>
            <Text fontWeight="800" fontSize="md" color={colors.text}>
              Skill World Map
            </Text>
            <Text fontSize="xs" color={colors.textSecondary}>
              {data.domains.filter((d) => d.skillsProficient > 0).length} of {data.domains.length} islands discovered
            </Text>
          </Box>
        </HStack>
        <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={3} py={1}>
          {Math.round(data.overallScore * 100)}% World Mastery
        </Badge>
      </HStack>

      {/* Island grid */}
      <SimpleGrid columns={gridCols} spacing={compact ? 2 : 4}>
        {data.domains.map((domain) => (
          <IslandCard
            key={domain.domainCode}
            domain={domain}
            isSelected={selectedDomain?.domainCode === domain.domainCode}
            onSelect={(d) => {
              sounds.play('reveal');
              setSelectedDomain(d);
            }}
            onClose={() => {
              sounds.play('click');
              setSelectedDomain(null);
            }}
          />
        ))}
      </SimpleGrid>
    </VStack>
  );
}
