import React from 'react';
import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Icon,
  Progress,
  Badge,
  Flex,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { FiServer, FiCpu, FiBarChart, FiAlertTriangle } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EnhancedStatusCardsProps {
  clusterData: any;
  servicesData: any[];
  isLoading: boolean;
}

const EnhancedStatusCards: React.FC<EnhancedStatusCardsProps> = ({
  clusterData,
  servicesData,
  isLoading,
}) => {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const successColor = 'green.500';
  const warningColor = 'orange.500';
  const errorColor = 'red.500';
  const accentColor = 'blue.500';

  const statusCards = [
    {
      title: 'Total Pods',
      value: clusterData?.totalPods || servicesData.length || 0,
      subtitle: `${clusterData?.runningPods || 0} running`,
      icon: FiServer,
      color: accentColor,
      bgGradient: 'linear(135deg, blue.400, blue.600)',
      trend: '+12%',
      trendDirection: 'up',
    },
    {
      title: 'Cluster Health',
      value: `${Math.round((servicesData.filter(s => s.status === 'Running').length / Math.max(servicesData.length, 1)) * 100)}%`,
      subtitle: 'Overall health score',
      icon: FiBarChart,
      color: successColor,
      bgGradient: 'linear(135deg, green.400, green.600)',
      trend: '+5%',
      trendDirection: 'up',
    },
    {
      title: 'Resource Usage',
      value: `${clusterData?.cpuUsage || 45}%`,
      subtitle: `${clusterData?.memoryUsage || 62}% memory`,
      icon: FiCpu,
      color: warningColor,
      bgGradient: 'linear(135deg, orange.400, orange.600)',
      trend: '-3%',
      trendDirection: 'down',
    },
    {
      title: 'Active Issues',
      value: clusterData?.failedPods || servicesData.filter(s => s.status === 'Failed').length || 0,
      subtitle: 'Requires attention',
      icon: FiAlertTriangle,
      color: errorColor,
      bgGradient: 'linear(135deg, red.400, red.600)',
      trend: '-8%',
      trendDirection: 'down',
    },
  ];

  if (isLoading) {
    return (
      <Grid templateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap={6} mb={8}>
        {[1, 2, 3, 4].map((i) => (
          <GlassPanel key={i} variant="light">
            <Box p={6} h="200px">
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Box w={12} h={12} bg={useSemanticToken('surface.elevated')} borderRadius="xl" />
                  <Box w={16} h={6} bg={useSemanticToken('surface.elevated')} borderRadius="md" />
                </HStack>
                <Box w="full" h={8} bg={useSemanticToken('surface.elevated')} borderRadius="md" />
                <Box w="3/4" h={4} bg={useSemanticToken('surface.elevated')} borderRadius="md" />
              </VStack>
            </Box>
          </GlassPanel>
        ))}
      </Grid>
    );
  }

  return (
    <Grid templateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap={6} mb={8}>
      {statusCards.map((card, index) => (
        <GlassPanel
          key={card.title}
          variant="light"
          className="enhanced-hover"
          style={{
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <Box
            p={6}
            h="200px"
            position="relative"
            overflow="hidden"
            borderRadius="2xl"
          >
            {/* Background Gradient */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bgGradient={card.bgGradient}
              opacity={0.05}
              borderRadius="2xl"
            />

            {/* Decorative Circle */}
            <Box
              position="absolute"
              top="-20px"
              right="-20px"
              w="80px"
              h="80px"
              borderRadius="full"
              bg={card.color}
              opacity={0.1}
              filter="blur(12px)"
            />

            <VStack spacing={4} align="stretch" position="relative" zIndex={1}>
              {/* Header */}
              <HStack justify="space-between" align="flex-start">
                <VStack align="start" spacing={1}>
                  <Text
                    fontSize="sm"
                    fontWeight="600"
                    color={textSecondary}
                    textTransform="uppercase"
                    letterSpacing="wide"
                  >
                    {card.title}
                  </Text>
                  <HStack spacing={2}>
                    <Text
                      fontSize="3xl"
                      fontWeight="900"
                      color={textPrimary}
                      lineHeight="1"
                    >
                      {card.value}
                    </Text>
                    <Badge
                      colorScheme={card.trendDirection === 'up' ? 'green' : 'red'}
                      fontSize="xs"
                      px={2}
                      py={1}
                      borderRadius="full"
                    >
                      {card.trend}
                    </Badge>
                  </HStack>
                </VStack>

                {/* Icon Container */}
                <Box
                  p={3}
                  bg={card.color}
                  borderRadius="xl"
                  color="whiteAlpha.900"
                  boxShadow="0 8px 25px rgba(0, 0, 0, 0.15)"
                  className="scale-in-animation"
                >
                  <Icon as={card.icon} w={6} h={6} />
                </Box>
              </HStack>

              {/* Progress Visualization */}
              <Box>
                {card.title === 'Cluster Health' ? (
                  <Flex align="center" gap={4}>
                    <CircularProgress
                      value={parseInt(card.value)}
                      color={card.color}
                      size="60px"
                      thickness="8px"
                    >
                      <CircularProgressLabel fontSize="sm" fontWeight="bold">
                        {card.value}
                      </CircularProgressLabel>
                    </CircularProgress>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="xs" color={textSecondary}>
                        {card.subtitle}
                      </Text>
                      <HStack spacing={2}>
                        <Box w={2} h={2} bg={successColor} borderRadius="full" />
                        <Text fontSize="xs" color={textSecondary}>
                          {servicesData.filter(s => s.status === 'Running').length} healthy
                        </Text>
                      </HStack>
                    </VStack>
                  </Flex>
                ) : card.title === 'Resource Usage' ? (
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color={textSecondary}>CPU</Text>
                      <Text fontSize="xs" color={textSecondary}>{card.value}</Text>
                    </HStack>
                    <Progress
                      value={parseInt(card.value)}
                      colorScheme={parseInt(card.value) > 80 ? 'red' : parseInt(card.value) > 60 ? 'orange' : 'green'}
                      size="sm"
                      borderRadius="full"
                    />
                    <HStack justify="space-between">
                      <Text fontSize="xs" color={textSecondary}>Memory</Text>
                      <Text fontSize="xs" color={textSecondary}>{card.subtitle.split(' ')[0]}</Text>
                    </HStack>
                    <Progress
                      value={parseInt(card.subtitle)}
                      colorScheme={parseInt(card.subtitle) > 80 ? 'red' : parseInt(card.subtitle) > 60 ? 'orange' : 'green'}
                      size="sm"
                      borderRadius="full"
                    />
                  </VStack>
                ) : (
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" color={textSecondary}>
                      {card.subtitle}
                    </Text>
                    <Progress
                      value={card.title === 'Active Issues' ?
                        Math.max(0, 100 - (parseInt(card.value) * 10)) :
                        75
                      }
                      colorScheme={card.title === 'Active Issues' ? 'red' : 'blue'}
                      size="sm"
                      borderRadius="full"
                      w="full"
                    />
                  </VStack>
                )}
              </Box>
            </VStack>
          </Box>
        </GlassPanel>
      ))}
    </Grid>
  );
};

export default EnhancedStatusCards;
