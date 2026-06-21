/**
 * Child Learning Insights Page
 * 
 * Parent view of child's PCG-powered learning progress and wellness.
 * Shows aggregated insights while protecting child privacy.
 */

import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  SimpleGrid,
  Badge,
  Wrap,
  WrapItem,
  Card,
  CardBody,
  Progress,
} from '@chakra-ui/react';
import { FiArrowLeft, FiTrendingUp, FiShield, FiTarget, FiHeart, FiCompass } from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PCGInsightsDashboard from '@/components/family/PCGInsightsDashboard';
import AISafetyDashboard from '@/components/family/AISafetyDashboard';
import SkillProgressDashboard from '@/components/family/SkillProgressDashboard';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { query } from '@/lib/db';
import { buildFamilyLearningSnapshot } from '@/domains/learning/shared/family-presenter';

interface LearningPageProps {
  child: {
    id: string;
    name: string;
    email: string;
  };
  childProfileId: string;
  attemptSummary: LearningActivitySummary;
}

interface LearningActivitySummary {
  attemptsLast7Days: number;
  correctLast7Days: number;
  latestAttemptAt: string | null;
  skillsPracticed: number;
  sessionsCompleted: number;
  bySubject: Array<{ subject: string; attempts: number; correct: number }>;
}

export default function ChildLearningPage({ child, childProfileId, attemptSummary }: LearningPageProps) {
  const router = useRouter();
  const bg = useSemanticToken('surface.base');

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh" py={{ base: 6, md: 8 }}>
        <Container maxW="container.xl">
          <VStack spacing={{ base: 5, md: 6 }} align="stretch">
            {/* Header */}
            <HStack justify="space-between" align={{ base: 'stretch', md: 'flex-start' }} flexWrap="wrap" gap={3}>
              <VStack align="start" spacing={1}>
                <Breadcrumb fontSize="sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink as={NextLink} href="/family">
                      Family Hub
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem>
                    <BreadcrumbLink as={NextLink} href={`/family/${child.id}`}>
                      {child.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem isCurrentPage>
                    <BreadcrumbLink>Learning Insights</BreadcrumbLink>
                  </BreadcrumbItem>
                </Breadcrumb>
                <Heading size="lg">Learning Insights</Heading>
                <Text color="gray.500">
                  Privacy-first view of {child.name}'s learning journey
                </Text>
              </VStack>
              <Button
                leftIcon={<FiArrowLeft />}
                variant="outline"
                onClick={() => router.push(`/family/${child.id}`)}
                minH={{ base: '44px', md: '48px' }}
                w={{ base: 'full', md: 'auto' }}
              >
                Back to {child.name}
              </Button>
            </HStack>

            <ParentLearningSnapshot summary={attemptSummary} childName={child.name} />

            <LearningActivityCard summary={attemptSummary} childName={child.name} />

            {/* Tabbed Dashboard */}
            <Tabs colorScheme="purple" variant="enclosed">
              <TabList flexWrap="wrap" gap={{ base: 2, md: 3 }}>
                <Tab minH={{ base: '44px', md: '48px' }} px={{ base: 3, md: 4 }} flex={{ base: '1 1 auto', md: '1 1 0' }}>
                  <HStack spacing={2} justify="center">
                    <Icon as={FiTrendingUp} />
                    <Text fontSize="sm">Learning Progress</Text>
                  </HStack>
                </Tab>
                <Tab minH={{ base: '44px', md: '48px' }} px={{ base: 3, md: 4 }} flex={{ base: '1 1 auto', md: '1 1 0' }}>
                  <HStack spacing={2} justify="center">
                    <Icon as={FiTarget} />
                    <Text fontSize="sm">Skill Progress</Text>
                  </HStack>
                </Tab>
                <Tab minH={{ base: '44px', md: '48px' }} px={{ base: 3, md: 4 }} flex={{ base: '1 1 auto', md: '1 1 0' }}>
                  <HStack spacing={2} justify="center">
                    <Icon as={FiShield} />
                    <Text fontSize="sm">AI Safety</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0} pt={{ base: 4, md: 5 }}>
                  <PCGInsightsDashboard 
                    childId={childProfileId} 
                    childName={child.name}
                  />
                </TabPanel>
                <TabPanel px={0} pt={{ base: 4, md: 5 }}>
                  <SkillProgressDashboard 
                    childId={childProfileId} 
                    childName={child.name}
                  />
                </TabPanel>
                <TabPanel px={0} pt={{ base: 4, md: 5 }}>
                  <AISafetyDashboard 
                    childId={childProfileId} 
                    childName={child.name}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}

