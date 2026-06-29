/**
 * Learning Kit — Brilliant-style, theme-aware learning primitives.
 *
 * Inspiration: brilliant.org's learning DNA —
 *   - "Adapts to where you are"  → MasteryBar (segmented concept mastery)
 *   - "Keeps you learning"        → StreakFlame, DailyGoalRing, LevelChip, XPBurst
 *   - "Concepts that click"       → InteractiveLessonCard (see ConceptCheckCard too)
 *
 * Every primitive reads the active child theme via useChildTheme() so it adapts
 * to Minecraft / Pusheen / Pokémon / default skins automatically.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, HStack, VStack, Text, Icon, Tooltip } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiLock, FiCheck, FiStar } from 'react-icons/fi';
import { useChildTheme } from '../ChildThemeProvider';

// Warm flame colors are intentionally fixed (a flame is always warm), the rest
// of the palette comes from the active theme.
const FLAME_WARM = '#FF8A3D';
const FLAME_HOT = '#FFC53D';

const pop = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const floatUp = keyframes`
  0% { transform: translateY(8px); opacity: 0; }
  20% { transform: translateY(0); opacity: 1; }
  80% { transform: translateY(-18px); opacity: 1; }
  100% { transform: translateY(-30px); opacity: 0; }
`;

const flicker = keyframes`
  0%, 100% { transform: scale(1) rotate(-2deg); }
  50% { transform: scale(1.08) rotate(2deg); }
`;

// ─── MasteryBar ──────────────────────────────────────────────────────────────
// Segmented progress that conveys "how close to mastered" a concept is.

export interface MasteryBarProps {
  /** 0–100 mastery percentage. */
  value: number;
  label?: string;
  /** Number of milestone segments (Brilliant-style "levels"). */
  segments?: number;
  /** Show the numeric percentage on the right. */
  showPercent?: boolean;
  size?: 'sm' | 'md';
}

export function MasteryBar({
  value,
  label,
  segments = 5,
  showPercent = true,
  size = 'md',
}: MasteryBarProps) {
  const { colors } = useChildTheme();
  const clamped = Math.max(0, Math.min(100, value));
  const filledSegments = Math.round((clamped / 100) * segments);
  const h = size === 'sm' ? '8px' : '12px';

  const mastered = clamped >= 100;
  const fillColor = mastered ? FLAME_WARM : colors.primary;

  return (
    <Box w="full">
      {(label || showPercent) && (
        <HStack justify="space-between" mb={1}>
          {label && (
            <Text fontSize="xs" fontWeight="600" color={colors.textSecondary} noOfLines={1}>
              {label}
            </Text>
          )}
          {showPercent && (
            <Text fontSize="xs" fontWeight="700" color={fillColor}>
              {mastered ? 'Mastered!' : `${Math.round(clamped)}%`}
            </Text>
          )}
        </HStack>
      )}
      <HStack spacing={1} w="full">
        {Array.from({ length: segments }).map((_, i) => (
          <Box
            key={i}
            flex={1}
            h={h}
            borderRadius="full"
            bg={i < filledSegments ? fillColor : `${colors.textMuted}33`}
            transition="background 0.4s ease"
          />
        ))}
      </HStack>
    </Box>
  );
}

// ─── StreakFlame ───────────────────────────────────────────────────────────────

export interface StreakFlameProps {
  days: number;
  size?: 'sm' | 'md' | 'lg';
  /** Dim when the streak is at risk / inactive today. */
  active?: boolean;
}

export function StreakFlame({ days, size = 'md', active = true }: StreakFlameProps) {
  const { colors } = useChildTheme();
  const fontSize = size === 'lg' ? '2xl' : size === 'sm' ? 'md' : 'xl';
  const numSize = size === 'lg' ? 'xl' : size === 'sm' ? 'xs' : 'md';

  return (
    <Tooltip label={`${days}-day streak — keep it going!`} hasArrow>
      <HStack
        spacing={1}
        px={2}
        py={1}
        borderRadius="full"
        bg={active ? `${FLAME_WARM}22` : `${colors.textMuted}1A`}
        border="1px solid"
        borderColor={active ? `${FLAME_WARM}55` : 'transparent'}
      >
        <Box
          as="span"
          fontSize={fontSize}
          animation={active && days > 0 ? `${flicker} 1.6s ease-in-out infinite` : undefined}
          filter={active ? 'none' : 'grayscale(1)'}
          opacity={active ? 1 : 0.6}
        >
          🔥
        </Box>
        <Text fontSize={numSize} fontWeight="800" color={active ? FLAME_WARM : colors.textMuted}>
          {days}
        </Text>
      </HStack>
    </Tooltip>
  );
}

// ─── DailyGoalRing ───────────────────────────────────────────────────────────

export interface DailyGoalRingProps {
  /** Current progress count. */
  value: number;
  /** Goal target count. */
  goal: number;
  size?: number;
  label?: string;
}

