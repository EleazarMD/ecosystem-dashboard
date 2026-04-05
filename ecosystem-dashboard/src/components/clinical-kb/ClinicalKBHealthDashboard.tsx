import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Progress,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Flex,
  Spinner,
  Divider,
  Icon,
  Button,
  useToast,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BeakerIcon,
  BoltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface KBHealthReport {
  report_id: string;
  timestamp: string;
  metrics: {
    total_pathways: number;
    target_pathways: number;
    coverage_percentage: number;
    gap: number;
    by_specialty: Record<string, number>;
    by_priority: Record<string, { target: number; completed: number; percentage: number }>;
  };
  quality: {
    avg_depth_score: number;
    max_depth_score: number;
    pathways_below_threshold: string[];
    missing_components: Record<string, string[]>;
    enrichment_needed: number;
  };
  performance: {
    queries_24h: number;
    hit_rate: number;
    avg_response_time_ms: number;
    cache_efficiency: number;
    errors_24h: number;
    unresolved_errors: number;
  };
  expansion_queue: {
    pending_count: number;
    by_priority: Record<string, number>;
    oldest_item_age: string;
  };
  recommendations: Array<{
    priority: string;
    category: string;
    title: string;
    description: string;
    action: string;
    impact: string;
    conditions?: string[];
  }>;
  health_score: {
    score: number;
    status: string;
    color: string;
    breakdown: {
      coverage: number;
      quality: number;
      performance: number;
      operations: number;
    };
  };
}

const priorityColors: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
};

const statusColors: Record<string, string> = {
  healthy: 'green',
  good: 'blue',
  needs_attention: 'yellow',
  critical: 'red',
};