function ParentLearningSnapshot({
  summary,
  childName,
}: {
  summary: LearningActivitySummary;
  childName: string;
}) {
  const { strongest, support, sessionGoal, consistencyProgress, recommendations } = buildFamilyLearningSnapshot({
    sessionsCompleted: summary.sessionsCompleted,
    bySubject: summary.bySubject,
  });

  return (
    <Card borderRadius="xl" borderWidth="1px" boxShadow="sm">
      <CardBody p={{ base: 4, md: 6 }}>
        <VStack align="stretch" spacing={{ base: 4, md: 5 }}>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 3, md: 4 }} alignItems="start">
            <Box>
              <HStack spacing={2} mb={1} color="purple.600">
                <FiCompass />
                <Text fontWeight="bold" fontSize="sm" textTransform="uppercase" letterSpacing="0.04em">
                  Family Learning Snapshot
                </Text>
              </HStack>
              <Heading size="sm">Celebrate and support this week</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Adaptive mastery signals from {childName}'s guided sessions, without exposing private responses.
              </Text>
            </Box>
            <Wrap spacing={2} justify={{ base: 'flex-start', lg: 'flex-end' }}>
              <WrapItem>
                <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="md">
                  Adaptive plan enabled
                </Badge>
              </WrapItem>
              <WrapItem>
                <Badge colorScheme="blue" variant="subtle" px={2} py={1} borderRadius="md">
                  Mastery signals only
                </Badge>
              </WrapItem>
              <WrapItem>
                <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="md">
                  Privacy-first insights
                </Badge>
              </WrapItem>
            </Wrap>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 2, xl: 3 }} spacing={{ base: 3, md: 4 }}>
            <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
              <HStack spacing={2} color="green.600" mb={1}>
                <FiHeart />
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
                  Celebrate
                </Text>
              </HStack>
              <Text fontWeight="semibold">
                {strongest
                  ? `${SUBJECT_LABELS[strongest.subject] || strongest.subject} momentum`
                  : 'Getting started'}
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {strongest
                  ? `${strongest.accuracy}% accuracy over ${strongest.attempts} attempts.`
                  : `${childName} has not started practice yet this week.`}
              </Text>
            </Box>

            <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
              <HStack spacing={2} color="orange.600" mb={1}>
                <FiTarget />
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
                  Support Next
                </Text>
              </HStack>
              <Text fontWeight="semibold">
                {support ? SUBJECT_LABELS[support.subject] || support.subject : 'Build routine'}
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {support
                  ? `Coach confidence in this area (${support.accuracy}% accuracy).`
                  : `Encourage one short session to keep the learning rhythm.`}
              </Text>
            </Box>

            <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
              <HStack spacing={2} color="blue.600" mb={1}>
                <FiTrendingUp />
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
                  Weekly Rhythm
                </Text>
              </HStack>
              <Text fontWeight="semibold">
                {summary.sessionsCompleted} of {sessionGoal} guided sessions
              </Text>
              <Progress mt={2} value={consistencyProgress} size="sm" borderRadius="full" colorScheme="blue" />
              <Text fontSize="sm" color="gray.600" mt={1}>
                Consistency matters more than long sessions.
              </Text>
            </Box>
          </SimpleGrid>

          <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 5 }}>
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="bold" mb={2}>
              Suggested Parent Actions
            </Text>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={2}>
              {recommendations.map((recommendation) => (
                <Text key={recommendation} fontSize="sm" color="gray.700">
                  - {recommendation}
                </Text>
              ))}
            </SimpleGrid>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
}

const SUBJECT_LABELS: Record<string, string> = {
  math: 'Math',
  reading: 'Reading',
  writing: 'Writing',
  science: 'Science',
  analytical: 'Thinking',
};

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold">{value}</Text>
      <Text fontSize="xs" color="gray.500">{label}</Text>
    </Box>
  );
}

