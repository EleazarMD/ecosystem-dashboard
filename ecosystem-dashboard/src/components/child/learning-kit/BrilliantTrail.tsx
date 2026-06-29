/**
 * BrilliantTrail — Reusable Brilliant.org-style learning trail components.
 *
 * Shared visual language for kid-facing learning surfaces: a central spine,
 * alternating 3D-tilt cards, a wandering dotted path, a floating guide mascot,
 * and polished progress / action chrome.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Progress,
  Circle,
  Flex,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { ChevronRightIcon } from '@chakra-ui/icons';

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.92) translateY(12px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
  50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
`;

export interface TrailItem {
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  color?: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
  isLocked?: boolean;
  isLast?: boolean;
  badge?: string;
  metadata?: React.ReactNode;
}

export interface TrailSection {
  id: string;
  title: string;
  emoji?: string;
  color?: string;
  items: TrailItem[];
}

export interface TrailGuideProps {
  emoji?: string;
  title?: string;
  lines: string[];
  accent?: string;
  bottom?: string | number | Record<string, string | number>;
  right?: string | number | Record<string, string | number>;
  hidden?: boolean;
}

export function TrailPath({
  height,
  color = '#9f7aea',
  dotted = true,
  idPrefix = 'trail',
  progress = 0,
}: {
  height: number;
  color?: string;
  dotted?: boolean;
  idPrefix?: string;
  /** Completion fraction 0–1. Renders a solid fill path that grows with progress. */
  progress?: number;
}) {
  const strokeDash = dotted ? '6 8' : 'none';
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillHeight = height * clampedProgress;
  const pathD = `M20 0 C 32 0, 32 ${height * 0.18}, 20 ${height * 0.18} C 8 ${height * 0.18}, 8 ${height * 0.38}, 20 ${height * 0.38} C 32 ${height * 0.38}, 32 ${height * 0.58}, 20 ${height * 0.58} C 8 ${height * 0.58}, 8 ${height * 0.78}, 20 ${height * 0.78} C 32 ${height * 0.78}, 32 ${height}, 20 ${height}`;
  return (
    <Box
      position="absolute"
      left="50%"
      top="0"
      transform="translateX(-50%)"
      width="40px"
      height={`${height}px`}
      zIndex={0}
      pointerEvents="none"
    >
      <svg
        width="40"
        height={height}
        viewBox={`0 0 40 ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* Base path (dotted, faded) */}
        <path
          d={pathD}
          stroke={color}
          strokeWidth="3"
          strokeDasharray={strokeDash}
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />
        {/* Progress fill path (solid, animated via stroke-dashoffset) */}
        {clampedProgress > 0 && (
          <path
            d={pathD}
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
            style={{
              strokeDasharray: height,
              strokeDashoffset: height - fillHeight,
              transition: 'stroke-dashoffset 0.8s ease-out',
            }}
          />
        )}
      </svg>
    </Box>
  );
}

export function TrailCard({
  item,
  index,
  total,
  onClick,
  onHover,
  onLeave,
  accentColor = '#9f7aea',
}: {
  item: TrailItem;
  index: number;
  total: number;
  onClick?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  accentColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const isLeft = index % 2 === 0;
  const color = item.color || accentColor;
  const status = item.isCompleted
    ? 'completed'
    : item.isCurrent
      ? 'current'
      : item.isLocked
        ? 'locked'
        : 'upcoming';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const max = 6;
    setTilt({
      rotateX: (0.5 - y) * max,
      rotateY: (x - 0.5) * max,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    onLeave?.();
  };

  const borderColor =
    status === 'completed'
      ? '#38a169'
      : status === 'current'
        ? color
        : status === 'locked'
          ? 'rgba(255,255,255,0.15)'
          : 'rgba(255,255,255,0.25)';

  const bgGradient =
    status === 'completed'
      ? 'linear-gradient(135deg, rgba(56,161,105,0.18) 0%, rgba(72,187,120,0.08) 100%)'
      : status === 'current'
        ? `linear-gradient(135deg, ${color}25 0%, rgba(255,255,255,0.06) 100%)`
        : status === 'locked'
          ? 'linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.12) 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)';

  const statusBadge =
    status === 'completed' ? (
      <Badge colorScheme="green" variant="solid" borderRadius="full" fontSize="2xs">
        Done
      </Badge>
    ) : status === 'current' ? (
      <Badge
        bg={color}
        color="white"
        variant="solid"
        borderRadius="full"
        fontSize="2xs"
        animation={`${pulseGlow} 2s ease-in-out infinite`}
      >
        Next up
      </Badge>
    ) : status === 'locked' ? (
      <Badge colorScheme="gray" variant="solid" borderRadius="full" fontSize="2xs">
        Locked
      </Badge>
    ) : null;

  return (
    <Box
      position="relative"
      width={{ base: '100%', md: '50%' }}
      alignSelf={isLeft ? 'flex-start' : 'flex-end'}
      pl={{ base: 14, md: isLeft ? 0 : 14 }}
      pr={{ base: 0, md: isLeft ? 14 : 0 }}
      mb={{ base: 4, md: total > 1 ? '-24px' : 4 }}
      zIndex={1}
      animation={`${popIn} 0.4s ease ${index * 0.06}s both`}
    >
      <Box
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseEnter={onHover}
        onMouseLeave={handleMouseLeave}
        cursor={status === 'locked' ? 'not-allowed' : 'pointer'}
        opacity={status === 'locked' ? 0.55 : 1}
        borderRadius="2xl"
        border="2px solid"
        borderColor={borderColor}
        bg={bgGradient}
        backdropFilter="blur(8px)"
        p={{ base: 4, md: 5 }}
        boxShadow={
          status === 'current'
            ? `0 12px 40px ${color}44`
            : '0 8px 30px rgba(0,0,0,0.25)'
        }
        transform={`perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`}
        transition="transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease"
        _hover={
          status !== 'locked'
            ? {
                transform: `perspective(900px) rotateX(${tilt.rotateX * 1.3}deg) rotateY(${
                  tilt.rotateY * 1.3
                }deg) translateY(-3px)`,
                boxShadow: status === 'current' ? `0 18px 50px ${color}55` : '0 14px 40px rgba(0,0,0,0.35)',
              }
            : {}
        }
      >
        <HStack spacing={3} align="start">
          <Circle
            size="48px"
            bg={
              status === 'completed'
                ? 'green.400'
                : status === 'current'
                  ? color
                  : status === 'locked'
                    ? 'whiteAlpha.200'
                    : 'whiteAlpha.300'
            }
            color="white"
            fontSize="xl"
            flexShrink={0}
            boxShadow={status === 'current' ? `0 0 0 4px ${color}44` : 'none'}
          >
            {item.emoji || (status === 'completed' ? '✅' : status === 'locked' ? '🔒' : '⭐')}
          </Circle>
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <HStack spacing={2} justify="space-between" w="full">
              <Text
                fontWeight="bold"
                fontSize={{ base: 'sm', md: 'md' }}
                color={status === 'locked' ? 'whiteAlpha.600' : 'white'}
                noOfLines={1}
              >
                {item.title}
              </Text>
              {statusBadge}
            </HStack>
            {item.description && (
              <Text fontSize="xs" color="whiteAlpha.800" noOfLines={2}>
                {item.description}
              </Text>
            )}
            {item.metadata && (
              <Box pt={1} w="full">
                {item.metadata}
              </Box>
            )}
          </VStack>
        </HStack>
      </Box>
    </Box>
  );
}

export function TrailGuide({
  emoji = '🦊',
  title,
  lines,
  accent = '#9f7aea',
  bottom = { base: 'calc(env(safe-area-inset-bottom) + 90px)', md: 24 },
  right = { base: 3, md: 6 },
  hidden = false,
}: TrailGuideProps) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    setLineIndex(0);
  }, [lines.length, lines[0]]);

  if (hidden || lines.length === 0) return null;

  const currentLine = lines[lineIndex % lines.length];

  return (
    <Box
      position="fixed"
      bottom={bottom}
      right={right}
      zIndex={1200}
      display={{ base: 'none', md: 'flex' }}
      flexDirection="column"
      alignItems="flex-end"
      maxW="260px"
      pointerEvents="none"
    >
      <Box
        bg="linear-gradient(135deg, #1a1a2e 0%, #162447 100%)"
        borderRadius="2xl"
        p={3}
        border="2px solid"
        borderColor={accent}
        boxShadow={`0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px ${accent}44`}
        mb={2}
        position="relative"
        pointerEvents="auto"
        _after={{
          content: '""',
          position: 'absolute',
          bottom: '-10px',
          right: '28px',
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: `10px solid ${accent}`,
        }}
      >
        {title && (
          <Text fontSize="2xs" color={accent} fontWeight="bold" textTransform="uppercase" mb={1}>
            {title}
          </Text>
        )}
        <Text fontSize="sm" color="white" fontWeight="medium">
          {currentLine}
        </Text>
        {lines.length > 1 && (
          <HStack spacing={1} mt={2} justify="flex-end">
            {lines.map((_, i) => (
              <Box
                key={i}
                w="6px"
                h="6px"
                borderRadius="full"
                bg={i === lineIndex ? accent : 'whiteAlpha.400'}
                cursor="pointer"
                pointerEvents="auto"
                onClick={() => setLineIndex(i)}
              />
            ))}
          </HStack>
        )}
      </Box>
      <Box
        fontSize="4xl"
        animation={`${float} 3s ease-in-out infinite`}
        cursor="pointer"
        pointerEvents="auto"
        onClick={() => setLineIndex((i) => (i + 1) % lines.length)}
        filter="drop-shadow(0 6px 10px rgba(0,0,0,0.3))"
      >
        {emoji}
      </Box>
    </Box>
  );
}

export function TrailHeader({
  title,
  subtitle,
  emoji,
  accent = '#9f7aea',
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  emoji?: string;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <Box
      bgGradient={`linear(135deg, ${accent} 0%, #162447 50%, #0f3460 100%)`}
      borderRadius="2xl"
      p={{ base: 5, md: 7 }}
      position="relative"
      overflow="hidden"
      borderWidth="2px"
      borderColor={`${accent}66`}
      boxShadow={`0 10px 40px rgba(15,52,96,0.5)`}
    >
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        width="200px"
        height="200px"
        borderRadius="full"
        bg={`${accent}22`}
        filter="blur(40px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-30%"
        left="-10%"
        width="180px"
        height="180px"
        borderRadius="full"
        bg="rgba(255,255,255,0.06)"
        filter="blur(50px)"
        pointerEvents="none"
      />

      <VStack align="start" spacing={3} position="relative" zIndex={1}>
        <HStack spacing={3} align="center">
          {emoji && (
            <Box
              fontSize="4xl"
              bg="whiteAlpha.200"
              borderRadius="xl"
              px={3}
              py={1}
              backdropFilter="blur(4px)"
            >
              {emoji}
            </Box>
          )}
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color={`${accent}.200`} fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em">
              Learning Journey
            </Text>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color="white">
              {title}
            </Text>
          </VStack>
        </HStack>
        {subtitle && (
          <Text fontSize="sm" color="whiteAlpha.900" maxW="600px">
            {subtitle}
          </Text>
        )}
        {children && (
          <Box w="full" pt={1}>
            {children}
          </Box>
        )}
      </VStack>
    </Box>
  );
}

export function TrailProgress({
  label,
  value,
  total,
  percent,
  accent = '#9f7aea',
  children,
}: {
  label?: string;
  value: number;
  total: number;
  percent: number;
  accent?: string;
  children?: React.ReactNode;
}) {
  return (
    <Box
      bg="rgba(26,26,46,0.65)"
      borderRadius="2xl"
      p={5}
      borderWidth="1px"
      borderColor="rgba(255,255,255,0.12)"
      boxShadow="0 6px 20px rgba(0,0,0,0.35)"
      backdropFilter="blur(8px)"
    >
      <HStack justify="space-between" mb={3} align="center">
        <VStack align="start" spacing={0}>
          <Text fontWeight="bold" fontSize="md" color="white">
            {label || 'Your progress'}
          </Text>
          <Text fontSize="sm" color="whiteAlpha.700">
            {value} of {total} complete
          </Text>
        </VStack>
        <Circle
          size="56px"
          bg={`${accent}22`}
          border="2px solid"
          borderColor={accent}
          color="white"
          fontWeight="bold"
          fontSize="sm"
        >
          {Math.round(percent)}%
        </Circle>
      </HStack>
      <Progress
        value={percent}
        size="lg"
        borderRadius="full"
        bg="whiteAlpha.200"
        sx={{
          '& > div': {
            background: `linear-gradient(90deg, ${accent}, #b794f4)`,
            transition: 'width 0.5s ease',
          },
        }}
      />
      {children && <Box mt={3}>{children}</Box>}
    </Box>
  );
}

export function TrailStartBar({
  emoji,
  title,
  subtitle,
  color = '#9f7aea',
  onClick,
  hidden = false,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  color?: string;
  onClick?: () => void;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <Box
      position="fixed"
      bottom={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 6 }}
      left={{ base: 3, md: '50%' }}
      right={{ base: 3, md: undefined }}
      transform={{ base: 'none', md: 'translateX(-50%)' }}
      w={{ base: 'auto', md: '420px' }}
      zIndex={1100}
      bg={`linear-gradient(135deg, ${color} 0%, #553c9a 100%)`}
      borderRadius="2xl"
      p={3}
      boxShadow={`0 12px 40px ${color}55`}
      border="2px solid"
      borderColor="rgba(255,255,255,0.25)"
      cursor="pointer"
      onClick={onClick}
      _hover={{ transform: { md: 'translateX(-50%) translateY(-3px)' }, boxShadow: `0 16px 50px ${color}66` }}
      transition="all 0.2s ease"
      animation={`${popIn} 0.4s ease both`}
    >
      <HStack spacing={3}>
        <Circle size="44px" bg="whiteAlpha.300" border="2px solid" borderColor="whiteAlpha.400" flexShrink={0}>
          <Text fontSize="xl">{emoji || '▶️'}</Text>
        </Circle>
        <Box flex={1} minW={0}>
          <Text fontSize="xs" color="whiteAlpha.900" fontWeight="bold" textTransform="uppercase">
            Continue your journey
          </Text>
          <Text fontWeight="bold" color="white" fontSize="sm" noOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="xs" color="whiteAlpha.800" noOfLines={1}>
              {subtitle}
            </Text>
          )}
        </Box>
        <Button
          size="sm"
          bg="white"
          color={color}
          fontWeight="bold"
          borderRadius="xl"
          rightIcon={<ChevronRightIcon />}
          _hover={{ bg: 'whiteAlpha.900' }}
          flexShrink={0}
        >
          Start
        </Button>
      </HStack>
    </Box>
  );
}

