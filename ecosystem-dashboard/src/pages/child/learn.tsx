/**
 * Child Learn Hub
 *
 * "Today's Plan" guided learning session. Loads an adaptive plan, walks the
 * child through short activities one at a time, grades each attempt
 * deterministically, coaches with escalating hints (never the answer), and
 * ends with a short reflection. Runs on the Phase 1 learn APIs and works on
 * starter content even before the DB catalog is seeded.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Textarea,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Flex,
  Wrap,
  WrapItem,
  SimpleGrid,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiArrowRight,
  FiRefreshCw,
  FiHelpCircle,
  FiAward,
  FiSkipForward,
  FiCompass,
  FiEdit3,
} from 'react-icons/fi';

import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { ReadAloudButton } from '@/components/child/ReadAloudButton';
import { useKidsPCG } from '@/hooks/useKidsPCG';
import type {
  LearnPlanActivity,
  LearnPlanResponse,
} from '@/domains/learning/shared/plan-types';
import {
  buildReflectionWorkspacePayload,
  buildWorkspacePayloadFromActivity,
  describePlanSource,
  getLearnThemePresentation,
  summarizeLearnPlanActivities,
} from '@/domains/learning/shared/ui-presenter';
import { getAgeBandSessionConfig } from '@/domains/learning/shared/learning-config';

interface RubricDimensionScore {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface RubricResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  dimensionScores: RubricDimensionScore[];
  encouragement: string;
  strengths: string[];
  recommendations: { title: string; description: string }[];
  method: string;
  confidence: number;
}

interface AttemptResponse {
  correct: boolean;
  score: number;
  feedback: string;
  hint?: string;
  hintLevel?: number;
  hintsAvailable?: number;
  coachMessage?: string;
  rubricResult?: RubricResult;
}

interface TutorTurnResponse {
  response?: string;
  tutorMessage?: string;
  hint?: string;
  hintLevel?: number;
  hintsAvailable?: number;
}

type Phase = 'loading' | 'plan' | 'activity' | 'complete' | 'empty' | 'error' | 'blocked';

// Each activity walks through a short pedagogical loop: instruction ->
// answer (with scaffolded hints) -> check-for-understanding (metacognition).
type ActivityStep = 'intro' | 'instruction' | 'answer' | 'understanding';

const TIME_UP_MESSAGE = "That's all the learning time for today. Come back tomorrow!";

// Thrown when the learning APIs report the child is out of allowed time/hours, so
// the UI can show a friendly "time's up" screen instead of a generic error.
class AccessBlockedError extends Error {}

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Math',
  reading: 'Reading',
  writing: 'Writing',
  analytical: 'Thinking',
  science: 'Science',
};

const ANALYTICAL_TAG_LABELS: Record<string, string> = {
  'analytical.infer_evidence': 'Inference with evidence',
  'analytical.compare_classify': 'Compare and classify',
  'analytical.cause_effect': 'Cause and effect',
  'analytical.patterns': 'Pattern detection',
  'analytical.evaluate': 'Evaluate reasoning',
  'analytical.metacognition': 'Metacognitive reflection',
};

const SUBJECT_INSTRUCTION_PROMPTS: Record<string, string> = {
  math: 'Before you solve it, think about what kind of problem this is. What operation do you need? What information matters?',
  reading: 'Read the passage carefully. What is it asking you to find? Look for the key detail that answers the question.',
  writing: 'Take a moment to plan your writing. What is your main idea? What details will you include? Remember to use capital letters and end marks.',
  analytical: 'Think step by step. What evidence do you have? What conclusion does it support? Can you explain why?',
};

function analyticalTagLabel(tag: string): string {
  return ANALYTICAL_TAG_LABELS[tag] || tag.replace(/^analytical\./, '').replace(/_/g, ' ');
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function prettifySkill(code: string): string {
  const parts = code.split('.');
  const last = parts[parts.length - 1] || code;
  return last
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function subjectOf(code: string): string {
  const subject = code.split('.')[0] || '';
  return SUBJECT_LABELS[subject] || 'Learn';
}

function getHintStageLabel(hintLevel?: number): string {
  if (typeof hintLevel !== 'number') {
    return 'Hint support';
  }
  if (hintLevel <= 0) {
    return 'Quick nudge';
  }
  if (hintLevel === 1) {
    return 'Strategy hint';
  }
  return 'Step-by-step hint';
}

function ChildLearnContent() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useKidsPCG();
  const { colors, childExtras } = useChildTheme();

  const [phase, setPhase] = useState<Phase>('loading');
  const [plan, setPlan] = useState<LearnPlanResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responseText, setResponseText] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [reflection, setReflection] = useState('');
  const [step, setStep] = useState<ActivityStep>('intro');
  const [understanding, setUnderstanding] = useState('');
  const [understandingNotes, setUnderstandingNotes] = useState<Record<number, string>>({});
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const childId = profile?.id || '';
  const ageBand = profile?.ageGroup || '';

  // Session timer — tracks elapsed time against age-band-aware session length.
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionConfig = useMemo(
    () => getAgeBandSessionConfig(ageBand),
    [ageBand],
  );
  const sessionWarnAt = sessionConfig.defaultSessionMinutes * 60;
  const sessionOverAt = sessionConfig.defaultSessionMinutes * 60 + 60; // 1 min grace

  useEffect(() => {
    if (phase !== 'activity') return;
    const interval = setInterval(() => {
      setSessionElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const loadPlan = useCallback(async () => {
    if (!childId) return;
    setPhase('loading');
    setErrorMessage('');

    try {
      const fetchPlan = async (withBand: boolean) => {
        const params = new URLSearchParams({ childId });
        if (withBand && ageBand) params.set('ageBand', ageBand);
        params.set('objectivesLimit', '5');
        const res = await fetch(`/api/learn/plan?${params.toString()}`);
        if (res.status === 403) {
          const blocked = await res.json().catch(() => ({}));
          throw new AccessBlockedError(blocked?.message || TIME_UP_MESSAGE);
        }
        if (!res.ok) {
          throw new Error(`Plan request failed (${res.status})`);
        }
        return (await res.json()) as LearnPlanResponse;
      };

      let data = await fetchPlan(true);
      // If this age band has no starter content yet, widen the search.
      if ((!data.activities || data.activities.length === 0) && ageBand) {
        data = await fetchPlan(false);
      }

      setPlan(data);
      setCurrentIndex(0);
      setCorrectCount(0);
      setResponseText('');
      setAttemptNumber(1);
      setResult(null);
      setStep('intro');
      setUnderstanding('');
      setSessionElapsed(0);
      setUnderstandingNotes({});
      setReflectionSaved(false);

      if (!data.activities || data.activities.length === 0) {
        setPhase('empty');
        return;
      }

      setPhase('activity');

      // Best-effort: open a learning session to record the loop end-to-end.
      try {
        const sessionRes = await fetch('/api/learn/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            mode: 'guided',
            status: 'started',
            plan: { plannedActivityCount: data.activities.length },
          }),
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSessionId(sessionData?.session?.id || sessionData?.id || null);
        }
      } catch {
        /* session tracking is non-critical */
      }
    } catch (err) {
      if (err instanceof AccessBlockedError) {
        setErrorMessage(err.message);
        setPhase('blocked');
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : 'Could not load your plan.');
      setPhase('error');
    }
  }, [childId, ageBand]);

  useEffect(() => {
    if (!profileLoading && childId) {
      loadPlan();
    }
  }, [profileLoading, childId, loadPlan]);

  const activities = plan?.activities || [];
  const activity = activities[currentIndex];
  const total = activities.length;
  const isLast = currentIndex >= total - 1;

  const themedPresentation = useMemo(
    () => getLearnThemePresentation(childExtras?.themeName),
    [childExtras?.themeName],
  );
  const planSummary = useMemo(
    () => summarizeLearnPlanActivities(activities, plan?.assignmentsApplied),
    [activities, plan?.assignmentsApplied],
  );
  const { assignmentCount, reviewCount, focusCount, hasAssignments } = planSummary;
  const planSourceLabel = describePlanSource(plan?.source);

  const openActivityInWorkspace = useCallback(
    (targetActivity: LearnPlanActivity) => {
      if (typeof window === 'undefined') {
        return;
      }

      sessionStorage.setItem(
        'workspacePagePrompt',
        JSON.stringify(
          buildWorkspacePayloadFromActivity({
            activity: targetActivity,
            childName: plan?.childName,
            subjectLabel: subjectOf(targetActivity.skillCode),
            fallbackTitle: prettifySkill(targetActivity.skillCode),
          }),
        ),
      );

      router.push('/child/workspace');
    },
    [plan?.childName, router],
  );

  const openReflectionInWorkspace = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    sessionStorage.setItem(
      'workspacePagePrompt',
      JSON.stringify(
        buildReflectionWorkspacePayload({
          childName: plan?.childName,
          correctCount,
          total,
          reflection,
        }),
      ),
    );

    router.push('/child/workspace');
  }, [correctCount, plan?.childName, reflection, router, total]);

  const submitAttempt = useCallback(async () => {
    if (!activity || !responseText.trim() || !childId) return;
    setGrading(true);
    try {
      const res = await fetch('/api/learn/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          contentItemId: activity.contentItemId,
          response: responseText,
          attemptNumber,
        }),
      });

      if (res.status === 403) {
        const blocked = await res.json().catch(() => ({}));
        setErrorMessage(blocked?.message || TIME_UP_MESSAGE);
        setPhase('blocked');
        return;
      }

      if (!res.ok) {
        throw new Error(`Attempt failed (${res.status})`);
      }

      const data = (await res.json()) as AttemptResponse;

      let tutorTurn: TutorTurnResponse | null = null;
      if (!data.correct) {
        try {
          const tutorRes = await fetch('/api/learn/tutor/turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId,
              contentItemId: activity.contentItemId,
              message: responseText,
              attemptNumber,
              sessionId: sessionId || undefined,
            }),
          });

          if (tutorRes.ok) {
            tutorTurn = (await tutorRes.json()) as TutorTurnResponse;
          }
        } catch {
          /* tutor coaching is non-critical */
        }
      }

      const mergedResult: AttemptResponse = {
        ...data,
        coachMessage: tutorTurn?.tutorMessage || tutorTurn?.response,
        hint: tutorTurn?.hint ?? data.hint,
        hintLevel:
          typeof tutorTurn?.hintLevel === 'number' ? tutorTurn.hintLevel : data.hintLevel,
        hintsAvailable:
          typeof tutorTurn?.hintsAvailable === 'number'
            ? tutorTurn.hintsAvailable
            : data.hintsAvailable,
      };

      setResult(mergedResult);
      if (mergedResult.correct) {
        setCorrectCount((c) => c + 1);
        setStep('understanding');
      } else {
        setAttemptNumber((n) => n + 1);
      }
    } catch (err) {
      setResult({
        correct: false,
        score: 0,
        feedback: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      });
    } finally {
      setGrading(false);
    }
  }, [activity, responseText, childId, attemptNumber, sessionId]);

  const completeSession = useCallback(
    async (outcomes: Record<string, unknown>) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/learn/session/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            endedAt: new Date().toISOString(),
            outcomes,
          }),
        });
      } catch {
        /* non-critical */
      }
    },
    [sessionId],
  );

  const advanceToNext = useCallback(
    (notes: Record<number, string>) => {
      setResult(null);
      setResponseText('');
      setAttemptNumber(1);
      setUnderstanding('');
      setStep('intro');

      if (isLast) {
        setPhase('complete');
        completeSession({
          correct: correctCount,
          total,
          understanding: Object.values(notes).filter(Boolean),
        });
        return;
      }
      setCurrentIndex((i) => i + 1);
    },
    [isLast, completeSession, correctCount, total],
  );

  // Advance without capturing a metacognition note (used by both Skip actions).
  const skipActivity = useCallback(() => {
    advanceToNext(understandingNotes);
  }, [advanceToNext, understandingNotes]);

  // Advance from the understanding step, capturing the child's explanation.
  const goNext = useCallback(() => {
    const trimmed = understanding.trim();
    const nextNotes = trimmed
      ? { ...understandingNotes, [currentIndex]: trimmed }
      : understandingNotes;
    if (trimmed) {
      setUnderstandingNotes(nextNotes);
    }
    advanceToNext(nextNotes);
  }, [understanding, understandingNotes, currentIndex, advanceToNext]);

  const retry = useCallback(() => {
    setResult(null);
    setResponseText('');
  }, []);

  const saveReflection = useCallback(async () => {
    if (!sessionId) return;
    setSavingReflection(true);
    try {
      await completeSession({
        correct: correctCount,
        total,
        understanding: Object.values(understandingNotes).filter(Boolean),
        reflection: reflection.trim() || undefined,
      });
      setReflectionSaved(true);
    } finally {
      setSavingReflection(false);
    }
  }, [sessionId, completeSession, correctCount, total, understandingNotes, reflection]);

  // ---- Render states -------------------------------------------------------

  if (phase === 'loading' || profileLoading) {
    return (
      <Centered>
        <Spinner size="xl" thickness="4px" color={colors.primary} />
        <Text mt={4} fontWeight="bold">Getting today&apos;s plan ready...</Text>
      </Centered>
    );
  }

  if (phase === 'error') {
    return (
      <Centered>
        <Alert status="error" borderRadius="lg" maxW="md">
          <AlertIcon />
          {errorMessage || 'Could not load your plan.'}
        </Alert>
        <Button mt={4} leftIcon={<FiRefreshCw />} onClick={loadPlan} colorScheme="primary">
          Try again
        </Button>
      </Centered>
    );
  }

  if (phase === 'blocked') {
    return (
      <Centered>
        <Text fontSize="5xl">⏰</Text>
        <Heading size="md" mt={2}>That&apos;s all for now</Heading>
        <Text mt={2} textAlign="center" maxW="md" opacity={0.8}>
          {errorMessage || TIME_UP_MESSAGE}
        </Text>
        <Button mt={6} onClick={() => router.push('/child/home')} colorScheme="primary">
          Back to Home
        </Button>
      </Centered>
    );
  }

  if (phase === 'empty') {
    return (
      <Centered>
        <Text fontSize="5xl">🌱</Text>
        <Heading size="md" mt={2}>No activities yet</Heading>
        <Text mt={2} textAlign="center" maxW="md" opacity={0.8}>
          Your learning plan is empty right now. Check back soon for new practice!
        </Text>
        <Button mt={6} onClick={() => router.push('/child/home')} variant="outline">
          Back to Home
        </Button>
      </Centered>
    );
  }

  if (phase === 'complete') {
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <Container maxW={{ base: '4xl', md: '6xl', lg: '6xl' }} py={{ base: 6, md: 8 }}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }}>
          <Card
            borderRadius="card"
            boxShadow="card"
            bgGradient={themedPresentation.heroGradient}
            color="white"
            border="2px solid"
            borderColor={themedPresentation.panelBorderColor}
          >
            <CardBody p={{ base: 4, md: 6 }}>
              <VStack spacing={3} textAlign="center">
                <Box fontSize="6xl">{pct >= 80 ? '🎉' : '💪'}</Box>
                <Heading size="lg">Great work today!</Heading>
                <Text fontSize="lg">
                  You got <b>{correctCount}</b> of <b>{total}</b> right.
                </Text>
                <HStack>
                  <FiAward />
                  <Text fontWeight="bold">Effort badge earned</Text>
                </HStack>
                <Wrap justify="center" spacing={2}>
                  {hasAssignments && (
                    <WrapItem>
                      <Badge colorScheme="yellow" variant="solid">
                        {assignmentCount} {themedPresentation.assignmentLabel}
                      </Badge>
                    </WrapItem>
                  )}
                  <WrapItem>
                    <Badge colorScheme="green" variant="solid">
                      {reviewCount} {themedPresentation.reviewLabel}
                    </Badge>
                  </WrapItem>
                  <WrapItem>
                    <Badge colorScheme="blue" variant="solid">
                      {focusCount} {themedPresentation.focusLabel}
                    </Badge>
                  </WrapItem>
                </Wrap>

                {plan?.spacedReview?.nextReview && (
                  <Box
                    p={3}
                    borderRadius="lg"
                    bg="blackAlpha.50"
                    _dark={{ bg: 'whiteAlpha.100' }}
                  >
                    <Text fontWeight="semibold" fontSize="sm" mb={1}>
                      Next time
                    </Text>
                    <Text fontSize="sm" opacity={0.85}>
                      {plan.spacedReview.overdueCount > 0
                        ? `You have ${plan.spacedReview.overdueCount} skill${plan.spacedReview.overdueCount > 1 ? 's' : ''} to review next session.`
                        : `Next up: ${plan.spacedReview.nextReview.skillName}${plan.spacedReview.nextReview.daysUntilReview > 0 ? ` (in ${plan.spacedReview.nextReview.daysUntilReview} day${plan.spacedReview.nextReview.daysUntilReview === 1 ? '' : 's'})` : ' — ready when you are!'}`}
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>

          <Card borderRadius="card" boxShadow="card">
            <CardBody p={{ base: 4, md: 6 }}>
              <VStack spacing={4} textAlign="center">
                <Box w="full" pt={1}>
                  <Text fontWeight="bold" mb={2} textAlign="left">
                    One quick thought: what felt tricky today?
                  </Text>
                  <Textarea
                    value={reflection}
                    onChange={(e) => {
                      setReflection(e.target.value);
                      setReflectionSaved(false);
                    }}
                    placeholder="Type a sentence (optional)"
                    rows={3}
                    isDisabled={savingReflection}
                  />
                  <Flex justify={{ base: 'stretch', md: 'space-between' }} mt={3} gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      size="sm"
                      leftIcon={<FiEdit3 />}
                      variant="outline"
                      onClick={openReflectionInWorkspace}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      Open Reflection Canvas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={saveReflection}
                      isLoading={savingReflection}
                      loadingText="Saving"
                      isDisabled={reflectionSaved || !reflection.trim()}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      {reflectionSaved ? 'Saved' : 'Save reflection'}
                    </Button>
                  </Flex>
                </Box>

                <VStack pt={2} spacing={2}>
                  <Button
                    leftIcon={<FiArrowRight />}
                    onClick={loadPlan}
                    colorScheme="primary"
                    minH={{ base: '44px', md: '48px' }}
                    w={{ base: 'full', md: 'auto' }}
                  >
                    Start next mission
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/child/home')}
                    minH={{ base: '44px', md: '48px' }}
                    w={{ base: 'full', md: 'auto' }}
                  >
                    Back to Home
                  </Button>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Container>
    );
  }

  // phase === 'activity'
  if (!activity) {
    return (
      <Centered>
        <Spinner size="lg" color={colors.primary} />
      </Centered>
    );
  }

  const isWarmUp = activity.kind === 'review';
  const isAssignmentActivity = activity.isAssignment === true;
  const stepLabel =
    step === 'intro'
      ? isWarmUp
        ? themedPresentation.reviewLabel
        : 'Get ready'
      : step === 'instruction'
        ? 'Mini-lesson'
        : step === 'understanding'
          ? 'Explain it'
          : 'Practice';
  const isQuestionType = activity.type === 'question';

  return (
    <Container maxW={{ base: '4xl', md: '6xl', lg: '6xl' }} py={{ base: 5, md: 7 }}>
      <VStack align="stretch" spacing={{ base: 4, md: 5 }}>
        <Card
          borderRadius="card"
          boxShadow="card"
          bgGradient={themedPresentation.heroGradient}
          color="white"
          border="2px solid"
          borderColor={themedPresentation.panelBorderColor}
        >
          <CardBody p={{ base: 4, md: 6 }}>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" align={{ base: 'stretch', md: 'center' }} wrap="wrap" gap={{ base: 2, md: 3 }}>
                <Box>
                  <HStack mb={1} spacing={2}>
                    <FiCompass />
                    <Text fontWeight="bold" fontSize="sm" textTransform="uppercase" letterSpacing="0.06em">
                      {themedPresentation.missionLabel}
                    </Text>
                  </HStack>
                  <Heading size="md">
                    {plan?.childName ? `${plan.childName}'s Plan` : "Today's Plan"}
                  </Heading>
                  <Text opacity={0.95} fontSize="sm">
                    {themedPresentation.missionSubtitle}
                  </Text>
                  <Text opacity={0.85} fontSize="xs" mt={1}>
                    {themedPresentation.paceLine}
                  </Text>
                </Box>

                <Button
                  leftIcon={<FiEdit3 />}
                  variant="outline"
                  borderColor="whiteAlpha.700"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => openActivityInWorkspace(activity)}
                  minH={{ base: '44px', md: '48px' }}
                  w={{ base: 'full', md: 'auto' }}
                >
                  Open in Workspace Canvas
                </Button>
              </HStack>

              <Wrap spacing={{ base: 2, md: 3 }}>
                <WrapItem>
                  <Badge colorScheme="whiteAlpha" variant="solid">
                    Activity {currentIndex + 1} of {total}
                  </Badge>
                </WrapItem>
                {hasAssignments && (
                  <WrapItem>
                    <Badge colorScheme="yellow" variant="solid">
                      {assignmentCount} {themedPresentation.assignmentLabel}
                    </Badge>
                  </WrapItem>
                )}
                <WrapItem>
                  <Badge colorScheme="green" variant="solid">
                    {reviewCount} {themedPresentation.reviewLabel}
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge colorScheme="blue" variant="solid">
                    {focusCount} {themedPresentation.focusLabel}
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge colorScheme="purple" variant="solid">
                    {planSourceLabel}
                  </Badge>
                </WrapItem>
              </Wrap>

              {plan?.spacedReview?.nextReview && (
                <Text opacity={0.85} fontSize="xs">
                  {plan.spacedReview.overdueCount > 0
                    ? `${plan.spacedReview.overdueCount} skill${plan.spacedReview.overdueCount > 1 ? 's' : ''} due for review`
                    : `Next review: ${plan.spacedReview.nextReview.skillName} in ${plan.spacedReview.nextReview.daysUntilReview} day${plan.spacedReview.nextReview.daysUntilReview === 1 ? '' : 's'}`}
                </Text>
              )}

              <HStack spacing={2} opacity={0.9}>
                <Text fontSize="xs" fontFamily="mono">
                  {formatElapsed(sessionElapsed)}
                </Text>
                {sessionElapsed >= sessionWarnAt && sessionElapsed < sessionOverAt && (
                  <Badge colorScheme="orange" variant="solid" fontSize="0.65rem">
                    Almost time to wrap up
                  </Badge>
                )}
                {sessionElapsed >= sessionOverAt && (
                  <Badge colorScheme="red" variant="solid" fontSize="0.65rem">
                    Time to finish up
                  </Badge>
                )}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card borderRadius="card" boxShadow="sm">
          <CardBody p={{ base: 4, md: 5 }}>
            <VStack align="stretch" spacing={3}>
              <Text fontSize="sm" fontWeight="bold">
                Today&apos;s activity path
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 2, md: 3 }}>
                {activities.map((item, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isDone = idx < currentIndex;
                  return (
                    <Box
                      key={`${item.contentItemId}-${idx}`}
                      h="full"
                      p={{ base: 3, md: 4 }}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderColor={isCurrent ? colors.primary : isDone ? 'green.300' : 'gray.200'}
                      bg={isCurrent ? 'blackAlpha.50' : 'transparent'}
                    >
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" fontWeight="bold">
                          Step {idx + 1}
                        </Text>
                        {isDone && <Text fontSize="xs">✅</Text>}
                      </HStack>
                      <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                        {prettifySkill(item.skillCode)}
                      </Text>
                      <Wrap spacing={1} mt={2}>
                        {item.isAssignment && (
                          <WrapItem>
                            <Badge colorScheme="yellow" variant="subtle" fontSize="0.65rem">
                              {themedPresentation.assignmentLabel}
                            </Badge>
                          </WrapItem>
                        )}
                        {item.kind === 'review' && (
                          <WrapItem>
                            <Badge colorScheme="green" variant="subtle" fontSize="0.65rem">
                              {themedPresentation.reviewLabel}
                            </Badge>
                          </WrapItem>
                        )}
                      </Wrap>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        <SegmentedStepRail total={total} currentIndex={currentIndex} step={step} />

        <Card borderRadius="card" boxShadow="card">
          <CardBody p={{ base: 4, md: 6 }}>
            <VStack align="stretch" spacing={4}>
              <Wrap spacing={2}>
                <WrapItem>
                  <Badge colorScheme="blue">{subjectOf(activity.skillCode)}</Badge>
                </WrapItem>
                <WrapItem>
                  <Badge variant="subtle">{prettifySkill(activity.skillCode)}</Badge>
                </WrapItem>
                {isAssignmentActivity && (
                  <WrapItem>
                    <Badge colorScheme="yellow" variant="subtle">
                      {themedPresentation.assignmentLabel}
                    </Badge>
                  </WrapItem>
                )}
                <WrapItem>
                  <Badge colorScheme={isWarmUp && step === 'intro' ? 'green' : 'gray'} variant="subtle">
                    {stepLabel}
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <DifficultyDots difficulty={activity.difficulty} />
                </WrapItem>
              </Wrap>

              {step === 'intro' && (
                <VStack align="stretch" spacing={4}>
                  {isAssignmentActivity && (
                    <Alert status="info" borderRadius="lg">
                      <AlertIcon />
                      <Text fontSize="sm" fontWeight="semibold">
                        {themedPresentation.assignmentLabel}: your family asked you to focus on this today.
                      </Text>
                    </Alert>
                  )}

                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      {isWarmUp ? "Let's warm up by reviewing" : 'Next up'}: {prettifySkill(activity.skillCode)}
                    </Text>
                    <Text opacity={0.8}>
                      Read the {isQuestionType ? 'passage and question' : 'problem'} carefully and take
                      your time. You can ask for hints, and I&apos;ll coach you step by step &mdash; I won&apos;t
                      just give the answer.
                    </Text>
                  </Box>

                  <HStack
                    align="start"
                    spacing={3}
                    bg="blackAlpha.50"
                    _dark={{ bg: 'whiteAlpha.100' }}
                    p={{ base: 3, md: 4 }}
                    borderRadius="lg"
                  >
                    <Text fontSize="lg" flex="1">
                      {activity.prompt}
                    </Text>
                    <ReadAloudButton text={activity.prompt} sourceType="document" size="md" />
                  </HStack>

                  <Flex justify="flex-end">
                    <HStack gap={{ base: 2, md: 3 }} wrap="wrap" justify="flex-end">
                      <Button
                        leftIcon={<FiEdit3 />}
                        variant="outline"
                        onClick={() => openActivityInWorkspace(activity)}
                        minH={{ base: '44px', md: '48px' }}
                      >
                        Workspace Canvas
                      </Button>
                      <Button
                        rightIcon={<FiArrowRight />}
                        colorScheme="primary"
                        onClick={() => setStep(isWarmUp ? 'answer' : 'instruction')}
                        minH={{ base: '44px', md: '48px' }}
                      >
                        {isWarmUp ? 'Start' : 'Let\'s learn'}
                      </Button>
                    </HStack>
                  </Flex>
                </VStack>
              )}

              {step === 'instruction' && (
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      Mini-lesson: {prettifySkill(activity.skillCode)}
                    </Text>
                    <Text opacity={0.8}>
                      {SUBJECT_INSTRUCTION_PROMPTS[activity.skillCode.split('.')[0]] ||
                        'Think about what you already know about this topic. What strategy might help you here?'}
                    </Text>
                  </Box>

                  {activity.analyticalTags && activity.analyticalTags.length > 0 && (
                    <Box
                      p={{ base: 3, md: 4 }}
                      borderRadius="lg"
                      bg="purple.50"
                      _dark={{ bg: 'purpleAlpha.100' }}
                      border="1px solid"
                      borderColor="purple.200"
                    >
                      <HStack spacing={2} mb={1}>
                        <FiCompass />
                        <Text fontWeight="semibold" fontSize="sm" color="purple.700">
                          Thinking focus
                        </Text>
                      </HStack>
                      <Wrap spacing={2}>
                        {activity.analyticalTags.map((tag) => (
                          <WrapItem key={tag}>
                            <Badge colorScheme="purple" variant="subtle">
                              {analyticalTagLabel(tag)}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                      <Text fontSize="sm" mt={2} opacity={0.8}>
                        As you work, try to use this kind of thinking.
                      </Text>
                    </Box>
                  )}

                  <HStack
                    align="start"
                    spacing={3}
                    bg="blackAlpha.50"
                    _dark={{ bg: 'whiteAlpha.100' }}
                    p={{ base: 3, md: 4 }}
                    borderRadius="lg"
                  >
                    <Text fontSize="lg" flex="1">
                      {activity.prompt}
                    </Text>
                    <ReadAloudButton text={activity.prompt} sourceType="document" size="md" />
                  </HStack>

                  <Flex justify="flex-end" gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      leftIcon={<FiEdit3 />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      Workspace Canvas
                    </Button>
                    <Button
                      rightIcon={<FiArrowRight />}
                      colorScheme="primary"
                      onClick={() => setStep('answer')}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      Try it
                    </Button>
                  </Flex>
                </VStack>
              )}

              {step === 'answer' && (
                <>
                  <HStack align="start" spacing={3}>
                    <Text fontSize="xl" fontWeight="medium" flex="1">
                      {activity.prompt}
                    </Text>
                    <ReadAloudButton text={activity.prompt} sourceType="document" size="md" />
                  </HStack>

                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder={
                      activity.contentType === 'writing'
                        ? 'Write your response here. Take your time and do your best!'
                        : activity.contentType === 'reasoning'
                          ? 'Explain your thinking step by step...'
                          : 'Type your answer here'
                    }
                    rows={activity.contentType === 'writing' || activity.contentType === 'reasoning' ? 6 : 2}
                    autoFocus
                    isDisabled={grading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && activity.contentType !== 'writing' && activity.contentType !== 'reasoning') {
                        e.preventDefault();
                        submitAttempt();
                      }
                    }}
                  />

                  {/* Rubric feedback for writing/reasoning activities */}
                  {result?.rubricResult && (
                    <Box borderWidth="1px" borderRadius="lg" p={4} bg="purple.50" borderColor="purple.200">
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" color="purple.700">
                            {result.rubricResult.encouragement}
                          </Text>
                          <Badge colorScheme="purple" fontSize="sm" px={3} py={1} borderRadius="full">
                            {result.rubricResult.percentage}%
                          </Badge>
                        </HStack>

                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                          {result.rubricResult.dimensionScores.map((dim) => (
                            <Box key={dim.dimension} p={3} bg="white" borderRadius="md" borderWidth="1px" borderColor="purple.100">
                              <HStack justify="space-between" mb={1}>
                                <Text fontWeight="semibold" fontSize="sm">{dim.label}</Text>
                                <Text fontSize="sm" color="purple.600" fontWeight="bold">
                                  {dim.score}/{dim.maxScore}
                                </Text>
                              </HStack>
                              <Box h="4px" bg="purple.100" borderRadius="full" mb={2}>
                                <Box
                                  h="100%"
                                  w={`${(dim.score / dim.maxScore) * 100}%`}
                                  bg="purple.400"
                                  borderRadius="full"
                                />
                              </Box>
                              <Text fontSize="xs" color="gray.600">{dim.feedback}</Text>
                            </Box>
                          ))}
                        </SimpleGrid>

                        {result.rubricResult.strengths.length > 0 && (
                          <Box>
                            <Text fontWeight="semibold" fontSize="sm" color="green.600" mb={1}>
                              What you did well:
                            </Text>
                            <VStack align="start" spacing={1}>
                              {result.rubricResult.strengths.map((s, i) => (
                                <Text key={i} fontSize="sm" color="gray.700">
                                  • {s}
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}

                        {result.rubricResult.recommendations.length > 0 && (
                          <Box>
                            <Text fontWeight="semibold" fontSize="sm" color="orange.600" mb={1}>
                              Next steps to grow:
                            </Text>
                            <VStack align="start" spacing={1}>
                              {result.rubricResult.recommendations.map((r, i) => (
                                <Text key={i} fontSize="sm" color="gray.700">
                                  • <strong>{r.title}:</strong> {r.description}
                                </Text>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}

                  {result && !result.correct && !result.rubricResult && (
                    <Alert status="warning" borderRadius="lg" alignItems="start">
                      <AlertIcon />
                      <Box w="full">
                        <Text fontWeight="bold">{result.feedback}</Text>
                        {result.coachMessage && <Text mt={2}>{result.coachMessage}</Text>}
                        {result.hint && (
                          <Accordion allowToggle mt={3} defaultIndex={[0]}>
                            <AccordionItem border="1px solid" borderColor="orange.200" borderRadius="md">
                              <h2>
                                <AccordionButton _hover={{ bg: 'orange.50' }}>
                                  <HStack flex="1" spacing={2} textAlign="left">
                                    <FiHelpCircle />
                                    <Text fontWeight="semibold">
                                      {typeof result.hintsAvailable === 'number' &&
                                      typeof result.hintLevel === 'number'
                                        ? `Hint ${result.hintLevel + 1} of ${result.hintsAvailable} · ${getHintStageLabel(result.hintLevel)}`
                                        : getHintStageLabel(result.hintLevel)}
                                    </Text>
                                  </HStack>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pt={0}>
                                <Text>{result.hint}</Text>
                                {typeof result.hintsAvailable === 'number' &&
                                  typeof result.hintLevel === 'number' &&
                                  result.hintLevel + 1 < result.hintsAvailable && (
                                    <Text fontSize="xs" color="orange.700" mt={2}>
                                      Keep trying&mdash;another attempt unlocks a stronger hint if you need it.
                                    </Text>
                                  )}
                              </AccordionPanel>
                            </AccordionItem>
                          </Accordion>
                        )}
                      </Box>
                    </Alert>
                  )}

                  <Flex justify="flex-end" gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      leftIcon={<FiEdit3 />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      isDisabled={grading}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      Workspace Canvas
                    </Button>
                    <Button
                      leftIcon={<FiSkipForward />}
                      variant="ghost"
                      onClick={skipActivity}
                      isDisabled={grading}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      Skip
                    </Button>

                    {result && !result.correct ? (
                      <Button
                        leftIcon={<FiRefreshCw />}
                        colorScheme="primary"
                        onClick={retry}
                        isDisabled={grading}
                        minH={{ base: '44px', md: '48px' }}
                      >
                        Try again
                      </Button>
                    ) : result?.rubricResult ? (
                      <Button
                        leftIcon={<FiArrowRight />}
                        colorScheme="primary"
                        onClick={() => setStep('understanding')}
                        isDisabled={grading}
                        minH={{ base: '44px', md: '48px' }}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        colorScheme="primary"
                        onClick={submitAttempt}
                        isLoading={grading}
                        loadingText="Checking"
                        isDisabled={!responseText.trim()}
                        minH={{ base: '44px', md: '48px' }}
                      >
                        {activity.contentType === 'writing' ? 'Submit writing' : activity.contentType === 'reasoning' ? 'Submit answer' : 'Check answer'}
                      </Button>
                    )}
                  </Flex>
                </>
              )}

              {step === 'understanding' && (
                <VStack align="stretch" spacing={4}>
                  <Alert status="success" borderRadius="lg" alignItems="start">
                    <AlertIcon />
                    <Text fontWeight="bold">{result?.feedback || 'Correct! Nice thinking.'}</Text>
                  </Alert>

                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      Quick check: how did you figure it out?
                    </Text>
                    <Text opacity={0.8} mb={2}>
                      One sentence is plenty &mdash; explaining it helps you remember it next time.
                    </Text>
                    <Textarea
                      value={understanding}
                      onChange={(e) => setUnderstanding(e.target.value)}
                      placeholder="I figured it out by..."
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          goNext();
                        }
                      }}
                    />
                  </Box>

                  <Flex justify="flex-end" gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      leftIcon={<FiEdit3 />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      Workspace Canvas
                    </Button>
                    <Button variant="ghost" onClick={skipActivity} minH={{ base: '44px', md: '48px' }}>
                      Skip
                    </Button>
                    <Button
                      rightIcon={isLast ? <FiCheckCircle /> : <FiArrowRight />}
                      colorScheme="primary"
                      onClick={goNext}
                      minH={{ base: '44px', md: '48px' }}
                    >
                      {isLast ? 'Finish' : 'Next'}
                    </Button>
                  </Flex>
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  const level = Math.max(1, Math.min(3, difficulty || 1));
  return (
    <HStack spacing={1} aria-label={`Difficulty ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          w="8px"
          h="8px"
          borderRadius="full"
          bg={i <= level ? 'orange.400' : 'gray.300'}
        />
      ))}
    </HStack>
  );
}

function SegmentedStepRail({
  total,
  currentIndex,
  step,
}: {
  total: number;
  currentIndex: number;
  step: ActivityStep;
}) {
  if (total <= 0) {
    return null;
  }

  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={{ base: 1.5, md: 2 }}>
        {Array.from({ length: total }).map((_, idx) => {
          const isDone = idx < currentIndex || (idx === currentIndex && step === 'understanding');
          const isCurrent = idx === currentIndex && step !== 'understanding';
          const isInstruction = idx === currentIndex && step === 'instruction';

          return (
            <Box
              key={`step-segment-${idx}`}
              flex="1"
              h={{ base: '8px', md: '10px' }}
              borderRadius="full"
              bg={isDone ? 'green.400' : isInstruction ? 'purple.400' : isCurrent ? 'blue.400' : 'gray.200'}
              transition="background-color 0.2s ease"
            />
          );
        })}
      </HStack>
      <HStack justify="space-between">
        <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
          Step {Math.min(total, currentIndex + 1)} of {total}
        </Text>
        <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
          One activity at a time
        </Text>
      </HStack>
    </VStack>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Flex direction="column" align="center" justify="center" minH="60vh" px={4}>
      {children}
    </Flex>
  );
}

export default function ChildLearnPage() {
  return (
    <ChildDashboardLayout pageType="learn">
      <ChildLearnContent />
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: { destination: '/auth/signin', permanent: false },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }

  return { props: {} };
};
