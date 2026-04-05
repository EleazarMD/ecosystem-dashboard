import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Badge,
  HStack,
  VStack,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tooltip,
  Circle,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import {
  ServerIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  CloudIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KubernetesHeaderProps {
  clusterStatus?: {
    status: string;
    version: string;
    nodes: number;
    namespaces: number;
    totalServices?: number;
  };
  onRefresh: () => void;
  isLoading?: boolean;
}

// Pulse animation for status indicator
const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

export const KubernetesHeader: React.FC<KubernetesHeaderProps> = ({
  clusterStatus,
  onRefresh,
  isLoading = false,
}) => {
  const textSecondary = useSemanticToken('text.secondary');
  const isHealthy = clusterStatus?.status === 'Ready';

  return (
    <GlassPanel variant="heavy" mb={6}>
      <Box p={4}>
        {/* Compact Header */}
        <Flex justify="space-between" align="center" mb={4}>
          <HStack spacing={4}>
            <Box
              p={2}
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              borderRadius="lg"
              color="whiteAlpha.900"
            >
              <Icon as={ServerIcon} boxSize={6} />
            </Box>
            <VStack align="flex-start" spacing={0}>
              <HStack spacing={2} align="center">
                <Heading
                  size="lg"
                  color={useSemanticToken('text.primary')}
                  fontWeight="700"
                >
                  Kubernetes Control
                </Heading>
                <Circle
                  size="8px"
                  bg={isHealthy ? 'green.400' : 'red.400'}
                  animation={isHealthy ? `${pulse} 2s infinite` : 'none'}
                />
              </HStack>
              <Text fontSize="sm" color={textSecondary}>
                {clusterStatus?.status || 'Disconnected'} • {clusterStatus?.version || 'Unknown'}
              </Text>
            </VStack>
          </HStack>

          <HStack spacing={3}>
            <Button
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              colorScheme="blue"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              loadingText="Syncing..."
            >
              Refresh
            </Button>
            <Badge
              colorScheme={isHealthy ? 'green' : 'red'}
              variant="subtle"
              px={3}
              py={1}
              borderRadius="md"
              fontSize="xs"
            >
              {isHealthy ? '🟢 Ready' : '🔴 Issues'}
            </Badge>
          </HStack>
        </Flex>

        {/* Compact Stats */}
        {clusterStatus && (
          <SimpleGrid columns={4} spacing={4}>
            {[
              { label: 'Nodes', value: clusterStatus.nodes, color: 'blue' },
              { label: 'Services', value: clusterStatus.totalServices || 15, color: 'green' },
              { label: 'Namespaces', value: clusterStatus.namespaces, color: 'purple' },
              { label: 'Health', value: '99%', color: 'orange' },
            ].map((stat, index) => (
              <Box
                key={index}
                p={3}
                bg="gray.50"
                borderRadius="lg"
                textAlign="center"
              >
                <Text fontSize="xs" color={textSecondary} textTransform="uppercase">
                  {stat.label}
                </Text>
                <Text fontSize="lg" fontWeight="bold" color={`${stat.color}.500`}>
                  {stat.value}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </GlassPanel>
  );
};
