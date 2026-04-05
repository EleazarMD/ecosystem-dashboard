import React from 'react';
import {
  Box,
  Card,
  CardBody,
  HStack,
  VStack,
  Text,
  Switch,
  Badge,
  Progress,
  IconButton,
  Tooltip,
  Spinner,
  Link,
} from '@chakra-ui/react';
import { 
  RefreshIcon, 
  ExternalLinkIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon
} from '@chakra-ui/icons';
import { useKnowledgeGraphControl } from '../../hooks/useKnowledgeGraphControl';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KnowledgeGraphWidgetProps {
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  refreshInterval?: number;
}

const KnowledgeGraphWidget: React.FC<KnowledgeGraphWidgetProps> = ({
  showDetails = false,
  size = 'md',
  refreshInterval = 60000 // 1 minute for widget
}) => {
  const {
    systemStatus,
    isLoading,
    isToggling,
    lastUpdate,
    error,
    isSystemRunning,
    healthPercentage,
    fetchSystemStatus,
    toggleSystem,
    getStatusColor
  } = useKnowledgeGraphControl({ refreshInterval });

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const getStatusIcon = (status?: string) => {
    const iconSize = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    switch (status) {
      case 'fully_operational': 
        return <CheckCircleIcon color="green.500" boxSize={iconSize} />;
      case 'partially_operational': 
        return <WarningIcon color="yellow.500" boxSize={iconSize} />;
      case 'stopped': 
        return <InfoIcon color="red.500" boxSize={iconSize} />;
      default: 
        return <InfoIcon color={useSemanticToken('text.secondary')} boxSize={iconSize} />;
    }
  };

  const getSizeProps = () => {
    switch (size) {
      case 'sm':
        return {
          cardPadding: 3,
          headingSize: 'sm',
          textSize: 'xs',
          switchSize: 'sm',
          iconSize: 'xs'
        };
      case 'lg':
        return {
          cardPadding: 6,
          headingSize: 'md',
          textSize: 'sm',
          switchSize: 'lg',
          iconSize: 'sm'
        };
      default: // md
        return {
          cardPadding: 4,
          headingSize: 'sm',
          textSize: 'xs',
          switchSize: 'md',
          iconSize: 'xs'
        };
    }
  };

  const sizeProps = getSizeProps();

  if (error && !systemStatus) {
    return (
      <Card bg={cardBg} borderColor="red.200" borderWidth={1} maxW="400px">
        <CardBody p={sizeProps.cardPadding}>
          <VStack spacing={2}>
            <HStack>
              <InfoIcon color="red.500" />
              <Text fontSize={sizeProps.textSize} color="red.600" fontWeight="medium">
                Knowledge Graph Offline
              </Text>
            </HStack>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
              Unable to connect to control API
            </Text>
            <IconButton
              icon={<RefreshIcon />}
              size={sizeProps.iconSize}
              variant="ghost"
              onClick={fetchSystemStatus}
              isLoading={isLoading}
              aria-label="Retry connection"
            />
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1} maxW="400px">
      <CardBody p={sizeProps.cardPadding}>
        <VStack spacing={3} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              {systemStatus && getStatusIcon(systemStatus.summary.status)}
              <VStack align="start" spacing={0}>
                <Text fontSize={sizeProps.headingSize} fontWeight="semibold">
                  Knowledge Graph
                </Text>
                {systemStatus && (
                  <Badge 
                    colorScheme={getStatusColor(systemStatus.summary.status)} 
                    size="sm"
                    fontSize="xs"
                  >
                    {systemStatus.summary.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </VStack>
            </HStack>

            <HStack spacing={1}>
              <Tooltip label="Refresh Status">
                <IconButton
                  icon={<RefreshIcon />}
                  size={sizeProps.iconSize}
                  variant="ghost"
                  onClick={fetchSystemStatus}
                  isLoading={isLoading}
                  aria-label="Refresh status"
                />
              </Tooltip>
              
              <Tooltip label="Open Control Panel">
                <Link href="/knowledge-graph-control" isExternal>
                  <IconButton
                    icon={<ExternalLinkIcon />}
                    size={sizeProps.iconSize}
                    variant="ghost"
                    aria-label="Open control panel"
                  />
                </Link>
              </Tooltip>
            </HStack>
          </HStack>

          {/* Control Switch */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <Text fontSize={sizeProps.textSize} fontWeight="medium">
                System Control
              </Text>
              {systemStatus && (
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {systemStatus.summary.healthy}/{systemStatus.summary.total} services
                </Text>
              )}
            </VStack>

            <HStack spacing={2}>
              <Text fontSize={sizeProps.textSize} color={useSemanticToken('text.secondary')}>
                {isSystemRunning ? 'ON' : 'OFF'}
              </Text>
              <Switch
                size={sizeProps.switchSize}
                isChecked={isSystemRunning}
                onChange={(e) => toggleSystem(e.target.checked)}
                isDisabled={isToggling || isLoading}
                colorScheme="green"
              />
              {isToggling && <Spinner size="sm" />}
            </HStack>
          </HStack>

          {/* Health Progress */}
          {systemStatus && showDetails && (
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="medium">Health</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{healthPercentage}%</Text>
              </HStack>
              <Progress 
                value={healthPercentage} 
                colorScheme={getStatusColor(systemStatus.summary.status)}
                size="sm"
                hasStripe
                isAnimated={isSystemRunning}
              />
            </Box>
          )}

          {/* Service Count Details */}
          {systemStatus && showDetails && (
            <HStack justify="space-between" fontSize="xs">
              <VStack align="start" spacing={0}>
                <Text color="green.600">{systemStatus.summary.healthy} Healthy</Text>
                <Text color={useSemanticToken('text.secondary')}>
                  {systemStatus.summary.total - systemStatus.summary.healthy} Stopped
                </Text>
              </VStack>
              {lastUpdate && (
                <Text color={useSemanticToken('text.tertiary')} textAlign="right">
                  {lastUpdate.toLocaleTimeString()}
                </Text>
              )}
            </HStack>
          )}

          {/* Compact Status for small size */}
          {!showDetails && lastUpdate && (
            <Text fontSize="xs" color={useSemanticToken('text.tertiary')} textAlign="center">
              Updated {lastUpdate.toLocaleTimeString()}
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default KnowledgeGraphWidget;
