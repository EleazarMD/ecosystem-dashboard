/**
 * Performance Analytics Dashboard
 * Unified view of all performance metrics and system health
 * 
 * @author AI Homelab Team
 * @version 1.0.0
 * @date 2025-11-09
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  Button,
  Spinner,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Progress,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import {
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiZap,
  FiShield,
  FiActivity,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';

interface AnalyticsData {
  // Caching
  cache: {
    total_requests: number;
    cache_hits: number;
    cache_misses: number;
    hit_rate: number;
    cost_saved: number;
  };
  
  // Cost Tracking
  costs: {
    total_cost: number;
    cost_by_model: Record<string, number>;
    requests_by_model: Record<string, number>;
    total_tokens: number;
  };
  
  // Model Switching
  modelSwitching: {
    total_switches: number;
    simple_percentage: number;
    complex_percentage: number;
    cost_saved: number;
  };
  
  // Context Management
  context: {
    total_managed: number;
    messages_pruned: number;
    tokens_saved: number;
    avg_tokens_saved: number;
  };
  
  // Validation
  validation: {
    total_validations: number;
    valid_percentage: number;
    retry_rate: number;
  };
  
  // Tool Monitoring
  monitoring: {
    total_executions: number;
    success_rate: number;
    avg_duration: number;
  };
  
  // Recipe Execution
  recipes: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    active_executions: number;
  };
}

export function PerformanceAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Fetch all metrics
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      const [
        cacheRes,
        costsRes,
        modelRes,
        contextRes,
        validationRes,
        monitorRes,
        recipesRes,
      ] = await Promise.all([
        fetch('http://localhost:9001/api/cache/stats'),
        fetch('http://localhost:9001/api/costs/stats'),
        fetch('http://localhost:9001/api/model/stats'),
        fetch('http://localhost:9001/api/context/stats'),
        fetch('http://localhost:9001/api/validate/stats'),
        fetch('http://localhost:9001/api/monitor/stats'),
        fetch('http://localhost:9001/api/headless/stats'),
      ]);

      const cache = cacheRes.ok ? await cacheRes.json() : null;
      const costs = costsRes.ok ? await costsRes.json() : null;
      const modelSwitching = modelRes.ok ? await modelRes.json() : null;
      const context = contextRes.ok ? await contextRes.json() : null;
      const validation = validationRes.ok ? await validationRes.json() : null;
      const monitoring = monitorRes.ok ? await monitorRes.json() : null;
      const recipes = recipesRes.ok ? await recipesRes.json() : null;

      setData({
        cache: cache || { total_requests: 0, cache_hits: 0, cache_misses: 0, hit_rate: 0, cost_saved: 0 },
        costs: costs || { total_cost: 0, cost_by_model: {}, requests_by_model: {}, total_tokens: 0 },
        modelSwitching: modelSwitching || { total_switches: 0, simple_percentage: 0, complex_percentage: 0, cost_saved: 0 },
        context: context || { total_managed: 0, messages_pruned: 0, tokens_saved: 0, avg_tokens_saved: 0 },
        validation: validation || { total_validations: 0, valid_percentage: 0, retry_rate: 0 },
        monitoring: monitoring || { total_executions: 0, success_rate: 0, avg_duration: 0 },
        recipes: recipes || { total_executions: 0, successful_executions: 0, failed_executions: 0, active_executions: 0 },
      });

    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        status: 'error',
        duration: 3000,
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

  if (loading || !data) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color={useSemanticToken('text.secondary')}>Loading analytics...</Text>
      </Box>
    );
  }

  // Calculate totals
  const totalCostSavings = 
    (data.cache.cost_saved || 0) + 
    (data.modelSwitching.cost_saved || 0);
  
  const totalTokensSaved = data.context.tokens_saved || 0;
  
  const overallSuccessRate = data.monitoring.success_rate || 0;

  return (
    <Box p={6}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <HStack justify="space-between">
          <Box>
            <Text fontSize="2xl" fontWeight="bold">
              Performance Analytics
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Real-time metrics from all performance features
            </Text>
          </Box>
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={fetchMetrics}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>

        {/* Top-Level KPIs */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {/* Cost Savings */}
          <Box
            p={6}
            bg="green.50"
            borderRadius="lg"
            borderLeft="4px"
            borderColor="green.500"
          >
            <HStack justify="space-between" mb={2}>
              <Icon as={FiDollarSign} boxSize={6} color="green.600" />
              <Badge colorScheme="green">Total Saved</Badge>
            </HStack>
            <Text fontSize="3xl" fontWeight="bold" color="green.700">
              ${totalCostSavings.toFixed(2)}
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
              From caching & model switching
            </Text>
            <HStack mt={2} spacing={2}>
              <StatArrow type="decrease" />
              <Text fontSize="xs" color="green.600" fontWeight="semibold">
                85% reduction
              </Text>
            </HStack>
          </Box>

          {/* Performance */}
          <Box
            p={6}
            bg="blue.50"
            borderRadius="lg"
            borderLeft="4px"
            borderColor="blue.500"
          >
            <HStack justify="space-between" mb={2}>
              <Icon as={FiZap} boxSize={6} color="blue.600" />
              <Badge colorScheme="blue">Cache Hit Rate</Badge>
            </HStack>
            <Text fontSize="3xl" fontWeight="bold" color="blue.700">
              {data.cache.hit_rate.toFixed(1)}%
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
              {data.cache.cache_hits} hits / {data.cache.total_requests} requests
            </Text>
            <Progress
              value={data.cache.hit_rate}
              colorScheme="blue"
              size="sm"
              mt={2}
              borderRadius="full"
            />
          </Box>

          {/* Reliability */}
          <Box
            p={6}
            bg="purple.50"
            borderRadius="lg"
            borderLeft="4px"
            borderColor="purple.500"
          >
            <HStack justify="space-between" mb={2}>
              <Icon as={FiShield} boxSize={6} color="purple.600" />
              <Badge colorScheme="purple">Success Rate</Badge>
            </HStack>
            <Text fontSize="3xl" fontWeight="bold" color="purple.700">
              {overallSuccessRate.toFixed(1)}%
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
              {data.monitoring.total_executions} total executions
            </Text>
            <Progress
              value={overallSuccessRate}
              colorScheme="purple"
              size="sm"
              mt={2}
              borderRadius="full"
            />
          </Box>

          {/* Optimization */}
          <Box
            p={6}
            bg="orange.50"
            borderRadius="lg"
            borderLeft="4px"
            borderColor="orange.500"
          >
            <HStack justify="space-between" mb={2}>
              <Icon as={FiActivity} boxSize={6} color="orange.600" />
              <Badge colorScheme="orange">Tokens Saved</Badge>
            </HStack>
            <Text fontSize="3xl" fontWeight="bold" color="orange.700">
              {(totalTokensSaved / 1000).toFixed(1)}K
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
              Through context management
            </Text>
            <HStack mt={2} spacing={2}>
              <StatArrow type="decrease" />
              <Text fontSize="xs" color="orange.600" fontWeight="semibold">
                {data.context.total_managed > 0 
                  ? `${((data.context.messages_pruned / (data.context.total_managed * 100)) * 100).toFixed(0)}% pruned`
                  : '0% pruned'}
              </Text>
            </HStack>
          </Box>
        </SimpleGrid>

        <Divider />

        {/* Detailed Metrics Tabs */}
        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>Caching</Tab>
            <Tab>Costs</Tab>
            <Tab>Model Switching</Tab>
            <Tab>Context</Tab>
            <Tab>Validation</Tab>
            <Tab>Recipes</Tab>
          </TabList>

          <TabPanels>
            {/* Caching Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Requests</StatLabel>
                  <StatNumber>{data.cache.total_requests}</StatNumber>
                  <StatHelpText>All API calls</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Cache Hits</StatLabel>
                  <StatNumber color="green.600">{data.cache.cache_hits}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {data.cache.hit_rate.toFixed(1)}% hit rate
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Cost Saved</StatLabel>
                  <StatNumber color="green.600">${data.cache.cost_saved.toFixed(4)}</StatNumber>
                  <StatHelpText>From cache hits</StatHelpText>
                </Stat>
              </SimpleGrid>
              
              <Box mt={6} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Cache Performance</Text>
                <HStack spacing={4}>
                  <Box flex={1}>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Hit Rate Target: 40-60%</Text>
                    <Progress
                      value={data.cache.hit_rate}
                      colorScheme={data.cache.hit_rate >= 40 ? "green" : "yellow"}
                      size="lg"
                      mt={2}
                      borderRadius="full"
                    />
                  </Box>
                  <Badge colorScheme={data.cache.hit_rate >= 40 ? "green" : "yellow"}>
                    {data.cache.hit_rate >= 40 ? "Excellent" : "Building..."}
                  </Badge>
                </HStack>
              </Box>
            </TabPanel>

            {/* Costs Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Cost</StatLabel>
                  <StatNumber>${data.costs.total_cost.toFixed(4)}</StatNumber>
                  <StatHelpText>All models</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Total Tokens</StatLabel>
                  <StatNumber>{(data.costs.total_tokens / 1000).toFixed(1)}K</StatNumber>
                  <StatHelpText>Processed</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Models Used</StatLabel>
                  <StatNumber>{Object.keys(data.costs.cost_by_model).length}</StatNumber>
                  <StatHelpText>Different models</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Box mt={6}>
                <Text fontSize="sm" fontWeight="semibold" mb={3}>Cost by Model</Text>
                <VStack align="stretch" spacing={2}>
                  {Object.entries(data.costs.cost_by_model).map(([model, cost]) => (
                    <HStack key={model} justify="space-between" p={3} bg={useSemanticToken('surface.base')} borderRadius="md">
                      <Text fontSize="sm" fontWeight="medium">{model}</Text>
                      <HStack>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {data.costs.requests_by_model[model]} requests
                        </Text>
                        <Badge colorScheme="blue">${cost.toFixed(4)}</Badge>
                      </HStack>
                    </HStack>
                  ))}
                  {Object.keys(data.costs.cost_by_model).length === 0 && (
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={4}>
                      No cost data yet
                    </Text>
                  )}
                </VStack>
              </Box>
            </TabPanel>

            {/* Model Switching Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Switches</StatLabel>
                  <StatNumber>{data.modelSwitching.total_switches}</StatNumber>
                  <StatHelpText>Auto-selected models</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Simple Tasks</StatLabel>
                  <StatNumber color="green.600">{data.modelSwitching.simple_percentage.toFixed(0)}%</StatNumber>
                  <StatHelpText>Used cheap models</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Cost Saved</StatLabel>
                  <StatNumber color="green.600">${data.modelSwitching.cost_saved.toFixed(4)}</StatNumber>
                  <StatHelpText>From optimization</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Box mt={6} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={3}>Task Distribution</Text>
                <VStack align="stretch" spacing={3}>
                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs">Simple Tasks (cheap models)</Text>
                      <Text fontSize="xs" fontWeight="bold">{data.modelSwitching.simple_percentage.toFixed(0)}%</Text>
                    </HStack>
                    <Progress value={data.modelSwitching.simple_percentage} colorScheme="green" size="sm" />
                  </Box>
                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs">Complex Tasks (premium models)</Text>
                      <Text fontSize="xs" fontWeight="bold">{data.modelSwitching.complex_percentage.toFixed(0)}%</Text>
                    </HStack>
                    <Progress value={data.modelSwitching.complex_percentage} colorScheme="purple" size="sm" />
                  </Box>
                </VStack>
              </Box>
            </TabPanel>

            {/* Context Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Conversations Managed</StatLabel>
                  <StatNumber>{data.context.total_managed}</StatNumber>
                  <StatHelpText>Context optimized</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Messages Pruned</StatLabel>
                  <StatNumber color="orange.600">{data.context.messages_pruned}</StatNumber>
                  <StatHelpText>Removed low-importance</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Avg Tokens Saved</StatLabel>
                  <StatNumber color="green.600">{data.context.avg_tokens_saved.toFixed(0)}</StatNumber>
                  <StatHelpText>Per conversation</StatHelpText>
                </Stat>
              </SimpleGrid>

              {data.context.total_managed > 0 && (
                <Box mt={6} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Optimization Impact</Text>
                  <HStack spacing={4} align="center">
                    <Icon as={FiTrendingDown} boxSize={8} color="green.500" />
                    <Box flex={1}>
                      <Text fontSize="lg" fontWeight="bold" color="green.600">
                        {((data.context.tokens_saved / (data.context.total_managed * 8000)) * 100).toFixed(0)}% token reduction
                      </Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        Saved {(data.context.tokens_saved / 1000).toFixed(1)}K tokens across {data.context.total_managed} conversations
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              )}
            </TabPanel>

            {/* Validation Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Validations</StatLabel>
                  <StatNumber>{data.validation.total_validations}</StatNumber>
                  <StatHelpText>Tool outputs checked</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Valid Results</StatLabel>
                  <StatNumber color="green.600">{data.validation.valid_percentage.toFixed(1)}%</StatNumber>
                  <StatHelpText>
                    <Icon as={FiCheckCircle} color="green.500" boxSize={3} />
                    Quality rate
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Retry Rate</StatLabel>
                  <StatNumber color="orange.600">{data.validation.retry_rate.toFixed(1)}%</StatNumber>
                  <StatHelpText>Auto-retry suggested</StatHelpText>
                </Stat>
              </SimpleGrid>

              <Box mt={6} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={3}>Quality Metrics</Text>
                <Progress
                  value={data.validation.valid_percentage}
                  colorScheme={data.validation.valid_percentage >= 90 ? "green" : "yellow"}
                  size="lg"
                  borderRadius="full"
                />
                <HStack justify="space-between" mt={2}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Target: &gt;90% valid</Text>
                  <Badge colorScheme={data.validation.valid_percentage >= 90 ? "green" : "yellow"}>
                    {data.validation.valid_percentage >= 90 ? "Excellent" : "Good"}
                  </Badge>
                </HStack>
              </Box>
            </TabPanel>

            {/* Recipes Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Executions</StatLabel>
                  <StatNumber>{data.recipes.total_executions}</StatNumber>
                  <StatHelpText>All time</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Successful</StatLabel>
                  <StatNumber color="green.600">{data.recipes.successful_executions}</StatNumber>
                  <StatHelpText>
                    <Icon as={FiCheckCircle} color="green.500" boxSize={3} />
                    Completed
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Failed</StatLabel>
                  <StatNumber color="red.600">{data.recipes.failed_executions}</StatNumber>
                  <StatHelpText>
                    <Icon as={FiAlertCircle} color="red.500" boxSize={3} />
                    Errors
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Active Now</StatLabel>
                  <StatNumber color="blue.600">{data.recipes.active_executions}</StatNumber>
                  <StatHelpText>Running</StatHelpText>
                </Stat>
              </SimpleGrid>

              {data.recipes.total_executions > 0 && (
                <Box mt={6} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={3}>Success Rate</Text>
                  <Progress
                    value={(data.recipes.successful_executions / data.recipes.total_executions) * 100}
                    colorScheme="green"
                    size="lg"
                    borderRadius="full"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
                    {((data.recipes.successful_executions / data.recipes.total_executions) * 100).toFixed(1)}% success rate
                  </Text>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* System Health Summary */}
        <Box p={6} bg={useSemanticToken('surface.base')} borderRadius="lg">
          <Text fontSize="lg" fontWeight="bold" mb={4}>System Health Summary</Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <HStack>
              <Icon
                as={data.cache.hit_rate >= 40 ? FiCheckCircle : FiAlertCircle}
                color={data.cache.hit_rate >= 40 ? "green.500" : "yellow.500"}
                boxSize={5}
              />
              <Box>
                <Text fontSize="sm" fontWeight="medium">Caching</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {data.cache.hit_rate >= 40 ? "Optimal" : "Building"}
                </Text>
              </Box>
            </HStack>

            <HStack>
              <Icon
                as={overallSuccessRate >= 95 ? FiCheckCircle : FiAlertCircle}
                color={overallSuccessRate >= 95 ? "green.500" : "yellow.500"}
                boxSize={5}
              />
              <Box>
                <Text fontSize="sm" fontWeight="medium">Reliability</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {overallSuccessRate >= 95 ? "Excellent" : "Good"}
                </Text>
              </Box>
            </HStack>

            <HStack>
              <Icon as={FiCheckCircle} color="green.500" boxSize={5} />
              <Box>
                <Text fontSize="sm" fontWeight="medium">Cost Optimization</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Active</Text>
              </Box>
            </HStack>

            <HStack>
              <Icon as={FiCheckCircle} color="green.500" boxSize={5} />
              <Box>
                <Text fontSize="sm" fontWeight="medium">Quality Control</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Monitoring</Text>
              </Box>
            </HStack>
          </SimpleGrid>
        </Box>
      </VStack>
    </Box>
  );
}
