/**
 * Rich Message Cards — Brilliant-style interactive content cards rendered
 * alongside companion messages.
 *
 * - HintCard: tiered hint ladder that never gives the answer
 * - ExampleCard: worked example with step-by-step reveal
 * - CelebrationCard: animated praise + XP gain
 * - PassageCard: embedded reading passage with read-aloud
 */

import React, { useState } from 'react';
import { Box, VStack, HStack, Text, Button, Collapse, useDisclosure } from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp, FiVolume2 } from 'react-icons/fi';
import { useChildTheme } from '../ChildThemeProvider';
import type {
  HintCardPayload,
  ExampleCardPayload,
  CelebrationPayload,
  PassagePayload,
} from '@/domains/learning/shared/agent-transport';

// ─── HintCard ────────────────────────────────────────────────────────────────

export function HintCard({ payload }: { payload: HintCardPayload }) {
  const { colors } = useChildTheme();
  const [revealed, setRevealed] = useState(payload.currentLevel);

  return (
    <Box
      bg={`${colors.accent}11`}
      border={`1px solid ${colors.accent}44`}
      borderRadius="12px"
      px={3.5}
      py={3}
      w="full"
    >
      <HStack spacing={1.5} mb={2}>
        <Text fontSize="sm" fontWeight="bold" color={colors.accent}>
          🤔 Hint Ladder
        </Text>
        {payload.hints.length > 1 && (
          <Text fontSize="2xs" color={colors.textMuted}>
            ({Math.min(revealed, payload.hints.length)}/{payload.hints.length})
          </Text>
        )}
      </HStack>
      <VStack spacing={2} align="stretch">
        {payload.hints.slice(0, revealed).map((hint, i) => (
          <Text key={i} fontSize="sm" color={colors.textSecondary} lineHeight="1.5">
            <Text as="span" fontWeight="bold" color={colors.accent}>{i + 1}.</Text>{' '}
            {hint}
          </Text>
        ))}
        {revealed < payload.hints.length && (
          <Button
            size="xs"
            variant="ghost"
            alignSelf="flex-start"
            color={colors.accent}
            _hover={{ bg: `${colors.accent}11` }}
            leftIcon={<FiChevronDown />}
            onClick={() => setRevealed((r) => r + 1)}
          >
            Next hint
          </Button>
        )}
      </VStack>
    </Box>
  );
}

// ─── ExampleCard ──────────────────────────────────────────────────────────────

export function ExampleCard({ payload }: { payload: ExampleCardPayload }) {
  const { colors } = useChildTheme();
  const [visibleSteps, setVisibleSteps] = useState(1);

  return (
    <Box
      bg={`${colors.primary}11`}
      border={`1px solid ${colors.primary}33`}
      borderRadius="12px"
      px={3.5}
      py={3}
      w="full"
    >
      <Text fontSize="sm" fontWeight="bold" color={colors.primary} mb={2}>
        💡 {payload.title}
      </Text>
      <VStack spacing={2} align="stretch">
        {payload.steps.slice(0, visibleSteps).map((step, i) => (
          <HStack key={i} spacing={2} align="flex-start">
            <Box
              flexShrink={0}
              w="20px"
              h="20px"
              borderRadius="full"
              bg={colors.primary}
              color={colors.textInverse}
              fontSize="2xs"
              fontWeight="bold"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {i + 1}
            </Box>
            <Text fontSize="sm" color={colors.textSecondary} lineHeight="1.5">
              {step}
            </Text>
          </HStack>
        ))}
        {visibleSteps < payload.steps.length && (
          <Button
            size="xs"
            variant="ghost"
            alignSelf="flex-start"
            color={colors.primary}
            _hover={{ bg: `${colors.primary}11` }}
            leftIcon={<FiChevronDown />}
            onClick={() => setVisibleSteps((s) => s + 1)}
          >
            Next step
          </Button>
        )}
      </VStack>
    </Box>
  );
}

// ─── CelebrationCard ──────────────────────────────────────────────────────────

export function CelebrationCard({ payload }: { payload: CelebrationPayload }) {
  const { colors } = useChildTheme();

  return (
    <Box
      bg={`${colors.secondary}15`}
      border={`2px solid ${colors.secondary}`}
      borderRadius="16px"
      px={4}
      py={3}
      w="full"
      textAlign="center"
      animation="celebrationPop 0.5s ease-out"
      css={{
        '@keyframes celebrationPop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      }}
    >
      <Text fontSize="2xl" mb={1}>{payload.emoji}</Text>
      <Text fontSize="sm" fontWeight="bold" color={colors.secondary}>
        {payload.message}
      </Text>
      {payload.xpGained > 0 && (
        <Text fontSize="xs" color={colors.accent} fontWeight="bold" mt={1}>
          +{payload.xpGained} XP
        </Text>
      )}
    </Box>
  );
}

// ─── PassageCard ──────────────────────────────────────────────────────────────

export function PassageCard({ payload }: { payload: PassagePayload }) {
  const { colors } = useChildTheme();
  const { isOpen, onToggle } = useDisclosure();

  const handleReadAloud = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(payload.text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <Box
      bg={`${colors.backgroundSecondary}`}
      border={`1px solid ${colors.border}`}
      borderRadius="12px"
      w="full"
      overflow="hidden"
    >
      <HStack
        spacing={2}
        px={3.5}
        py={2}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: `${colors.primary}08` }}
        transition="background 0.15s"
      >
        <Text fontSize="sm" fontWeight="bold" color={colors.text} flex={1}>
          📖 {payload.title}
        </Text>
        <Box
          as="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleReadAloud();
          }}
          aria-label="Read aloud"
          color={colors.primary}
          bg="transparent"
          border="none"
          cursor="pointer"
          _hover={{ color: colors.primaryHover }}
          fontSize="md"
          p={1}
        >
          <FiVolume2 />
        </Box>
        {isOpen ? <FiChevronUp color={colors.textMuted} /> : <FiChevronDown color={colors.textMuted} />}
      </HStack>
      <Collapse in={isOpen}>
        <Box px={3.5} pb={3}>
          <Text
            fontSize="sm"
            color={colors.textSecondary}
            lineHeight="1.7"
            whiteSpace="pre-wrap"
          >
            {payload.text}
          </Text>
        </Box>
      </Collapse>
    </Box>
  );
}
