/**
 * Knowledge Graph Status Component
 * 
 * This component displays the status of the Knowledge Graph MCP service integration,
 * showing whether real responses via AI Gateway are being used or mock data.
 * 
 * Architecture Flow: Dashboard → AI Gateway → Knowledge Graph MCP Server
 */

import React from 'react';
import { Box, Badge, Text, Tooltip, HStack, Icon } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import { isKGGatewayInitialized, isKGGatewayReadyWithAIGateway } from '@/lib/kg-gateway-initializer';
import { useAIGatewayDetection } from '@/hooks/useAIGatewayDetection';

export const KnowledgeGraphStatus: React.FC = () => {
  const { isAvailable: isAIGatewayAvailable, error } = useAIGatewayDetection();
  const statusError = error?.message;
  const isInitialized = isKGGatewayInitialized();

  // Determine status display properties
  const getStatusProps = () => {
    if (statusError) {
      return {
        icon: WarningIcon,
        color: 'red.500',
        status: 'Error',
        message: `Connection error: ${statusError}`,
        badge: 'mock',
        badgeColor: 'red'
      };
    }

    if (isAIGatewayAvailable && isKGGatewayReadyWithAIGateway()) {
      return {
        icon: CheckCircleIcon,
        color: 'green.500',
        status: 'Connected',
        message: 'Using real Knowledge Graph responses via AI Gateway MCP',
        badge: 'real',
        badgeColor: 'green'
      };
    }
    
    if (process.env.NEXT_PUBLIC_AI_GATEWAY_ENABLED === 'true') {
      return {
        icon: WarningIcon,
        color: 'orange.500',
        status: 'Disconnected',
        message: 'AI Gateway enabled but not available, using mock responses',
        badge: 'mock',
        badgeColor: 'orange'
      };
    }

    return {
      icon: InfoIcon,
      color: 'blue.500',
      status: 'Development',
      message: 'Using mock Knowledge Graph responses',
      badge: 'mock',
      badgeColor: 'blue'
    };
  };

  const statusProps = getStatusProps();

  return (
    <Tooltip 
      hasArrow
      label={statusProps.message} 
      placement="top"
      bg={useSemanticToken('surface.elevated')}
    >
      <HStack spacing={2} alignItems="center">
        <Box display="flex" alignItems="center">
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mr={1}>
            Knowledge Graph:
          </Text>
          <Badge 
            colorScheme={statusProps.badgeColor} 
            variant="subtle" 
            fontSize="xs"
          >
            {statusProps.badge}
          </Badge>
        </Box>
        <Icon as={statusProps.icon} color={statusProps.color} boxSize={3} />
      </HStack>
    </Tooltip>
  );
};

export default KnowledgeGraphStatus;
