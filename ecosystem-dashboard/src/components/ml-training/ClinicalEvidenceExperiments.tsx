/**
 * Clinical Evidence Experiments Panel
 * Displays training experiments, A/B test results, and safety metrics
 * for the Clinical Evidence Pipeline optimization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  Icon,
  Tooltip,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Beaker,
  Shield,
  FileText,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  GitBranch,
} from 'lucide-react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';

// Types
interface TrainingRun {
  run_id: string;
  run_name: string;
  run_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_experiments: number;
  successful_experiments: number;
  failed_experiments: number;
  avg_overall_score: number | null;
  git_branch: string;
}

interface ExperimentSummary {
  experiment_id: string;
  query_text: string;
  complexity_level: string;
  overall_score: number;
  safety_score: number;
  clinical_accuracy_score: number;
  guideline_alignment_score: number;
  deployment_safe: boolean;
  max_hallucination_severity: number;
  max_omission_severity: number;
  execution_time_ms: number;
  version_tag: string | null;
}

interface SafetyDashboard {
  run_id: string;
  run_name: string;
  total_experiments: number;
  hallucination_count: number;
  omission_count: number;
  max_hallucination_severity: number;
  max_omission_severity: number;
  avg_safety_score: number;
  critical_hallucinations: number;
  critical_omissions: number;
  black_box_omissions: number;
  deployment_blocked_count: number;
}

interface ABTestMetrics {
  version_tag: string;
  request_count: number;
  avg_score: number;
  avg_safety: number;
  unsafe_count: number;
  traffic_percentage: number;
}

// API Configuration
const TRAINING_API_URL = process.env.NEXT_PUBLIC_TRAINING_API_URL || 'http://localhost:8021';

export default function ClinicalEvidenceExperiments() {
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<ExperimentSummary[]>([]);
  const [safetyData, setSafetyData] = useState<SafetyDashboard | null>(null);
  const [abTestMetrics, setABTestMetrics] = useState<ABTestMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  // Fetch training runs
  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetch(`${TRAINING_API_URL}/api/training/runs`);
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
        if (data.runs?.length > 0 && !selectedRun) {
          setSelectedRun(data.runs[0].run_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch training runs:', error);
    }
  }, [selectedRun]);

  // Fetch experiments for selected run
  const fetchExperiments = useCallback(async () => {
    if (!selectedRun) return;
    try {
      const response = await fetch(`${TRAINING_API_URL}/api/training/runs/${selectedRun}/experiments`);
      if (response.ok) {
        const data = await response.json();
        setExperiments(data.experiments || []);
      }
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    }
  }, [selectedRun]);

  // Fetch safety dashboard
  const fetchSafetyData = useCallback(async () => {
    if (!selectedRun) return;
    try {
      const response = await fetch(`${TRAINING_API_URL}/api/training/runs/${selectedRun}/safety`);
      if (response.ok) {
        const data = await response.json();
        setSafetyData(data);
      }
    } catch (error) {
      console.error('Failed to fetch safety data:', error);
    }
  }, [selectedRun]);

  // Fetch A/B test metrics
  const fetchABTestMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${TRAINING_API_URL}/api/training/ab-test/metrics`);
      if (response.ok) {
        const data = await response.json();
        setABTestMetrics(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to fetch A/B test metrics:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRuns();
      await fetchABTestMetrics();
      setLoading(false);
    };
    loadData();
  }, [fetchRuns, fetchABTestMetrics]);

  // Load run-specific data when run changes
  useEffect(() => {
    if (selectedRun) {
      fetchExperiments();
      fetchSafetyData();
    }
  }, [selectedRun, fetchExperiments, fetchSafetyData]);

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchRuns(),
      fetchExperiments(),
      fetchSafetyData(),
      fetchABTestMetrics(),
    ]);
    setRefreshing(false);
    toast({
      title: 'Data refreshed',
      status: 'success',
      duration: 2000,
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'running': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  // Get severity badge color
  const getSeverityColor = (severity: number) => {
    if (severity >= 0.6) return 'red';
    if (severity >= 0.3) return 'orange';
    if (severity >= 0.1) return 'yellow';
    return 'green';
  };

  if (loading) {
    return (
      <VStack h="400px" justify="center" align="center">
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text color={textSecondary}>Loading Clinical Evidence experiments...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>
            Clinical Evidence Pipeline Experiments
          </Text>
          <Text color={textSecondary}>
            Training runs, A/B testing, and safety metrics
          </Text>
        </VStack>
        <HStack spacing={4}>
          <Select
            value={selectedRun || ''}
            onChange={(e) => setSelectedRun(e.target.value)}
            w="300px"
            bg={bgCard}
          >
            {runs.map((run) => (
              <option key={run.run_id} value={run.run_id}>
                {run.run_name} ({run.run_type})
              </option>
            ))}
          </Select>
          <Button
            leftIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            isLoading={refreshing}
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Summary Stats */}
      <Grid templateColumns="repeat(5, 1fr)" gap={4}>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Total Runs</StatLabel>
              <StatNumber>{runs.length}</StatNumber>
              <StatHelpText>
                {runs.filter(r => r.status === 'running').length} active
              </StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Experiments</StatLabel>
              <StatNumber>{experiments.length}</StatNumber>
              <StatHelpText>in selected run</StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Avg Score</StatLabel>
              <StatNumber>
                {experiments.length > 0
                  ? (experiments.reduce((sum, e) => sum + (e.overall_score || 0), 0) / experiments.length).toFixed(1)
                  : '--'}
              </StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                vs baseline
              </StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Safety Score</StatLabel>
              <StatNumber color={safetyData?.avg_safety_score && safetyData.avg_safety_score >= 85 ? 'green.500' : 'orange.500'}>
                {safetyData?.avg_safety_score?.toFixed(1) || '--'}
              </StatNumber>
              <StatHelpText>target: ≥90</StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
        <GridItem>
          <SimpleGlassPanel p={4}>
            <Stat>
              <StatLabel>Deployment Safe</StatLabel>
              <StatNumber>
                {safetyData?.deployment_blocked_count === 0 ? (
                  <Icon as={CheckCircle} color="green.500" boxSize={8} />
                ) : (
                  <Icon as={XCircle} color="red.500" boxSize={8} />
                )}
              </StatNumber>
              <StatHelpText>
                {safetyData?.deployment_blocked_count || 0} blocked
              </StatHelpText>
            </Stat>
          </SimpleGlassPanel>
        </GridItem>
      </Grid>

      {/* Main Tabs */}
      <Tabs variant="soft-rounded" colorScheme="purple">
        <TabList>
          <Tab><Icon as={Beaker} mr={2} /> Experiments</Tab>
          <Tab><Icon as={Shield} mr={2} /> Safety</Tab>
          <Tab><Icon as={GitBranch} mr={2} /> A/B Testing</Tab>
          <Tab><Icon as={BarChart3} mr={2} /> Performance</Tab>
        </TabList>

        <TabPanels>
          {/* Experiments Tab */}
          <TabPanel px={0}>
            <SimpleGlassPanel>
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Query</Th>
                      <Th>Complexity</Th>
                      <Th isNumeric>Overall</Th>
                      <Th isNumeric>Accuracy</Th>
                      <Th isNumeric>Guidelines</Th>
                      <Th isNumeric>Safety</Th>
                      <Th>Status</Th>
                      <Th isNumeric>Time</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {experiments.slice(0, 20).map((exp) => (
                      <Tr key={exp.experiment_id}>
                        <Td maxW="300px" isTruncated>
                          <Tooltip label={exp.query_text}>
                            <Text>{exp.query_text}</Text>
                          </Tooltip>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              exp.complexity_level === 'expert' ? 'red' :
                              exp.complexity_level === 'complex' ? 'orange' :
                              exp.complexity_level === 'moderate' ? 'yellow' : 'green'
                            }
                          >
                            {exp.complexity_level}
                          </Badge>
                        </Td>
                        <Td isNumeric fontWeight="bold">{exp.overall_score?.toFixed(0) || '--'}</Td>
                        <Td isNumeric>{exp.clinical_accuracy_score?.toFixed(0) || '--'}</Td>
                        <Td isNumeric>{exp.guideline_alignment_score?.toFixed(0) || '--'}</Td>
                        <Td isNumeric>{exp.safety_score?.toFixed(0) || '--'}</Td>
                        <Td>
                          {exp.deployment_safe ? (
                            <Icon as={CheckCircle} color="green.500" />
                          ) : (
                            <Icon as={XCircle} color="red.500" />
                          )}
                        </Td>
                        <Td isNumeric>{exp.execution_time_ms}ms</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
              {experiments.length > 20 && (
                <Text p={4} color={textSecondary} textAlign="center">
                  Showing 20 of {experiments.length} experiments
                </Text>
              )}
            </SimpleGlassPanel>
          </TabPanel>

          {/* Safety Tab */}
          <TabPanel px={0}>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              {/* Hallucinations */}
              <GridItem>
                <SimpleGlassPanel p={6}>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <Text fontSize="lg" fontWeight="bold">Hallucinations</Text>
                      <Badge colorScheme={getSeverityColor(safetyData?.max_hallucination_severity || 0)}>
                        Max: {(safetyData?.max_hallucination_severity || 0).toFixed(2)}
                      </Badge>
                    </HStack>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Stat>
                        <StatLabel>Total Detected</StatLabel>
                        <StatNumber>{safetyData?.hallucination_count || 0}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Critical (≥0.6)</StatLabel>
                        <StatNumber color="red.500">
                          {safetyData?.critical_hallucinations || 0}
                        </StatNumber>
                      </Stat>
                    </Grid>
                    <Box>
                      <Text fontSize="sm" color={textSecondary} mb={2}>
                        Severity Distribution
                      </Text>
                      <Progress
                        value={100 - ((safetyData?.max_hallucination_severity || 0) * 100)}
                        colorScheme="green"
                        size="lg"
                        borderRadius="md"
                      />
                    </Box>
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>

              {/* Omissions */}
              <GridItem>
                <SimpleGlassPanel p={6}>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <Text fontSize="lg" fontWeight="bold">Omissions</Text>
                      <Badge colorScheme={getSeverityColor(safetyData?.max_omission_severity || 0)}>
                        Max: {(safetyData?.max_omission_severity || 0).toFixed(2)}
                      </Badge>
                    </HStack>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Stat>
                        <StatLabel>Total Detected</StatLabel>
                        <StatNumber>{safetyData?.omission_count || 0}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Black Box Warnings</StatLabel>
                        <StatNumber color="red.500">
                          {safetyData?.black_box_omissions || 0}
                        </StatNumber>
                      </Stat>
                    </Grid>
                    <Box>
                      <Text fontSize="sm" color={textSecondary} mb={2}>
                        Severity Distribution
                      </Text>
                      <Progress
                        value={100 - ((safetyData?.max_omission_severity || 0) * 100)}
                        colorScheme="green"
                        size="lg"
                        borderRadius="md"
                      />
                    </Box>
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>

              {/* Safety Gate Status */}
              <GridItem colSpan={2}>
                <SimpleGlassPanel p={6}>
                  <VStack spacing={4}>
                    <Text fontSize="lg" fontWeight="bold">Deployment Safety Gate</Text>
                    <HStack spacing={8}>
                      <VStack>
                        <Icon
                          as={safetyData?.critical_hallucinations === 0 ? CheckCircle : XCircle}
                          color={safetyData?.critical_hallucinations === 0 ? 'green.500' : 'red.500'}
                          boxSize={10}
                        />
                        <Text>No Critical Hallucinations</Text>
                      </VStack>
                      <VStack>
                        <Icon
                          as={safetyData?.black_box_omissions === 0 ? CheckCircle : XCircle}
                          color={safetyData?.black_box_omissions === 0 ? 'green.500' : 'red.500'}
                          boxSize={10}
                        />
                        <Text>No Black Box Omissions</Text>
                      </VStack>
                      <VStack>
                        <Icon
                          as={(safetyData?.avg_safety_score || 0) >= 85 ? CheckCircle : AlertTriangle}
                          color={(safetyData?.avg_safety_score || 0) >= 85 ? 'green.500' : 'orange.500'}
                          boxSize={10}
                        />
                        <Text>Safety Score ≥85</Text>
                      </VStack>
                      <VStack>
                        <Icon
                          as={safetyData?.deployment_blocked_count === 0 ? CheckCircle : XCircle}
                          color={safetyData?.deployment_blocked_count === 0 ? 'green.500' : 'red.500'}
                          boxSize={10}
                        />
                        <Text>All Experiments Safe</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>
            </Grid>
          </TabPanel>

          {/* A/B Testing Tab */}
          <TabPanel px={0}>
            <SimpleGlassPanel p={6}>
              <VStack align="stretch" spacing={6}>
                <Text fontSize="lg" fontWeight="bold">Active A/B Test Versions</Text>
                
                {abTestMetrics.length === 0 ? (
                  <VStack py={8}>
                    <Icon as={GitBranch} boxSize={12} color={textSecondary} />
                    <Text color={textSecondary}>No A/B tests currently running</Text>
                    <Text fontSize="sm" color={textSecondary}>
                      Deploy a canary version to start A/B testing
                    </Text>
                  </VStack>
                ) : (
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Version</Th>
                        <Th isNumeric>Traffic %</Th>
                        <Th isNumeric>Requests</Th>
                        <Th isNumeric>Avg Score</Th>
                        <Th isNumeric>Avg Safety</Th>
                        <Th isNumeric>Unsafe</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {abTestMetrics.map((version) => (
                        <Tr key={version.version_tag}>
                          <Td>
                            <HStack>
                              <Badge colorScheme="purple">{version.version_tag}</Badge>
                              {version.traffic_percentage < 50 && (
                                <Badge colorScheme="orange" size="sm">canary</Badge>
                              )}
                            </HStack>
                          </Td>
                          <Td isNumeric>
                            <Progress
                              value={version.traffic_percentage}
                              colorScheme="purple"
                              size="sm"
                              w="100px"
                              display="inline-block"
                              mr={2}
                            />
                            {version.traffic_percentage}%
                          </Td>
                          <Td isNumeric>{version.request_count.toLocaleString()}</Td>
                          <Td isNumeric fontWeight="bold">{version.avg_score.toFixed(1)}</Td>
                          <Td isNumeric>{version.avg_safety.toFixed(1)}</Td>
                          <Td isNumeric color={version.unsafe_count > 0 ? 'red.500' : 'green.500'}>
                            {version.unsafe_count}
                          </Td>
                          <Td>
                            {version.unsafe_count === 0 ? (
                              <Badge colorScheme="green">Healthy</Badge>
                            ) : (
                              <Badge colorScheme="red">Issues</Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </VStack>
            </SimpleGlassPanel>
          </TabPanel>

          {/* Performance Tab */}
          <TabPanel px={0}>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <GridItem>
                <SimpleGlassPanel p={6}>
                  <VStack align="stretch" spacing={4}>
                    <Text fontSize="lg" fontWeight="bold">Score Breakdown</Text>
                    {[
                      { label: 'Clinical Accuracy', key: 'clinical_accuracy_score', target: 90 },
                      { label: 'Guideline Alignment', key: 'guideline_alignment_score', target: 85 },
                      { label: 'Evidence Quality', key: 'evidence_quality_score', target: 80 },
                      { label: 'Completeness', key: 'completeness_score', target: 80 },
                      { label: 'Actionability', key: 'actionability_score', target: 75 },
                      { label: 'Safety', key: 'safety_score', target: 90 },
                      { label: 'Clarity', key: 'clarity_score', target: 80 },
                    ].map((metric) => {
                      const avg = experiments.length > 0
                        ? experiments.reduce((sum, e) => sum + ((e as any)[metric.key] || 0), 0) / experiments.length
                        : 0;
                      return (
                        <Box key={metric.key}>
                          <Flex justify="space-between" mb={1}>
                            <Text fontSize="sm">{metric.label}</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {avg.toFixed(1)} / {metric.target}
                            </Text>
                          </Flex>
                          <Progress
                            value={(avg / metric.target) * 100}
                            colorScheme={avg >= metric.target ? 'green' : avg >= metric.target * 0.8 ? 'yellow' : 'red'}
                            size="sm"
                            borderRadius="md"
                          />
                        </Box>
                      );
                    })}
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>

              <GridItem>
                <SimpleGlassPanel p={6}>
                  <VStack align="stretch" spacing={4}>
                    <Text fontSize="lg" fontWeight="bold">Training Runs</Text>
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Run</Th>
                          <Th>Type</Th>
                          <Th>Status</Th>
                          <Th isNumeric>Score</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {runs.slice(0, 10).map((run) => (
                          <Tr
                            key={run.run_id}
                            cursor="pointer"
                            onClick={() => setSelectedRun(run.run_id)}
                            bg={selectedRun === run.run_id ? 'purple.900' : undefined}
                            _hover={{ bg: 'whiteAlpha.100' }}
                          >
                            <Td>{run.run_name}</Td>
                            <Td>
                              <Badge>{run.run_type}</Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme={getStatusColor(run.status)}>
                                {run.status}
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              {run.avg_overall_score?.toFixed(1) || '--'}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </VStack>
                </SimpleGlassPanel>
              </GridItem>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
