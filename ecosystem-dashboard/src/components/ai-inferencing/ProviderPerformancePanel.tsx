import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Progress,
  VStack,
  HStack,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertCircle, FiZap, FiDollarSign } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ProviderMetrics {
  provider: string;
  status: 'healthy' | 'degraded' | 'offline';
  avgLatency: number;
  successRate: number;
  requestCount: number;
  errorCount: number;
  costEfficiency: number;
  uptime: number;
}

interface ProviderPerformancePanelProps {
  metrics: ProviderMetrics[];
}

export const ProviderPerformancePanel: React.FC<ProviderPerformancePanelProps> = ({ metrics }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'degraded': return 'yellow';
      case 'offline': return 'red';
      case 'inactive': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return FiCheckCircle;
      case 'degraded': return FiAlertCircle;
      case 'offline': return FiAlertCircle;
      case 'inactive': return FiAlertCircle;
      default: return FiCheckCircle;
    }
  };

  const getPerformanceScore = (provider: ProviderMetrics) => {
    // Score based on latency, success rate, and uptime
    const latencyScore = Math.max(0, 100 - (provider.avgLatency / 50));
    const successScore = provider.successRate;
    const uptimeScore = provider.uptime;
    return Math.round((latencyScore + successScore + uptimeScore) / 3);
  };

  return (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Icon as={FiZap} /> Provider Performance
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {metrics.map((provider) => {
          const performanceScore = getPerformanceScore(provider);
          
          return (
            <Card key={provider.provider} variant="outline">
              <CardHeader pb={2}>
                <Flex justify="space-between" align="center">
                  <Text fontWeight="bold" fontSize="lg" textTransform="capitalize">
                    {provider.provider}
                  </Text>
                  <Badge
                    colorScheme={getStatusColor(provider.status)}
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Icon as={getStatusIcon(provider.status)} boxSize={3} />
                    {provider.status}
                  </Badge>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <VStack align="stretch" spacing={3}>
                  {/* Performance Score */}
                  <Box>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Performance</Text>
                      <Text fontSize="xs" fontWeight="bold">{performanceScore}%</Text>
                    </Flex>
                    <Progress
                      value={performanceScore}
                      size="sm"
                      colorScheme={
                        performanceScore >= 80 ? 'green' :
                        performanceScore >= 60 ? 'yellow' : 'red'
                      }
                    />
                  </Box>

                  {/* Key Metrics */}
                  <SimpleGrid columns={2} spacing={2}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Latency</StatLabel>
                      <StatNumber fontSize="md">{provider.avgLatency}ms</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel fontSize="xs">Success</StatLabel>
                      <StatNumber fontSize="md">{provider.successRate}%</StatNumber>
                    </Stat>
                  </SimpleGrid>

                  {/* Request Stats */}
                  <Box>
                    <HStack justify="space-between" fontSize="xs">
                      <Text color={useSemanticToken('text.secondary')}>Requests</Text>
                      <Text fontWeight="bold">{provider.requestCount}</Text>
                    </HStack>
                    <HStack justify="space-between" fontSize="xs" mt={1}>
                      <Text color={useSemanticToken('text.secondary')}>Errors</Text>
                      <Text fontWeight="bold" color={provider.errorCount > 0 ? 'red.500' : 'green.500'}>
                        {provider.errorCount}
                      </Text>
                    </HStack>
                  </Box>

                  {/* Cost Efficiency */}
                  <Box>
                    <HStack justify="space-between" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FiDollarSign} boxSize={3} />
                        <Text color={useSemanticToken('text.secondary')}>Cost Efficiency</Text>
                      </HStack>
                      <Badge colorScheme={provider.costEfficiency >= 0.8 ? 'green' : 'orange'}>
                        {(provider.costEfficiency * 100).toFixed(0)}%
                      </Badge>
                    </HStack>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>

      {metrics.length === 0 && (
        <Card>
          <CardBody>
            <Flex h="200px" align="center" justify="center">
              <Text color={useSemanticToken('text.secondary')}>No provider metrics available</Text>
            </Flex>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};
