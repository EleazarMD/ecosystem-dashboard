/**
 * ConceptCheckCard — Brilliant-style "play with the concept until it clicks".
 *
 * Pattern: the child makes a PREDICTION (picks an answer), then the card REVEALS
 * whether they were right with an explanation. Getting it wrong is encouraged —
 * the explanation is where the learning happens. This is the interactive,
 * understanding-over-memorization mechanic any studio can drop in.
 *
 * It also emits an outcome so the agentic tutor / mastery tracker can react.
 */

import React, { useState } from 'react';
import { Box, VStack, HStack, Text, Icon } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiCheck, FiX, FiArrowRight } from 'react-icons/fi';
import { useChildTheme } from '../ChildThemeProvider';
import { XPBurst } from './LearningKit';
import { useLearningSounds } from '@/hooks/useLearningSounds';

const SUCCESS = '#3BB273';
const MISS = '#E8743B';

const reveal = keyframes`
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
`;

export interface ConceptChoice {
  id: string;
  label: string;
  /** Whether this choice is correct. */
  correct: boolean;
}

export interface ConceptCheckOutcome {
  choiceId: string;
  correct: boolean;
  attempts: number;
}

export interface ConceptCheckCardProps {
  /** The question / prompt the child reasons about. */
  question: string;
  choices: ConceptChoice[];
  /** Shown after a correct (or revealed) answer — the "why". */
  explanation: string;
  /** Optional hint shown after a first wrong attempt (Socratic nudge). */
  hint?: string;
  /** XP awarded on first-try correct. */
  xpReward?: number;
  /** Fires whenever the child commits a choice. */
  onOutcome?: (outcome: ConceptCheckOutcome) => void;
  /** Fires once when the concept is correctly understood. */
  onMastered?: () => void;
}

export function ConceptCheckCard({
  question,
  choices,
  explanation,
  hint,
  xpReward = 10,
  onOutcome,
  onMastered,
}: ConceptCheckCardProps) {
  const { colors, effectiveTheme } = useChildTheme();
  const { play } = useLearningSounds();
  const surface = effectiveTheme.surface;
  const cardBg = surface?.card ?? colors.backgroundSecondary;

  const [selected, setSelected] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [burst, setBurst] = useState(false);

  const handlePick = (choice: ConceptChoice) => {
    if (solved) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelected(choice.id);
    onOutcome?.({ choiceId: choice.id, correct: choice.correct, attempts: nextAttempts });

    if (choice.correct) {
      setSolved(true);
      play('correct');
      if (nextAttempts === 1) {
        setBurst(true);
        setTimeout(() => setBurst(false), 1200);
      }
      onMastered?.();
    } else if (hint) {
      play('tryAgain');
      setShowHint(true);
    }
  };

  const choiceVisual = (choice: ConceptChoice) => {
    const isSelected = selected === choice.id;
    const reveal = solved || isSelected;
    if (!reveal) {
      return { border: colors.border, bg: 'transparent', icon: null, iconColor: colors.textMuted };
    }
    if (choice.correct) {
      return { border: SUCCESS, bg: `${SUCCESS}14`, icon: FiCheck, iconColor: SUCCESS };
    }
    if (isSelected && !choice.correct) {
      return { border: MISS, bg: `${MISS}14`, icon: FiX, iconColor: MISS };
    }
    return { border: colors.border, bg: 'transparent', icon: null, iconColor: colors.textMuted };
  };

  return (
    <Box
      position="relative"
      p={4}
      borderRadius="2xl"
      bg={cardBg}
      border="2px solid"
      borderColor={solved ? SUCCESS : colors.border}
      transition="border-color 0.3s ease"
    >
      <XPBurst amount={xpReward} show={burst} />

      <HStack spacing={1.5} mb={2}>
        <Box w="6px" h="6px" borderRadius="full" bg={colors.primary} />
        <Text fontSize="2xs" fontWeight="700" letterSpacing="0.04em" textTransform="uppercase" color={colors.textMuted}>
          Think
        </Text>
      </HStack>
      <Text fontSize="sm" fontWeight="700" color={colors.text} mb={3} lineHeight="1.45">
        {question}
      </Text>

      <VStack spacing={2} align="stretch">
        {choices.map((choice) => {
          const v = choiceVisual(choice);
          return (
            <Box
              as="button"
              key={choice.id}
              onClick={() => handlePick(choice)}
              disabled={solved}
              textAlign="left"
              p={3}
              borderRadius="xl"
              border="2px solid"
              borderColor={v.border}
              bg={v.bg}
              cursor={solved ? 'default' : 'pointer'}
              transition="all 0.18s ease"
              _hover={solved ? undefined : { borderColor: colors.primary, transform: 'translateX(2px)' }}
            >
              <HStack justify="space-between">
                <Text fontSize="sm" color={colors.text} fontWeight="600" lineHeight="1.4">
                  {choice.label}
                </Text>
                {v.icon && <Icon as={v.icon} color={v.iconColor} boxSize={4} flexShrink={0} />}
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {showHint && !solved && hint && (
        <Box
          mt={3}
          p={3}
          borderRadius="xl"
          bg={`${colors.accent}14`}
          border="1px solid"
          borderColor={`${colors.accent}40`}
          animation={`${reveal} 0.3s ease-out`}
        >
          <HStack align="start" spacing={2}>
            <Text fontSize="md">💡</Text>
            <Text fontSize="xs" color={colors.textSecondary}>
              <strong>Hint:</strong> {hint}
            </Text>
          </HStack>
        </Box>
      )}

      {solved && (
        <Box
          mt={3}
          p={3}
          borderRadius="xl"
          bg={`${SUCCESS}10`}
          border="1px solid"
          borderColor={`${SUCCESS}40`}
          animation={`${reveal} 0.35s ease-out`}
        >
          <HStack align="start" spacing={2}>
            <Icon as={FiArrowRight} color={SUCCESS} boxSize={4} mt="2px" />
            <Text fontSize="xs" color={colors.textSecondary}>
              <strong>Why:</strong> {explanation}
            </Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
