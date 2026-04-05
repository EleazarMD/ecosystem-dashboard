/**
 * Validation Quick Stats Component
 * Displays key metrics in a compact 2x2 grid
 */

import React from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  HStack,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiAlertCircle,
} from 'react-icons/fi';

interface ValidationQuickStatsProps {
  successRate: number;
  avgResponseTime: number;
  lastSuccess?: string;
  lastFailure?: string;
  consecutiveFailures?: number;
}

export function ValidationQuickStats({
  successRate,
  avgResponseTime,
  lastSuccess,
  lastFailure,
  consecutiveFailures = 0,
}: ValidationQuickStatsProps) {
  const cardBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const stats = [
    {
      label: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      icon: FiCheckCircle,
      iconColor: successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red',
    },
    {
      label: 'Avg Response',
      value: `${avgResponseTime}ms`,
      icon: FiClock,
      iconColor: avgResponseTime < 500 ? 'green' : avgResponseTime < 1000 ? 'yellow' : 'orange',
    },
    {
      label: 'Last Success',
      value: formatTimeAgo(lastSuccess),
      icon: FiActivity,
      iconColor: 'blue',
    },
    {
      label: 'Last Failure',
      value: consecutiveFailures > 0 ? `${consecutiveFailures} consecutive` : formatTimeAgo(lastFailure),
      icon: FiAlertCircle,
      iconColor: consecutiveFailures > 0 ? 'red' : 'gray',
    },
  ];

  return (
    <SimpleGrid columns={2} spacing={3}>
      {stats.map((stat) => (
        <Box
          key={stat.label}
          p={3}
          bg={cardBg}
          borderRadius="md"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Stat size="sm">
            <StatLabel fontSize="xs" color={useSemanticToken('text.secondary')}>
              <HStack spacing={1}>
                <Icon as={stat.icon} boxSize={3} color={`${stat.iconColor}.500`} />
                <span>{stat.label}</span>
              </HStack>
            </StatLabel>
            <StatNumber fontSize="md" fontWeight="bold">
              {stat.value}
            </StatNumber>
          </Stat>
        </Box>
      ))}
    </SimpleGrid>
  );
}

export default ValidationQuickStats;
