/**
 * CardPlayer — Brilliant-style "one micro-action per screen" engine.
 *
 * Renders a sequence of cards (try → see → explain → play → check) that guide
 * the child through a learning step. Each card is a single interactive beat:
 *
 * - **try**:     Predict-then-reveal (ConceptCheckCard) — the child commits a guess.
 * - **see**:     Worked example with step-by-step reveal (ExampleCard).
 * - **explain**: Short text/visual explanation passage (PassageCard).
 * - **play**:    Free-form interaction (manipulative, sandbox, or drawing).
 * - **check**:   Final assessment graded server-side via /api/learn/attempt.
 *
 * On the final `check` card, the player POSTs to /api/learn/attempt, receives
 * a real score, and calls onComplete with the result — replacing the old
 * hardcoded `score: 1.0` stub.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, Badge, Progress, Spinner,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  FiCheckCircle, FiArrowRight, FiRefreshCw, FiAlertCircle,
} from 'react-icons/fi';
import { useChildTheme } from '../ChildThemeProvider';
import { useLearningSounds } from '@/hooks/useLearningSounds';
import { useTTS } from '@/hooks/useTTS';
import {
  ConceptCheckCard,
  HintCard,
  ExampleCard,
  CelebrationCard,
  PassageCard,
  XPBurst,
  ReflectionCard,
} from '.';
import type { ConceptChoice, ConceptCheckOutcome } from '.';
import {
  buildCardSetFromStep as _buildCardSetFromStep,
  type CardType,
  type BaseCard,
  type TryCard,
  type SeeCard,
  type ExplainCard,
  type PlayCard,
  type CheckCard,
  type LearningCard,
  type CardSet,
  type CardPlayerResult,
} from './card-types';

// Re-export types and builder so existing imports from CardPlayer.tsx still work.
export type {
  CardType,
  BaseCard,
  TryCard,
  SeeCard,
  ExplainCard,
  PlayCard,
  CheckCard,
  LearningCard,
  CardSet,
  CardPlayerResult,
};
export { _buildCardSetFromStep as buildCardSetFromStep };

// Re-import ConceptChoice locally for use in CardRenderer
// (ConceptCheckOutcome is used in the component body)

type _Unused = ConceptChoice; // keep import alive

export interface CardPlayerProps {
  cards: LearningCard[];
  /** Child ID for the attempt API */
  childId?: string;
  /** Path context for auto-completing the step on a correct check */
  pathId?: string;
  stepNumber?: number;
  /** Called when the player finishes all cards (or exits on a win) */
  onComplete: (result: CardPlayerResult) => void;
  /** Called when the user dismisses the player */
  onExit: () => void;
  /** Called on each card transition with the current card index and card.
   * The parent can use this to push card-level detail into the Context Hub. */
  onCardChange?: (index: number, total: number, card: LearningCard) => void;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const slideIn = keyframes`
  0% { opacity: 0; transform: translateX(12px); }
  100% { opacity: 1; transform: translateX(0); }
`;

// ─── CardPlayer ──────────────────────────────────────────────────────────────

