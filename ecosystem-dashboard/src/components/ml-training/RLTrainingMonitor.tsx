import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  useToast,
  Card,
  CardHeader,
  CardBody,
} from '@chakra-ui/react';

interface RLSummary {
  total_phases: number;
  avg_score: number;
  best_score: number;
  worst_score: number;
  latest_version: number;
  latest_score: number;
  latest_action: string;
  promoted_phases?: number;
}

interface RLPhase {
  timestamp: string;
  phase_id: string;
  action: string;
  before_version: number;
  after_version: number;
  score: number;
  improvement?: number;
  promotion_gate?: {
    passed: boolean;
    reasons?: string[];
    actual?: {
      explicit_contract_coverage?: number;
      field_completeness?: number;
      family_coverage?: Record<string, number>;
    };
  };
  promotion_blocked?: boolean;
}

export default function RLTrainingMonitor() {
  const [summary, setSummary] = useState<RLSummary | null>(null);
  const [phases, setPhases] = useState<RLPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchData = async () => {
    try {
      const [summaryRes, phasesRes] = await Promise.all([
        fetch('/api/clinical-kb/rl-monitoring?endpoint=summary'),
        fetch('/api/clinical-kb/rl-monitoring?endpoint=phases'),
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (phasesRes.ok) {
        const phasesData = await phasesRes.json();
        setPhases(phasesData.phases || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch RL monitoring data:', error);
      toast({
        title: 'Error fetching RL data',
        description: 'Could not load training metrics',
        status: 'error',
        duration: 3000,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading RL training metrics...</Text>
      </Box>
    );
  }

  const recentPhases = phases.slice(-10).reverse();

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="lg">RL Training Monitor</Heading>

      {summary && (
        <HStack spacing={4}>
          <Card flex={1}>
            <CardBody>
              <Stat>
                <StatLabel>Total Phases</StatLabel>
                <StatNumber>{summary.total_phases}</StatNumber>
                <StatHelpText>
                  {summary.promoted_phases !== undefined && (
                    <Text fontSize="sm" color="green.500">
                      {summary.promoted_phases} promoted
                    </Text>
                  )}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <Stat>
                <StatLabel>Latest Score</StatLabel>
                <StatNumber>{summary.latest_score.toFixed(2)}</StatNumber>
                <StatHelpText>
                  Version {summary.latest_version}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <Stat>
                <StatLabel>Best Score</StatLabel>
                <StatNumber>{summary.best_score.toFixed(2)}</StatNumber>
                <StatHelpText>
                  Avg: {summary.avg_score.toFixed(2)}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card flex={1}>
            <CardBody>
              <Stat>
                <StatLabel>Latest Action</StatLabel>
                <StatNumber fontSize="md">{summary.latest_action}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </HStack>
      )}

      <Card>
        <CardHeader>
          <Heading size="md">Recent Training Phases</Heading>
        </CardHeader>
        <CardBody>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Phase ID</Th>
                <Th>Action</Th>
                <Th>Version</Th>
                <Th>Score</Th>
                <Th>Improvement</Th>
                <Th>Gate</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentPhases.map((phase, idx) => (
                <Tr key={idx}>
                  <Td fontSize="xs">{phase.phase_id}</Td>
                  <Td fontSize="xs">{phase.action}</Td>
                  <Td>
                    {phase.before_version} → {phase.after_version}
                  </Td>
                  <Td>{phase.score.toFixed(2)}</Td>
                  <Td>
                    {phase.improvement !== undefined && (
                      <Text
                        fontSize="sm"
                        color={phase.improvement >= 0 ? 'green.500' : 'red.500'}
                      >
                        {phase.improvement >= 0 ? '▲ +' : '▼ '}{Math.abs(phase.improvement).toFixed(2)}
                      </Text>
                    )}
                  </Td>
                  <Td>
                    {phase.promotion_gate && (
                      <Badge
                        colorScheme={phase.promotion_gate.passed ? 'green' : 'red'}
                      >
                        {phase.promotion_gate.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    {phase.promotion_blocked ? (
                      <Badge colorScheme="orange">Blocked</Badge>
                    ) : (
                      <Badge colorScheme="green">Promoted</Badge>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {recentPhases.length === 0 && (
            <Text textAlign="center" py={4} color="gray.500">
              No training phases recorded yet
            </Text>
          )}
        </CardBody>
      </Card>

      {recentPhases.length > 0 && recentPhases[0].promotion_gate && (
        <Card>
          <CardHeader>
            <Heading size="sm">Latest Promotion Gate Details</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={2}>
              {recentPhases[0].promotion_gate.actual && (
                <>
                  <HStack>
                    <Text fontWeight="bold">Contract Coverage:</Text>
                    <Text>
                      {(
                        (recentPhases[0].promotion_gate.actual
                          .explicit_contract_coverage || 0) * 100
                      ).toFixed(1)}
                      %
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="bold">Field Completeness:</Text>
                    <Text>
                      {(
                        (recentPhases[0].promotion_gate.actual.field_completeness ||
                          0) * 100
                      ).toFixed(1)}
                      %
                    </Text>
                  </HStack>
                </>
              )}
              {recentPhases[0].promotion_gate.reasons &&
                recentPhases[0].promotion_gate.reasons.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      Failure Reasons:
                    </Text>
                    {recentPhases[0].promotion_gate.reasons.map((reason, idx) => (
                      <Text key={idx} fontSize="sm" color="red.500">
                        • {reason}
                      </Text>
                    ))}
                  </Box>
                )}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}
