import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  HStack,
  VStack,
  Text,
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
  Circle,
  useToast
} from '@chakra-ui/react';
import {
  RefreshIcon, 
  ExternalLinkIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon,
  TimeIcon,
  RepeatClockIcon,
  CloudUploadIcon
} from '@chakra-ui/icons';

interface EnhancedIDEMemoryStatus {
  status: 'fully_operational' | 'degraded' | 'offline';
  components: {
    memoryWatcher: {
      healthy: boolean;
      filesTracked: number;
      syncStatus: 'idle' | 'syncing' | 'offline';
      memoryStats: {
        total: number;
        synced: number;
        failed: number;
        lastSyncTime: string;
      };
      offlineSync: {
        enabled: boolean;
        lastOfflineSync?: string;
        filesProcessedOffline?: number;
      };
    };
    memoryBackend: {
      healthy: boolean;
      memoriesLoaded: number;
      kgConnected: boolean;
      workspaceIsolation: boolean;
      syncFrequency: string;
      approvalQueue: {
        pending: number;
        processed: number;
      };
    };
    knowledgeGraph: {
      healthy: boolean;
      agentsConnected: number;
      a2aProtocol: boolean;
      memoryValidation: boolean;
      truthEngine: boolean;
    };
  };
  metrics: {
    overallHealth: boolean;
    syncEfficiency: number;
    totalMemories: number;
    syncedMemories: number;
    failedMemories: number;
    pendingApprovals: number;
  };
  capabilities: {
    offlineSync: boolean;
    workspaceIsolation: boolean;
    a2aProtocol: boolean;
    memoryValidation: boolean;
    truthEngine: boolean;
  };
  lastUpdate: string;
}

interface EnhancedIDEMemoryWidgetProps {
  showDetails?: boolean;
  showMetrics?: boolean;
  showCapabilities?: boolean;
  size?: 'sm' | 'md' | 'lg';
  refreshInterval?: number;
}

