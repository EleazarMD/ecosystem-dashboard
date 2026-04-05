/**
 * Research Analytics Dashboard
 * Comprehensive analytics for AI Research performance, costs, and ROI
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Select,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  Icon,
  Button,
  ButtonGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Tooltip,
  Progress,
  Flex,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import {
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown,
  FiZap,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiBarChart2,
  FiPieChart,
  FiLayers,
} from 'react-icons/fi';

interface AnalyticsSummary {
  total_sessions: number;
  successful_sessions: number;
  failed_sessions: number;
  success_rate_pct: number;
  avg_tokens_per_session: number;
  total_tokens_used: number;
  avg_tpm: number;
  peak_tpm: number;
  total_cost_usd: number;
  avg_cost_per_session: number;
  avg_cost_per_1k_output_tokens: number;
  avg_duration_seconds: number;
  median_duration_seconds: number;
  p95_duration_seconds: number;
  avg_citations: number;
  avg_output_words: number;
  pct_with_tables: number;
  avg_cost_prediction_error_pct: number;
  predictions_within_20pct: number;
  prediction_accuracy_rate: number;
}

interface ProviderComparison {
  provider: string;
  total_sessions: number;
  successful_sessions: number;
  success_rate_pct: number;
  avg_total_tokens: number;
  avg_cost_per_session: number;
  avg_cost_per_1k_output_tokens: number;
  avg_duration_seconds: number;
  avg_citations: number;
  avg_output_words: number;
  words_per_dollar: number;
  citations_per_dollar: number;
}

interface DepthPerformance {
  research_depth: number;
  sessions: number;
  avg_tokens: number;
  avg_cost: number;
  avg_output_words: number;
  avg_citations: number;
}

interface CostDriver {
  model: string;
  research_depth: number;
  reasoning_effort: string;
  sessions: number;
  total_cost: number;
  avg_cost: number;
  avg_tokens: number;
}

interface Recommendation {
  id: number;
  recommendation_type: string;
  severity: string;
  model: string;
  current_settings: any;
  recommended_settings: any;
  current_avg_cost: number;
  projected_avg_cost: number;
  projected_savings_pct: number;
  projected_quality_impact: string;
  sample_size: number;
  confidence_score: number;
}

export default function ResearchAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [providerComparison, setProviderComparison] = useState<ProviderComparison[]>([]);
  const [depthPerformance, setDepthPerformance] = useState<DepthPerformance[]>([]);
  const [costDrivers, setCostDrivers] = useState<CostDriver[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Theme colors
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const successColor = 'green.500';
  const warningColor = 'orange.500';
  const errorColor = 'red.500';
  const recBg = useSemanticToken('surface.base');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/research/overview?timeRange=${timeRange}`);
      const data = await response.json();
      
      setSummary(data.summary);
      setProviderComparison(data.modelComparison || []);
      setDepthPerformance(data.depthPerformance || []);
      setCostDrivers(data.costDrivers || []);
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '$0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(numValue);
  };

  const formatNumber = (value: number | string | null) => {
    if (value === null || value === undefined) return '0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return new Intl.NumberFormat('en-US').format(Math.round(numValue));
  };

  const formatPercent = (value: number | string | null) => {
    if (value === null || value === undefined) return '0%';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0%';
    return `${numValue.toFixed(1)}%`;
  };

  const formatDecimal = (value: number | string | null | undefined, decimals: number = 1) => {
    if (value === null || value === undefined) return '0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0';
    return numValue.toFixed(decimals);
  };

  if (loading) {
    return (
      <VStack h="full" justify="center" spacing={4}>
        <Spinner size="xl" color="blue.500" />
        <Text color={mutedColor}>Loading analytics...</Text>
      </VStack>
    );
  }

  if (!summary) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        No analytics data yet. Submit some research queries to see insights!
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch" h="full" overflowY="auto" p={6}>
      {/* Header with Time Range Selector */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg" mb={1}>Research Analytics</Heading>
          <Text color={mutedColor} fontSize="sm">
            Performance insights and ROI analysis
          </Text>
        </Box>
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            isActive={timeRange === '24h'}
            onClick={() => setTimeRange('24h')}
          >
            24h
          </Button>
          <Button
            isActive={timeRange === '7d'}
            onClick={() => setTimeRange('7d')}
          >
            7d
          </Button>
          <Button
            isActive={timeRange === '30d'}
            onClick={() => setTimeRange('30d')}
          >
            30d
          </Button>
        </ButtonGroup>
      </HStack>

      {/* Key Metrics Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {/* Total Sessions */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <HStack>
                <Icon as={FiActivity} boxSize={5} color="blue.500" />
                <StatLabel>Total Sessions</StatLabel>
              </HStack>
              <StatNumber mt={2}>{formatNumber(summary.total_sessions)}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                {formatPercent(summary.success_rate_pct)} success rate
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Total Cost */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <HStack>
                <Icon as={FiDollarSign} boxSize={5} color="green.500" />
                <StatLabel>Total Spend</StatLabel>
              </HStack>
              <StatNumber mt={2}>{formatCurrency(summary.total_cost_usd)}</StatNumber>
              <StatHelpText>
                {formatCurrency(summary.avg_cost_per_session)} avg/session
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Tokens Used */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <HStack>
                <Icon as={FiZap} boxSize={5} color="orange.500" />
                <StatLabel>Tokens Used</StatLabel>
              </HStack>
              <StatNumber mt={2}>{formatNumber(summary.total_tokens_used / 1000)}K</StatNumber>
              <StatHelpText>
                {formatNumber(summary.avg_tpm)} TPM avg
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Prediction Accuracy */}
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <Stat>
              <HStack>
                <Icon as={FiCheckCircle} boxSize={5} color="purple.500" />
                <StatLabel>Prediction Accuracy</StatLabel>
              </HStack>
              <StatNumber mt={2}>{formatPercent(summary.prediction_accuracy_rate)}</StatNumber>
              <StatHelpText>
                {summary.predictions_within_20pct} within ±20%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Optimization Recommendations */}
      {recommendations.length > 0 && (
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <HStack>
              <Icon as={FiTrendingUp} boxSize={5} color="green.500" />
              <Heading size="md">Cost Optimization Recommendations</Heading>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {recommendations.map((rec) => (
                <Box
                  key={rec.id}
                  p={4}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={
                    rec.severity === 'high' ? errorColor :
                    rec.severity === 'medium' ? warningColor :
                    borderColor
                  }
                  bg={recBg}
                >
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Badge colorScheme={
                        rec.severity === 'high' ? 'red' :
                        rec.severity === 'medium' ? 'orange' :
                        'gray'
                      }>
                        {rec.severity}
                      </Badge>
                      <Text fontWeight="600">{rec.model}</Text>
                    </HStack>
                    <Badge colorScheme="green" fontSize="md">
                      Save {formatPercent(rec.projected_savings_pct)}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color={mutedColor} mb={2}>
                    Current: Depth {rec.current_settings?.research_depth} → 
                    Recommended: Depth {rec.recommended_settings?.research_depth}
                  </Text>
                  <HStack justify="space-between" fontSize="sm">
                    <Text>
                      {formatCurrency(rec.current_avg_cost)} → {formatCurrency(rec.projected_avg_cost)}
                    </Text>
                    <Text color={mutedColor}>
                      Quality impact: <Badge>{rec.projected_quality_impact}</Badge>
                    </Text>
                    <Text color={mutedColor}>
                      Confidence: {formatPercent(rec.confidence_score * 100)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Detailed Analytics Tabs */}
      <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
        <CardBody p={0}>
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList px={4} pt={4}>
              <Tab>
                <Icon as={FiLayers} mr={2} />
                Research Depth
              </Tab>
              <Tab>
                <Icon as={FiPieChart} mr={2} />
                Provider Comparison
              </Tab>
              <Tab>
                <Icon as={FiBarChart2} mr={2} />
                Cost Drivers
              </Tab>
            </TabList>

            <TabPanels>
              {/* Research Depth Analysis */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text color={mutedColor} fontSize="sm">
                    Compare token usage, costs, and quality across research depth levels (1-5)
                  </Text>
                  
                  {depthPerformance.length > 0 ? (
                    <Box overflowX="auto">
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Depth</Th>
                            <Th isNumeric>Sessions</Th>
                            <Th isNumeric>Avg Tokens</Th>
                            <Th isNumeric>Avg Cost</Th>
                            <Th isNumeric>Avg Words</Th>
                            <Th isNumeric>Avg Citations</Th>
                            <Th isNumeric>Cost/Citation</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {depthPerformance.map((depth) => (
                            <Tr key={depth.research_depth}>
                              <Td>
                                <Badge colorScheme={
                                  depth.research_depth >= 4 ? 'red' :
                                  depth.research_depth >= 3 ? 'orange' :
                                  'green'
                                }>
                                  Depth {depth.research_depth}
                                </Badge>
                              </Td>
                              <Td isNumeric>{depth.sessions}</Td>
                              <Td isNumeric>{formatNumber(depth.avg_tokens)}</Td>
                              <Td isNumeric fontWeight="600">{formatCurrency(depth.avg_cost)}</Td>
                              <Td isNumeric>{formatNumber(depth.avg_output_words)}</Td>
                              <Td isNumeric>{formatDecimal(depth.avg_citations, 1)}</Td>
                              <Td isNumeric>
                                {formatCurrency(depth.avg_cost / (depth.avg_citations || 1))}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Alert status="info">
                      <AlertIcon />
                      No depth performance data yet. Try different research depth settings!
                    </Alert>
                  )}
                </VStack>
              </TabPanel>

              {/* Provider Comparison */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text color={mutedColor} fontSize="sm">
                    Compare performance and ROI across different AI providers
                  </Text>
                  
                  {providerComparison.length > 0 ? (
                    <Box overflowX="auto">
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Provider</Th>
                            <Th isNumeric>Sessions</Th>
                            <Th isNumeric>Success Rate</Th>
                            <Th isNumeric>Avg Cost</Th>
                            <Th isNumeric>Avg Duration</Th>
                            <Th isNumeric>Words/$</Th>
                            <Th isNumeric>Citations/$</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {providerComparison.map((provider) => (
                            <Tr key={provider.provider}>
                              <Td fontWeight="600">{provider.provider}</Td>
                              <Td isNumeric>{provider.total_sessions}</Td>
                              <Td isNumeric>
                                <Badge colorScheme={
                                  provider.success_rate_pct >= 95 ? 'green' :
                                  provider.success_rate_pct >= 80 ? 'yellow' :
                                  'red'
                                }>
                                  {formatPercent(provider.success_rate_pct)}
                                </Badge>
                              </Td>
                              <Td isNumeric>{formatCurrency(provider.avg_cost_per_session)}</Td>
                              <Td isNumeric>{formatDecimal(provider.avg_duration_seconds, 0)}s</Td>
                              <Td isNumeric fontWeight="600" color={successColor}>
                                {formatDecimal(provider.words_per_dollar, 0)}
                              </Td>
                              <Td isNumeric fontWeight="600" color={successColor}>
                                {formatDecimal(provider.citations_per_dollar, 1)}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Alert status="info">
                      <AlertIcon />
                      Provider comparison will show when you have multiple providers!
                    </Alert>
                  )}
                </VStack>
              </TabPanel>

              {/* Cost Drivers */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text color={mutedColor} fontSize="sm">
                    Top 10 most expensive parameter combinations
                  </Text>
                  
                  {costDrivers.length > 0 ? (
                    <Box overflowX="auto">
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Model</Th>
                            <Th>Depth</Th>
                            <Th>Effort</Th>
                            <Th isNumeric>Sessions</Th>
                            <Th isNumeric>Total Cost</Th>
                            <Th isNumeric>Avg Cost</Th>
                            <Th isNumeric>Avg Tokens</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {costDrivers.map((driver, idx) => (
                            <Tr key={idx}>
                              <Td fontSize="xs">{driver.model}</Td>
                              <Td>{driver.research_depth || '-'}</Td>
                              <Td>
                                {driver.reasoning_effort ? (
                                  <Badge size="sm">{driver.reasoning_effort}</Badge>
                                ) : '-'}
                              </Td>
                              <Td isNumeric>{driver.sessions}</Td>
                              <Td isNumeric fontWeight="600" color={errorColor}>
                                {formatCurrency(driver.total_cost)}
                              </Td>
                              <Td isNumeric>{formatCurrency(driver.avg_cost)}</Td>
                              <Td isNumeric>{formatNumber(driver.avg_tokens)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Alert status="info">
                      <AlertIcon />
                      No cost data yet. Submit some research queries!
                    </Alert>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>

      {/* Additional Metrics */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="600" fontSize="sm">Quality Metrics</Text>
              <Divider />
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Avg Citations</Text>
                <Text fontWeight="600">{formatDecimal(summary.avg_citations, 1)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Avg Output Words</Text>
                <Text fontWeight="600">{formatNumber(summary.avg_output_words)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>With Data Tables</Text>
                <Text fontWeight="600">{formatPercent(summary.pct_with_tables)}</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="600" fontSize="sm">Performance Metrics</Text>
              <Divider />
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Avg Duration</Text>
                <Text fontWeight="600">{formatDecimal(summary.avg_duration_seconds, 0)}s</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Median Duration</Text>
                <Text fontWeight="600">{formatDecimal(summary.median_duration_seconds, 0)}s</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>P95 Duration</Text>
                <Text fontWeight="600">{formatDecimal(summary.p95_duration_seconds, 0)}s</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Text fontWeight="600" fontSize="sm">Cost Efficiency</Text>
              <Divider />
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Cost/1K Tokens</Text>
                <Text fontWeight="600">{formatCurrency(summary.avg_cost_per_1k_output_tokens)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Peak TPM</Text>
                <Text fontWeight="600">{formatNumber(summary.peak_tpm)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={mutedColor}>Prediction Error</Text>
                {(() => {
                  const errorPct = Math.abs(parseFloat(summary.avg_cost_prediction_error_pct as any) || 0);
                  return (
                    <Badge colorScheme={
                      errorPct <= 10 ? 'green' :
                      errorPct <= 25 ? 'yellow' :
                      'red'
                    }>
                      ±{errorPct.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
    </VStack>
  );
}
