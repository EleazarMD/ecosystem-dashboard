/**
 * LessonPlayer — Brilliant-style interactive lesson renderer for children.
 *
 * Features:
 * - Step strip navigation (numbered circles with progress)
 * - Narrative hook display per step
 * - Interactive content rendering (body text, fun facts, assessment questions)
 * - ConceptCheckCard for predict-then-reveal interactions
 * - XP bursts on correct answers
 * - MasteryBar for overall lesson progress
 * - Celebration screen on completion
 * - Theme-aware via useChildTheme()
 * - Read-aloud support via ReadAloudButton
 * - Asset display (images) per step
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Button, Badge, Circle, IconButton,
  Spinner, SimpleGrid, Image, useToast, Tooltip,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { FiRefreshCw } from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';
import { ReadAloudButton } from './ReadAloudButton';
import { MasteryBar, XPBurst, ConceptCheckCard } from './learning-kit';
import type { ConceptChoice, ConceptCheckOutcome } from './learning-kit';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LessonData {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    subject: string;
    ageBand: string;
    difficulty: number;
    estimatedMinutes: number;
    skillCodes: string[];
    lessonEmoji: string | null;
    designSpec: any;
  };
  steps: StepData[];
  assets: AssetData[];
}

interface StepData {
  id: string;
  stepNumber: number;
  stepType: string;
  title: string;
  description: string | null;
  stepEmoji: string;
  content: Record<string, any> | null;
  visualSpec: Record<string, any> | null;
  assetIds: string[];
}

interface AssetData {
  id: string;
  stepId: string | null;
  assetType: string;
  assetUrl: string | null;
  thumbnailUrl: string | null;
  altText: string | null;
  mimeType: string | null;
}

// ─── Animations ──────────────────────────────────────────────────────────────

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
`;

const celebrate = keyframes`
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
`;

const SUBJECT_EMOJIS: Record<string, string> = {
  math: '🔢',
  reading: '📖',
  writing: '✏️',
  analytical: '🧩',
  science: '🔬',
};

const STEP_TYPE_LABELS: Record<string, string> = {
  intro: 'Let\'s Start!',
  concept: 'New Idea',
  example: 'See It',
  practice: 'Try It',
  assessment: 'Quick Check',
  review: 'Recap',
  celebration: 'You Did It!',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export interface LessonPlayerProps {
  lessonId: string;
  onComplete?: () => void;
  onExit?: () => void;
}

export function LessonPlayer({ lessonId, onComplete, onExit }: LessonPlayerProps) {
  const { colors, effectiveTheme } = useChildTheme();
  const surface = effectiveTheme.surface;
  const toast = useToast();

  const [data, setData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [xpEarned, setXpEarned] = useState(0);
  const [showXpBurst, setShowXpBurst] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const panelBg = surface?.panel ?? colors.backgroundSecondary;
  const cardBg = surface?.card ?? colors.backgroundSecondary;
  const borderColor = surface?.border ?? colors.border;
  const titleColor = surface?.title ?? colors.text;
  const bodyColor = surface?.body ?? colors.text;
  const accentColor = colors.primary;

  // Load lesson
  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/learn/lessons/child?id=${lessonId}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch {
      setError('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // Step completion
  const handleStepComplete = useCallback((stepIdx: number, xp: number = 0) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepIdx);
      return next;
    });
    if (xp > 0) {
      setXpEarned((prev) => prev + xp);
      setShowXpBurst(true);
      setTimeout(() => setShowXpBurst(false), 2000);
    }
  }, []);

  // Lesson completion
  const handleFinish = useCallback(() => {
    setShowCelebration(true);
    if (xpEarned > 0) {
      toast({
        title: `+${xpEarned} XP earned!`,
        status: 'success',
        duration: 3000,
      });
    }
    onComplete?.();
  }, [xpEarned, toast, onComplete]);

  // Navigation
  const goNext = useCallback(() => {
    if (!data) return;
    if (currentStep < data.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  }, [currentStep, data, handleFinish]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !showCelebration) goNext();
      if (e.key === 'ArrowLeft' && !showCelebration) goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, showCelebration]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" h="100%" minH="400px">
        <Spinner size="xl" color={accentColor} thickness="4px" />
        <Text mt={4} color={bodyColor} fontSize="lg">Loading your lesson...</Text>
      </Box>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" h="100%" minH="400px" p={6}>
        <Text fontSize="4xl" mb={4}>🤔</Text>
        <Text color={bodyColor} fontSize="lg" mb={2}>{error}</Text>
        <Button leftIcon={<FiRefreshCw />} colorScheme="blue" size="sm" onClick={loadLesson} mt={4}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (!data || data.steps.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" h="100%" minH="400px" p={6}>
        <Text fontSize="4xl" mb={4}>📭</Text>
        <Text color={bodyColor} fontSize="lg">This lesson doesn't have any steps yet.</Text>
      </Box>
    );
  }

  // ─── Celebration ──────────────────────────────────────────────────────────
  if (showCelebration) {
    return (
      <CelebrationView
        lesson={data.lesson}
        xpEarned={xpEarned}
        onReplay={() => {
          setShowCelebration(false);
          setCurrentStep(0);
          setCompletedSteps(new Set());
          setXpEarned(0);
        }}
        onExit={onExit}
        colors={{ accent: accentColor, text: titleColor, body: bodyColor, card: cardBg, border: borderColor }}
      />
    );
  }

  // ─── Main Player ──────────────────────────────────────────────────────────
  const step = data.steps[currentStep];
  const isLast = currentStep === data.steps.length - 1;
  const progressPct = Math.round((completedSteps.size / data.steps.length) * 100);
  const stepAssets = data.assets.filter((a) => a.stepId === step.id);

  return (
    <Box h="100%" display="flex" flexDirection="column" overflowY="auto">
      {/* Header */}
      <Box flexShrink={0} px={{ base: 3, md: 5 }} pt={4} pb={2}>
        <HStack justify="space-between" align="start" mb={3}>
          <HStack spacing={3}>
            <Box
              w="48px" h="48px" minW="48px"
              borderRadius="2xl"
              bg={`${accentColor}18`}
              display="flex" alignItems="center" justifyContent="center"
              fontSize="2xl"
              animation={`${float} 3s ease-in-out infinite`}
            >
              {data.lesson.lessonEmoji || SUBJECT_EMOJIS[data.lesson.subject] || '📘'}
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="800" color={titleColor} noOfLines={1}>
                {data.lesson.title}
              </Text>
              <HStack spacing={2}>
                <Text fontSize="xs" color={bodyColor} opacity={0.7}>
                  {data.steps.length} steps · ~{data.lesson.estimatedMinutes || 10} min
                </Text>
              </HStack>
            </VStack>
          </HStack>
          <HStack spacing={2}>
            <ReadAloudButton text={step.content?.bodyText || step.content?.narrationScript || step.title} />
            {onExit && (
              <Tooltip label="Exit lesson">
                <IconButton
                  aria-label="Exit lesson"
                  icon={<ChevronLeftIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={onExit}
                />
              </Tooltip>
            )}
          </HStack>
        </HStack>

        {/* Overall progress bar */}
        <MasteryBar value={progressPct} label="Lesson Progress" segments={data.steps.length} size="sm" />
      </Box>

      {/* Step strip */}
      <Box flexShrink={0} px={{ base: 3, md: 5 }} py={2}>
        <HStack spacing={1} justify="center" flexWrap="wrap">
          {data.steps.map((s, i) => {
            const isCompleted = completedSteps.has(i);
            const isCurrent = i === currentStep;
            return (
              <HStack key={s.id} spacing={1} align="center">
                <Circle
                  size={isCurrent ? '32px' : '26px'}
                  bg={isCompleted ? 'green.400' : isCurrent ? accentColor : `${accentColor}22`}
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  transition="all 0.3s ease"
                  flexShrink={0}
                  boxShadow={isCurrent ? `0 0 12px ${accentColor}66` : 'none'}
                  cursor="pointer"
                  onClick={() => setCurrentStep(i)}
                  animation={isCurrent ? `${popIn} 0.3s ease-out` : undefined}
                >
                  {isCompleted ? '✓' : i + 1}
                </Circle>
                {i < data.steps.length - 1 && (
                  <Box
                    h="2px"
                    w={{ base: '8px', md: '16px' }}
                    bg={isCompleted ? 'green.400' : `${accentColor}22`}
                    borderRadius="full"
                    transition="all 0.3s ease"
                  />
                )}
              </HStack>
            );
          })}
        </HStack>
      </Box>

      {/* Step content */}
      <Box flex={1} px={{ base: 3, md: 5 }} py={3} overflowY="auto">
        <StepContent
          step={step}
          assets={stepAssets}
          isLast={isLast}
          onComplete={(xp) => handleStepComplete(currentStep, xp)}
          colors={{ accent: accentColor, text: titleColor, body: bodyColor, card: cardBg, border: borderColor, panel: panelBg }}
        />
      </Box>

      {/* Navigation */}
      <Box flexShrink={0} px={{ base: 3, md: 5 }} py={3} borderTop="1px solid" borderColor={borderColor}>
        <HStack justify="space-between">
          <Button
            leftIcon={<ChevronLeftIcon />}
            variant="ghost"
            onClick={goPrev}
            isDisabled={currentStep === 0}
            size="sm"
            color={bodyColor}
          >
            Previous
          </Button>
          <HStack spacing={2}>
            {showXpBurst && <XPBurst amount={10} show={showXpBurst} />}
            <Badge colorScheme="yellow" borderRadius="full" px={3} py={1}>
              ⭐ {xpEarned} XP
            </Badge>
          </HStack>
          {isLast ? (
            <Button
              rightIcon={<CheckCircleIcon />}
              colorScheme="green"
              onClick={handleFinish}
              size="sm"
              isDisabled={!completedSteps.has(currentStep)}
            >
              Finish!
            </Button>
          ) : (
            <Button
              rightIcon={<ChevronRightIcon />}
              colorScheme="blue"
              onClick={goNext}
              size="sm"
            >
              Next
            </Button>
          )}
        </HStack>
      </Box>
    </Box>
  );
}