export function DailyGoalRing({ value, goal, size = 64, label }: DailyGoalRingProps) {
  const { colors } = useChildTheme();
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;
  const complete = value >= goal && goal > 0;
  const ringColor = complete ? FLAME_WARM : colors.accent;

  return (
    <VStack spacing={1}>
      <Box position="relative" w={`${size}px`} h={`${size}px`}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`${colors.textMuted}2A`}
            strokeWidth={8}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <Box
          position="absolute"
          inset={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
        >
          {complete ? (
            <Icon as={FiCheck} color={ringColor} boxSize={5} />
          ) : (
            <Text fontSize="sm" fontWeight="800" color={colors.text}>
              {value}/{goal}
            </Text>
          )}
        </Box>
      </Box>
      {label && (
        <Text fontSize="2xs" color={colors.textMuted} fontWeight="600">
          {label}
        </Text>
      )}
    </VStack>
  );
}

// ─── LevelChip ───────────────────────────────────────────────────────────────

export interface LevelChipProps {
  level: number;
  /** XP into the current level. */
  xp?: number;
  /** XP needed to reach the next level. */
  xpToNext?: number;
}

export function LevelChip({ level, xp, xpToNext }: LevelChipProps) {
  const { colors } = useChildTheme();
  const pct = xp != null && xpToNext ? Math.min(1, xp / xpToNext) : null;

  return (
    <Tooltip
      label={pct != null ? `${xp} / ${xpToNext} XP to level ${level + 1}` : `Level ${level}`}
      hasArrow
    >
      <HStack
        spacing={2}
        px={2.5}
        py={1}
        borderRadius="full"
        bg={`${colors.primary}1A`}
        border="1px solid"
        borderColor={`${colors.primary}40`}
      >
        <HStack spacing={1}>
          <Icon as={FiStar} color={colors.primary} boxSize={3.5} />
          <Text fontSize="xs" fontWeight="800" color={colors.primary}>
            Lv {level}
          </Text>
        </HStack>
        {pct != null && (
          <Box w="42px" h="5px" borderRadius="full" bg={`${colors.primary}26`} overflow="hidden">
            <Box w={`${pct * 100}%`} h="full" bg={colors.primary} transition="width 0.5s ease" />
          </Box>
        )}
      </HStack>
    </Tooltip>
  );
}

// ─── XPBurst ─────────────────────────────────────────────────────────────────
// Floating "+N XP" celebratory feedback. Render conditionally on a reward.

export interface XPBurstProps {
  amount: number;
  show: boolean;
}

export function XPBurst({ amount, show }: XPBurstProps) {
  if (!show) return null;
  return (
    <Box
      position="absolute"
      top="-6px"
      left="50%"
      transform="translateX(-50%)"
      pointerEvents="none"
      animation={`${floatUp} 1.2s ease-out forwards`}
      zIndex={20}
    >
      <Text fontSize="sm" fontWeight="900" color={FLAME_HOT} textShadow="0 1px 2px rgba(0,0,0,0.25)">
        +{amount} XP
      </Text>
    </Box>
  );
}

// ─── InteractiveLessonCard ─────────────────────────────────────────────────────

export type LessonStatus = 'locked' | 'available' | 'in-progress' | 'mastered';

export interface InteractiveLessonCardProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  status?: LessonStatus;
  /** 0–100 progress, shown for in-progress lessons. */
  progress?: number;
  onClick?: () => void;
}

export function InteractiveLessonCard({
  emoji = '📘',
  title,
  subtitle,
  status = 'available',
  progress = 0,
  onClick,
}: InteractiveLessonCardProps) {
  const { colors, effectiveTheme } = useChildTheme();
  const surface = effectiveTheme.surface;
  const cardBg = surface?.card ?? colors.backgroundSecondary;
  const locked = status === 'locked';
  const mastered = status === 'mastered';

  const borderColor = mastered
    ? FLAME_WARM
    : status === 'in-progress'
      ? colors.primary
      : `${colors.border}`;

  return (
    <Box
      as="button"
      onClick={locked ? undefined : onClick}
      textAlign="left"
      w="full"
      p={3}
      borderRadius="2xl"
      bg={cardBg}
      border="2px solid"
      borderColor={borderColor}
      opacity={locked ? 0.55 : 1}
      cursor={locked ? 'not-allowed' : 'pointer'}
      transition="all 0.2s cubic-bezier(0.4,0,0.2,1)"
      animation={`${pop} 0.35s ease-out`}
      _hover={locked ? undefined : { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${colors.primary}22` }}
      position="relative"
    >
      <HStack spacing={3} align="start">
        <Box
          w="44px"
          h="44px"
          minW="44px"
          borderRadius="xl"
          bg={mastered ? `${FLAME_WARM}22` : `${colors.primary}18`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="xl"
          position="relative"
        >
          {emoji}
          {mastered && (
            <Box position="absolute" bottom="-4px" right="-4px" bg={FLAME_WARM} borderRadius="full" p="2px">
              <Icon as={FiCheck} color="white" boxSize={2.5} />
            </Box>
          )}
          {locked && (
            <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" bg="blackAlpha.300" borderRadius="xl">
              <Icon as={FiLock} color="white" boxSize={4} />
            </Box>
          )}
        </Box>
        <VStack align="stretch" spacing={1} flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="700" color={colors.text} noOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="xs" color={colors.textMuted} noOfLines={2}>
              {subtitle}
            </Text>
          )}
          {status === 'in-progress' && (
            <Box mt={1}>
              <MasteryBar value={progress} segments={5} showPercent={false} size="sm" />
            </Box>
          )}
        </VStack>
      </HStack>
    </Box>
  );
}