const EnhancedIDEMemoryWidget: React.FC<EnhancedIDEMemoryWidgetProps> = ({
  showDetails = true,
  showMetrics = true,
  showCapabilities = true,
  size = 'md',
  refreshInterval = 30000 // 30 seconds
}) => {
  const [status, setStatus] = useState<EnhancedIDEMemoryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const statBg = useSemanticToken('surface.base');
  const toast = useToast();

  const fetchStatus = async () => {
    try {
      setError(null);
      const response = await fetch('/api/ide-memory/enhanced-status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch status');
      }
    } catch (error: any) {
      console.error('Failed to fetch IDE Memory status:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getStatusIcon = (status?: string) => {
    const iconSize = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    switch (status) {
      case 'fully_operational': 
        return <CheckCircleIcon color="green.500" boxSize={iconSize} />;
      case 'degraded': 
        return <WarningIcon color="yellow.500" boxSize={iconSize} />;
      case 'offline': 
        return <InfoIcon color="red.500" boxSize={iconSize} />;
      default: 
        return <InfoIcon color={useSemanticToken('text.secondary')} boxSize={iconSize} />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'fully_operational': return 'green';
      case 'degraded': return 'yellow';
      case 'offline': return 'red';
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
          iconSize: 'xs'
        };
      case 'lg':
        return {
          cardPadding: 6,
          headingSize: 'lg',
          textSize: 'md',
          iconSize: 'sm'
        };
      default: // md
        return {
          cardPadding: 4,
          headingSize: 'md',
          textSize: 'sm',
          iconSize: 'xs'
        };
    }
  };

  const sizeProps = getSizeProps();

  if (error && !status) {
    return (
      <Card bg={cardBg} borderColor="red.200" borderWidth={1} maxW="600px">
        <CardBody p={sizeProps.cardPadding}>
          <VStack spacing={2}>
            <HStack>
              <InfoIcon color="red.500" />
              <Text fontSize={sizeProps.textSize} color="red.600" fontWeight="medium">
                IDE Memory Offline
              </Text>
            </HStack>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
              Unable to connect to memory services
            </Text>
            <IconButton
              icon={<RefreshIcon />}
              size={sizeProps.iconSize}
              variant="ghost"
              onClick={fetchStatus}
              isLoading={isLoading}
              aria-label="Retry connection"
            />
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1} maxW="600px">
      <CardBody p={sizeProps.cardPadding}>
        <VStack spacing={4} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <HStack spacing={2}>
              {status && getStatusIcon(status.status)}
              <VStack align="start" spacing={0}>
                <Text fontSize={sizeProps.headingSize} fontWeight="semibold">
                  IDE Memory System
                </Text>
                {status && (
                  <HStack spacing={2}>
                    <Badge 
                      colorScheme={getStatusColor(status.status)} 
                      size="sm"
                      fontSize="xs"
                    >
                      {status.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {status.capabilities.offlineSync && (
                      <Badge colorScheme="blue" size="sm" fontSize="xs">
                        OFFLINE SYNC
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
                  onClick={fetchStatus}
                  isLoading={isLoading}
                  aria-label="Refresh status"
                />
              </Tooltip>
              
              <Tooltip label="Open IDE Memory Dashboard">
                <Link href="/ide-memory" isExternal>
                  <IconButton
                    icon={<ExternalLinkIcon />}
                    size={sizeProps.iconSize}
                    variant="ghost"
                    aria-label="Open IDE Memory dashboard"
                  />
                </Link>
              </Tooltip>
            </HStack>
          </HStack>

          {/* Sync Status */}
          {status && showDetails && (
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="medium">Sync Efficiency</Text>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{status.metrics.syncEfficiency}%</Text>
              </HStack>
              <Progress 
                value={status.metrics.syncEfficiency} 
                colorScheme={getStatusColor(status.status)}
                size="sm"
                hasStripe
                isAnimated={status.components.memoryWatcher.syncStatus === 'syncing'}
              />
            </Box>
          )}

          {/* Enhanced Metrics */}
          {status && showMetrics && (
            <>
              <Divider />
              <SimpleGrid columns={3} spacing={3}>
                <Stat bg={statBg} p={2} borderRadius="md" size="sm">
                  <StatLabel fontSize="xs">Total Memories</StatLabel>
                  <StatNumber fontSize="sm">
                    {status.metrics.totalMemories}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color="green.500">
                    {status.metrics.syncedMemories} synced
                  </StatHelpText>
                </Stat>
                
                <Stat bg={statBg} p={2} borderRadius="md" size="sm">
                  <StatLabel fontSize="xs">Files Tracked</StatLabel>
                  <StatNumber fontSize="sm">
                    {status.components.memoryWatcher.filesTracked}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color={status.components.memoryWatcher.healthy ? 'green.500' : 'red.500'}>
                    {status.components.memoryWatcher.syncStatus}
                  </StatHelpText>
                </Stat>
                
                <Stat bg={statBg} p={2} borderRadius="md" size="sm">
                  <StatLabel fontSize="xs">Approvals</StatLabel>
                  <StatNumber fontSize="sm">
                    {status.metrics.pendingApprovals}
                  </StatNumber>
                  <StatHelpText fontSize="xs" color="blue.500">
                    pending
                  </StatHelpText>
                </Stat>
              </SimpleGrid>
            </>
          )}

          {/* Component Status */}
          {status && showDetails && (
            <>
              <Divider />
              <VStack align="stretch" spacing={2}>
                <Text fontSize="xs" fontWeight="medium" color={useSemanticToken('text.secondary')}>Component Status</Text>
                
                <HStack justify="space-between" fontSize="xs">
                  <HStack>
                    <Circle size="8px" bg={status.components.memoryWatcher.healthy ? 'green.500' : 'red.500'} />
                    <Text>Memory Watcher</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Badge size="xs" colorScheme={status.components.memoryWatcher.healthy ? 'green' : 'red'}>
                      {status.components.memoryWatcher.healthy ? 'HEALTHY' : 'OFFLINE'}
                    </Badge>
                    {status.components.memoryWatcher.offlineSync.enabled && (
                      <RepeatClockIcon color="blue.500" boxSize={3} />
                    )}
                  </HStack>
                </HStack>

                <HStack justify="space-between" fontSize="xs">
                  <HStack>
                    <Circle size="8px" bg={status.components.memoryBackend.healthy ? 'green.500' : 'red.500'} />
                    <Text>Memory Backend</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Badge size="xs" colorScheme={status.components.memoryBackend.healthy ? 'green' : 'red'}>
                      {status.components.memoryBackend.memoriesLoaded} loaded
                    </Badge>
                    {status.components.memoryBackend.kgConnected && (
                      <CloudUploadIcon color="green.500" boxSize={3} />
                    )}
                  </HStack>
                </HStack>

                <HStack justify="space-between" fontSize="xs">
                  <HStack>
                    <Circle size="8px" bg={status.components.knowledgeGraph.healthy ? 'green.500' : 'red.500'} />
                    <Text>Knowledge Graph</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Badge size="xs" colorScheme={status.components.knowledgeGraph.healthy ? 'green' : 'red'}>
                      {status.components.knowledgeGraph.agentsConnected} agents
                    </Badge>
                    {status.components.knowledgeGraph.a2aProtocol && (
                      <Badge size="xs" colorScheme="blue">A2A</Badge>
                    )}
                  </HStack>
                </HStack>
              </VStack>
            </>
          )}

          {/* Capabilities */}
          {status && showCapabilities && (
            <>
              <Divider />
              <VStack align="stretch" spacing={2}>
                <Text fontSize="xs" fontWeight="medium" color={useSemanticToken('text.secondary')}>Capabilities</Text>
                <HStack wrap="wrap" spacing={1}>
                  {status.capabilities.offlineSync && (
                    <Badge colorScheme="blue" size="sm">Offline Sync</Badge>
                  )}
                  {status.capabilities.workspaceIsolation && (
                    <Badge colorScheme="green" size="sm">Workspace Isolation</Badge>
                  )}
                  {status.capabilities.a2aProtocol && (
                    <Badge colorScheme="purple" size="sm">A2A Protocol</Badge>
                  )}
                  {status.capabilities.memoryValidation && (
                    <Badge colorScheme="orange" size="sm">Memory Validation</Badge>
                  )}
                  {status.capabilities.truthEngine && (
                    <Badge colorScheme="red" size="sm">Truth Engine</Badge>
                  )}
                </HStack>
              </VStack>
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

export default EnhancedIDEMemoryWidget;
