import React from 'react';
import {
  SimpleGrid,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Badge,
  HStack,
  Text,
} from '@chakra-ui/react';
import {
  ServerIcon,
  CubeIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KubernetesMetrics {
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  totalServices: number;
  nodes: number;
  namespaces: number;
  cpuUsage?: string;
  memoryUsage?: string;
}

interface KubernetesStatusCardsProps {
  metrics?: KubernetesMetrics;
  isLoading?: boolean;
}

const StatusCard: React.FC<{
  title: string;
  value: string | number;
  icon: any;
  color: string;
  helpText?: string;
  badge?: { text: string; colorScheme: string };
  trend?: { value: number; direction: 'up' | 'down' };
}> = ({ title, value, icon, color, helpText, badge, trend }) => {
  const cardBg = useSemanticToken('surface.elevated');
  const shadowColor = 'rgba(0,0,0,0.1)';
  
  return (
    <Box
      as={GlassPanel}
      p={8} 
      variant="heavy"
      bg={cardBg}
      borderRadius="2xl"
      position="relative"
      overflow="hidden"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: `0 20px 40px ${shadowColor}`,
      }}
      transition="all 0.3s ease-in-out"
      cursor="pointer"
    >
      {/* Background Gradient */}
      <Box
        position="absolute"
        top={0}
        right={0}
        w="100px"
        h="100px"
        bgGradient={`linear(45deg, ${color}.400, ${color}.600)`}
        opacity={0.1}
        borderRadius="full"
        transform="translate(30px, -30px)"
      />
      
      <Stat position="relative" zIndex={1}>
        <HStack justify="space-between" mb={4}>
          <Box>
            <StatLabel 
              color={useSemanticToken('text.secondary')} 
              fontSize="sm"
              fontWeight="medium"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              {title}
            </StatLabel>
            {trend && (
              <HStack spacing={1} mt={1}>
                <Text 
                  fontSize="xs" 
                  color={trend.direction === 'up' ? 'green.500' : 'red.500'}
                  fontWeight="semibold"
                >
                  {trend.direction === 'up' ? '↗' : '↘'} {trend.value}%
                </Text>
              </HStack>
            )}
          </Box>
          <Box
            p={3}
            bg={`${color}.100`}
            borderRadius="xl"
            color={`${color}.600`}
          >
            <Icon as={icon} boxSize={6} />
          </Box>
        </HStack>
        
        <StatNumber 
          fontSize="3xl" 
          fontWeight="bold" 
          color={useSemanticToken('text.primary')}
          mb={2}
        >
          {value}
        </StatNumber>
        
        {helpText && (
          <StatHelpText 
            color="gray.500" 
            fontSize="sm"
            mb={3}
            fontWeight="medium"
          >
            {helpText}
          </StatHelpText>
        )}
        
        {badge && (
          <Badge
            colorScheme={badge.colorScheme}
            variant="solid"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="xs"
            fontWeight="semibold"
          >
            {badge.text}
          </Badge>
        )}
      </Stat>
    </Box>
  );
};

export const KubernetesStatusCards: React.FC<KubernetesStatusCardsProps> = ({
  metrics,
  isLoading = false,
}) => {
  if (isLoading || !metrics) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={8} mb={12}>
        {Array.from({ length: 4 }).map((_, index) => (
          <GlassPanel key={index} p={8} variant="light" borderRadius="2xl">
            <Box h="120px" bg={useSemanticToken('surface.base')} borderRadius="xl" opacity={0.7} />
          </GlassPanel>
        ))}
      </SimpleGrid>
    );
  }

  const podHealthPercentage = metrics.totalPods > 0 
    ? Math.round((metrics.runningPods / metrics.totalPods) * 100)
    : 0;

  return (
    <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={8} mb={12}>
      <StatusCard
        title="Pod Orchestration"
        value={metrics.totalPods}
        icon={CubeIcon}
        color="blue"
        helpText={`${metrics.runningPods} active, ${metrics.pendingPods} pending`}
        badge={
          podHealthPercentage >= 80
            ? { text: '✨ Healthy', colorScheme: 'green' }
            : { text: '⚠ Attention', colorScheme: 'yellow' }
        }
        trend={{ value: 12, direction: 'up' }}
      />
      
      <StatusCard
        title="Service Mesh"
        value={metrics.totalServices}
        icon={RocketLaunchIcon}
        color="green"
        helpText="Distributed services running"
        badge={{ text: '🚀 Live', colorScheme: 'green' }}
        trend={{ value: 8, direction: 'up' }}
      />
      
      <StatusCard
        title="Compute Nodes"
        value={metrics.nodes}
        icon={ServerIcon}
        color="purple"
        helpText="High-availability cluster"
        badge={{ text: '💪 Ready', colorScheme: 'purple' }}
        trend={{ value: 0, direction: 'up' }}
      />
      
      <StatusCard
        title="System Health"
        value={metrics.failedPods + metrics.pendingPods}
        icon={ExclamationTriangleIcon}
        color={metrics.failedPods > 0 ? 'red' : 'green'}
        helpText={`${metrics.failedPods} failed, ${metrics.pendingPods} pending`}
        badge={
          (metrics.failedPods + metrics.pendingPods) === 0
            ? { text: '✓ Optimal', colorScheme: 'green' }
            : { text: '🔄 Resolving', colorScheme: 'orange' }
        }
        trend={{ 
          value: metrics.failedPods > 0 ? 5 : 2, 
          direction: metrics.failedPods > 0 ? 'down' : 'up' 
        }}
      />
    </SimpleGrid>
  );
};
