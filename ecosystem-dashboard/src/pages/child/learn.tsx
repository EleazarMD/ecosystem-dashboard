/**
 * Child Learn Hub
 *
 * "Today's Plan" guided learning session. Loads an adaptive plan, walks the
 * child through short activities one at a time, grades each attempt
 * deterministically, coaches with escalating hints (never the answer), and
 * ends with a short reflection. Runs on the Phase 1 learn APIs and works on
 * starter content even before the DB catalog is seeded.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Stack,
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
  Icon,
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
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  TrophyIcon,
  ForwardIcon,
  GlobeAltIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { ReadAloudButton } from '@/components/child/ReadAloudButton';
import {
  KNOWN_ACTIVITY_IDS,
  useActivityContext,
  createLearnHubContextProvider,
} from '@/domains/learning/shared/activity-registry';
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
  assignmentCompleted?: boolean;
  pathStepCompleted?: boolean;
  pathCompleted?: boolean;
}

interface AgentTurnResult {
  response?: string;
  source?: string;
  activityId?: string;
  toolsUsed?: string[];
  hops?: number;
  budgetExhausted?: boolean;
  personaName?: string;
  conceptCheck?: unknown;
  hintCard?: { hints: string[]; currentLevel: number };
  exampleCard?: unknown;
  celebration?: unknown;
  passage?: unknown;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  toolsUsed?: string[];
}

interface AgentMessage {
  id: string;
  phase: 'opening' | 'celebrating' | 'coaching' | 'closing';
  message: string;
  timestamp: number;
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

const SUBJECT_ICONS: Record<string, string> = {
  math: '🔢',
  reading: '📖',
  writing: '✏️',
  analytical: '🧠',
  science: '🔬',
};

const SUBJECT_COLORS: Record<string, string> = {
  math: 'blue',
  reading: 'green',
  writing: 'orange',
  analytical: 'purple',
  science: 'cyan',
};

function subjectOf(code: string): string {
  const subject = code.split('.')[0] || '';
  return SUBJECT_LABELS[subject] || 'Learn';
}

function subjectIconOf(code: string): string {
  const subject = code.split('.')[0] || '';
  return SUBJECT_ICONS[subject] || '⭐';
}

function subjectColorOf(code: string): string {
  const subject = code.split('.')[0] || '';
  return SUBJECT_COLORS[subject] || 'gray';
}

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
  science: 'Observe carefully. What do you notice? What do you already know about this? Use evidence to explain your answer.',
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
  const { profile, loading: profileLoading, error: profileError, fetchProfile } = useKidsPCG();
  const { colors, childExtras } = useChildTheme();

  // Register Learn Hub context provider with the Context Hub
  const learnStateRef = useRef({ childName: profile?.displayName || '' });
  useActivityContext(KNOWN_ACTIVITY_IDS.LEARN_HUB, () => createLearnHubContextProvider(learnStateRef));

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
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [reflection, setReflection] = useState('');
  const [step, setStep] = useState<ActivityStep>('intro');
  const [understanding, setUnderstanding] = useState('');
  const [understandingNotes, setUnderstandingNotes] = useState<Record<number, string>>({});
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Agent engagement state — tracks conversation history and proactive agent messages
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [agentMessage, setAgentMessage] = useState<AgentMessage | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const totalAttempts = correctCount + (attemptNumber - 1);

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
      setStreak(0);
      setBestStreak(0);
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
    } else if (!profileLoading && !childId) {
      // Profile fetch completed but no profile was returned — show error
      // instead of staying stuck on the loading spinner forever.
      setErrorMessage(
        profileError
          ? `Could not load your profile: ${profileError}`
          : 'Could not load your profile. Please try again.'
      );
      setPhase('error');
    }
  }, [profileLoading, childId, loadPlan, profileError]);

  const activities = plan?.activities || [];
  const activity = activities[currentIndex];
  const total = activities.length;
  const isLast = currentIndex >= total - 1;

  // ─── Agent engagement helper ──────────────────────────────────────────────
  // Fires a proactive agent turn at key session lifecycle moments: opening,
  // celebrating (correct answer), coaching (incorrect), and closing.
  const fireAgentTurn = useCallback(async (
    phase: 'opening' | 'celebrating' | 'coaching' | 'closing',
    message: string,
    contentItemId?: string,
    correct?: boolean,
  ) => {
    if (!childId) return;
    setAgentLoading(true);
    try {
      const mastery = {
        sessionCorrect: correctCount,
        sessionAttempts: totalAttempts,
        currentStreak: streak,
        currentSkill: activity?.skillCode,
      };

      const res = await fetch('/api/child/companion/agent-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          activityId: 'learn-hub',
          intent: phase === 'coaching' ? 'hint' : 'talk',
          childId,
          contextState: {
            contentItemId: contentItemId || activity?.contentItemId || 'session-greeting',
            attemptNumber: phase === 'opening' ? 0 : attemptNumber,
            sessionId: sessionId || undefined,
            sessionPhase: phase,
            correct,
            conversationHistory: conversationHistory.slice(-8),
            mastery,
            skillCode: activity?.skillCode,
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as AgentTurnResult;
        const agentMsg = data.response || '';
        if (agentMsg) {
          setAgentMessage({
            id: `${phase}-${Date.now()}`,
            phase,
            message: agentMsg,
            timestamp: Date.now(),
          });
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user' as const, content: message, timestamp: Date.now() },
            { role: 'assistant' as const, content: agentMsg, timestamp: Date.now() },
          ]);
        }
      }
    } catch {
      // Agent engagement is non-critical — silent fallback
    } finally {
      setAgentLoading(false);
    }
  }, [childId, sessionId, attemptNumber, correctCount, totalAttempts, streak, activity, conversationHistory]);

  // Fire opening agent turn when session starts
  useEffect(() => {
    if (phase === 'activity' && sessionId && conversationHistory.length === 0) {
      fireAgentTurn('opening', 'Hi! I am ready to start learning today.', undefined, undefined);
    }
  }, [phase, sessionId, conversationHistory.length, fireAgentTurn]);

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
          pathId: activity.pathId,
          pathStepNumber: activity.pathStepNumber,
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

      let tutorTurn: AgentTurnResult | null = null;
      if (!data.correct) {
        try {
          const tutorRes = await fetch('/api/child/companion/agent-turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: responseText,
              activityId: 'learn-hub',
              intent: 'hint',
              childId,
              contextState: {
                contentItemId: activity.contentItemId,
                attemptNumber,
                sessionId: sessionId || undefined,
                sessionPhase: 'coaching',
                correct: false,
                conversationHistory: conversationHistory.slice(-8),
                mastery: {
                  sessionCorrect: correctCount,
                  sessionAttempts: totalAttempts,
                  currentStreak: streak,
                  currentSkill: activity.skillCode,
                },
                skillCode: activity.skillCode,
              },
            }),
          });

          if (tutorRes.ok) {
            tutorTurn = (await tutorRes.json()) as AgentTurnResult;
            const coachMsg = tutorTurn?.response || '';
            if (coachMsg) {
              setConversationHistory((prev) => [
                ...prev,
                { role: 'user' as const, content: responseText, timestamp: Date.now() },
                { role: 'assistant' as const, content: coachMsg, timestamp: Date.now() },
              ]);
            }
          }
        } catch {
          /* tutor coaching is non-critical */
        }
      }

      const mergedResult: AttemptResponse = {
        ...data,
        coachMessage: tutorTurn?.response,
        hint: tutorTurn?.hintCard?.hints?.join('\n') ?? data.hint,
        hintLevel:
          typeof tutorTurn?.hintCard?.currentLevel === 'number'
            ? tutorTurn.hintCard.currentLevel
            : data.hintLevel,
        hintsAvailable:
          typeof tutorTurn?.hintCard?.hints?.length === 'number'
            ? tutorTurn.hintCard.hints.length
            : data.hintsAvailable,
      };

      setResult(mergedResult);
      if (mergedResult.correct) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        setStep('understanding');
        // Fire celebration agent turn (non-blocking)
        fireAgentTurn('celebrating', `I got it right! ${responseText}`, activity.contentItemId, true);
      } else {
        setStreak(0);
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
  }, [activity, responseText, childId, attemptNumber, sessionId, fireAgentTurn, conversationHistory, correctCount, totalAttempts, streak]);

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
        // Fire closing agent turn with session recap (non-blocking)
        fireAgentTurn('closing', 'Session complete! I finished all my activities.', undefined, undefined);
        return;
      }
      setCurrentIndex((i) => i + 1);
    },
    [isLast, completeSession, correctCount, total, fireAgentTurn],
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
    const isProfileError = !childId;
    const handleRetry = isProfileError
      ? async () => {
          setPhase('loading');
          setErrorMessage('');
          await fetchProfile();
        }
      : loadPlan;
    return (
      <Centered>
        <Alert status="error" borderRadius="lg" maxW="md">
          <AlertIcon />
          {errorMessage || 'Could not load your plan.'}
        </Alert>
        <Button mt={4} leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />} onClick={handleRetry} colorScheme="primary">
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
    const subjectsPracticed = Array.from(new Set(activities.map((a) => a.skillCode.split('.')[0])));
    const skillsPracticed = activities.map((a) => prettifySkill(a.skillCode));

    return (
      <Container maxW={{ base: '4xl', md: '6xl', lg: '6xl' }} py={{ base: 6, md: 8 }}>
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 4, md: 6 }}>
          <Card
            borderRadius="2xl"
            boxShadow="md"
            bgGradient={themedPresentation.heroGradient}
            color="white"
            border="1px solid"
            borderColor={themedPresentation.panelBorderColor}
          >
            <CardBody p={{ base: 5, md: 6 }}>
              <VStack spacing={4} align="stretch">
                <HStack spacing={4} align="center">
                  <Box fontSize={{ base: '4xl', md: '5xl' }}>{pct >= 80 ? '🎉' : '💪'}</Box>
                  <Box>
                    <Heading size="md">Great work today!</Heading>
                    <Text fontSize="sm" opacity={0.9}>
                      You got <b>{correctCount}</b> of <b>{total}</b> right.
                    </Text>
                  </Box>
                </HStack>

                <HStack spacing={{ base: 4, md: 6 }} wrap="wrap">
                  <HStack spacing={1}>
                    <Icon as={TrophyIcon} boxSize={4} />
                    <Text fontWeight="bold" fontSize="sm">Effort badge</Text>
                  </HStack>
                  {bestStreak >= 2 && (
                    <HStack spacing={1}>
                      <Text fontSize="lg">🔥</Text>
                      <Text fontWeight="bold" fontSize="sm">Best streak: {bestStreak}</Text>
                    </HStack>
                  )}
                  <HStack spacing={1}>
                    <Text fontSize="lg">⏱️</Text>
                    <Text fontWeight="bold" fontSize="sm">{formatElapsed(sessionElapsed)}</Text>
                  </HStack>
                </HStack>

                <Wrap spacing={1.5}>
                  {hasAssignments && (
                    <WrapItem>
                      <Badge colorScheme="yellow" variant="solid" fontSize="0.65rem" borderRadius="full" px={2} py={0.5}>
                        {assignmentCount} {themedPresentation.assignmentLabel}
                      </Badge>
                    </WrapItem>
                  )}
                  <WrapItem>
                    <Badge colorScheme="green" variant="solid" fontSize="0.65rem" borderRadius="full" px={2} py={0.5}>
                      {reviewCount} {themedPresentation.reviewLabel}
                    </Badge>
                  </WrapItem>
                  <WrapItem>
                    <Badge colorScheme="blue" variant="solid" fontSize="0.65rem" borderRadius="full" px={2} py={0.5}>
                      {focusCount} {themedPresentation.focusLabel}
                    </Badge>
                  </WrapItem>
                </Wrap>

                {plan?.spacedReview?.nextReview && (
                  <Box
                    p={3}
                    borderRadius="xl"
                    bg="whiteAlpha.200"
                    _dark={{ bg: 'whiteAlpha.100' }}
                  >
                    <Text fontWeight="semibold" fontSize="sm" mb={0.5}>
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

          <Card borderRadius="2xl" boxShadow="md" border="1px solid" borderColor={colors.border} bg="white" _dark={{ bg: 'gray.800' }}>
            <CardBody p={{ base: 5, md: 6 }}>
              <VStack spacing={5} align="stretch">
                <Box>
                  <Text fontWeight="bold" mb={3} fontSize="md">
                    What you practiced today
                  </Text>
                  <Wrap spacing={2} mb={3}>
                    {subjectsPracticed.map((subj) => (
                      <WrapItem key={subj}>
                        <Badge colorScheme={SUBJECT_COLORS[subj] || 'gray'} variant="subtle" borderRadius="full" px={2}>
                          {SUBJECT_ICONS[subj] || '⭐'} {SUBJECT_LABELS[subj] || subj}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                  <VStack align="start" spacing={1} maxH="120px" overflowY="auto" w="full">
                    {skillsPracticed.map((skill, i) => (
                      <HStack key={i} spacing={2}>
                        <Text fontSize="sm" color={i < correctCount ? 'green.500' : 'gray.500'}>
                          {i < correctCount ? '✅' : '📝'}
                        </Text>
                        <Text fontSize="sm" color={colors.text}>{skill}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2} fontSize="md">
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
                    borderRadius="xl"
                  />
                  <Flex justify={{ base: 'stretch', md: 'flex-end' }} mt={3} gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      size="md"
                      leftIcon={<Icon as={PencilSquareIcon} boxSize={4} />}
                      variant="outline"
                      onClick={openReflectionInWorkspace}
                      borderRadius="xl"
                      px={5}
                    >
                      Open Reflection Canvas
                    </Button>
                    <Button
                      size="md"
                      variant="outline"
                      onClick={saveReflection}
                      isLoading={savingReflection}
                      loadingText="Saving"
                      isDisabled={reflectionSaved || !reflection.trim()}
                      borderRadius="xl"
                      px={5}
                    >
                      {reflectionSaved ? 'Saved' : 'Save reflection'}
                    </Button>
                  </Flex>
                </Box>

                <Flex justify={{ base: 'stretch', md: 'flex-end' }} gap={{ base: 2, md: 3 }} wrap="wrap" pt={1}>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/child/home')}
                    size="md"
                    borderRadius="xl"
                    px={5}
                  >
                    Back to Home
                  </Button>
                  <Button
                    leftIcon={<Icon as={ArrowRightIcon} boxSize={4} />}
                    onClick={loadPlan}
                    colorScheme="primary"
                    size="md"
                    borderRadius="xl"
                    px={5}
                  >
                    Start next mission
                  </Button>
                </Flex>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Agent closing message — recap + reflection prompt */}
        {agentMessage && agentMessage.phase === 'closing' && (
          <Alert status="info" borderRadius="lg" variant="left-accent">
            <AlertIcon />
            <Box flex="1">
              <Text fontSize="sm" fontWeight="bold" mb={1}>🌟 Session recap</Text>
              <Text fontSize="sm">{agentMessage.message}</Text>
            </Box>
          </Alert>
        )}
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
          borderRadius="2xl"
          boxShadow="sm"
          bgGradient={themedPresentation.heroGradient}
          color="white"
          border="1px solid"
          borderColor={themedPresentation.panelBorderColor}
          overflow="hidden"
        >
          <CardBody p={{ base: 4, md: 5 }}>
            <Stack
              direction={{ base: 'column', md: 'row' }}
              spacing={{ base: 4, md: 6 }}
              align={{ base: 'start', md: 'center' }}
              justify="space-between"
            >
              <Box>
                <HStack spacing={2} mb={1}>
                  <Icon as={GlobeAltIcon} boxSize={4} />
                  <Text fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="0.06em">
                    {themedPresentation.missionLabel}
                  </Text>
                </HStack>
                <Heading size="md" mb={0.5}>
                  {plan?.childName ? `${plan.childName}'s Plan` : "Today's Plan"}
                </Heading>
                <Text opacity={0.9} fontSize="sm" maxW="md">
                  {themedPresentation.missionSubtitle}
                </Text>
                <Text opacity={0.75} fontSize="xs" mt={0.5}>
                  {themedPresentation.paceLine}
                </Text>
              </Box>

              <Stack
                direction={{ base: 'column', sm: 'row' }}
                spacing={{ base: 3, md: 4 }}
                align={{ base: 'stretch', sm: 'center' }}
                w={{ base: 'full', md: 'auto' }}
              >
                <Box minW={{ md: '220px' }}>
                  <HStack spacing={4} justify={{ base: 'start', md: 'space-between' }} opacity={0.95} fontSize="xs" mb={1}>
                    <HStack spacing={1}>
                      <Text fontFamily="mono">{formatElapsed(sessionElapsed)}</Text>
                      {sessionElapsed >= sessionWarnAt && sessionElapsed < sessionOverAt && (
                        <Badge colorScheme="orange" variant="solid" fontSize="0.6rem" borderRadius="full">
                          Almost time
                        </Badge>
                      )}
                      {sessionElapsed >= sessionOverAt && (
                        <Badge colorScheme="red" variant="solid" fontSize="0.6rem" borderRadius="full">
                          Wrap up
                        </Badge>
                      )}
                    </HStack>
                    <HStack spacing={1}>
                      <Text>🎯</Text>
                      <Text fontWeight="bold">
                        {total > 0 ? Math.round((correctCount / Math.max(1, currentIndex + (step === 'understanding' ? 1 : 0))) * 100) : 0}%
                      </Text>
                    </HStack>
                    {streak >= 2 && (
                      <HStack spacing={1}>
                        <Text>🔥</Text>
                        <Text fontWeight="bold">{streak} streak</Text>
                      </HStack>
                    )}
                  </HStack>
                  <Box h="3px" bg="whiteAlpha.300" borderRadius="full">
                    <Box
                      h="100%"
                      w={`${Math.min(100, (sessionElapsed / sessionOverAt) * 100)}%`}
                      bg={sessionElapsed >= sessionOverAt ? 'red.300' : sessionElapsed >= sessionWarnAt ? 'orange.300' : 'whiteAlpha.600'}
                      borderRadius="full"
                      transition="width 1s linear"
                    />
                  </Box>
                </Box>

                <Button
                  leftIcon={<Icon as={PencilSquareIcon} boxSize={4} />}
                  variant="outline"
                  borderColor="whiteAlpha.700"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={() => openActivityInWorkspace(activity)}
                  size="sm"
                  borderRadius="full"
                  px={4}
                  flexShrink={0}
                >
                  Open Workspace
                </Button>
              </Stack>
            </Stack>

            <Wrap spacing={1.5} mt={{ base: 3, md: 3 }}>
              <WrapItem>
                <Badge colorScheme="whiteAlpha" variant="solid" fontSize="0.65rem" px={2} py={0.5} borderRadius="full">
                  Activity {currentIndex + 1} of {total}
                </Badge>
              </WrapItem>
              {hasAssignments && (
                <WrapItem>
                  <Badge colorScheme="yellow" variant="solid" fontSize="0.65rem" px={2} py={0.5} borderRadius="full">
                    {assignmentCount} {themedPresentation.assignmentLabel}
                  </Badge>
                </WrapItem>
              )}
              <WrapItem>
                <Badge colorScheme="green" variant="solid" fontSize="0.65rem" px={2} py={0.5} borderRadius="full">
                  {reviewCount} {themedPresentation.reviewLabel}
                </Badge>
              </WrapItem>
              <WrapItem>
                <Badge colorScheme="blue" variant="solid" fontSize="0.65rem" px={2} py={0.5} borderRadius="full">
                  {focusCount} {themedPresentation.focusLabel}
                </Badge>
              </WrapItem>
              <WrapItem>
                <Badge colorScheme="purple" variant="solid" fontSize="0.65rem" px={2} py={0.5} borderRadius="full">
                  {planSourceLabel}
                </Badge>
              </WrapItem>
            </Wrap>

            {plan?.spacedReview?.nextReview && (
              <Text opacity={0.85} fontSize="xs" mt={2}>
                {plan.spacedReview.overdueCount > 0
                  ? `${plan.spacedReview.overdueCount} skill${plan.spacedReview.overdueCount > 1 ? 's' : ''} due for review`
                  : `Next review: ${plan.spacedReview.nextReview.skillName} in ${plan.spacedReview.nextReview.daysUntilReview} day${plan.spacedReview.nextReview.daysUntilReview === 1 ? '' : 's'}`}
              </Text>
            )}
          </CardBody>
        </Card>

        {/* Agent companion message — proactive engagement at session lifecycle moments */}
        {agentMessage && (
          <Alert
            status={agentMessage.phase === 'celebrating' ? 'success' : agentMessage.phase === 'coaching' ? 'warning' : 'info'}
            borderRadius="lg"
            variant="left-accent"
          >
            <AlertIcon />
            <Box flex="1">
              <Text fontSize="sm" fontWeight="bold" mb={1}>
                {agentMessage.phase === 'opening' && '🚀 Let us get started!'}
                {agentMessage.phase === 'celebrating' && '🎉 Great job!'}
                {agentMessage.phase === 'coaching' && '💡 Coaching tip'}
                {agentMessage.phase === 'closing' && '🌟 Session recap'}
              </Text>
              <Text fontSize="sm">{agentMessage.message}</Text>
            </Box>
            {agentLoading && <Spinner size="sm" ml={2} />}
          </Alert>
        )}

        <Box>
          <HStack spacing={2} overflowX="auto" py={1} px={0.5}>
            {activities.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              const isDone = idx < currentIndex;
              const subjColor = subjectColorOf(item.skillCode);
              return (
                <HStack
                  key={`${item.contentItemId}-${idx}`}
                  spacing={2}
                  flexShrink={0}
                  p={2}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={isCurrent ? colors.primary : isDone ? 'green.300' : 'gray.200'}
                  bg={isCurrent ? 'white' : isDone ? 'green.50' : 'white'}
                  boxShadow={isCurrent ? `0 2px 8px ${colors.primary}25` : 'sm'}
                  transition="all 0.2s"
                  minW={isCurrent ? '160px' : 'auto'}
                >
                  <Box
                    w="28px"
                    h="28px"
                    borderRadius="full"
                    bg={isDone ? 'green.400' : isCurrent ? `${subjColor}.400` : 'gray.200'}
                    color={isDone || isCurrent ? 'white' : 'gray.600'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="xs"
                    fontWeight="700"
                  >
                    {isDone ? '✓' : idx + 1}
                  </Box>
                  <VStack spacing={0} align="start">
                    <Text fontWeight="600" fontSize="xs" color={colors.text} noOfLines={1}>
                      {prettifySkill(item.skillCode)}
                    </Text>
                    <Badge colorScheme={subjColor} variant="subtle" fontSize="0.55rem" borderRadius="full" px={1.5}>
                      {subjectOf(item.skillCode)}
                    </Badge>
                  </VStack>
                </HStack>
              );
            })}
          </HStack>
          <SegmentedStepRail total={total} currentIndex={currentIndex} step={step} activities={activities} />
        </Box>

        <Card
          borderRadius="2xl"
          boxShadow="md"
          border="1px solid"
          borderColor={colors.border}
          bg="white"
          _dark={{ bg: 'gray.800' }}
        >
          <CardBody p={{ base: 5, md: 7 }}>
            <VStack align="stretch" spacing={5}>
              <Wrap spacing={2} justify={{ base: 'center', md: 'start' }}>
                <WrapItem>
                  <Badge colorScheme={subjectColorOf(activity.skillCode)} variant="subtle" borderRadius="full" px={2.5} py={0.5} fontSize="0.75rem">
                    {subjectIconOf(activity.skillCode)} {subjectOf(activity.skillCode)}
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge variant="subtle" borderRadius="full" px={2.5} py={0.5} fontSize="0.75rem">{prettifySkill(activity.skillCode)}</Badge>
                </WrapItem>
                {isAssignmentActivity && (
                  <WrapItem>
                    <Badge colorScheme="yellow" variant="subtle" borderRadius="full" px={2.5} py={0.5} fontSize="0.75rem">
                      {themedPresentation.assignmentLabel}
                    </Badge>
                  </WrapItem>
                )}
                <WrapItem>
                  <Badge colorScheme={isWarmUp && step === 'intro' ? 'green' : 'gray'} variant="subtle" borderRadius="full" px={2.5} py={0.5} fontSize="0.75rem">
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
                    <Alert status="info" borderRadius="xl" variant="left-accent">
                      <AlertIcon />
                      <Text fontSize="sm" fontWeight="semibold">
                        {themedPresentation.assignmentLabel}: your family asked you to focus on this today.
                      </Text>
                    </Alert>
                  )}

                  <Box>
                    <Text fontWeight="700" fontSize={{ base: 'lg', md: 'xl' }} mb={1} color={colors.text}>
                      {isWarmUp ? "Let's warm up by reviewing" : 'Next up'}: {prettifySkill(activity.skillCode)}
                    </Text>
                    <Text color={colors.textMuted} fontSize="sm">
                      Read the {isQuestionType ? 'passage and question' : 'problem'} carefully and take
                      your time. You can ask for hints, and I&apos;ll coach you step by step.
                    </Text>
                  </Box>

                  <Box
                    p={{ base: 4, md: 5 }}
                    borderRadius="xl"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    borderLeftWidth="4px"
                    borderLeftColor={`${subjectColorOf(activity.skillCode)}.400`}
                    _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
                  >
                    <HStack align="start" justify="space-between" spacing={3}>
                      <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="500" lineHeight="1.6" color={colors.text}>
                        {activity.prompt}
                      </Text>
                      <ReadAloudButton text={activity.prompt} sourceType="document" size="sm" />
                    </HStack>
                  </Box>

                  <Flex justify="flex-end" gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      leftIcon={<Icon as={PencilSquareIcon} boxSize={4} />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Workspace Canvas
                    </Button>
                    <Button
                      rightIcon={<Icon as={ArrowRightIcon} boxSize={4} />}
                      colorScheme="primary"
                      onClick={() => setStep(isWarmUp ? 'answer' : 'instruction')}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      {isWarmUp ? 'Start' : 'Let\'s learn'}
                    </Button>
                  </Flex>
                </VStack>
              )}

              {step === 'instruction' && (
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontWeight="700" fontSize={{ base: 'lg', md: 'xl' }} mb={1} color={colors.text}>
                      Mini-lesson: {prettifySkill(activity.skillCode)}
                    </Text>
                    <Text color={colors.textMuted} fontSize="sm">
                      {SUBJECT_INSTRUCTION_PROMPTS[activity.skillCode.split('.')[0]] ||
                        'Think about what you already know about this topic. What strategy might help you here?'}
                    </Text>
                  </Box>

                  {activity.analyticalTags && activity.analyticalTags.length > 0 && (
                    <Box
                      p={{ base: 3, md: 4 }}
                      borderRadius="xl"
                      bg="purple.50"
                      _dark={{ bg: 'purpleAlpha.100' }}
                      border="1px solid"
                      borderColor="purple.200"
                      w="full"
                    >
                      <HStack spacing={2} mb={2}>
                        <Icon as={GlobeAltIcon} boxSize={4} color="purple.600" />
                        <Text fontWeight="semibold" fontSize="sm" color="purple.700">
                          Thinking focus
                        </Text>
                      </HStack>
                      <Wrap spacing={2}>
                        {activity.analyticalTags.map((tag) => (
                          <WrapItem key={tag}>
                            <Badge colorScheme="purple" variant="subtle" borderRadius="full" px={2}>
                              {analyticalTagLabel(tag)}
                            </Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  <Box
                    p={{ base: 4, md: 5 }}
                    borderRadius="xl"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    borderLeftWidth="4px"
                    borderLeftColor={`${subjectColorOf(activity.skillCode)}.400`}
                    _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
                  >
                    <HStack align="start" justify="space-between" spacing={3}>
                      <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="500" lineHeight="1.6" color={colors.text}>
                        {activity.prompt}
                      </Text>
                      <ReadAloudButton text={activity.prompt} sourceType="document" size="sm" />
                    </HStack>
                  </Box>

                  <Flex justify="flex-end" gap={{ base: 2, md: 3 }} wrap="wrap">
                    <Button
                      leftIcon={<Icon as={PencilSquareIcon} boxSize={4} />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Workspace Canvas
                    </Button>
                    <Button
                      rightIcon={<Icon as={ArrowRightIcon} boxSize={4} />}
                      colorScheme="primary"
                      onClick={() => setStep('answer')}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Try it
                    </Button>
                  </Flex>
                </VStack>
              )}

              {step === 'answer' && (
                <VStack align="stretch" spacing={4}>
                  <Box
                    p={{ base: 4, md: 5 }}
                    borderRadius="xl"
                    bg="gray.50"
                    border="1px solid"
                    borderColor="gray.200"
                    borderLeftWidth="4px"
                    borderLeftColor={`${subjectColorOf(activity.skillCode)}.400`}
                    _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
                  >
                    <HStack align="start" justify="space-between" spacing={3}>
                      <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="500" lineHeight="1.6" color={colors.text}>
                        {activity.prompt}
                      </Text>
                      <ReadAloudButton text={activity.prompt} sourceType="document" size="sm" />
                    </HStack>
                  </Box>

                  <Box>
                    <Text fontWeight="600" fontSize="sm" color={colors.textMuted} mb={1.5}>
                      Your answer
                    </Text>
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
                      borderRadius="xl"
                      fontSize="md"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && activity.contentType !== 'writing' && activity.contentType !== 'reasoning') {
                          e.preventDefault();
                          submitAttempt();
                        }
                      }}
                    />
                  </Box>

                  {/* Rubric feedback for writing/reasoning activities */}
                  {result?.rubricResult && (
                    <Box borderWidth="1px" borderRadius="xl" p={{ base: 4, md: 5 }} bg="purple.50" borderColor="purple.200">
                      <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" color="purple.700" fontSize="lg">
                            {result.rubricResult.encouragement}
                          </Text>
                          <Badge colorScheme="purple" fontSize="md" px={3} py={1} borderRadius="full">
                            {result.rubricResult.percentage}%
                          </Badge>
                        </HStack>

                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                          {result.rubricResult.dimensionScores.map((dim) => (
                            <Box key={dim.dimension} p={3} bg="white" borderRadius="lg" borderWidth="1px" borderColor="purple.100">
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
                    <Alert status="warning" borderRadius="xl" alignItems="start" variant="left-accent">
                      <AlertIcon />
                      <Box w="full">
                        <Text fontWeight="bold" fontSize="md">{result.feedback}</Text>
                        {result.coachMessage && <Text mt={2} fontSize="sm">{result.coachMessage}</Text>}
                        {result.hint && (
                          <Accordion allowToggle mt={3} defaultIndex={[0]}>
                            <AccordionItem border="1px solid" borderColor="orange.200" borderRadius="md">
                              <h2>
                                <AccordionButton _hover={{ bg: 'orange.50' }}>
                                  <HStack flex="1" spacing={2} textAlign="left">
                                    <Icon as={QuestionMarkCircleIcon} boxSize={4} />
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
                      leftIcon={<Icon as={PencilSquareIcon} boxSize={4} />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      isDisabled={grading}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Workspace Canvas
                    </Button>
                    <Button
                      leftIcon={<Icon as={ForwardIcon} boxSize={4} />}
                      variant="ghost"
                      onClick={skipActivity}
                      isDisabled={grading}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Skip
                    </Button>

                    {result && !result.correct ? (
                      <Button
                        leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}
                        colorScheme="primary"
                        onClick={retry}
                        isDisabled={grading}
                        size="md"
                        borderRadius="xl"
                        px={5}
                      >
                        Try again
                      </Button>
                    ) : result?.rubricResult ? (
                      <Button
                        leftIcon={<Icon as={ArrowRightIcon} boxSize={4} />}
                        colorScheme="primary"
                        onClick={() => setStep('understanding')}
                        isDisabled={grading}
                        size="md"
                        borderRadius="xl"
                        px={5}
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
                        size="md"
                        borderRadius="xl"
                        px={5}
                      >
                        {activity.contentType === 'writing' ? 'Submit writing' : activity.contentType === 'reasoning' ? 'Submit answer' : 'Check answer'}
                      </Button>
                    )}
                  </Flex>
                </VStack>
              )}

              {step === 'understanding' && (
                <VStack align="stretch" spacing={4}>
                  <Alert status="success" borderRadius="xl" variant="left-accent">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold" fontSize="md">{result?.feedback || 'Correct! Nice thinking.'}</Text>
                      {result?.assignmentCompleted && (
                        <Text mt={1} color="green.700" fontWeight="semibold">
                          Parent assignment complete! Great job! 🎉
                        </Text>
                      )}
                    </Box>
                  </Alert>

                  <Box>
                    <Text fontWeight="700" fontSize={{ base: 'lg', md: 'xl' }} mb={1} color={colors.text}>
                      Quick check: how did you figure it out?
                    </Text>
                    <Text color={colors.textMuted} fontSize="sm" mb={2}>
                      One sentence is plenty &mdash; explaining it helps you remember it next time.
                    </Text>
                    <Textarea
                      value={understanding}
                      onChange={(e) => setUnderstanding(e.target.value)}
                      placeholder="I figured it out by..."
                      rows={2}
                      autoFocus
                      borderRadius="xl"
                      fontSize="md"
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
                      leftIcon={<Icon as={PencilSquareIcon} boxSize={4} />}
                      variant="outline"
                      onClick={() => openActivityInWorkspace(activity)}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Workspace Canvas
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={skipActivity}
                      size="md"
                      borderRadius="xl"
                      px={5}
                    >
                      Skip
                    </Button>
                    <Button
                      rightIcon={isLast ? <Icon as={CheckCircleIcon} boxSize={4} /> : <Icon as={ArrowRightIcon} boxSize={4} />}
                      colorScheme="primary"
                      onClick={goNext}
                      size="md"
                      borderRadius="xl"
                      px={5}
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
  activities,
}: {
  total: number;
  currentIndex: number;
  step: ActivityStep;
  activities: LearnPlanActivity[];
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
          const subjColor = activities[idx] ? subjectColorOf(activities[idx].skillCode) : 'gray';

          return (
            <Box
              key={`step-segment-${idx}`}
              flex="1"
              h={{ base: '8px', md: '10px' }}
              borderRadius="full"
              bg={isDone ? 'green.400' : isInstruction ? 'purple.400' : isCurrent ? `${subjColor}.400` : 'gray.200'}
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