function LearningActivityCard({
  summary,
  childName,
}: {
  summary: LearningActivitySummary;
  childName: string;
}) {
  const accuracy =
    summary.attemptsLast7Days > 0
      ? Math.round((summary.correctLast7Days / summary.attemptsLast7Days) * 100)
      : null;
  const hasActivity = summary.attemptsLast7Days > 0 || summary.sessionsCompleted > 0;

  return (
    <Box borderWidth="1px" borderRadius="lg" p={{ base: 4, md: 6 }}>
      <HStack justify="space-between" align="start" mb={4} flexWrap="wrap">
        <Heading size="sm">Practice activity (last 7 days)</Heading>
        {summary.latestAttemptAt && (
          <Text fontSize="xs" color="gray.500">
            Last practice: {new Date(summary.latestAttemptAt).toLocaleString()}
          </Text>
        )}
      </HStack>

      {!hasActivity ? (
        <Text fontSize="sm" color="gray.500">
          No practice yet this week. When {childName} completes activities on the Learn hub, a
          privacy-first summary will appear here.
        </Text>
      ) : (
        <VStack align="stretch" spacing={4}>
          <SimpleGrid columns={{ base: 2, md: 2, lg: 4 }} spacing={{ base: 3, md: 4 }}>
            <StatCell label="Attempts" value={summary.attemptsLast7Days} />
            <StatCell label="Accuracy" value={accuracy === null ? '\u2014' : `${accuracy}%`} />
            <StatCell label="Skills practiced" value={summary.skillsPracticed} />
            <StatCell label="Sessions completed" value={summary.sessionsCompleted} />
          </SimpleGrid>

          {summary.bySubject.length > 0 && (
            <Box>
              <Text fontSize="xs" color="gray.500" mb={2}>
                By subject
              </Text>
              <Wrap spacing={2}>
                {summary.bySubject.map((s) => {
                  const pct = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0;
                  return (
                    <WrapItem key={s.subject}>
                      <Badge colorScheme="purple" variant="subtle" px={2} py={1} borderRadius="md">
                        {SUBJECT_LABELS[s.subject] || s.subject}: {s.correct}/{s.attempts} ({pct}%)
                      </Badge>
                    </WrapItem>
                  );
                })}
              </Wrap>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const { childId } = context.params as { childId: string };

  // Verify parent-child relationship and get child info
  const childResult = await query(
    `SELECT u.id, u.name, u.email, cp.id as profile_id
     FROM users u
     LEFT JOIN child_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1 AND u.parent_user_id = $2`,
    [childId, session.user.id]
  );

  if (childResult.rows.length === 0) {
    return {
      redirect: {
        destination: '/family',
        permanent: false,
      },
    };
  }

  const child = childResult.rows[0];

  // If no profile exists yet, create one
  let profileId = child.profile_id;
  if (!profileId) {
    const createResult = await query(
      `INSERT INTO child_profiles (user_id, display_name, age_group)
       VALUES ($1, $2, 'middle')
       RETURNING id`,
      [childId, child.name]
    );
    profileId = createResult.rows[0].id;
  }

  let attemptSummary: LearningActivitySummary = {
    attemptsLast7Days: 0,
    correctLast7Days: 0,
    latestAttemptAt: null,
    skillsPracticed: 0,
    sessionsCompleted: 0,
    bySubject: [],
  };

  try {
    const hasAttemptsTable = await query('SELECT to_regclass($1) AS exists', [
      'public.learning_attempts',
    ]);

    if (hasAttemptsTable.rows[0]?.exists) {
      const attemptsResult = await query(
        `SELECT
           COUNT(*)::text AS attempts_last_7_days,
           COUNT(*) FILTER (WHERE is_correct)::text AS correct_last_7_days,
           COUNT(DISTINCT skill_code)::text AS skills_practiced,
           MAX(attempted_at)::text AS latest_attempt_at
         FROM learning_attempts
         WHERE child_id = $1
           AND attempted_at >= NOW() - INTERVAL '7 days'`,
        [profileId],
      );

      const row = attemptsResult.rows[0] as
        | {
            attempts_last_7_days: string;
            correct_last_7_days: string;
            skills_practiced: string;
            latest_attempt_at: string | null;
          }
        | undefined;
      if (row) {
        attemptSummary.attemptsLast7Days = Number.parseInt(row.attempts_last_7_days, 10) || 0;
        attemptSummary.correctLast7Days = Number.parseInt(row.correct_last_7_days, 10) || 0;
        attemptSummary.skillsPracticed = Number.parseInt(row.skills_practiced, 10) || 0;
        attemptSummary.latestAttemptAt = row.latest_attempt_at;
      }

      const bySubjectResult = await query(
        `SELECT
           split_part(skill_code, '.', 1) AS subject,
           COUNT(*)::text AS attempts,
           COUNT(*) FILTER (WHERE is_correct)::text AS correct
         FROM learning_attempts
         WHERE child_id = $1
           AND attempted_at >= NOW() - INTERVAL '7 days'
         GROUP BY 1
         ORDER BY COUNT(*) DESC`,
        [profileId],
      );

      attemptSummary.bySubject = (
        bySubjectResult.rows as Array<{ subject: string; attempts: string; correct: string }>
      ).map((r) => ({
        subject: r.subject || 'other',
        attempts: Number.parseInt(r.attempts, 10) || 0,
        correct: Number.parseInt(r.correct, 10) || 0,
      }));
    }
  } catch (error) {
    console.warn('[family-learning] failed to load attempt summary:', error);
  }

  // Completed-session count is isolated so a sessions schema mismatch never
  // wipes the attempt aggregates computed above.
  try {
    const hasSessionsTable = await query('SELECT to_regclass($1) AS exists', [
      'public.learning_sessions',
    ]);

    if (hasSessionsTable.rows[0]?.exists) {
      const sessionsResult = await query(
        `SELECT COUNT(*)::text AS sessions_completed
         FROM learning_sessions
         WHERE child_id = $1
           AND status = 'completed'
           AND started_at >= NOW() - INTERVAL '7 days'`,
        [profileId],
      );

      attemptSummary.sessionsCompleted =
        Number.parseInt(
          (sessionsResult.rows[0] as { sessions_completed: string } | undefined)
            ?.sessions_completed || '0',
          10,
        ) || 0;
    }
  } catch (error) {
    console.warn('[family-learning] failed to load session summary:', error);
  }

  return {
    props: {
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
      },
      childProfileId: profileId,
      attemptSummary,
    },
  };
};
