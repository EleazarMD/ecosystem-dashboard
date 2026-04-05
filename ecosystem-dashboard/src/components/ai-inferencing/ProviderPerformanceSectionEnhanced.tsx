/**
 * Enhanced Provider Performance Section
 * Sophisticated, modern design with better visual hierarchy
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
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
  
  Circle,
  Divider,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiZap,
  FiActivity,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiServer,
} from 'react-icons/fi';

interface ProviderMetrics {
  provider: string;
  status: 'healthy' | 'degraded' | 'offline' | 'inactive';
  avgLatency: number;
  successRate: number;
  requestCount: number;
  errorCount: number;
  totalCost: number;
  totalTokens: number;
  costEfficiency: number;
  uptime: number;
}

interface OverviewStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  errorRate: number;
  totalCost: number;
  totalTokens: number;
}

interface ServiceStats {
  projects: number;
  services: number;
  totalKeys: number;
  cacheSize?: number;
}

interface Props {
  providers: ProviderMetrics[];
  overviewStats: OverviewStats | null;
  serviceStats: ServiceStats | null;
  timeRange: string;
}

export const ProviderPerformanceSectionEnhanced: React.FC<Props> = ({
  providers,
  overviewStats,
  serviceStats,
  timeRange,
}) => {
  const bgGradient = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const accentColor = useSemanticToken('interactive.primary');
  const mutedText = useSemanticToken('text.secondary');

  const getProviderGradient = (provider: string) => {
    const gradients = {
      google: 'linear(to-br, blue.400, blue.600)',
      openai: 'linear(to-br, green.400, teal.500)',
      anthropic: 'linear(to-br, orange.400, red.500)',
    };
    return gradients[provider.toLowerCase()] || 'linear(to-br, gray.400, gray.600)';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return { color: 'green', icon: FiCheckCircle, label: 'Healthy' };
      case 'degraded':
        return { color: 'yellow', icon: FiAlertCircle, label: 'Degraded' };
      case 'offline':
        return { color: 'red', icon: FiAlertCircle, label: 'Offline' };
      case 'inactive':
        return { color: 'gray', icon: FiServer, label: 'No Activity' };
      default:
        return { color: 'gray', icon: FiServer, label: 'Unknown' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Compact Header with Service Status */}
      <Card
        bg={cardBg}
        borderColor={borderColor}
        borderWidth="1px"
        shadow="sm"
        overflow="hidden"
      >
        <CardBody p={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={4}>
              <Circle size="40px" bg={useSemanticToken('interactive.primary')}>
                <Icon as={FiZap} color={useSemanticToken('text.inverse')} boxSize={5} />
              </Circle>
              <Box>
                <Heading size="md" mb={1}>
                  Provider Performance
                </Heading>
                <HStack spacing={4} fontSize="sm" color={mutedText}>
                  {serviceStats && (
                    <>
                      <HStack spacing={1}>
                        <Icon as={FiServer} />
                        <Text>{serviceStats.services} services</Text>
                      </HStack>
                      <Text>•</Text>
                      <HStack spacing={1}>
                        <Icon as={FiCheckCircle} color={useSemanticToken('status.success')} />
                        <Text>{providers.filter(p => p.status === 'healthy').length} active</Text>
                      </HStack>
                      <Text>•</Text>
                      <Text>{timeRange} window</Text>
                    </>
                  )}
                </HStack>
              </Box>
            </HStack>

            {serviceStats && (
              <Badge
                colorScheme="green"
                fontSize="sm"
                px={3}
                py={1}
                borderRadius="full"
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Circle size="6px" bg={useSemanticToken('status.success')} />
                Connected
              </Badge>
            )}
          </Flex>
        </CardBody>
      </Card>

      {/* Key Metrics - Elegant Grid */}
      {overviewStats && (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
          <Card
            bg={cardBg}
            borderLeftWidth="3px"
            borderLeftColor={useSemanticToken('interactive.primary')}
            shadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
          >
            <CardBody p={4}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Icon as={FiActivity} color={useSemanticToken('interactive.primary')} boxSize={4} />
                  <Text fontSize="xs" color={mutedText} fontWeight="medium">
                    REQUESTS
                  </Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                  {overviewStats.totalRequests.toLocaleString()}
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  Last {timeRange}
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            bg={cardBg}
            borderLeftWidth="3px"
            borderLeftColor={overviewStats.successRate >= 95 ? useSemanticToken('status.success') : useSemanticToken('status.warning')}
            shadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
          >
            <CardBody p={4}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Icon
                    as={FiCheckCircle}
                    color={overviewStats.successRate >= 95 ? useSemanticToken('status.success') : useSemanticToken('status.warning')}
                    boxSize={4}
                  />
                  <Text fontSize="xs" color={mutedText} fontWeight="medium">
                    SUCCESS
                  </Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                  {overviewStats.successRate.toFixed(1)}%
                </Text>
                <Progress
                  value={overviewStats.successRate}
                  size="xs"
                  colorScheme={overviewStats.successRate >= 95 ? 'green' : 'orange'}
                  borderRadius="full"
                />
              </VStack>
            </CardBody>
          </Card>

          <Card
            bg={cardBg}
            borderLeftWidth="3px"
            borderLeftColor={overviewStats.avgLatency < 1000 ? useSemanticToken('status.success') : useSemanticToken('status.warning')}
            shadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
          >
            <CardBody p={4}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Icon as={FiClock} color={useSemanticToken('interactive.secondary')} boxSize={4} />
                  <Text fontSize="xs" color={mutedText} fontWeight="medium">
                    LATENCY
                  </Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                  {overviewStats.avgLatency}ms
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  Average response
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            bg={cardBg}
            borderLeftWidth="3px"
            borderLeftColor={overviewStats.errorRate < 1 ? useSemanticToken('status.success') : useSemanticToken('status.error')}
            shadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
          >
            <CardBody p={4}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Icon
                    as={FiAlertCircle}
                    color={overviewStats.errorRate < 1 ? useSemanticToken('status.success') : useSemanticToken('status.error')}
                    boxSize={4}
                  />
                  <Text fontSize="xs" color={mutedText} fontWeight="medium">
                    ERRORS
                  </Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                  {overviewStats.errorRate.toFixed(1)}%
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  Error rate
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            bg={cardBg}
            borderLeftWidth="3px"
            borderLeftColor={useSemanticToken('interactive.secondary')}
            shadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
          >
            <CardBody p={4}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Icon as={FiDollarSign} color={useSemanticToken('interactive.secondary')} boxSize={4} />
                  <Text fontSize="xs" color={mutedText} fontWeight="medium">
                    COST
                  </Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                  {formatCurrency(overviewStats.totalCost)}
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  Total spend
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            bg={cardBg}
            borderLeftWidth="3px"
            borderLeftColor={useSemanticToken('status.warning')}
            shadow="sm"
            transition="all 0.2s"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
          >
            <CardBody p={4}>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Icon as={FiTrendingUp} color={useSemanticToken('status.warning')} boxSize={4} />
                  <Text fontSize="xs" color={mutedText} fontWeight="medium">
                    TOKENS
                  </Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                  {((overviewStats.totalTokens || 0) / 1000).toFixed(1)}K
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  Tokens used
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Enhanced Provider Cards */}
      <Box>
        <Heading size="sm" mb={4} color={mutedText} fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
          Provider Status
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {providers.map((provider) => {
            const statusConfig = getStatusConfig(provider.status);
            const isActive = provider.requestCount > 0;

            return (
              <Card
                key={provider.provider}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                shadow="sm"
                overflow="hidden"
                transition="all 0.3s"
                _hover={{
                  shadow: 'lg',
                  transform: 'translateY(-4px)',
                  borderColor: accentColor,
                }}
              >
                {/* Provider Header with Gradient */}
                <Box
                  bgGradient={getProviderGradient(provider.provider)}
                  p={4}
                  color={useSemanticToken('text.inverse')}
                >
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="lg" fontWeight="bold" textTransform="capitalize">
                        {provider.provider}
                      </Text>
                      <HStack spacing={2}>
                        <Circle size="6px" bg={`${statusConfig.color}.300`} />
                        <Text fontSize="xs" opacity={0.9}>
                          {statusConfig.label}
                        </Text>
                      </HStack>
                    </VStack>
                    <Circle size="40px" bg="whiteAlpha.200" backdropFilter="blur(10px)">
                      <Icon as={statusConfig.icon} boxSize={5} />
                    </Circle>
                  </Flex>
                </Box>

                {/* Provider Metrics */}
                <CardBody p={4}>
                  <VStack align="stretch" spacing={4}>
                    {/* Key Stats */}
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="xs" color={mutedText} mb={1}>
                          Requests
                        </Text>
                        <Text fontSize="xl" fontWeight="bold">
                          {provider.requestCount.toLocaleString()}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={mutedText} mb={1}>
                          Success
                        </Text>
                        <HStack>
                          <Text fontSize="xl" fontWeight="bold">
                            {provider.successRate.toFixed(0)}%
                          </Text>
                        </HStack>
                      </Box>
                    </SimpleGrid>

                    <Divider />

                    {/* Performance Metrics */}
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between" fontSize="sm">
                        <Text color={mutedText}>Latency</Text>
                        <Text fontWeight="medium">
                          {provider.avgLatency > 0 ? `${provider.avgLatency}ms` : '-'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" fontSize="sm">
                        <Text color={mutedText}>Cost</Text>
                        <Text fontWeight="medium">
                          {provider.totalCost > 0 ? formatCurrency(provider.totalCost) : '-'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" fontSize="sm">
                        <Text color={mutedText}>Errors</Text>
                        <Badge
                          colorScheme={provider.errorCount === 0 ? 'green' : 'red'}
                          fontSize="xs"
                        >
                          {provider.errorCount}
                        </Badge>
                      </HStack>
                    </VStack>

                    {/* Activity Indicator */}
                    {isActive && (
                      <Box>
                        <HStack justify="space-between" mb={2}>
                          <Text fontSize="xs" color={mutedText}>
                            Activity
                          </Text>
                          <Text fontSize="xs" fontWeight="medium">
                            {provider.successRate.toFixed(1)}%
                          </Text>
                        </HStack>
                        <Progress
                          value={provider.successRate}
                          size="sm"
                          colorScheme={provider.successRate >= 95 ? 'green' : 'yellow'}
                          borderRadius="full"
                        />
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
      </Box>
    </VStack>
  );
};
