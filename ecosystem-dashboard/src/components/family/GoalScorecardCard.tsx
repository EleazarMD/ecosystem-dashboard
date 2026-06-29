/**
 * GoalScorecardCard — Phase 10 parent insight component.
 *
 * Displays the per-child age-based goal scorecard with progress bars
 * and learning-style signals (pace, modality, fatigue point).
 *
 * Backend: /api/learn/goal-scorecard
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Card, CardBody,
  Spinner, Center, Progress, SimpleGrid, Icon, Heading,
  Tooltip, HStack as HStackRow,
} from '@chakra-ui/react';
import {
  FiTarget, FiZap, FiEye, FiHeadphones, FiHand, FiBook,
  FiClock, FiTrendingUp, FiActivity,
} from 'react-icons/fi';

interface GoalMetric {
  id: string;
  label: string;
  description: string;
  target: number;
  current: number;
  unit: 'mastery' | 'count' | 'streak' | 'minutes';
  skillCodes?: string[];
  status: 'on-track' | 'behind' | 'ahead' | 'not-started';
}

interface Scorecard {
  childId: string;
  ageBand: string;
  goals: GoalMetric[];
  overallProgress: number;
  updatedAt: number;
}

interface LearningStyleSignals {
  pace: 'slow' | 'medium' | 'fast';
  preferredModality: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  fatiguePointMinutes: number;
  readingLevel: 'below-grade' | 'at-grade' | 'above-grade';
  confidence: number;
  evidence: {
    avgLatencyMs: number;
    accuracyRate: number;
    topTools: string[];
    sessionCount: number;
  };
}

interface GoalScorecardCardProps {
  childId: string;
  ageBand?: string;
}

const STATUS_COLORS: Record<GoalMetric['status'], string> = {
  'on-track': 'green',
  'ahead': 'blue',
  'behind': 'orange',
  'not-started': 'gray',
};

const STATUS_LABELS: Record<GoalMetric['status'], string> = {
  'on-track': 'On Track',
  'ahead': 'Ahead',
  'behind': 'Behind',
  'not-started': 'Not Started',
};

const MODALITY_ICONS: Record<string, React.ElementType> = {
  visual: FiEye,
  auditory: FiHeadphones,
  kinesthetic: FiHand,
  reading: FiBook,
  mixed: FiActivity,
};

const MODALITY_LABELS: Record<string, string> = {
  visual: 'Visual',
  auditory: 'Auditory',
  kinesthetic: 'Hands-on',
  reading: 'Reading',
  mixed: 'Mixed',
};

const PACE_COLORS: Record<string, string> = {
  slow: 'orange',
  medium: 'blue',
  fast: 'green',
};

export default function GoalScorecardCard({ childId, ageBand = 'middle' }: GoalScorecardCardProps) {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [styleSignals, setStyleSignals] = useState<LearningStyleSignals | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScorecard = useCallback(async () => {
    try {
      const res = await fetch(`/api/learn/goal-scorecard?childId=${childId}&ageBand=${ageBand}`);
      if (res.ok) {
        const data = await res.json();
        setScorecard(data.scorecard || null);
        setStyleSignals(data.learningStyle || null);
      }
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  }, [childId, ageBand]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  if (loading) {
    return <Center py={4}><Spinner size="sm" color="blue.500" /></Center>;
  }

  if (!scorecard) {
    return (
      <Card borderWidth="1px" borderRadius="lg" borderColor="blue.100">
        <CardBody p={4}>
          <Text fontSize="sm" color="gray.500">
            Goal scorecard will appear after your child completes a few learning activities.
          </Text>
        </CardBody>
      </Card>
    );
  }

  const overallPct = Math.round(scorecard.overallProgress * 100);

  return (
    <Card borderWidth="1px" borderRadius="lg" borderColor="blue.100">
      <CardBody p={4}>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Icon as={FiTarget} color="blue.500" />
              <Heading size="sm">Goal Scorecard</Heading>
              <Badge colorScheme="blue" fontSize="2xs">{scorecard.ageBand}</Badge>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="blue.600">{overallPct}%</Text>
          </HStack>

          <Progress value={overallPct} size="sm" colorScheme="blue" borderRadius="full" />

          {/* Goal metrics */}
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
            {scorecard.goals.map((goal) => {
              const pct = goal.unit === 'mastery'
                ? Math.round((goal.current / goal.target) * 100)
                : Math.min(100, Math.round((goal.current / goal.target) * 100));
              const displayValue = goal.unit === 'mastery'
                ? `${Math.round(goal.current * 100)}%`
                : `${goal.current}/${goal.target}`;

              return (
                <Box key={goal.id} p={3} borderRadius="md" borderWidth="1px" borderColor="gray.100">
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="600">{goal.label}</Text>
                      <Badge colorScheme={STATUS_COLORS[goal.status]} fontSize="2xs">
                        {STATUS_LABELS[goal.status]}
                      </Badge>
                    </HStack>
                    <Text fontSize="2xs" color="gray.500">{goal.description}</Text>
                    <HStack justify="space-between" mt={1}>
                      <Progress
                        value={pct}
                        size="xs"
                        colorScheme={STATUS_COLORS[goal.status]}
                        borderRadius="full"
                        flex={1}
                        mr={2}
                      />
                      <Text fontSize="2xs" fontWeight="600" color="gray.600">{displayValue}</Text>
                    </HStack>
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>

          {/* Learning style signals */}
          {styleSignals && (
            <>
              <Box borderTop="1px solid" borderColor="gray.100" pt={3}>
                <HStack spacing={2} mb={2}>
                  <Icon as={FiZap} color="purple.500" />
                  <Text fontSize="xs" fontWeight="600" textTransform="uppercase" color="purple.600">
                    Learning Style Signals
                  </Text>
                  {styleSignals.confidence < 0.3 && (
                    <Tooltip label="Based on limited data — will improve with more sessions">
                      <Badge fontSize="2xs" colorScheme="gray">Early</Badge>
                    </Tooltip>
                  )}
                </HStack>

                <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
                  {/* Pace */}
                  <Box p={2} borderRadius="md" bg="purple.50">
                    <VStack spacing={0} align="center">
                      <Icon as={FiTrendingUp} color="purple.400" boxSize={3} />
                      <Text fontSize="2xs" color="gray.500" mt={1}>Pace</Text>
                      <Badge colorScheme={PACE_COLORS[styleSignals.pace]} fontSize="2xs" mt={1}>
                        {styleSignals.pace}
                      </Badge>
                    </VStack>
                  </Box>

                  {/* Modality */}
                  <Box p={2} borderRadius="md" bg="purple.50">
                    <VStack spacing={0} align="center">
                      <Icon as={MODALITY_ICONS[styleSignals.preferredModality] || FiActivity} color="purple.400" boxSize={3} />
                      <Text fontSize="2xs" color="gray.500" mt={1}>Modality</Text>
                      <Badge colorScheme="purple" fontSize="2xs" mt={1}>
                        {MODALITY_LABELS[styleSignals.preferredModality] || 'Mixed'}
                      </Badge>
                    </VStack>
                  </Box>

                  {/* Fatigue point */}
                  <Box p={2} borderRadius="md" bg="purple.50">
                    <VStack spacing={0} align="center">
                      <Icon as={FiClock} color="purple.400" boxSize={3} />
                      <Text fontSize="2xs" color="gray.500" mt={1}>Session Length</Text>
                      <Text fontSize="xs" fontWeight="600" color="purple.700" mt={1}>
                        ~{styleSignals.fatiguePointMinutes}m
                      </Text>
                    </VStack>
                  </Box>

                  {/* Reading level */}
                  <Box p={2} borderRadius="md" bg="purple.50">
                    <VStack spacing={0} align="center">
                      <Icon as={FiBook} color="purple.400" boxSize={3} />
                      <Text fontSize="2xs" color="gray.500" mt={1}>Reading</Text>
                      <Badge
                        colorScheme={
                          styleSignals.readingLevel === 'above-grade' ? 'green'
                          : styleSignals.readingLevel === 'below-grade' ? 'orange'
                          : 'blue'
                        }
                        fontSize="2xs"
                        mt={1}
                      >
                        {styleSignals.readingLevel === 'above-grade' ? 'Above'
                          : styleSignals.readingLevel === 'below-grade' ? 'Below'
                          : 'At Grade'}
                      </Badge>
                    </VStack>
                  </Box>
                </SimpleGrid>

                {styleSignals.confidence < 0.3 && (
                  <Text fontSize="2xs" color="gray.400" mt={2}>
                    Signals are based on {styleSignals.evidence.sessionCount} sessions.
                    They become more accurate as your child completes more activities.
                  </Text>
                )}
              </Box>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
