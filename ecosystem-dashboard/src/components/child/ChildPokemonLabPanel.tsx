import React from 'react';
import { Box, VStack, HStack, Text, Badge, Divider, Wrap, WrapItem } from '@chakra-ui/react';
import { ChildTutorTab } from './ChildTutorTab';
import { KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';
import { useChildTheme } from './ChildThemeProvider';
import { StreakFlame, MasteryBar, LevelChip } from './learning-kit';

interface ChildPokemonLabPanelProps {
  activeTab: string;
}

const CORE_CONCEPTS = [
  { name: 'Nodes', emoji: '🔵', note: 'Things like Pokémon, types, and moves.', mastery: 70 },
  { name: 'Edges', emoji: '🔗', note: 'Connections between things.', mastery: 45 },
  { name: 'Properties', emoji: '🏷️', note: 'Details like level, power, or category.', mastery: 30 },
  { name: 'Queries', emoji: '❓', note: 'Questions that search the graph.', mastery: 15 },
];

export default function ChildPokemonLabPanel({ activeTab }: ChildPokemonLabPanelProps) {
  const { colors } = useChildTheme();

  return (
    <Box h="full" display="flex" flexDirection="column">
      {activeTab === 'chat' && (
        <ChildTutorTab
          defaultActivityId={KNOWN_ACTIVITY_IDS.POKEMON_LAB}
          defaultTitle="Professor Lab"
        />
      )}

      {activeTab === 'concepts' && (
        <VStack spacing={4} align="stretch" p={4} overflowY="auto">
          {/* Gamification header */}
          <HStack justify="space-between" px={1}>
            <HStack spacing={2}>
              <StreakFlame days={7} size="sm" />
              <LevelChip level={5} xp={340} xpToNext={500} />
            </HStack>
          </HStack>

          <Divider />

          <HStack spacing={3}>
            <Text fontSize="2xl">🕸️</Text>
            <Box>
              <Text fontWeight="700" fontSize="sm" color={colors.text}>Graph Concepts</Text>
              <Text fontSize="xs" color={colors.textMuted}>Core ideas for Pokémon Lab lessons.</Text>
            </Box>
          </HStack>

          <Divider />

          <VStack spacing={3} align="stretch">
            {CORE_CONCEPTS.map((concept) => (
              <Box key={concept.name} p={3} borderRadius="lg" bg={colors.backgroundTertiary} border="1px solid" borderColor={colors.border}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="600" color={colors.text}>
                    {concept.emoji} {concept.name}
                  </Text>
                  <Badge colorScheme="purple" fontSize="2xs">Lab</Badge>
                </HStack>
                <Text fontSize="xs" color={colors.textMuted} mb={2.5}>{concept.note}</Text>
                <MasteryBar label="Mastery" value={concept.mastery} segments={5} size="sm" />
              </Box>
            ))}
          </VStack>

          <Box>
            <Text fontSize="xs" fontWeight="700" letterSpacing="0.02em" color={colors.textSecondary} mb={3}>
              🧭 Focus Skills
            </Text>
            <Wrap spacing={2}>
              <WrapItem><Badge colorScheme="blue">Sorting</Badge></WrapItem>
              <WrapItem><Badge colorScheme="green">Pattern Finding</Badge></WrapItem>
              <WrapItem><Badge colorScheme="orange">Query Thinking</Badge></WrapItem>
              <WrapItem><Badge colorScheme="pink">Data Stories</Badge></WrapItem>
            </Wrap>
          </Box>
        </VStack>
      )}

      {activeTab !== 'chat' && activeTab !== 'concepts' && (
        <VStack spacing={2} align="stretch" p={2}>
          <Text fontSize="sm" fontWeight="bold">Pokémon Lab Panel</Text>
          <Text fontSize="xs" color="gray.500">Choose a tab to continue.</Text>
        </VStack>
      )}
    </Box>
  );
}
