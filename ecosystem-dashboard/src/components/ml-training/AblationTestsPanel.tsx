/**
 * Ablation Tests Panel
 * Display and monitor Clinical Evidence pipeline ablation test results
 * Connected to Training Hub API /api/ablation-results
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Badge,
  Icon,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import StatWrapper from '@/components/ui/StatWrapper';
import {
  BeakerIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface QueryResult {
  query_id: string;
  query_text: string;
  complexity: string;
  domain: string;
  ablation_id: string;
  success: boolean;
  answer: string;
  sources_count: number;
  pubmed_count: number;
  trials_count: number;
  guideline_count: number;
  latency_ms: number;
  searxng_called: boolean;
  searxng_results: number;
  error: string;
  timestamp: string;
}

interface AblationRun {
  run_id: string;
  ablation_id: string;
  ablation_name: string;
  description: string;
  started_at: string;
  completed_at: string;
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  avg_latency_ms: number;
  avg_sources: number;
  avg_pubmed: number;
  avg_trials: number;
  avg_guidelines: number;
  searxng_success_rate: number;
  results: QueryResult[];
}

interface AblationData {
  runs: AblationRun[];
  updated_at?: string;
}

export const AblationTestsPanel: React.FC = () => {
  const [data, setData] = useState<AblationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AblationRun | null>(null);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/training-hub/ablation-results');
      if (!response.ok) throw new Error('Failed to fetch ablation results');
      const result = await response.json();
      setData(result);
      if (result.runs?.length > 0 && !selectedRun) {
        setSelectedRun(result.runs[result.runs.length - 1]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (success: boolean) => success ? 'green' : 'red';
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'green';
      case 'moderate': return 'yellow';
      case 'complex': return 'orange';
      case 'expert': return 'red';
      default: return 'gray';
    }
  };

  // Find baseline for comparison
  const baseline = data?.runs?.find(r => r.ablation_id === 'baseline');

  if (loading && !data) {
    return (
      <VStack h="full" justify="center" align="center" p={8}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text color={textSecondary}>Loading ablation results...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        {error}
        <Button ml={4} size="sm" onClick={fetchData}>Retry</Button>
      </Alert>
    );
  }

  return (
    <Box p={6}>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <VStack align="start" spacing={1}>
          <HStack>
            <Icon as={BeakerIcon} boxSize={6} color="purple.400" />
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              Clinical Evidence Ablation Tests
            </Text>
          </HStack>
          <Text fontSize="sm" color={textSecondary}>
            Pipeline component impact analysis from DGX Spark
          </Text>
        </VStack>
        <Button
          leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}
          size="sm"
          onClick={fetchData}
          isLoading={loading}
        >
          Refresh
        </Button>
      </HStack>

      {/* Summary Stats */}
      {data?.runs && data.runs.length > 0 && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          <GlassPanel p={4}>
            <StatWrapper>
              <StatLabel color={textSecondary}>Total Runs</StatLabel>
              <StatNumber color={textPrimary}>{data.runs.length}</StatNumber>
              <StatHelpText>ablation configs tested</StatHelpText>
            </StatWrapper>
          </GlassPanel>
          <GlassPanel p={4}>
            <StatWrapper>
              <StatLabel color={textSecondary}>Baseline Success</StatLabel>
              <StatNumber color="green.400">
                {baseline ? `${Math.round(baseline.successful_queries / baseline.total_queries * 100)}%` : '-'}
              </StatNumber>
              <StatHelpText>{baseline?.successful_queries}/{baseline?.total_queries} queries</StatHelpText>
            </StatWrapper>
          </GlassPanel>
          <GlassPanel p={4}>
            <StatWrapper>
              <StatLabel color={textSecondary}>Avg Latency</StatLabel>
              <StatNumber color={textPrimary}>
                {baseline ? `${Math.round(baseline.avg_latency_ms)}ms` : '-'}
              </StatNumber>
              <StatHelpText>baseline response time</StatHelpText>
            </StatWrapper>
          </GlassPanel>
          <GlassPanel p={4}>
            <StatWrapper>
              <StatLabel color={textSecondary}>SearXNG Rate</StatLabel>
              <StatNumber color="blue.400">
                {baseline ? `${Math.round(baseline.searxng_success_rate)}%` : '-'}
              </StatNumber>
              <StatHelpText>guideline retrieval</StatHelpText>
            </StatWrapper>
          </GlassPanel>
        </SimpleGrid>
      )}

      {/* Comparison Table */}
      {data?.runs && data.runs.length > 0 ? (
        <GlassPanel p={4} mb={6}>
          <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={4}>
            Ablation Comparison
          </Text>
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th color={textSecondary}>Ablation</Th>
                  <Th color={textSecondary} isNumeric>Success</Th>
                  <Th color={textSecondary} isNumeric>Latency</Th>
                  <Th color={textSecondary} isNumeric>Sources</Th>
                  <Th color={textSecondary} isNumeric>Guidelines</Th>
                  <Th color={textSecondary} isNumeric>SearXNG</Th>
                  <Th color={textSecondary}>Delta</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.runs.map((run) => {
                  const successRate = run.total_queries > 0 
                    ? Math.round(run.successful_queries / run.total_queries * 100) 
                    : 0;
                  const baselineSuccess = baseline && baseline.total_queries > 0
                    ? Math.round(baseline.successful_queries / baseline.total_queries * 100)
                    : 0;
                  const delta = successRate - baselineSuccess;

                  return (
                    <Tr 
                      key={run.run_id}
                      cursor="pointer"
                      _hover={{ bg: surfaceElevated }}
                      onClick={() => setSelectedRun(run)}
                      bg={selectedRun?.run_id === run.run_id ? surfaceElevated : 'transparent'}
                    >
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" color={textPrimary}>{run.ablation_name}</Text>
                          <Text fontSize="xs" color={textSecondary}>{run.description}</Text>
                        </VStack>
                      </Td>
                      <Td isNumeric>
                        <Badge colorScheme={successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red'}>
                          {successRate}%
                        </Badge>
                      </Td>
                      <Td isNumeric color={textPrimary}>{Math.round(run.avg_latency_ms)}ms</Td>
                      <Td isNumeric color={textPrimary}>{run.avg_sources.toFixed(1)}</Td>
                      <Td isNumeric color={textPrimary}>{run.avg_guidelines.toFixed(1)}</Td>
                      <Td isNumeric>
                        <Badge colorScheme={run.searxng_success_rate > 0 ? 'blue' : 'gray'}>
                          {Math.round(run.searxng_success_rate)}%
                        </Badge>
                      </Td>
                      <Td>
                        {run.ablation_id !== 'baseline' && (
                          <HStack>
                            <Icon 
                              as={delta >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon} 
                              color={delta >= 0 ? 'green.400' : 'red.400'} 
                              boxSize={4} 
                            />
                            <Text color={delta >= 0 ? 'green.400' : 'red.400'} fontSize="sm">
                              {delta > 0 ? '+' : ''}{delta}%
                            </Text>
                          </HStack>
                        )}
                        {run.ablation_id === 'baseline' && (
                          <Badge colorScheme="purple">baseline</Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </GlassPanel>
      ) : (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          No ablation test results yet. Run tests from DGX Spark using:
          <Text as="code" ml={2} fontFamily="mono" fontSize="sm">
            python ablation_tests.py --all
          </Text>
        </Alert>
      )}

      {/* Selected Run Details */}
      {selectedRun && (
        <GlassPanel p={4}>
          <Text fontSize="md" fontWeight="bold" color={textPrimary} mb={4}>
            {selectedRun.ablation_name} - Query Results
          </Text>
          <Accordion allowMultiple>
            {selectedRun.results?.map((result, idx) => (
              <AccordionItem key={idx} border="none">
                <AccordionButton px={2} py={2} _hover={{ bg: surfaceElevated }} borderRadius="md">
                  <HStack flex={1} justify="space-between">
                    <HStack>
                      <Icon 
                        as={result.success ? CheckCircleIcon : XCircleIcon} 
                        color={result.success ? 'green.400' : 'red.400'}
                        boxSize={4}
                      />
                      <Text fontSize="sm" color={textPrimary}>{result.query_id}</Text>
                      <Badge colorScheme={getComplexityColor(result.complexity)} size="sm">
                        {result.complexity}
                      </Badge>
                    </HStack>
                    <HStack spacing={4}>
                      <Text fontSize="xs" color={textSecondary}>{result.latency_ms}ms</Text>
                      <Text fontSize="xs" color={textSecondary}>{result.sources_count} sources</Text>
                    </HStack>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="start" spacing={2}>
                    <Text fontSize="sm" color={textPrimary} fontWeight="medium">
                      {result.query_text}
                    </Text>
                    <SimpleGrid columns={4} spacing={4} w="full">
                      <Box>
                        <Text fontSize="xs" color={textSecondary}>PubMed</Text>
                        <Text fontSize="sm" color={textPrimary}>{result.pubmed_count}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={textSecondary}>Trials</Text>
                        <Text fontSize="sm" color={textPrimary}>{result.trials_count}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={textSecondary}>Guidelines</Text>
                        <Text fontSize="sm" color={textPrimary}>{result.guideline_count}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={textSecondary}>SearXNG</Text>
                        <Badge colorScheme={result.searxng_called ? 'green' : 'gray'} size="sm">
                          {result.searxng_called ? 'Yes' : 'No'}
                        </Badge>
                      </Box>
                    </SimpleGrid>
                    {result.error && (
                      <Alert status="error" size="sm" borderRadius="md">
                        <AlertIcon />
                        {result.error}
                      </Alert>
                    )}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassPanel>
      )}
    </Box>
  );
};

export default AblationTestsPanel;
