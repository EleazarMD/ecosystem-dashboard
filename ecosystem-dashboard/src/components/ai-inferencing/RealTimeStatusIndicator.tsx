/**
 * Real-Time Status Indicator Component
 * Shows live connection status and real-time updates from AI Gateway Backend
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  HStack,
  Text,
  Badge,
  Tooltip,
  Icon,
  Spinner,
  
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, TimeIcon } from '@chakra-ui/icons';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface RealTimeStatusIndicatorProps {
  isConnected: boolean;
  isLoading: boolean;
  error?: string | null;
  lastUpdate?: string;
  className?: string;
}

export function RealTimeStatusIndicator({
  isConnected,
  isLoading,
  error,
  lastUpdate,
  className
}: RealTimeStatusIndicatorProps) {
  const [pulseCount, setPulseCount] = useState(0);
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Pulse animation for live updates
  useEffect(() => {
    if (isConnected && !isLoading) {
      const interval = setInterval(() => {
        setPulseCount(prev => prev + 1);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isLoading]);

  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');
  const infoColor = useSemanticToken('interactive.primary');
  const disabledColor = useSemanticToken('text.disabled');
  const successBg = useSemanticToken('status.successSubtle');
  const errorBg = useSemanticToken('status.errorSubtle');
  const infoBg = useSemanticToken('interactive.primarySubtle'); // Assuming this exists or similar
  const disabledBg = useSemanticToken('surface.highlight');

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <Spinner size="xs" />,
        text: 'Connecting...',
        color: infoColor,
        bg: infoBg,
        description: 'Establishing connection to AI Gateway Backend'
      };
    }

    if (error) {
      return {
        icon: <WarningIcon />,
        text: 'Connection Error',
        color: errorColor,
        bg: errorBg,
        description: error
      };
    }

    if (isConnected) {
      return {
        icon: <CheckCircleIcon />,
        text: 'Live',
        color: successColor,
        bg: successBg,
        description: 'Real-time connection active'
      };
    }

    return {
      icon: <TimeIcon />,
      text: 'Offline',
      color: disabledColor,
      bg: disabledBg,
      description: 'Not connected to AI Gateway Backend'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Box
      className={className}
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      px={3}
      py={2}
      shadow="sm"
    >
      <HStack spacing={3}>
        <Tooltip label={statusInfo.description} placement="top">
          <HStack spacing={2}>
            <Box
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon
                as={statusInfo.icon.type}
                color={statusInfo.color}
                boxSize={4}
              />
              {isConnected && !isLoading && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  width="12px"
                  height="12px"
                  borderRadius="full"
                  bg={statusInfo.color}
                  opacity={0.6}
                  animation={`pulse 2s infinite`}
                  style={{
                    animationDelay: `${pulseCount * 0.1}s`
                  }}
                />
              )}
            </Box>
            <Badge
              bg={statusInfo.bg}
              color={statusInfo.color}
              variant="subtle"
              fontSize="xs"
              fontWeight="medium"
            >
              {statusInfo.text}
            </Badge>
          </HStack>
        </Tooltip>

        {lastUpdate && isConnected && (
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Updated {new Date(lastUpdate).toLocaleTimeString()}
          </Text>
        )}

        {isConnected && !isLoading && (
          <Box
            width="8px"
            height="8px"
            borderRadius="full"
            bg={useSemanticToken('status.success')}
            animation="pulse 1.5s infinite"
          />
        )}
      </HStack>

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
        }
      `}</style>
    </Box>
  );
}
