/**
 * DailyMissionCard — hero card showing today's learning mission.
 *
 * Surfaces on Home and the top of the Learning Path as a
 * "Start today's adventure" call-to-action. Shows the 3-phase structure:
 *   1. Review Burst (spaced-review warm-up)
 *   2. Focus Step (new learning)
 *   3. Reflection (metacognition)
 *
 * Contract: docs/LEARNING_PATH_STUDIO_REVIEW_2026-06.md §3.C
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, Spinner, Center,
  Progress, Collapse, useToast,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiPlay, FiCheckCircle, FiZap, FiHeart, FiChevronDown } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useChildTheme } from '../ChildThemeProvider';
import { useLearningSounds } from '@/hooks/useLearningSounds';

export interface DailyMissionData {
  id: string;
  childId: string;
  date: string;
  title: string;
  emoji: string;
  description: string;
  reviewBurst: Array<{ skillCode: string; skillName: string; emoji: string }>;
  focus: {
    skillCode: string;
    skillName: string;
    title: string;
    prompt: string;
    emoji: string;
    contentItemId?: string;
    pathId?: string;
    pathStepNumber?: number;
  } | null;
  reflection: { prompt: string; emoji: string };
  estimatedCards: number;
  skillCodes: string[];
  route: string;
}

interface DailyMissionCardProps {
  childId?: string;
  /** Compact mode for the home panel (fewer details). */
  compact?: boolean;
  /** Called when the child taps "Start". */
  onStart?: (mission: DailyMissionData) => void;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export function DailyMissionCard({ childId, compact = false, onStart }: DailyMissionCardProps) {
  const { colors } = useChildTheme();
  const router = useRouter();
  const toast = useToast();
  const sounds = useLearningSounds();
  const { data: session } = useSession();
  const effectiveChildId = childId || session?.user?.id;
  const [mission, setMission] = useState<DailyMissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadMission = useCallback(async () => {
    if (!effectiveChildId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/child/daily-mission?childId=${encodeURIComponent(effectiveChildId)}`);
      if (res.ok) {
        const data = (await res.json()) as DailyMissionData;
        setMission(data);
      }
    } catch {
      // Silent fallback — the card just won't show
    } finally {
      setLoading(false);
    }
  }, [effectiveChildId]);

  useEffect(() => {
    loadMission();
  }, [loadMission]);

  const handleStart = () => {
    if (!mission) return;
    sounds.play('click');
    onStart?.(mission);
    router.push(mission.route);
  };

  if (loading) {
    return (
      <Box
        borderRadius="2xl"
        p={6}
        bg={colors.backgroundSecondary}
        border="2px solid"
        borderColor={colors.border}
        minH="120px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="lg" color={colors.primary} />
      </Box>
    );
  }

  if (!mission) {
    return null;
  }

  const hasReview = mission.reviewBurst.length > 0;
  const hasFocus = !!mission.focus;

  return (
    <Box
      as="button"
      onClick={handleStart}
      w="full"
      textAlign="left"
      position="relative"
      borderRadius="2xl"
      overflow="hidden"
      p={compact ? 4 : 6}
      bg={`linear-gradient(135deg, ${colors.primary}25 0%, ${colors.primary}08 100%)`}
      border="2px solid"
      borderColor={`${colors.primary}50`}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        transform: 'translateY(-3px)',
        boxShadow: `0 8px 30px ${colors.primary}30`,
        borderColor: colors.primary,
      }}
      _active={{
        transform: 'translateY(-1px)',
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Shimmer accent bar */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        bg={`linear-gradient(90deg, transparent, ${colors.primary}, transparent)`}
        backgroundSize="200% 100%"
        animation={`${shimmer} 3s linear infinite`}
      />

      <HStack spacing={4} align="start">
        {/* Mission emoji */}
        <Box
          flexShrink={0}
          w="56px"
          h="56px"
          borderRadius="full"
          bg={`${colors.primary}20`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          animation={`${pulse} 2s ease-in-out infinite`}
        >
          <Text fontSize="2xl">{mission.emoji}</Text>
        </Box>

        <VStack align="start" spacing={2} flex={1}>
          {/* Badge */}
          <HStack spacing={2}>
            <Badge
              colorScheme="purple"
              fontSize="2xs"
              borderRadius="full"
              px={2}
              py={0.5}
            >
              🎯 Today's Adventure
            </Badge>
            <Badge
              fontSize="2xs"
              borderRadius="full"
              px={2}
              py={0.5}
              variant="subtle"
              colorScheme="blue"
            >
              ~{mission.estimatedCards} cards
            </Badge>
          </HStack>

          {/* Title */}
          <Text
            fontWeight="800"
            fontSize={compact ? 'md' : 'lg'}
            color={colors.text}
            letterSpacing="-0.01em"
          >
            {mission.title}
          </Text>

          {/* Description */}
          <Text fontSize="sm" color={colors.textSecondary} noOfLines={2}>
            {mission.description}
          </Text>

          {/* Phase pills (non-compact only) */}
          {!compact && (
            <HStack spacing={2} mt={1} flexWrap="wrap">
              {hasReview && (
                <HStack spacing={1}>
                  <Badge fontSize="2xs" colorScheme="green" variant="subtle" borderRadius="full" px={2}>
                    🔁 {mission.reviewBurst.length} review{mission.reviewBurst.length > 1 ? 's' : ''}
                  </Badge>
                </HStack>
              )}
              {hasFocus && (
                <Badge fontSize="2xs" colorScheme="blue" variant="subtle" borderRadius="full" px={2}>
                  ⭐ {mission.focus!.skillName}
                </Badge>
              )}
              <Badge fontSize="2xs" colorScheme="purple" variant="subtle" borderRadius="full" px={2}>
                {mission.reflection.emoji} Reflect
              </Badge>
            </HStack>
          )}

          {/* Expandable detail (non-compact only) */}
          {!compact && (
            <Box w="full" mt={1}>
              <Collapse in={expanded}>
                <VStack spacing={2} align="stretch" mt={2}>
                  {/* Review burst */}
                  {hasReview && (
                    <Box>
                      <Text fontSize="2xs" fontWeight="700" color={colors.textSecondary} mb={1}>
                        WARM-UP REVIEW
                      </Text>
                      <HStack spacing={1} flexWrap="wrap">
                        {mission.reviewBurst.map((item, i) => (
                          <Badge
                            key={i}
                            fontSize="2xs"
                            variant="outline"
                            colorScheme="green"
                            borderRadius="full"
                            px={2}
                          >
                            {item.emoji} {item.skillName}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                  )}

                  {/* Focus */}
                  {hasFocus && (
                    <Box>
                      <Text fontSize="2xs" fontWeight="700" color={colors.textSecondary} mb={1}>
                        NEW LEARNING
                      </Text>
                      <Text fontSize="xs" color={colors.text}>
                        {mission.focus!.emoji} {mission.focus!.title}
                      </Text>
                    </Box>
                  )}

                  {/* Reflection */}
                  <Box>
                    <Text fontSize="2xs" fontWeight="700" color={colors.textSecondary} mb={1}>
                      REFLECTION
                    </Text>
                    <Text fontSize="xs" color={colors.text} fontStyle="italic">
                      {mission.reflection.emoji} {mission.reflection.prompt}
                    </Text>
                  </Box>
                </VStack>
              </Collapse>

              <HStack
                spacing={1}
                mt={2}
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                  sounds.play('click');
                }}
              >
                <Text fontSize="2xs" color={colors.textSecondary} fontWeight="600">
                  {expanded ? 'Less detail' : 'More detail'}
                </Text>
                <Box
                  as={FiChevronDown}
                  size="12px"
                  color={colors.textSecondary}
                  style={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </HStack>
            </Box>
          )}

          {/* CTA */}
          <HStack spacing={2} mt={2}>
            <Button
              size="sm"
              colorScheme="purple"
              leftIcon={<FiPlay />}
              borderRadius="full"
              onClick={(e) => {
                e.stopPropagation();
                handleStart();
              }}
            >
              Start Adventure!
            </Button>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}
