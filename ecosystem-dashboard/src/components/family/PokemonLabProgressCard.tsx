/**
 * PokemonLabProgressCard — Phase 9 parent insight component.
 *
 * Surfaces Pokémon Lab lesson completion progress to parents so they can see
 * how fun activities translate into measured learning.
 *
 * Reads from child_activity_log (activity_type = 'pokemon-lab_lesson_complete')
 * and cross-references with LESSON_SKILL_CODES to show which skills were advanced.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Center, Progress, SimpleGrid, Icon,
} from '@chakra-ui/react';
import { FiCheckCircle, FiCircle } from 'react-icons/fi';

interface PokemonLabProgressCardProps {
  childId: string;
}

interface LabLesson {
  lessonId: string;
  skillCode: string;
  completedAt: string;
}

const LESSON_META: Record<string, { title: string; emoji: string; skill: string }> = {
  'spot-the-groups':      { title: 'Spot the Groups', emoji: '🗂️', skill: 'analytical.compare_classify' },
  'count-and-graph':      { title: 'Count & Graph', emoji: '🔢', skill: 'math.data.picture_bar' },
  'everything-connects':  { title: 'Everything Connects', emoji: '🕸️', skill: 'analytical.cause_effect' },
  'follow-the-strings':   { title: 'Follow the Strings', emoji: '🧭', skill: 'analytical.infer_evidence' },
  'strong-and-weak':      { title: 'Strong & Weak', emoji: '⚔️', skill: 'analytical.patterns' },
  'build-your-team':      { title: 'Build Your Team', emoji: '🏆', skill: 'analytical.evaluate' },
  'stat-bars':            { title: 'Stat Bars', emoji: '📊', skill: 'math.data.picture_bar' },
  'whos-typical':         { title: "Who's Typical?", emoji: '📈', skill: 'analytical.patterns' },
  'ask-the-pokedex':      { title: 'Ask the Pokedex', emoji: '🔍', skill: 'analytical.infer_evidence' },
  'talk-to-computer':     { title: 'Talk to the Computer', emoji: '🗣️', skill: 'analytical.infer_evidence' },
  'data-detective':       { title: 'Data Detective', emoji: '🕵️', skill: 'analytical.metacognition' },
  'amazing-forms':        { title: 'Amazing Forms', emoji: '✨', skill: 'analytical.compare_classify' },
};

const TOTAL_LESSONS = 12;

export default function PokemonLabProgressCard({ childId }: PokemonLabProgressCardProps) {
  const [completedLessons, setCompletedLessons] = useState<LabLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/child/activity-progress?activity=pokemon-lab&childId=${childId}`, {
          headers: { 'X-Child-Id': childId },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const lessonIds: string[] = data.completedLessons || [];
          const lessons: LabLesson[] = lessonIds.map((id) => ({
            lessonId: id,
            skillCode: LESSON_META[id]?.skill || 'analytical',
            completedAt: new Date().toISOString(),
          }));
          setCompletedLessons(lessons);
        }
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (loading) {
    return <Center py={4}><Spinner size="sm" color="purple.500" /></Center>;
  }

  const completedIds = new Set(completedLessons.map((l) => l.lessonId));
  const progressPct = (completedIds.size / TOTAL_LESSONS) * 100;
  const uniqueSkills = new Set(completedLessons.map((l) => l.skillCode));

  return (
    <Card borderWidth="1px" borderRadius="lg" borderColor="purple.100">
      <CardBody p={4}>
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Text fontSize="lg">🎮</Text>
              <Text fontWeight="600" fontSize="sm">Pokémon Lab Progress</Text>
            </HStack>
            <Badge colorScheme="purple" fontSize="2xs">
              {completedIds.size}/{TOTAL_LESSONS} lessons
            </Badge>
          </HStack>

          {completedIds.size === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No Pokémon Lab lessons completed yet. Fun activities like Pokémon Lab build
              analytical and data skills that show up in the learning plan.
            </Text>
          ) : (
            <>
              <Progress value={progressPct} size="sm" colorScheme="purple" borderRadius="full" />

              <HStack spacing={4} flexWrap="wrap">
                <Text fontSize="xs" color="gray.500">
                  <strong>{completedIds.size}</strong> lessons completed
                </Text>
                <Text fontSize="xs" color="gray.500">
                  <strong>{uniqueSkills.size}</strong> skills advanced
                </Text>
              </HStack>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={1}>
                {Object.entries(LESSON_META).map(([id, meta]) => {
                  const isDone = completedIds.has(id);
                  return (
                    <HStack key={id} spacing={2}>
                      <Icon
                        as={isDone ? FiCheckCircle : FiCircle}
                        color={isDone ? 'green.400' : 'gray.300'}
                        boxSize={3}
                      />
                      <Text fontSize="2xs">{meta.emoji}</Text>
                      <Text fontSize="xs" color={isDone ? 'gray.700' : 'gray.400'} noOfLines={1}>
                        {meta.title}
                      </Text>
                      {isDone && (
                        <Badge fontSize="2xs" colorScheme="purple" variant="subtle">
                          {meta.skill.split('.')[1]}
                        </Badge>
                      )}
                    </HStack>
                  );
                })}
              </SimpleGrid>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
