/**
 * Child Learn Hub
 *
 * "Today's Plan" guided learning session. Loads an adaptive plan, walks the
 * child through short activities one at a time, grades each attempt
 * deterministically, coaches with escalating hints (never the answer), and
 * ends with a short reflection. Runs on the Phase 1 learn APIs and works on
 * starter content even before the DB catalog is seeded.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  Progress,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Flex,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiArrowRight,
  FiRefreshCw,
  FiHelpCircle,
  FiAward,
  FiSkipForward,
} from 'react-icons/fi';

import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { useChildTheme } from '@/components/child/ChildThemeProvider';
import { ReadAloudButton } from '@/components/child/ReadAloudButton';
import { useKidsPIC } from '@/hooks/useKidsPIC';

interface PlanActivity {
  type: string;
  skillCode: string;
  contentItemId: string;
  title: string;
  prompt: string;
  difficulty: number;
}

interface PlanResponse {
  childId: string;
  childName?: string;
  objectives?: Array<{ skillCode: string; skillName?: string }>;
  activities: PlanActivity[];
  source?: string;
}

interface AttemptResponse {
  correct: boolean;
  score: number;
  feedback: string;
  hint?: string;
  hintLevel?: number;
  hintsAvailable?: number;
  coachMessage?: string;
}

interface TutorTurnResponse {
  response?: string;
  tutorMessage?: string;
  hint?: string;
  hintLevel?: number;
  hintsAvailable?: number;
}

type Phase = 'loading' | 'plan' | 'activity' | 'complete' | 'empty' | 'error';

// Each activity walks through a short pedagogical loop: read/instruction ->
// answer (with scaffolded hints) -> check-for-understanding (metacognition).
type ActivityStep = 'intro' | 'answer' | 'understanding';

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Math',
  reading: 'Reading',
  writing: 'Writing',
  analytical: 'Thinking',
  science: 'Science',
};

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

function ChildLearnContent() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useKidsPIC();
  const { colors } = useChildTheme();

  const [phase, setPhase] = useState<Phase>('loading');
  const [plan, setPlan] = useState<PlanResponse | null>(null);
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
        if (!res.ok) {
          throw new Error(`Plan request failed (${res.status})`);
        }
        return (await res.json()) as PlanResponse;
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
      <Container maxW="2xl" py={8}>
        <Card borderRadius="card" boxShadow="card">
          <CardBody>
            <VStack spacing={4} textAlign="center">
              <Box fontSize="6xl">{pct >= 80 ? '🎉' : '💪'}</Box>
              <Heading size="lg">Great work today!</Heading>
              <Text fontSize="lg">
                You got <b>{correctCount}</b> of <b>{total}</b> right.
              </Text>
              <HStack color={colors.primary}>
                <FiAward />
                <Text fontWeight="bold">Effort badge earned</Text>
              </HStack>

              <Box w="full" pt={4}>
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
                <Flex justify="flex-end" mt={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saveReflection}
                    isLoading={savingReflection}
                    loadingText="Saving"
                    isDisabled={reflectionSaved || !reflection.trim()}
                  >
                    {reflectionSaved ? 'Saved' : 'Save reflection'}
                  </Button>
                </Flex>
              </Box>

              <HStack pt={2}>
                <Button leftIcon={<FiRefreshCw />} onClick={loadPlan} colorScheme="primary">
                  Practice again
                </Button>
                <Button variant="outline" onClick={() => router.push('/child/home')}>
                  Back to Home
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
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

  const progressValue = total > 0 ? (currentIndex / total) * 100 : 0;
  const isWarmUp = currentIndex === 0;
  const stepLabel =
    step === 'intro'
      ? isWarmUp
        ? 'Warm-up'
        : 'Get ready'
      : step === 'understanding'
        ? 'Explain it'
        : 'Practice';
  const isQuestionType = activity.type === 'question';

  return (
    <Container maxW="2xl" py={6}>
      <VStack align="stretch" spacing={5}>
        <Box>
          <HStack justify="space-between" mb={2}>
            <Heading size="md">
              {plan?.childName ? `${plan.childName}'s Plan` : "Today's Plan"}
            </Heading>
            <Badge colorScheme="purple" fontSize="0.8em">
              Activity {currentIndex + 1} of {total}
            </Badge>
          </HStack>
          <Progress
            value={progressValue}
            size="sm"
            borderRadius="full"
            colorScheme="primary"
            hasStripe
            aria-label={`Progress: activity ${currentIndex + 1} of ${total}`}
          />
        </Box>

        <Card borderRadius="card" boxShadow="card">
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Wrap spacing={2}>
                <WrapItem>
                  <Badge colorScheme="blue">{subjectOf(activity.skillCode)}</Badge>
                </WrapItem>
                <WrapItem>
                  <Badge variant="subtle">{prettifySkill(activity.skillCode)}</Badge>
                </WrapItem>
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
                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      {isWarmUp ? "Let's warm up with" : "Next up"}: {prettifySkill(activity.skillCode)}
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
                    p={3}
                    borderRadius="lg"
                  >
                    <Text fontSize="lg" flex="1">
                      {activity.prompt}
                    </Text>
                    <ReadAloudButton text={activity.prompt} sourceType="document" size="md" />
                  </HStack>

                  <Flex justify="flex-end">
                    <Button rightIcon={<FiArrowRight />} colorScheme="primary" onClick={() => setStep('answer')}>
                      Start
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
                    placeholder="Type your answer here"
                    rows={2}
                    autoFocus
                    isDisabled={grading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAttempt();
                      }
                    }}
                  />

                  {result && !result.correct && (
                    <Alert status="warning" borderRadius="lg" alignItems="start">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">{result.feedback}</Text>
                        {result.coachMessage && <Text mt={2}>{result.coachMessage}</Text>}
                        {result.hint && (
                          <HStack mt={2} align="start" color="orange.700" _dark={{ color: 'orange.300' }}>
                            <Box pt={1}><FiHelpCircle /></Box>
                            <Text>
                              {typeof result.hintsAvailable === 'number' &&
                              typeof result.hintLevel === 'number' ? (
                                <b>Hint {result.hintLevel + 1} of {result.hintsAvailable}: </b>
                              ) : (
                                <b>Hint: </b>
                              )}
                              {result.hint}
                            </Text>
                          </HStack>
                        )}
                      </Box>
                    </Alert>
                  )}

                  <Flex justify="flex-end" gap={3} wrap="wrap">
                    <Button
                      leftIcon={<FiSkipForward />}
                      variant="ghost"
                      onClick={skipActivity}
                      isDisabled={grading}
                    >
                      Skip
                    </Button>

                    {result && !result.correct ? (
                      <Button
                        leftIcon={<FiRefreshCw />}
                        colorScheme="primary"
                        onClick={retry}
                        isDisabled={grading}
                      >
                        Try again
                      </Button>
                    ) : (
                      <Button
                        colorScheme="primary"
                        onClick={submitAttempt}
                        isLoading={grading}
                        loadingText="Checking"
                        isDisabled={!responseText.trim()}
                      >
                        Check answer
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

                  <Flex justify="flex-end" gap={3} wrap="wrap">
                    <Button variant="ghost" onClick={skipActivity}>
                      Skip
                    </Button>
                    <Button
                      rightIcon={isLast ? <FiCheckCircle /> : <FiArrowRight />}
                      colorScheme="primary"
                      onClick={goNext}
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
