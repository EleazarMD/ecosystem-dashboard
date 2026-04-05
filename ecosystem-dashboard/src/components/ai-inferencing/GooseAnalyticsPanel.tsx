/**
 * Goose AI Analytics Panel
 * Performance metrics for Goose AI as it relates to AI Inferencing
 * 
 * Focuses on:
 * - Caching performance
 * - Model switching optimization
 * - Cost savings from Goose features
 * - Context management efficiency
 * - Tool validation quality
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  VStack,
  HStack,
  Badge,
  Divider,
  Button,
  Icon,
  
  Spinner,
  Flex,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiZap,
  FiDollarSign,
  FiCpu,
  FiActivity,
} from 'react-icons/fi';

interface GooseMetrics {
  cache: {
    size: number;
    hits: number;
    misses: number;
    hit_rate: number;
    total_requests: number;
  };
  costs: {
    total_cost: number;
    total_tokens: number;
    total_requests: number;
    total_sessions: number;
    model_breakdown: Array<any>;
  };
  modelSwitching: {
    total_switches: number;
    simple_percentage: number;
    medium_percentage: number;
    complex_percentage: number;
    reasoning_percentage: number;
    cost_saved: number;
  };
  context: {
    total_managed: number;
    messages_pruned: number;
    tokens_saved: number;
    summarizations: number;
    avg_tokens_saved: number;
    avg_messages_pruned: number;
  };
  validation: {
    total_validations: number;
    valid_results: number;
    invalid_results: number;
    warnings: number;
    retries_suggested: number;
    valid_percentage: number;
    invalid_percentage: number;
    retry_rate: number;
  };
}

export function GooseAnalyticsPanel() {
  console.log('[GooseAnalyticsPanel] Component mounted');

  const [metrics, setMetrics] = useState<GooseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');

  const fetchMetrics = async () => {
    console.log('[GooseAnalyticsPanel] Fetching metrics...');
    try {
      setLoading(true);

      const [cacheRes, costsRes, modelRes, contextRes, validationRes] = await Promise.all([
        fetch('http://localhost:9001/api/cache/stats'),
        fetch('http://localhost:9001/api/cost/stats'), // Fixed: singular 'cost' not 'costs'
        fetch('http://localhost:9001/api/model/stats'),
        fetch('http://localhost:9001/api/context/stats'),
        fetch('http://localhost:9001/api/validate/stats'),
      ]);

      console.log('[GooseAnalyticsPanel] Response statuses:', {
        cache: cacheRes.status,
        costs: costsRes.status,
        model: modelRes.status,
        context: contextRes.status,
        validation: validationRes.status
      });

      const cache = cacheRes.ok ? await cacheRes.json() : null;
      const costs = costsRes.ok ? await costsRes.json() : null;
      const modelSwitching = modelRes.ok ? await modelRes.json() : null;
      const context = contextRes.ok ? await contextRes.json() : null;
      const validation = validationRes.ok ? await validationRes.json() : null;

      const newMetrics = {
        cache: cache || { size: 0, hits: 0, misses: 0, hit_rate: 0, total_requests: 0 },
        costs: costs || { total_cost: 0, total_tokens: 0, total_requests: 0, total_sessions: 0, model_breakdown: [] },
        modelSwitching: modelSwitching || { total_switches: 0, simple_percentage: 0, medium_percentage: 0, complex_percentage: 0, reasoning_percentage: 0, cost_saved: 0 },
        context: context || { total_managed: 0, messages_pruned: 0, tokens_saved: 0, summarizations: 0, avg_tokens_saved: 0, avg_messages_pruned: 0 },
        validation: validation || { total_validations: 0, valid_results: 0, invalid_results: 0, warnings: 0, retries_suggested: 0, valid_percentage: 0, invalid_percentage: 0, retry_rate: 0 },
      };

      console.log('[GooseAnalyticsPanel] Metrics set:', newMetrics);
      setMetrics(newMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('[GooseAnalyticsPanel] Error fetching metrics:', error);
      // Set default metrics even on error
      setMetrics({
        cache: { size: 0, hits: 0, misses: 0, hit_rate: 0, total_requests: 0 },
        costs: { total_cost: 0, total_tokens: 0, total_requests: 0, total_sessions: 0, model_breakdown: [] },
        modelSwitching: { total_switches: 0, simple_percentage: 0, medium_percentage: 0, complex_percentage: 0, reasoning_percentage: 0, cost_saved: 0 },
        context: { total_managed: 0, messages_pruned: 0, tokens_saved: 0, summarizations: 0, avg_tokens_saved: 0, avg_messages_pruned: 0 },
        validation: { total_validations: 0, valid_results: 0, invalid_results: 0, warnings: 0, retries_suggested: 0, valid_percentage: 0, invalid_percentage: 0, retry_rate: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" color={useSemanticToken('interactive.primary')} />
        <Text mt={4} color={useSemanticToken('text.secondary')}>Loading Goose AI Analytics...</Text>
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box p={8} textAlign="center">
        <Text color={useSemanticToken('text.secondary')}>No metrics available</Text>
      </Box>
    );
  }

  // Calculate total savings (cache doesn't provide cost_saved in API)
  const totalSavings = metrics.modelSwitching.cost_saved || 0;
  const hasActivity = metrics.cache.total_requests > 0 || metrics.modelSwitching.total_switches > 0 || metrics.validation.total_validations > 0;

  console.log('[GooseAnalyticsPanel] Rendering with metrics:', { totalSavings, hasActivity, metrics });

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={1}>Goose AI Performance Analytics</Heading>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Optimization metrics for Goose AI features integrated with AI Inferencing
          </Text>
          {!hasActivity && (
            <Badge colorScheme="yellow" mt={2}>
              No activity yet - Metrics will appear once Goose AI features are used
            </Badge>
          )}
        </Box>
        <VStack align="end" spacing={1}>
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            onClick={fetchMetrics}
            isLoading={loading}
            variant="outline"
          >
            Refresh
          </Button>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        </VStack>
      </Flex>

      {/* Top KPI Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        {/* Total Cost Savings */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <HStack justify="space-between" mb={2}>
                <Icon as={FiDollarSign} boxSize={6} color={useSemanticToken('status.success')} />
                <Badge colorScheme="green" fontSize="xs">SAVINGS</Badge>
              </HStack>
              <StatNumber fontSize="2xl" color={useSemanticToken('status.success')}>
                ${totalSavings.toFixed(4)}
              </StatNumber>
              <StatLabel fontSize="sm">Total Cost Saved</StatLabel>
              <StatHelpText>
                <StatArrow type="decrease" />
                Through optimization
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Cache Hit Rate */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <HStack justify="space-between" mb={2}>
                <Icon as={FiZap} boxSize={6} color={useSemanticToken('icon.primary')} />
                <Badge colorScheme="blue" fontSize="xs">CACHING</Badge>
              </HStack>
              <StatNumber fontSize="2xl" color={useSemanticToken('interactive.primary')}>
                {metrics.cache.hit_rate.toFixed(1)}%
              </StatNumber>
              <StatLabel fontSize="sm">Cache Hit Rate</StatLabel>
              <StatHelpText>
                {metrics.cache.hits} / {metrics.cache.total_requests} requests
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Model Optimization */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <HStack justify="space-between" mb={2}>
                <Icon as={FiCpu} boxSize={6} color={useSemanticToken('interactive.secondary')} />
                <Badge colorScheme="purple" fontSize="xs">SWITCHING</Badge>
              </HStack>
              <StatNumber fontSize="2xl" color={useSemanticToken('interactive.secondary')}>
                {metrics.modelSwitching.simple_percentage.toFixed(0)}%
              </StatNumber>
              <StatLabel fontSize="sm">Simple Tasks</StatLabel>
              <StatHelpText>
                Using cost-effective models
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Quality Score */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <HStack justify="space-between" mb={2}>
                <Icon as={FiCheckCircle} boxSize={6} color={useSemanticToken('icon.primary')} />
                <Badge colorScheme="teal" fontSize="xs">QUALITY</Badge>
              </HStack>
              <StatNumber fontSize="2xl" color={useSemanticToken('icon.primary')}>
                {metrics.validation.valid_percentage.toFixed(1)}%
              </StatNumber>
              <StatLabel fontSize="sm">Validation Rate</StatLabel>
              <StatHelpText>
                {metrics.validation.total_validations} validations
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Divider mb={6} />

      {/* Detailed Metrics */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Caching Performance */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Tool Result Caching</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={1}>
              Reduces API calls by caching tool results
            </Text>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">Hit Rate Target: 40-60%</Text>
                  <Badge colorScheme={metrics.cache.hit_rate >= 40 ? "green" : "yellow"}>
                    {metrics.cache.hit_rate >= 40 ? "Optimal" : "Building"}
                  </Badge>
                </Flex>
                <Progress
                  value={metrics.cache.hit_rate}
                  colorScheme={metrics.cache.hit_rate >= 40 ? "green" : "blue"}
                  size="lg"
                  borderRadius="full"
                />
              </Box>

              <SimpleGrid columns={3} spacing={4}>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Total Requests</Text>
                  <Text fontSize="lg" fontWeight="bold">{metrics.cache.total_requests}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Cache Hits</Text>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('status.success')}>
                    {metrics.cache.hits}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Cache Misses</Text>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('status.warning')}>
                    {metrics.cache.misses}
                  </Text>
                </Box>
              </SimpleGrid>

              {metrics.cache.hit_rate >= 40 && (
                <Box p={3} bg={useSemanticToken('status.successSubtle')} borderRadius="md" borderLeft="3px solid" borderColor={useSemanticToken('status.success')}>
                  <HStack>
                    <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} />
                    <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                      Caching is working optimally! Achieving {metrics.cache.hit_rate.toFixed(1)}% hit rate.
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Model Switching */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Dynamic Model Switching</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={1}>
              Auto-selects optimal model based on task complexity
            </Text>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={3}>Task Distribution</Text>
                <Box mb={3}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="xs">Simple Tasks (cheap models)</Text>
                    <Text fontSize="xs" fontWeight="bold">
                      {metrics.modelSwitching.simple_percentage.toFixed(0)}%
                    </Text>
                  </Flex>
                  <Progress
                    value={metrics.modelSwitching.simple_percentage}
                    colorScheme="green"
                    size="sm"
                    borderRadius="full"
                  />
                </Box>
                <Box>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="xs">Complex Tasks (premium models)</Text>
                    <Text fontSize="xs" fontWeight="bold">
                      {(100 - metrics.modelSwitching.simple_percentage).toFixed(0)}%
                    </Text>
                  </Flex>
                  <Progress
                    value={100 - metrics.modelSwitching.simple_percentage}
                    colorScheme="purple"
                    size="sm"
                    borderRadius="full"
                  />
                </Box>
              </Box>

              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Total Switches</Text>
                  <Text fontSize="lg" fontWeight="bold">{metrics.modelSwitching.total_switches}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Cost Saved</Text>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('status.success')}>
                    ${metrics.modelSwitching.cost_saved.toFixed(4)}
                  </Text>
                </Box>
              </SimpleGrid>

              {metrics.modelSwitching.simple_percentage > 50 && (
                <Box p={3} bg={useSemanticToken('status.successSubtle')} borderRadius="md" borderLeft="3px solid" borderColor={useSemanticToken('status.success')}>
                  <HStack>
                    <Icon as={FiTrendingDown} color={useSemanticToken('status.success')} />
                    <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                      Great! {metrics.modelSwitching.simple_percentage.toFixed(0)}% of tasks use cost-effective models.
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Context Management */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Context Management</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={1}>
              Optimizes conversation history for efficiency
            </Text>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <SimpleGrid columns={3} spacing={4}>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Managed</Text>
                  <Text fontSize="lg" fontWeight="bold">{metrics.context.total_managed}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Tokens Saved</Text>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('status.warning')}>
                    {(metrics.context.tokens_saved / 1000).toFixed(1)}K
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Avg Saved</Text>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('status.warning')}>
                    {metrics.context.avg_tokens_saved.toFixed(0)}
                  </Text>
                </Box>
              </SimpleGrid>

              {metrics.context.total_managed > 0 && (
                <Box p={4} bg={useSemanticToken('status.warningSubtle')} borderRadius="md" textAlign="center">
                  <Icon as={FiTrendingDown} boxSize={6} color={useSemanticToken('status.warning')} mb={2} />
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('status.warning')}>
                    {((metrics.context.tokens_saved / (metrics.context.total_managed * 8000)) * 100).toFixed(0)}% reduction
                  </Text>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Average token reduction per conversation
                  </Text>
                </Box>
              )}

              {metrics.context.total_managed === 0 && (
                <Box p={3} bg={useSemanticToken('surface.base')} borderRadius="md" textAlign="center">
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    No conversations managed yet. Enable context management in Performance Settings.
                  </Text>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Tool Validation */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Tool Result Validation</Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={1}>
              Ensures quality of tool execution results
            </Text>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">Quality Target: &gt;90%</Text>
                  <Badge colorScheme={metrics.validation.valid_percentage >= 90 ? "green" : "yellow"}>
                    {metrics.validation.valid_percentage >= 90 ? "Excellent" : "Good"}
                  </Badge>
                </Flex>
                <Progress
                  value={metrics.validation.valid_percentage}
                  colorScheme={metrics.validation.valid_percentage >= 90 ? "green" : "yellow"}
                  size="lg"
                  borderRadius="full"
                />
              </Box>

              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Total Validations</Text>
                  <Text fontSize="lg" fontWeight="bold">{metrics.validation.total_validations}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Valid Rate</Text>
                  <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('icon.primary')}>
                    {metrics.validation.valid_percentage.toFixed(1)}%
                  </Text>
                </Box>
              </SimpleGrid>

              {metrics.validation.total_validations > 0 && (
                <Box p={3} bg={useSemanticToken('status.successSubtle')} borderRadius="md" borderLeft="3px solid" borderColor={useSemanticToken('status.success')}>
                  <HStack>
                    <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} />
                    <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                      Tool results are being validated. Quality rate: {metrics.validation.valid_percentage.toFixed(1)}%
                    </Text>
                  </HStack>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Integration Summary */}
      <Card bg={cardBg} borderColor={borderColor} mt={6}>
        <CardHeader>
          <Heading size="md">AI Inferencing Integration Summary</Heading>
        </CardHeader>
        <CardBody>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={4}>
            Goose AI performance features work seamlessly with AI Inferencing to optimize costs and quality:
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <HStack>
              <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} boxSize={5} />
              <Box>
                <Text fontSize="sm" fontWeight="semibold">Tool Caching Active</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Reduces API calls by {metrics.cache.hit_rate.toFixed(0)}%
                </Text>
              </Box>
            </HStack>

            <HStack>
              <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} boxSize={5} />
              <Box>
                <Text fontSize="sm" fontWeight="semibold">Model Switching Enabled</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {metrics.modelSwitching.total_switches} optimized model selections
                </Text>
              </Box>
            </HStack>

            <HStack>
              <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} boxSize={5} />
              <Box>
                <Text fontSize="sm" fontWeight="semibold">Cost Tracking</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  ${metrics.costs.total_cost.toFixed(4)} total spent, ${totalSavings.toFixed(4)} saved
                </Text>
              </Box>
            </HStack>

            <HStack>
              <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} boxSize={5} />
              <Box>
                <Text fontSize="sm" fontWeight="semibold">Quality Assurance</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {metrics.validation.valid_percentage.toFixed(0)}% tool results validated
                </Text>
              </Box>
            </HStack>
          </SimpleGrid>
        </CardBody>
      </Card>
    </Box>
  );
}