export default function ClinicalKBHealthDashboard() {
  const [report, setReport] = useState<KBHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const fetchReport = async () => {
    try {
      const response = await fetch('/api/clinical-kb/health-report');
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch KB health report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // Refresh every 5 minutes
    const interval = setInterval(fetchReport, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger OpenClaw to generate new report
    try {
      await fetch('http://100.108.41.22:8021/openclaw/skill/generate_kb_health_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output_format: 'dashboard' }),
      });
      toast({
        title: 'Report refresh triggered',
        description: 'New report will be available shortly',
        status: 'info',
        duration: 3000,
      });
      // Wait a bit then fetch
      setTimeout(fetchReport, 2000);
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Could not trigger report generation',
        status: 'error',
        duration: 3000,
      });
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" color="purple.500" />
      </Flex>
    );
  }

  if (!report) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.500">No KB health report available</Text>
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="bold">
              Clinical Knowledge Base Health
            </Text>
            <Text fontSize="sm" color="gray.500">
              Last updated: {new Date(report.timestamp).toLocaleString()}
            </Text>
          </VStack>
          <Button
            leftIcon={<Icon as={ArrowPathIcon} />}
            onClick={handleRefresh}
            isLoading={refreshing}
            size="sm"
            colorScheme="purple"
            variant="outline"
          >
            Refresh
          </Button>
        </Flex>

        {/* Health Score Card */}
        <Box
          p={6}
          bg={`${statusColors[report.health_score.status]}.50`}
          borderRadius="xl"
          border="2px solid"
          borderColor={`${statusColors[report.health_score.status]}.200`}
        >
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Overall Health Score
              </Text>
              <HStack spacing={3}>
                <Text fontSize="4xl" fontWeight="bold">
                  {report.health_score.score}
                </Text>
                <Text fontSize="xl" color="gray.500">/100</Text>
                <Badge
                  colorScheme={statusColors[report.health_score.status]}
                  fontSize="md"
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {report.health_score.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </HStack>
            </VStack>
            <SimpleGrid columns={4} spacing={4}>
              {Object.entries(report.health_score.breakdown).map(([key, value]) => (
                <VStack key={key} spacing={0}>
                  <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                    {key}
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold">
                    {value}
                  </Text>
                </VStack>
              ))}
            </SimpleGrid>
          </Flex>
        </Box>

        {/* Metrics Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {/* Coverage */}
          <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
            <Stat>
              <StatLabel color="gray.500">
                <HStack>
                  <Icon as={ChartBarIcon} boxSize={4} />
                  <Text>Pathway Coverage</Text>
                </HStack>
              </StatLabel>
              <StatNumber>
                {report.metrics.total_pathways}/{report.metrics.target_pathways}
              </StatNumber>
              <StatHelpText>
                <Progress
                  value={report.metrics.coverage_percentage}
                  colorScheme={report.metrics.coverage_percentage > 50 ? 'green' : 'orange'}
                  size="sm"
                  borderRadius="full"
                  mt={2}
                />
                <Text mt={1}>{report.metrics.coverage_percentage}% complete</Text>
              </StatHelpText>
            </Stat>
          </Box>

          {/* Quality */}
          <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
            <Stat>
              <StatLabel color="gray.500">
                <HStack>
                  <Icon as={BeakerIcon} boxSize={4} />
                  <Text>Quality Score</Text>
                </HStack>
              </StatLabel>
              <StatNumber>
                {report.quality.avg_depth_score}/{report.quality.max_depth_score}
              </StatNumber>
              <StatHelpText>
                <Progress
                  value={(report.quality.avg_depth_score / report.quality.max_depth_score) * 100}
                  colorScheme="purple"
                  size="sm"
                  borderRadius="full"
                  mt={2}
                />
                <Text mt={1}>{report.quality.enrichment_needed} need enrichment</Text>
              </StatHelpText>
            </Stat>
          </Box>

          {/* Performance */}
          <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
            <Stat>
              <StatLabel color="gray.500">
                <HStack>
                  <Icon as={BoltIcon} boxSize={4} />
                  <Text>Hit Rate (24h)</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{(report.performance.hit_rate * 100).toFixed(0)}%</StatNumber>
              <StatHelpText>
                <HStack spacing={4} mt={2}>
                  <VStack spacing={0} align="start">
                    <Text fontSize="xs" color="gray.400">Queries</Text>
                    <Text fontWeight="medium">{report.performance.queries_24h}</Text>
                  </VStack>
                  <VStack spacing={0} align="start">
                    <Text fontSize="xs" color="gray.400">Avg Time</Text>
                    <Text fontWeight="medium">{report.performance.avg_response_time_ms}ms</Text>
                  </VStack>
                </HStack>
              </StatHelpText>
            </Stat>
          </Box>

          {/* Expansion Queue */}
          <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
            <Stat>
              <StatLabel color="gray.500">
                <HStack>
                  <Icon as={ClockIcon} boxSize={4} />
                  <Text>Expansion Queue</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{report.expansion_queue.pending_count}</StatNumber>
              <StatHelpText>
                <HStack spacing={2} mt={2}>
                  {Object.entries(report.expansion_queue.by_priority).map(([priority, count]) => (
                    <Badge key={priority} colorScheme={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'}>
                      {priority}: {count}
                    </Badge>
                  ))}
                </HStack>
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>

        {/* Specialty Distribution */}
        <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
          <Text fontSize="md" fontWeight="semibold" mb={4}>
            Pathways by Specialty
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
            {Object.entries(report.metrics.by_specialty)
              .sort(([, a], [, b]) => b - a)
              .map(([specialty, count]) => (
                <Box key={specialty} p={3} bg="gray.50" borderRadius="md">
                  <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                    {specialty.replace('_', ' ')}
                  </Text>
                  <Text fontSize="xl" fontWeight="bold">
                    {count}
                  </Text>
                </Box>
              ))}
          </SimpleGrid>
        </Box>

        {/* Priority Progress */}
        <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
          <Text fontSize="md" fontWeight="semibold" mb={4}>
            Priority Coverage
          </Text>
          <VStack spacing={4} align="stretch">
            {Object.entries(report.metrics.by_priority).map(([priority, data]) => (
              <Box key={priority}>
                <Flex justify="space-between" mb={1}>
                  <HStack>
                    <Badge colorScheme={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'}>
                      {priority}
                    </Badge>
                    <Text fontSize="sm" color="gray.600">
                      {data.completed}/{data.target} pathways
                    </Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {data.percentage}%
                  </Text>
                </Flex>
                <Progress
                  value={data.percentage}
                  colorScheme={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'}
                  size="sm"
                  borderRadius="full"
                />
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Recommendations */}
        <Box p={5} bg="white" borderRadius="lg" shadow="sm" border="1px solid" borderColor="gray.100">
          <Text fontSize="md" fontWeight="semibold" mb={4}>
            Recommendations ({report.recommendations.length})
          </Text>
          <VStack spacing={3} align="stretch">
            {report.recommendations.map((rec, idx) => (
              <Box
                key={idx}
                p={4}
                bg={`${priorityColors[rec.priority]}.50`}
                borderRadius="md"
                borderLeft="4px solid"
                borderLeftColor={`${priorityColors[rec.priority]}.400`}
              >
                <Flex justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Badge colorScheme={priorityColors[rec.priority]} size="sm">
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" colorScheme="gray" size="sm">
                        {rec.category}
                      </Badge>
                    </HStack>
                    <Text fontWeight="semibold">{rec.title}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {rec.description}
                    </Text>
                    {rec.conditions && (
                      <HStack spacing={1} flexWrap="wrap" mt={1}>
                        {rec.conditions.map((cond) => (
                          <Badge key={cond} variant="subtle" colorScheme="purple" size="sm">
                            {cond}
                          </Badge>
                        ))}
                      </HStack>
                    )}
                  </VStack>
                  <Badge colorScheme={rec.impact === 'high' ? 'red' : rec.impact === 'medium' ? 'orange' : 'blue'}>
                    {rec.impact} impact
                  </Badge>
                </Flex>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  Action: {rec.action}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Errors */}
        {report.performance.errors_24h > 0 && (
          <Box p={5} bg="red.50" borderRadius="lg" border="1px solid" borderColor="red.200">
            <HStack spacing={3}>
              <Icon as={ExclamationCircleIcon} boxSize={6} color="red.500" />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" color="red.700">
                  {report.performance.errors_24h} errors in last 24h
                </Text>
                <Text fontSize="sm" color="red.600">
                  {report.performance.unresolved_errors} unresolved
                </Text>
              </VStack>
            </HStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
