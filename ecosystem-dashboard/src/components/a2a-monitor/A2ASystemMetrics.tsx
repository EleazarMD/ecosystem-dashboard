import React, { useState, useEffect } from 'react';
import {
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Box,
  Icon,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { FiActivity, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface A2AMetrics {
  totalMessages: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatency: number;
  activeAgents: number;
  totalAgents: number;
  circuitBreakersOpen: number;
  messagesPerSecond: number;
}

export default function A2ASystemMetrics() {
  const cardBg = useSemanticToken('surface.elevated');
  const [metrics, setMetrics] = useState<A2AMetrics>({
    totalMessages: 0,
    successCount: 0,
    failureCount: 0,
    successRate: 0,
    avgLatency: 0,
    activeAgents: 0,
    totalAgents: 7,
    circuitBreakersOpen: 0,
    messagesPerSecond: 0,
  });

  useEffect(() => {
    // Fetch metrics from API
    const fetchMetrics = async () => {
      try {
        // Fetch agent status
        const agentsResponse = await fetch('/api/agentic-control/agents');
        const agentsData = await agentsResponse.json();
        const activeCount = agentsData.agents?.filter((a: any) => a.status === 'healthy').length || 0;

        // Fetch A2A metrics
        const metricsResponse = await fetch('http://localhost:8765/a2a/metrics');
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();

          if (metricsData.success && metricsData.metrics) {
            setMetrics({
              totalMessages: metricsData.metrics.totalMessages || 0,
              successCount: metricsData.metrics.successCount || 0,
              failureCount: metricsData.metrics.failureCount || 0,
              successRate: metricsData.metrics.successRate || 0,
              avgLatency: metricsData.metrics.avgLatency || 0,
              activeAgents: activeCount,
              totalAgents: agentsData.agents?.length || 7,
              circuitBreakersOpen: metricsData.metrics.circuitBreakersOpen || 0,
              messagesPerSecond: metricsData.metrics.messagesPerSecond || 0,
            });
          }
        } else {
          // Fallback to just agent count if metrics API not available
          setMetrics(prev => ({
            ...prev,
            activeAgents: activeCount,
            totalAgents: agentsData.agents?.length || 7,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ label, value, icon, change, colorScheme = 'blue' }: any) => (
    <Box bg={cardBg} p={5} borderRadius="lg" shadow="md">
      <Stat>
        <HStack justify="space-between" mb={2}>
          <StatLabel fontSize="sm" color={useSemanticToken('text.secondary')}>{label}</StatLabel>
          <Icon as={icon} color={`${colorScheme}.500`} boxSize={5} />
        </HStack>
        <StatNumber fontSize="3xl">{value}</StatNumber>
        {change !== undefined && (
          <StatHelpText>
            <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
            {Math.abs(change)}%
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );

  return (
    <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
      <MetricCard
        label="Total Messages"
        value={metrics.totalMessages.toLocaleString()}
        icon={FiActivity}
        change={12.5}
        colorScheme="blue"
      />

      <MetricCard
        label="Success Rate"
        value={`${metrics.successRate}%`}
        icon={FiCheckCircle}
        change={0.3}
        colorScheme="green"
      />

      <MetricCard
        label="Avg Latency"
        value={`${metrics.avgLatency}ms`}
        icon={FiClock}
        change={-5.2}
        colorScheme="purple"
      />

      <MetricCard
        label="Active Agents"
        value={`${metrics.activeAgents}/${metrics.totalAgents}`}
        icon={FiCheckCircle}
        colorScheme="green"
      />

      <MetricCard
        label="Messages/sec"
        value={metrics.messagesPerSecond}
        icon={FiActivity}
        change={8.1}
        colorScheme="cyan"
      />

      <Box bg={cardBg} p={5} borderRadius="lg" shadow="md">
        <Stat>
          <HStack justify="space-between" mb={2}>
            <StatLabel fontSize="sm" color={useSemanticToken('text.secondary')}>Circuit Breakers</StatLabel>
            <Icon
              as={FiAlertCircle}
              color={metrics.circuitBreakersOpen > 0 ? useSemanticToken('status.error') : useSemanticToken('status.success')}
              boxSize={5}
            />
          </HStack>
          <HStack>
            <Badge colorScheme="green" fontSize="lg" px={3} py={1}>
              {metrics.totalAgents - metrics.circuitBreakersOpen} Closed
            </Badge>
            {metrics.circuitBreakersOpen > 0 && (
              <Badge colorScheme="red" fontSize="lg" px={3} py={1}>
                {metrics.circuitBreakersOpen} Open
              </Badge>
            )}
          </HStack>
        </Stat>
      </Box>
    </SimpleGrid>
  );
}
