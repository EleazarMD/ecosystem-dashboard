/**
 * Health Score Badge Component
 * Displays a compact, color-coded health score (0-100)
 * Used in key cards and panels
 */

import React from 'react';
import {
  Box,
  Circle,
  Tooltip,
  Text,
  VStack,
  HStack,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface HealthScoreBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  lastChecked?: string;
  successRate?: number;
  avgResponseTime?: number;
}

export function HealthScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  lastChecked,
  successRate,
  avgResponseTime,
}: HealthScoreBadgeProps) {
  // Determine status and color based on score
  const getStatus = (score: number) => {
    if (score >= 90) return { label: 'Healthy', color: 'green' };
    if (score >= 70) return { label: 'Degraded', color: 'yellow' };
    if (score >= 40) return { label: 'Critical', color: 'orange' };
    return { label: 'Failed', color: 'red' };
  };

  const status = getStatus(score);

  // Size configurations
  const sizes = {
    sm: { circle: '32px', fontSize: '11px', iconSize: '8px' },
    md: { circle: '44px', fontSize: '14px', iconSize: '10px' },
    lg: { circle: '64px', fontSize: '18px', iconSize: '12px' },
  };

  const config = sizes[size];

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Format time ago
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

  const badge = (
    <VStack spacing={1} align="center">
      <Circle
        size={config.circle}
        bg={bgColor}
        borderWidth="2px"
        borderColor={`${status.color}.500`}
        position="relative"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          transform: 'scale(1.05)',
          boxShadow: 'md',
        }}
      >
        <VStack spacing={0}>
          <Text
            fontSize={config.fontSize}
            fontWeight="bold"
            color={`${status.color}.600`}
          >
            {score}
          </Text>
          <Circle size={config.iconSize} bg={`${status.color}.500`} />
        </VStack>
      </Circle>
      {showLabel && (
        <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="medium">
          {status.label}
        </Text>
      )}
    </VStack>
  );

  // Render with or without tooltip
  if (lastChecked || successRate !== undefined || avgResponseTime !== undefined) {
    return (
      <Tooltip
        label={
          <VStack align="start" spacing={1} fontSize="xs">
            <Text fontWeight="bold">Health Score: {score}/100</Text>
            <Text>Status: {status.label}</Text>
            {successRate !== undefined && (
              <Text>Success: {successRate.toFixed(1)}%</Text>
            )}
            {avgResponseTime !== undefined && (
              <Text>Avg Response: {avgResponseTime}ms</Text>
            )}
            {lastChecked && (
              <Text>Last Check: {formatTimeAgo(lastChecked)}</Text>
            )}
            <Text fontSize="2xs" color={useSemanticToken('text.tertiary')} mt={1}>
              Click for details
            </Text>
          </VStack>
        }
        placement="top"
        hasArrow
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

export default HealthScoreBadge;