// ─── Step Content Renderer ───────────────────────────────────────────────────

function StepContent({
  step,
  assets,
  isLast,
  onComplete,
  colors,
}: {
  step: StepData;
  assets: AssetData[];
  isLast: boolean;
  onComplete: (xp: number) => void;
  colors: { accent: string; text: string; body: string; card: string; border: string; panel: string };
}) {
  const c = step.content || {};
  const hasAssessment = !!(c.question && c.choices);
  const hasAnswerKey = !!c.answerKey;
  const [answered, setAnswered] = useState(false);

  const handleAnswer = (outcome: ConceptCheckOutcome) => {
    if (outcome.correct) {
      setAnswered(true);
      onComplete(10);
    }
  };

  const handleMastered = () => {
    setAnswered(true);
    onComplete(10);
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Step title */}
      <HStack spacing={2}>
        <Text fontSize="2xl">{step.stepEmoji || '⭐'}</Text>
        <VStack align="start" spacing={0}>
          <Text fontSize="xs" color={colors.body} opacity={0.6} fontWeight="600" textTransform="uppercase">
            {STEP_TYPE_LABELS[step.stepType] || step.stepType}
          </Text>
          <Text fontSize="xl" fontWeight="800" color={colors.text}>
            {step.title}
          </Text>
        </VStack>
      </HStack>

      {/* Image assets */}
      {assets.filter((a) => a.assetType === 'image' && a.assetUrl).length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          {assets.filter((a) => a.assetType === 'image' && a.assetUrl).map((asset) => (
            <Box
              key={asset.id}
              borderRadius="xl"
              overflow="hidden"
              borderWidth="2px"
              borderColor={colors.border}
              bg={colors.card}
            >
              <Image
                src={asset.assetUrl!}
                alt={asset.altText || step.title}
                w="100%"
                objectFit="contain"
                maxH="240px"
              />
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Narrative hook */}
      {c.narrativeHook && (
        <Box
          p={4}
          borderRadius="2xl"
          bg={`${colors.accent}11`}
          borderLeft="4px solid"
          borderColor={colors.accent}
        >
          <Text fontSize="md" fontStyle="italic" color={colors.body}>
            {c.narrativeHook}
          </Text>
        </Box>
      )}

      {/* Body text */}
      {c.bodyText && (
        <Box p={4} borderRadius="xl" bg={colors.card} borderWidth="1px" borderColor={colors.border}>
          <Text fontSize="md" color={colors.body} lineHeight="1.7">
            {c.bodyText}
          </Text>
        </Box>
      )}

      {/* Fun fact */}
      {c.funFact && (
        <Box p={3} borderRadius="lg" bg="yellow.50" borderWidth="1px" borderColor="yellow.200">
          <Text fontSize="sm" color="yellow.900">
            💡 <strong>Did you know?</strong> {c.funFact}
          </Text>
        </Box>
      )}

      {/* Prompt / practice */}
      {c.prompt && !hasAssessment && (
        <Box p={4} borderRadius="xl" bg={colors.panel} borderWidth="2px" borderColor={colors.accent}>
          <Text fontSize="md" fontWeight="600" color={colors.text}>
            {c.prompt}
          </Text>
        </Box>
      )}

      {/* Assessment: ConceptCheckCard (predict-then-reveal) */}
      {hasAssessment && c.choices && (
        <ConceptCheckCard
          question={c.question}
          choices={c.choices.map((ch: any) => ({
            id: ch.id || String(ch.label).substring(0, 20),
            label: ch.label,
            correct: ch.correct ?? (ch.id === c.answerKey?.answer),
          })) as ConceptChoice[]}
          explanation={c.explanation || c.answerKey?.explanation || 'Great thinking!'}
          hint={c.hintSet?.[0] || undefined}
          xpReward={10}
          onOutcome={handleAnswer}
          onMastered={handleMastered}
        />
      )}

      {/* Answer key (for non-choice questions) */}
      {hasAnswerKey && !hasAssessment && (
        <Box p={4} borderRadius="xl" bg={colors.card} borderWidth="1px" borderColor={colors.border}>
          <Text fontSize="sm" fontWeight="600" color={colors.text} mb={1}>
            Answer
          </Text>
          <Text fontSize="md" color={colors.body}>
            {c.answerKey.answer}
          </Text>
          {c.answerKey.explanation && (
            <Text fontSize="sm" color={colors.body} opacity={0.8} mt={2}>
              {c.answerKey.explanation}
            </Text>
          )}
        </Box>
      )}

      {/* Hints */}
      {c.hintSet && c.hintSet.length > 0 && !hasAssessment && (
        <VStack spacing={2} align="stretch">
          {c.hintSet.map((hint: string, i: number) => (
            <Box key={i} p={3} borderRadius="lg" bg="blue.50" borderWidth="1px" borderColor="blue.200">
              <Text fontSize="sm" color="blue.900">
                💡 <strong>Hint {i + 1}:</strong> {hint}
              </Text>
            </Box>
          ))}
        </VStack>
      )}

      {/* Narration script (for audio-supported lessons) */}
      {c.narrationScript && (
        <Box p={3} borderRadius="lg" bg={`${colors.accent}08`} borderWidth="1px" borderColor={colors.border}>
          <Text fontSize="xs" color={colors.body} opacity={0.6} mb={1}>
            🎙️ Narration
          </Text>
          <Text fontSize="sm" fontStyle="italic" color={colors.body}>
            {c.narrationScript}
          </Text>
        </Box>
      )}

      {/* Auto-complete for non-assessment steps */}
      {!hasAssessment && !answered && (c.bodyText || c.prompt) && (
        <Button
          colorScheme="green"
          size="sm"
          variant="outline"
          onClick={() => onComplete(5)}
          alignSelf="center"
        >
          <CheckCircleIcon mr={2} />
          Got it!
        </Button>
      )}

      {/* Visual spec (for debugging / advanced rendering) */}
      {step.visualSpec && step.visualSpec.layout && (
        <Box p={3} borderRadius="lg" bg={colors.panel} borderWidth="1px" borderColor={colors.border}>
          <Text fontSize="xs" color={colors.body} opacity={0.5}>
            Visual: {step.visualSpec.layout}
          </Text>
        </Box>
      )}
    </VStack>
  );
}

// ─── Celebration View ────────────────────────────────────────────────────────

function CelebrationView({
  lesson,
  xpEarned,
  onReplay,
  onExit,
  colors,
}: {
  lesson: LessonData['lesson'];
  xpEarned: number;
  onReplay: () => void;
  onExit?: () => void;
  colors: { accent: string; text: string; body: string; card: string; border: string };
}) {
  return (
    <Box
      h="100%"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={6}
      textAlign="center"
    >
      <Box animation={`${celebrate} 0.6s ease-out`} mb={4}>
        <Text fontSize="6xl">{lesson.lessonEmoji || '🎉'}</Text>
      </Box>

      <Text fontSize="2xl" fontWeight="900" color={colors.text} mb={2}>
        Amazing Work!
      </Text>

      <Text fontSize="md" color={colors.body} mb={4}>
        You finished "{lesson.title}"
      </Text>

      {/* XP earned */}
      <Box
        p={4}
        borderRadius="2xl"
        bg={`${colors.accent}11`}
        borderWidth="2px"
        borderColor={colors.accent}
        mb={6}
        animation={`${popIn} 0.5s ease-out`}
      >
        <HStack spacing={3} justify="center">
          <Text fontSize="3xl">⭐</Text>
          <Text fontSize="2xl" fontWeight="900" color={colors.accent}>
            +{xpEarned} XP
          </Text>
        </HStack>
      </Box>

      {/* Skills practiced */}
      {lesson.skillCodes && lesson.skillCodes.length > 0 && (
        <VStack spacing={2} mb={6}>
          <Text fontSize="xs" color={colors.body} opacity={0.6} fontWeight="600" textTransform="uppercase">
            Skills you practiced
          </Text>
          <HStack spacing={2} flexWrap="wrap" justify="center">
            {lesson.skillCodes.map((skill) => (
              <Badge key={skill} colorScheme="purple" borderRadius="full" px={3} py={1}>
                {skill}
              </Badge>
            ))}
          </HStack>
        </VStack>
      )}

      {/* Actions */}
      <HStack spacing={3}>
        <Button
          leftIcon={<FiRefreshCw />}
          colorScheme="blue"
          variant="outline"
          onClick={onReplay}
          size="md"
        >
          Play Again
        </Button>
        {onExit && (
          <Button
            colorScheme="green"
            onClick={onExit}
            size="md"
          >
            Back to Lessons
          </Button>
        )}
      </HStack>
    </Box>
  );
}

export default LessonPlayer;
