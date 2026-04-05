/**
 * Validation History Timeline Component
 * Shows recent validation attempts in a compact timeline
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';

interface ValidationHistoryItem {
  id: number;
  validated_at: string;
  valid: boolean;
  response_time_ms: number;
  error_type?: string;
  error_message?: string;
  validation_type: string;
}

interface ValidationHistoryTimelineProps {
  history: ValidationHistoryItem[];
  limit?: number;
  onViewAll?: () => void;
}

export function ValidationHistoryTimeline({
  history,
  limit = 5,
  onViewAll,
}: ValidationHistoryTimelineProps) {
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');

  const displayHistory = history.slice(0, limit);

  const formatTimeAgo = (dateString: string) => {
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

  const getIcon = (item: ValidationHistoryItem) => {
    if (item.valid) return FiCheckCircle;
    if (item.error_type === 'timeout') return FiClock;
    if (item.error_type === 'quota') return FiAlertCircle;
    return FiXCircle;
  };

  const getColor = (item: ValidationHistoryItem) => {
    if (item.valid) return 'green';
    if (item.error_type === 'timeout') return 'orange';
    if (item.error_type === 'quota') return 'purple';
    if (item.error_type === 'auth') return 'red';
    return 'red';
  };

  const getErrorLabel = (item: ValidationHistoryItem) => {
    if (item.valid) return 'Success';
    if (item.error_type === 'timeout') return 'Timeout';
    if (item.error_type === 'quota') return 'Quota Exceeded';
    if (item.error_type === 'auth') return 'Auth Failed';
    if (item.error_type === 'network') return 'Network Error';
    return 'Failed';
  };

  if (displayHistory.length === 0) {
    return (
      <Box p={4} textAlign="center" color={mutedText}>
        <Text fontSize="sm">No validation history yet</Text>
        <Text fontSize="xs" mt={1}>
          Click "Test Now" to validate this key
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="bold" color={mutedText}>
          RECENT CHECKS
        </Text>
        {onViewAll && history.length > limit && (
          <Button size="xs" variant="ghost" onClick={onViewAll}>
            View All →
          </Button>
        )}
      </HStack>

      <VStack spacing={2} align="stretch">
        {displayHistory.map((item, index) => {
          const icon = getIcon(item);
          const color = getColor(item);
          const isLast = index === displayHistory.length - 1;

          return (
            <HStack
              key={item.id}
              spacing={3}
              position="relative"
              pl={2}
              _before={
                isLast
                  ? undefined
                  : {
                      content: '""',
                      position: 'absolute',
                      left: '11px',
                      top: '24px',
                      width: '2px',
                      height: 'calc(100% + 8px)',
                      bg: borderColor,
                    }
              }
            >
              <Icon
                as={icon}
                boxSize={4}
                color={`${color}.500`}
                position="relative"
                zIndex={1}
              />

              <Box flex={1}>
                <HStack justify="space-between" mb={0.5}>
                  <Text fontSize="xs" fontWeight="medium">
                    {formatTimeAgo(item.validated_at)}
                  </Text>
                  <HStack spacing={2}>
                    <Badge
                      colorScheme={color}
                      fontSize="2xs"
                      textTransform="capitalize"
                    >
                      {getErrorLabel(item)}
                    </Badge>
                    <Text fontSize="2xs" color={mutedText}>
                      {item.response_time_ms}ms
                    </Text>
                    <Badge
                      variant="outline"
                      fontSize="2xs"
                      textTransform="capitalize"
                    >
                      {item.validation_type}
                    </Badge>
                  </HStack>
                </HStack>

                {!item.valid && item.error_message && (
                  <Text fontSize="2xs" color={`${color}.600`} noOfLines={1}>
                    {item.error_message}
                  </Text>
                )}
              </Box>
            </HStack>
          );
        })}
      </VStack>

      {history.length > limit && !onViewAll && (
        <Text fontSize="xs" color={mutedText} textAlign="center">
          + {history.length - limit} more checks
        </Text>
      )}
    </VStack>
  );
}

export default ValidationHistoryTimeline;