export function TrailContainer({
  children,
  accent = '#9f7aea',
  pb = { base: 28, md: 24 },
}: {
  children: React.ReactNode;
  accent?: string;
  pb?: string | number | Record<string, string | number>;
}) {
  return (
    <VStack
      spacing={6}
      align="stretch"
      maxW="1100px"
      mx="auto"
      w="full"
      position="relative"
      pb={pb}
      sx={{
        // Subtle radial glow behind the trail
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '60%',
          bg: `radial-gradient(ellipse, ${accent}15 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {children}
    </VStack>
  );
}

export function TrailSectionBanner({
  title,
  emoji,
  color = '#9f7aea',
  index,
}: {
  title: string;
  emoji?: string;
  color?: string;
  index: number;
}) {
  return (
    <Flex
      justify="center"
      position="relative"
      zIndex={1}
      my={6}
      animation={`${popIn} 0.4s ease ${index * 0.05}s both`}
    >
      <Box
        bg="rgba(22,36,71,0.85)"
        borderRadius="full"
        px={5}
        py={2}
        border="2px solid"
        borderColor={color}
        boxShadow={`0 0 20px ${color}44`}
        backdropFilter="blur(6px)"
      >
        <HStack spacing={2}>
          {emoji && <Text fontSize="lg">{emoji}</Text>}
          <Text fontSize="sm" fontWeight="bold" color="white" textTransform="uppercase" letterSpacing="0.05em">
            {title}
          </Text>
        </HStack>
      </Box>
    </Flex>
  );
}

export function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
