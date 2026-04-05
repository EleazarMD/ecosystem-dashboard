'use client';

import React from 'react';
import { keyframes } from "@emotion/react";
import {
  HStack,
  Text,
  Badge,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { ConnectionStatus } from '@/hooks/useSecurityWebSocket';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  clientId?: string | null;
  compact?: boolean;
}

const pulseAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
`;

const statusConfig: Record<ConnectionStatus, {
  color: string;
  label: string;
  description: string;
}> = {
  connecting: {
    color: 'yellow',
    label: 'Connecting',
    description: 'Establishing WebSocket connection...',
  },
  connected: {
    color: 'green',
    label: 'Live',
    description: 'Real-time updates active',
  },
  disconnected: {
    color: 'gray',
    label: 'Offline',
    description: 'WebSocket disconnected',
  },
  error: {
    color: 'red',
    label: 'Error',
    description: 'Connection error occurred',
  },
};

function PulsingDot({ color, isAnimated }: { color: string; isAnimated: boolean }) {
  return (
    <Icon viewBox="0 0 12 12" boxSize={3}>
      <circle
        cx="6"
        cy="6"
        r="5"
        fill={`var(--chakra-colors-${color}-400)`}
        style={{
          animation: isAnimated ? `${pulseAnimation} 1.5s ease-in-out infinite` : undefined,
        }}
      />
    </Icon>
  );
}

export function ConnectionStatusIndicator({
  status,
  clientId,
  compact = false,
}: ConnectionStatusIndicatorProps) {
  const config = statusConfig[status];
  const isAnimated = status === 'connecting' || status === 'connected';

  const tooltipLabel = clientId 
    ? `${config.description}\nClient: ${clientId}`
    : config.description;

  if (compact) {
    return (
      <Tooltip label={tooltipLabel} hasArrow>
        <HStack spacing={1} cursor="default">
          <PulsingDot color={config.color} isAnimated={isAnimated} />
          <Badge 
            colorScheme={config.color} 
            variant="subtle" 
            fontSize="xs"
            textTransform="uppercase"
          >
            {config.label}
          </Badge>
        </HStack>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={tooltipLabel} hasArrow>
      <HStack 
        spacing={2} 
        px={3} 
        py={1.5} 
        bg="whiteAlpha.100" 
        borderRadius="full"
        cursor="default"
      >
        <PulsingDot color={config.color} isAnimated={isAnimated} />
        <Text fontSize="xs" fontWeight="medium" color={`${config.color}.300`}>
          {config.label}
        </Text>
        {status === 'connected' && (
          <Text fontSize="xs" color="gray.500">
            Real-time
          </Text>
        )}
      </HStack>
    </Tooltip>
  );
}