export function CardPlayer({
  cards,
  childId,
  pathId,
  stepNumber,
  onComplete,
  onExit,
  onCardChange,
}: CardPlayerProps) {
  const { colors } = useChildTheme();
  const { play } = useLearningSounds();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [attemptResult, setAttemptResult] = useState<CardPlayerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [tryOutcomes, setTryOutcomes] = useState<Record<string, ConceptCheckOutcome>>({});
  const [hintLoading, setHintLoading] = useState(false);
  const [aiHint, setAiHint] = useState<string | undefined>(undefined);
  const [showReflection, setShowReflection] = useState(false);

  const card = cards[currentIdx];
  const isLast = currentIdx === cards.length - 1;
  const isCheckCard = card?.type === 'check';

  // Notify parent of card changes so it can push card detail into the Context Hub.
  useEffect(() => {
    if (card && onCardChange) {
      onCardChange(currentIdx, cards.length, card);
    }
  }, [currentIdx, card, cards.length, onCardChange]);

  const handleNext = useCallback(() => {
    if (currentIdx < cards.length - 1) {
      play('whoosh');
      setCurrentIdx((i) => i + 1);
      setProgress(((currentIdx + 1) / cards.length) * 100);
    }
  }, [currentIdx, cards.length]);

  const handleTryOutcome = useCallback((outcome: ConceptCheckOutcome) => {
    if (card?.id) {
      setTryOutcomes((prev) => ({ ...prev, [card.id]: outcome }));
    }
    if (outcome.correct) {
      setTimeout(() => handleNext(), 800);
    }
  }, [card?.id, handleNext]);

  const handleCheckSubmit = useCallback(async (outcome: ConceptCheckOutcome) => {
    if (!isCheckCard || !card || card.type !== 'check') return;

    // If no real contentItemId or childId, grade client-side only
    if (!card.contentItemId || !childId) {
      const clientResult: CardPlayerResult = {
        score: outcome.correct ? 1 : 0,
        correct: outcome.correct,
        skillCode: card.skillCode,
      };
      setAttemptResult(clientResult);
      if (clientResult.correct) {
        play('celebrate');
        setShowCelebration(true);
        setTimeout(() => onComplete(clientResult), 1800);
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/learn/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          contentItemId: card.contentItemId,
          response: outcome.choiceId,
          attemptNumber: outcome.attempts,
          pathId,
          pathStepNumber: stepNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      const result: CardPlayerResult = {
        score: data.score ?? (outcome.correct ? 1 : 0),
        correct: data.correct ?? outcome.correct,
        attemptId: data.attemptId,
        skillCode: data.skillCode || card.skillCode,
        masteryDelta: data.mastery?.inProcess?.delta,
        pathCompleted: data.pathCompleted,
      };

      setAttemptResult(result);

      if (result.correct) {
        play('celebrate');
        setShowCelebration(true);
        setTimeout(() => {
          onComplete(result);
        }, 1800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isCheckCard, card, childId, pathId, stepNumber, onComplete]);

  const handleRetry = useCallback(() => {
    setAttemptResult(null);
    setError(null);
    setShowCelebration(false);
    setAiHint(undefined);
    setShowReflection(false);
  }, []);

  const handleRequestHint = useCallback(async () => {
    if (!card || card.type !== 'check') return;
    setHintLoading(true);
    try {
      const res = await fetch('/api/child/companion/agent-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I need a hint for this question: ${card.question}`,
          activityId: 'learn-hub',
          intent: 'hint',
          childId,
          contextState: {
            contentItemId: card.contentItemId,
            skillCode: card.skillCode,
            sessionPhase: 'coaching',
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const hintText = data.hintCard?.hints?.[0] || data.response || 'Take a deep breath and try again!';
        setAiHint(hintText);
      } else {
        setAiHint(card.hint || 'Take a deep breath and try again!');
      }
    } catch {
      setAiHint(card.hint || 'Take a deep breath and try again!');
    } finally {
      setHintLoading(false);
    }
  }, [card, childId]);

  const handleExitWithResult = useCallback(() => {
    if (attemptResult?.correct) {
      onComplete(attemptResult);
    } else {
      onExit();
    }
  }, [attemptResult, onComplete, onExit]);

  const progressPct = useMemo(
    () => Math.round(((currentIdx + (attemptResult ? 1 : 0)) / cards.length) * 100),
    [currentIdx, attemptResult, cards.length],
  );

  if (!card) {
    return null;
  }

  return (
    <VStack spacing={4} align="stretch" w="full">
      {/* Progress bar */}
      <HStack spacing={3} align="center">
        <Badge colorScheme="purple" variant="solid" borderRadius="full" px={2} py={0.5} fontSize="2xs">
          Card {currentIdx + 1} of {cards.length}
        </Badge>
        <Progress
          value={progressPct}
          size="sm"
          colorScheme="purple"
          borderRadius="full"
          flex={1}
        />
        <Text fontSize="2xs" color={colors.textMuted} fontWeight="600">
          {progressPct}%
        </Text>
      </HStack>

      {/* Card title */}
      <HStack spacing={2}>
        {card.emoji && <Text fontSize="lg">{card.emoji}</Text>}
        <Text fontSize="sm" fontWeight="700" color={colors.text}>
          {card.title}
        </Text>
      </HStack>

      {/* Card content */}
      <Box
        animation={`${slideIn} 0.3s ease-out`}
        key={card.id}
      >
        <CardRenderer
          card={card}
          tryOutcome={tryOutcomes[card.id]}
          submitting={submitting}
          attemptResult={attemptResult}
          onTryOutcome={handleTryOutcome}
          onCheckSubmit={handleCheckSubmit}
          onRetry={handleRetry}
          onRequestHint={isCheckCard ? handleRequestHint : undefined}
          hintLoading={hintLoading}
          aiHint={aiHint}
        />
      </Box>

      {/* Error */}
      {error && (
        <Box
          p={3}
          borderRadius="lg"
          bg="red.50"
          border="1px solid"
          borderColor="red.200"
        >
          <HStack spacing={2}>
            <FiAlertCircle color="#E53E3E" />
            <Text fontSize="xs" color="red.700">{error}</Text>
          </HStack>
        </Box>
      )}

      {/* Reflection card — appears after check card is answered */}
      {isLast && isCheckCard && attemptResult && !showCelebration && !showReflection && (
        <ReflectionCard
          stepTitle={card?.title}
          skillCode={card?.type === 'check' ? card.skillCode : undefined}
          wasCompleted={attemptResult.correct}
          childId={childId}
          onDone={() => {
            setShowReflection(true);
            if (attemptResult.correct) {
              play('celebrate');
              setShowCelebration(true);
              setTimeout(() => onComplete(attemptResult), 1800);
            }
          }}
        />
      )}

      {/* Celebration overlay */}
      {showCelebration && attemptResult?.correct && (
        <CelebrationCard
          payload={{
            emoji: '🎉',
            message: 'Excellent work!',
            xpGained: 15,
          }}
        />
      )}

      {/* Navigation */}
      <HStack justify="space-between" pt={2}>
        <Button
          size="sm"
          variant="ghost"
          color={colors.textMuted}
          onClick={handleExitWithResult}
          _hover={{ bg: colors.backgroundSecondary }}
        >
          Exit
        </Button>

        {!isLast && !isCheckCard && (
          <Button
            size="sm"
            colorScheme="purple"
            variant="ghost"
            rightIcon={<FiArrowRight />}
            onClick={handleNext}
          >
            Next
          </Button>
        )}

        {isLast && attemptResult && !attemptResult.correct && showReflection && (
          <Button
            size="sm"
            colorScheme="yellow"
            variant="outline"
            leftIcon={<FiRefreshCw />}
            onClick={handleRetry}
          >
            Try Again
          </Button>
        )}

        {isLast && attemptResult?.correct && !showCelebration && (
          <Button
            size="sm"
            colorScheme="green"
            leftIcon={<FiCheckCircle />}
            onClick={() => onComplete(attemptResult)}
          >
            Complete Step
          </Button>
        )}

        {isLast && submitting && (
          <HStack spacing={2}>
            <Spinner size="sm" color="purple.400" />
            <Text fontSize="xs" color={colors.textMuted}>Grading...</Text>
          </HStack>
        )}
      </HStack>
    </VStack>
  );
}

// ─── Card renderer ───────────────────────────────────────────────────────────

function CardRenderer({
  card,
  tryOutcome,
  submitting,
  attemptResult,
  onTryOutcome,
  onCheckSubmit,
  onRetry,
  onRequestHint,
  hintLoading,
  aiHint,
}: {
  card: LearningCard;
  tryOutcome?: ConceptCheckOutcome;
  submitting: boolean;
  attemptResult: CardPlayerResult | null;
  onTryOutcome: (outcome: ConceptCheckOutcome) => void;
  onCheckSubmit: (outcome: ConceptCheckOutcome) => void;
  onRetry: () => void;
  onRequestHint?: () => void;
  hintLoading?: boolean;
  aiHint?: string;
}) {
  const { speak, stop, isSpeaking } = useTTS();
  const [readingCard, setReadingCard] = useState(false);
  switch (card.type) {
    case 'try':
      return (
        <ConceptCheckCard
          question={card.question}
          choices={card.choices}
          explanation={card.explanation}
          hint={card.hint}
          xpReward={5}
          onOutcome={onTryOutcome}
        />
      );

    case 'see':
      return (
        <Box>
          <ExampleCard
            payload={{
              title: card.exampleTitle,
              steps: card.steps,
            }}
          />
          <ReadAloudButton
            text={`${card.exampleTitle}. ${card.steps.join('. ')}`}
            isSpeaking={readingCard && isSpeaking}
            onToggle={async () => {
              if (readingCard) {
                stop();
                setReadingCard(false);
              } else {
                setReadingCard(true);
                await speak(`${card.exampleTitle}. ${card.steps.join('. ')}`);
                setReadingCard(false);
              }
            }}
          />
        </Box>
      );

    case 'explain':
      return (
        <Box>
          <PassageCard
            payload={{
              title: card.passageTitle,
              text: card.passageText,
            }}
          />
          <ReadAloudButton
            text={`${card.passageTitle}. ${card.passageText}`}
            isSpeaking={readingCard && isSpeaking}
            onToggle={async () => {
              if (readingCard) {
                stop();
                setReadingCard(false);
              } else {
                setReadingCard(true);
                await speak(`${card.passageTitle}. ${card.passageText}`);
                setReadingCard(false);
              }
            }}
          />
        </Box>
      );

    case 'play':
      return (
        <Box p={4} borderRadius="xl" bg="purple.50" border="1px solid" borderColor="purple.200">
          <Text fontSize="sm" fontWeight="600" color="purple.800" mb={2}>
            {card.prompt}
          </Text>
          <Text fontSize="xs" color="purple.600">
            🎮 Interaction: {card.interaction || 'explore freely'}
          </Text>
        </Box>
      );

    case 'check':
      return (
        <Box>
          <ConceptCheckCard
            question={card.question}
            choices={card.choices}
            explanation={card.explanation}
            hint={card.hint}
            xpReward={15}
            onOutcome={(outcome) => {
              if (!submitting && !attemptResult) {
                onCheckSubmit(outcome);
              }
            }}
          />
          {/* AI hint button — calls agent-turn with intent: 'hint' */}
          {onRequestHint && !attemptResult && (
            <Box mt={3}>
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                borderRadius="full"
                isLoading={hintLoading}
                onClick={onRequestHint}
              >
                💡 Ask my tutor for a hint
              </Button>
              {aiHint && (
                <Box mt={2} p={3} borderRadius="lg" bg="blue.50" border="1px solid" borderColor="blue.200">
                  <Text fontSize="sm" color="blue.800">{aiHint}</Text>
                </Box>
              )}
            </Box>
          )}
          {attemptResult && !attemptResult.correct && (
            <Box mt={3}>
              <HintCard
                payload={{
                  hints: card.hint ? [card.hint, 'Re-read the explanation and try again!'] : ['Take a deep breath and try again!'],
                  currentLevel: 1,
                }}
              />
            </Box>
          )}
        </Box>
      );

    default:
      return null;
  }
}

// ─── Read-aloud button (TTS) ─────────────────────────────────────────────────

function ReadAloudButton({
  text: _text,
  isSpeaking,
  onToggle,
}: {
  text: string;
  isSpeaking: boolean;
  onToggle: () => void;
}) {
  return (
    <HStack spacing={2} mt={3} justify="center">
      <Button
        size="sm"
        variant="ghost"
        colorScheme="blue"
        leftIcon={<Text>{isSpeaking ? '🔇' : '🔊'}</Text>}
        onClick={onToggle}
      >
        {isSpeaking ? 'Stop reading' : 'Read to me'}
      </Button>
    </HStack>
  );
}

// buildCardSetFromStep and generateChoicesFromAnswerKey are now in card-types.ts
// and re-exported above.
