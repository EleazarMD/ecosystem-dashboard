import React, { useMemo } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  Progress,
  Circle,
  Badge,
  Icon,
  Heading,
} from '@chakra-ui/react';
import {
  CpuChipIcon,
  CloudIcon,
  SignalIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  percentage: number;
  color: string;
  icon: any;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  percentage,
  color,
  icon,
  trend,
  trendValue,
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const progressBg = useSemanticToken('surface.base');

  return (
    <Box
      as={GlassPanel}
      variant="heavy"
      p={6}
      bg={cardBg}
      borderRadius="2xl"
      border="1px solid"
      borderColor={progressBg}
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      }}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      cursor="pointer"
      position="relative"
      overflow="hidden"
    >
      {/* Background Gradient */}
      <Box
        position="absolute"
        top={0}
        right={0}
        w="80px"
        h="80px"
        bgGradient={`radial(circle at center, ${color}.200 0%, transparent 70%)`}
        opacity={0.3}
        pointerEvents="none"
      />
      
      <VStack align="stretch" spacing={4} position="relative" zIndex={1}>
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            <Circle size="40px" bg={`${color}.100`} color={`${color}.600`}>
              <Icon as={icon} boxSize={5} />
            </Circle>
            <Text fontSize="sm" fontWeight="semibold" color={useSemanticToken('text.secondary')}>
              {title}
            </Text>
          </HStack>
          <Badge
            colorScheme={trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}
            variant="subtle"
            px={2}
            py={1}
            borderRadius="lg"
            fontSize="xs"
          >
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'} {trendValue}%
          </Badge>
        </HStack>

        {/* Value Display */}
        <HStack align="baseline" spacing={2}>
          <Text fontSize="3xl" fontWeight="bold" color={useSemanticToken('text.primary')}>
            {value}
          </Text>
          <Text fontSize="lg" color={`${color}.500`} fontWeight="medium">
            {unit}
          </Text>
        </HStack>

        {/* Progress Bar */}
        <VStack align="stretch" spacing={2}>
          <Progress
            value={percentage}
            colorScheme={color}
            size="lg"
            borderRadius="full"
            bg={progressBg}
          />
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500">
              {percentage}% utilized
            </Text>
            <Text fontSize="xs" color={`${color}.500`} fontWeight="semibold">
              {percentage > 80 ? 'High' : percentage > 50 ? 'Medium' : 'Low'}
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
};

interface KubernetesAdvancedMetricsProps {
  clusterData?: any;
  servicesData?: any[];
  isLoading?: boolean;
}

export const KubernetesAdvancedMetrics: React.FC<KubernetesAdvancedMetricsProps> = ({
  clusterData,
  servicesData = [],
  isLoading = false,
}) => {
  const metrics = useMemo(() => {
    if (!clusterData) {
      // Default values if no data
      return [
        {
          title: 'CPU Usage',
          value: 0,
          unit: 'cores',
          percentage: 0,
          color: 'blue',
          icon: CpuChipIcon,
          trend: 'stable' as const,
          trendValue: 0,
        },
        {
          title: 'Memory',
          value: 0,
          unit: 'GB',
          percentage: 0,
          color: 'green',
          icon: CloudIcon,
          trend: 'stable' as const,
          trendValue: 0,
        },
        {
          title: 'Network I/O',
          value: 0,
          unit: 'MB/s',
          percentage: 0,
          color: 'purple',
          icon: SignalIcon,
          trend: 'stable' as const,
          trendValue: 0,
        },
        {
          title: 'Storage',
          value: 0,
          unit: 'GB',
          percentage: 0,
          color: 'orange',
          icon: ChartBarIcon,
          trend: 'stable' as const,
          trendValue: 0,
        },
      ];
    }

    // Calculate real metrics based on pod data
    const runningPods = clusterData.runningPods || 0;
    const totalPods = clusterData.totalPods || 1;
    const restartCount = servicesData.reduce((sum, pod) => sum + (pod.restarts || 0), 0);
    const healthyPercentage = totalPods > 0 ? Math.round((runningPods / totalPods) * 100) : 0;
    
    // Calculate CPU usage (estimate based on running pods)
    const estimatedCPU = runningPods * 0.15; // Assume ~150m per pod average
    const cpuPercentage = Math.min(Math.round((estimatedCPU / 2) * 100), 100); // Assume 2 core limit
    
    // Calculate memory usage (estimate based on running pods) 
    const estimatedMemory = runningPods * 0.4; // Assume ~400Mi per pod average
    const memoryPercentage = Math.min(Math.round((estimatedMemory / 8) * 100), 100); // Assume 8GB limit
    
    return [
      {
        title: 'Pod Health',
        value: runningPods,
        unit: `of ${totalPods}`,
        percentage: healthyPercentage,
        color: healthyPercentage > 80 ? 'green' : healthyPercentage > 50 ? 'blue' : 'red',
        icon: CpuChipIcon,
        trend: (healthyPercentage > 75 ? 'up' : healthyPercentage < 50 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
        trendValue: healthyPercentage,
      },
      {
        title: 'Memory Usage',
        value: parseFloat(estimatedMemory.toFixed(1)),
        unit: 'GB',
        percentage: memoryPercentage,
        color: 'green',
        icon: CloudIcon,
        trend: (memoryPercentage > 70 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
        trendValue: memoryPercentage,
      },
      {
        title: 'Restarts',
        value: restartCount,
        unit: 'total',
        percentage: Math.min(restartCount * 5, 100), // Scale for visualization
        color: restartCount > 10 ? 'red' : restartCount > 5 ? 'orange' : 'purple',
        icon: SignalIcon,
        trend: (restartCount > 20 ? 'up' : restartCount < 5 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
        trendValue: restartCount,
      },
      {
        title: 'Namespaces',
        value: clusterData.namespaces || 0,
        unit: 'active',
        percentage: Math.min((clusterData.namespaces || 0) * 20, 100), // Scale for visualization
        color: 'orange',
        icon: ChartBarIcon,
        trend: 'stable' as 'up' | 'down' | 'stable',
        trendValue: clusterData.namespaces || 0,
      },
    ];
  }, [clusterData, servicesData]);

  if (isLoading) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {Array.from({ length: 4 }).map((_, index) => (
          <GlassPanel key={index} p={6} variant="light" borderRadius="2xl">
            <Box h="120px" bg={useSemanticToken('surface.base')} borderRadius="xl" opacity={0.7} />
          </GlassPanel>
        ))}
      </SimpleGrid>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      {/* Section Header */}
      <Box>
        <Heading size="md" color={useSemanticToken('text.primary')} mb={2}>
          🚀 Resource Analytics
        </Heading>
        <Text color={useSemanticToken('text.secondary')} fontSize="sm">
          Real-time cluster resource utilization and performance metrics
        </Text>
      </Box>

      {/* Metrics Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </SimpleGrid>
    </VStack>
  );
};
