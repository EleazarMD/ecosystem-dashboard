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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Flex,
  Circle
} from '@chakra-ui/react';
import { 
  RefreshIcon, 
  ExternalLinkIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon,
  TimeIcon,
  SettingsIcon
} from '@chakra-ui/icons';
import { useKnowledgeGraphControl } from '../../hooks/useKnowledgeGraphControl';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EnhancedKnowledgeGraphWidgetProps {
  showDetails?: boolean;
  showMetrics?: boolean;
  showA2AStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  refreshInterval?: number;
}

const EnhancedKnowledgeGraphWidget: React.FC<EnhancedKnowledgeGraphWidgetProps> = ({
  showDetails = true,
  showMetrics = true,
  showA2AStatus = true,
  size = 'md',
  refreshInterval = 30000 // 30 seconds for enhanced widget
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
  const statBg = useSemanticToken('surface.base');

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'database': return 'blue';
      case 'core': return 'green';
      case 'inference': return 'purple';
      case 'agent': return 'orange';
      default: return 'gray';
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
          headingSize: 'lg',
          textSize: 'md',
          switchSize: 'lg',
          iconSize: 'sm'
        };
      default: // md
        return {
          cardPadding: 4,
          headingSize: 'md',
          textSize: 'sm',
          switchSize: 'md',
          iconSize: 'xs'
        };
    }
  };

  const sizeProps = getSizeProps();

  if (error && !systemStatus) {
    return (
      <Card bg={cardBg} borderColor="red.200" borderWidth={1} maxW="600px">
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

  // Enhanced system status with new integrations
  const enhancedSystemStatus = systemStatus as any; // Type assertion for enhanced properties

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1} maxW="600px">
      <CardBody p={sizeProps.cardPadding}>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              {systemStatus && getStatusIcon(systemStatus.summary.status)}
              <VStack align="start" spacing={0}>
                <Text fontSize={sizeProps.headingSize} fontWeight="semibold">
                  AI Homelab Knowledge Graph
                </Text>
                {systemStatus && (
                  <HStack spacing={2}>
                    <Badge 
                      colorScheme={getStatusColor(systemStatus.summary.status)} 
                      size="sm"
                      fontSize="xs"
                    >
                      {systemStatus.summary.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {enhancedSystemStatus?.summary?.avgResponseTime && (
                      <Badge colorScheme="gray" size="sm" fontSize="xs">
                        {enhancedSystemStatus.summary.avgResponseTime}ms
                      </Badge>
                    )}
                  </HStack>
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

          {/* System Control */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <Text fontSize={sizeProps.textSize} fontWeight="medium">
                System Control
              </Text>
              {systemStatus && (
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  {systemStatus.summary.healthy}/{systemStatus.summary.total} services
                  {enhancedSystemStatus?.summary?.a2aEnabled && (
                    <> • {enhancedSystemStatus.summary.a2aEnabled}/{enhancedSystemStatus.summary.agentCount} A2A</>
                  )}
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
                <Text fontSize="xs" fontWeight="medium">System Health</Text>
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

          {/* Enhanced Metrics */}
          {systemStatus && showMetrics && enhancedSystemStatus?.metrics && (
            <>
              <Divider />
              <SimpleGrid columns={3} spacing={3}>
                <Stat bg={statBg} p={2} borderRadius="md" size="sm">
                  <StatLabel fontSize="xs">Uptime</StatLabel>
                  <StatNumber fontSize="sm">
                    {Math.round(enhancedSystemStatus.metrics.uptime * 100)}%
                  </StatNumber>
                </Stat>
                
                <Stat bg={statBg} p={2} borderRadius="md" size="sm">
                  <StatLabel fontSize="xs">A2A Protocol</StatLabel>
                  <StatNumber fontSize="sm">
                    {Math.round(enhancedSystemStatus.metrics.a2aCompliance * 100)}%
                  </StatNumber>
                </Stat>
                
                <Stat bg={statBg} p={2} borderRadius="md" size="sm">
                  <StatLabel fontSize="xs">Performance</StatLabel>
                  <StatNumber fontSize="sm" color={
                    enhancedSystemStatus.metrics.performance === 'excellent' ? 'green.500' :
                    enhancedSystemStatus.metrics.performance === 'good' ? 'yellow.500' : 'red.500'
                  }>
                    {enhancedSystemStatus.metrics.performance}
                  </StatNumber>
                </Stat>
              </SimpleGrid>
            </>
          )}

          {/* Service Categories */}
          {systemStatus && showDetails && enhancedSystemStatus?.servicesByCategory && (
            <>
              <Divider />
              <VStack align="stretch" spacing={2}>
                <Text fontSize="xs" fontWeight="medium" color={useSemanticToken('text.secondary')}>Service Categories</Text>
                {Object.entries(enhancedSystemStatus.servicesByCategory).map(([category, services]: [string, any[]]) => (
                  <HStack key={category} justify="space-between" fontSize="xs">
                    <HStack>
                      <Circle size="8px" bg={`${getCategoryColor(category)}.500`} />
                      <Text textTransform="capitalize">{category}</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Text color="green.600">{services.filter(s => s.healthy).length}</Text>
                      <Text color={useSemanticToken('text.secondary')}>/ {services.length}</Text>
                      {showA2AStatus && category === 'agent' && (
                        <Badge size="xs" colorScheme="blue">
                          A2A: {services.filter(s => s.a2a?.enabled).length}
                        </Badge>
                      )}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </>
          )}

          {/* Memory Watcher Status */}
          {systemStatus && showDetails && (
            <>
              <Divider />
              <HStack justify="space-between" fontSize="xs">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">Memory Watcher</Text>
                  <Text color={useSemanticToken('text.secondary')}>Offline sync enabled</Text>
                </VStack>
                <VStack align="end" spacing={0}>
                  <Badge 
                    colorScheme={enhancedSystemStatus?.services?.find((s: any) => s.key === 'memory-watcher')?.healthy ? 'green' : 'red'} 
                    size="sm"
                  >
                    {enhancedSystemStatus?.services?.find((s: any) => s.key === 'memory-watcher')?.healthy ? 'ACTIVE' : 'OFFLINE'}
                  </Badge>
                  <Text color={useSemanticToken('text.tertiary')}>Port 9578</Text>
                </VStack>
              </HStack>
            </>
          )}

          {/* Last Update */}
          {lastUpdate && (
            <HStack justify="center" fontSize="xs" color={useSemanticToken('text.tertiary')}>
              <TimeIcon boxSize={3} />
              <Text>Updated {lastUpdate.toLocaleTimeString()}</Text>
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default EnhancedKnowledgeGraphWidget;
