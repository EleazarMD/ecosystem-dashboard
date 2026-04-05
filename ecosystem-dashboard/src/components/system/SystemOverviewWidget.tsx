import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  HStack,
  VStack,
  Text,
  Badge,
  Progress,
  IconButton,
  Tooltip,
  Spinner,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Circle,
  Flex,
  Spacer,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import {
  RefreshIcon,
  CheckCircleIcon,
  WarningIcon,
  InfoIcon,
  TimeIcon,
  ViewIcon,
  SettingsIcon
} from '@chakra-ui/icons';

interface SystemOverviewData {
  knowledgeGraph: {
    status: string;
    healthy: number;
    total: number;
    a2aEnabled: number;
    agentCount: number;
    avgResponseTime: number;
  };
  ideMemory: {
    status: string;
    syncEfficiency: number;
    totalMemories: number;
    pendingApprovals: number;
    offlineSync: boolean;
  };
  infrastructure: {
    databases: number;
    services: number;
    agents: number;
    memoryWatcher: boolean;
  };
}

interface SystemOverviewWidgetProps {
  refreshInterval?: number;
  showDetails?: boolean;
}

const SystemOverviewWidget: React.FC<SystemOverviewWidgetProps> = ({
  refreshInterval = 60000, // 1 minute
  showDetails = true
}) => {
  const [data, setData] = useState<SystemOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const statBg = useSemanticToken('surface.base');
  const alertBg = useSemanticToken('surface.highlight');

  const fetchSystemOverview = async () => {
    try {
      setError(null);
      
      // Fetch Knowledge Graph status
      const kgResponse = await fetch('/api/knowledge-graph/control?action=status');
      const kgData = await kgResponse.json();
      
      // Fetch IDE Memory status
      const memoryResponse = await fetch('/api/ide-memory/enhanced-status');
      const memoryData = await memoryResponse.json();
      
      if (kgResponse.ok && memoryResponse.ok && memoryData.success) {
        const overview: SystemOverviewData = {
          knowledgeGraph: {
            status: kgData.summary?.status || 'unknown',
            healthy: kgData.summary?.healthy || 0,
            total: kgData.summary?.total || 0,
            a2aEnabled: kgData.summary?.a2aEnabled || 0,
            agentCount: kgData.summary?.agentCount || 0,
            avgResponseTime: kgData.summary?.avgResponseTime || 0
          },
          ideMemory: {
            status: memoryData.data?.status || 'unknown',
            syncEfficiency: memoryData.data?.metrics?.syncEfficiency || 0,
            totalMemories: memoryData.data?.metrics?.totalMemories || 0,
            pendingApprovals: memoryData.data?.metrics?.pendingApprovals || 0,
            offlineSync: memoryData.data?.capabilities?.offlineSync || false
          },
          infrastructure: {
            databases: 3, // Neo4j, PostgreSQL, Redis
            services: kgData.summary?.total || 0,
            agents: kgData.summary?.agentCount || 0,
            memoryWatcher: kgData.services?.find((s: any) => s.key === 'memory-watcher')?.healthy || false
          }
        };
        
        setData(overview);
        setLastUpdate(new Date());
      } else {
        throw new Error('Failed to fetch system overview data');
      }
    } catch (error: any) {
      console.error('Failed to fetch system overview:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemOverview();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchSystemOverview, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const getOverallStatus = () => {
    if (!data) return { status: 'unknown', color: 'gray' };
    
    const kgHealthy = data.knowledgeGraph.status === 'fully_operational';
    const memoryHealthy = data.ideMemory.status === 'fully_operational';
    
    if (kgHealthy && memoryHealthy) {
      return { status: 'Fully Operational', color: 'green' };
    } else if (kgHealthy || memoryHealthy) {
      return { status: 'Partially Operational', color: 'yellow' };
    } else {
      return { status: 'System Issues', color: 'red' };
    }
  };

  const overallStatus = getOverallStatus();

  if (error && !data) {
    return (
      <Card bg={cardBg} borderColor="red.200" borderWidth={1}>
        <CardBody p={4}>
          <VStack spacing={2}>
            <HStack>
              <InfoIcon color="red.500" />
              <Text fontSize="sm" color="red.600" fontWeight="medium">
                System Overview Unavailable
              </Text>
            </HStack>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
              Unable to fetch system status
            </Text>
            <IconButton
              icon={<RefreshIcon />}
              size="sm"
              variant="ghost"
              onClick={fetchSystemOverview}
              isLoading={isLoading}
              aria-label="Retry"
            />
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
      <CardHeader pb={2}>
        <Flex align="center">
          <HStack spacing={2}>
            <ViewIcon color={`${overallStatus.color}.500`} />
            <Text fontSize="lg" fontWeight="semibold">
              AI Homelab System Overview
            </Text>
            <Badge colorScheme={overallStatus.color} size="sm">
              {overallStatus.status}
            </Badge>
          </HStack>
          <Spacer />
          <Tooltip label="Refresh Overview">
            <IconButton
              icon={<RefreshIcon />}
              size="sm"
              variant="ghost"
              onClick={fetchSystemOverview}
              isLoading={isLoading}
              aria-label="Refresh overview"
            />
          </Tooltip>
        </Flex>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          {/* System Health Alert */}
          {data && data.infrastructure.memoryWatcher && data.ideMemory.offlineSync && (
            <Alert status="info" bg={alertBg} borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Enhanced Memory System Active!</AlertTitle>
                <AlertDescription fontSize="xs">
                  Memory Watcher with offline sync is operational. Your IDE memories are continuously synchronized.
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Key Metrics */}
          {data && (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <Stat bg={statBg} p={3} borderRadius="md" size="sm">
                <StatLabel fontSize="xs">Total Services</StatLabel>
                <StatNumber fontSize="lg" color={`${overallStatus.color}.500`}>
                  {data.knowledgeGraph.healthy}/{data.knowledgeGraph.total}
                </StatNumber>
                <StatHelpText fontSize="xs">
                  {Math.round((data.knowledgeGraph.healthy / data.knowledgeGraph.total) * 100)}% healthy
                </StatHelpText>
              </Stat>

              <Stat bg={statBg} p={3} borderRadius="md" size="sm">
                <StatLabel fontSize="xs">A2A Agents</StatLabel>
                <StatNumber fontSize="lg" color="purple.500">
                  {data.knowledgeGraph.a2aEnabled}/{data.knowledgeGraph.agentCount}
                </StatNumber>
                <StatHelpText fontSize="xs">
                  {data.knowledgeGraph.agentCount > 0 
                    ? Math.round((data.knowledgeGraph.a2aEnabled / data.knowledgeGraph.agentCount) * 100)
                    : 0}% A2A enabled
                </StatHelpText>
              </Stat>

              <Stat bg={statBg} p={3} borderRadius="md" size="sm">
                <StatLabel fontSize="xs">IDE Memories</StatLabel>
                <StatNumber fontSize="lg" color="blue.500">
                  {data.ideMemory.totalMemories}
                </StatNumber>
                <StatHelpText fontSize="xs">
                  {data.ideMemory.syncEfficiency}% sync efficiency
                </StatHelpText>
              </Stat>

              <Stat bg={statBg} p={3} borderRadius="md" size="sm">
                <StatLabel fontSize="xs">Response Time</StatLabel>
                <StatNumber fontSize="lg" color={
                  data.knowledgeGraph.avgResponseTime < 1000 ? 'green.500' :
                  data.knowledgeGraph.avgResponseTime < 3000 ? 'yellow.500' : 'red.500'
                }>
                  {data.knowledgeGraph.avgResponseTime}ms
                </StatNumber>
                <StatHelpText fontSize="xs">
                  Average response
                </StatHelpText>
              </Stat>
            </SimpleGrid>
          )}

          {/* System Components */}
          {data && showDetails && (
            <>
              <Divider />
              <VStack align="stretch" spacing={3}>
                <Text fontSize="sm" fontWeight="medium" color={useSemanticToken('text.secondary')}>System Components</Text>
                
                {/* Knowledge Graph */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Circle size="10px" bg={
                        data.knowledgeGraph.status === 'fully_operational' ? 'green.500' :
                        data.knowledgeGraph.status === 'partially_operational' ? 'yellow.500' : 'red.500'
                      } />
                      <Text fontSize="sm" fontWeight="medium">Knowledge Graph Stack</Text>
                    </HStack>
                    <Badge colorScheme={
                      data.knowledgeGraph.status === 'fully_operational' ? 'green' :
                      data.knowledgeGraph.status === 'partially_operational' ? 'yellow' : 'red'
                    } size="sm">
                      {data.knowledgeGraph.healthy}/{data.knowledgeGraph.total}
                    </Badge>
                  </HStack>
                  <Progress 
                    value={(data.knowledgeGraph.healthy / data.knowledgeGraph.total) * 100}
                    colorScheme={
                      data.knowledgeGraph.status === 'fully_operational' ? 'green' :
                      data.knowledgeGraph.status === 'partially_operational' ? 'yellow' : 'red'
                    }
                    size="sm"
                    hasStripe
                  />
                </Box>

                {/* IDE Memory System */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Circle size="10px" bg={
                        data.ideMemory.status === 'fully_operational' ? 'green.500' :
                        data.ideMemory.status === 'degraded' ? 'yellow.500' : 'red.500'
                      } />
                      <Text fontSize="sm" fontWeight="medium">IDE Memory System</Text>
                      {data.ideMemory.offlineSync && (
                        <Badge colorScheme="blue" size="xs">OFFLINE SYNC</Badge>
                      )}
                    </HStack>
                    <Badge colorScheme={
                      data.ideMemory.status === 'fully_operational' ? 'green' :
                      data.ideMemory.status === 'degraded' ? 'yellow' : 'red'
                    } size="sm">
                      {data.ideMemory.syncEfficiency}%
                    </Badge>
                  </HStack>
                  <Progress 
                    value={data.ideMemory.syncEfficiency}
                    colorScheme={
                      data.ideMemory.status === 'fully_operational' ? 'green' :
                      data.ideMemory.status === 'degraded' ? 'yellow' : 'red'
                    }
                    size="sm"
                    hasStripe
                  />
                </Box>

                {/* Infrastructure */}
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Circle size="10px" bg="blue.500" />
                      <Text fontSize="sm" fontWeight="medium">Infrastructure</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Badge colorScheme="blue" size="xs">{data.infrastructure.databases} DBs</Badge>
                      <Badge colorScheme="green" size="xs">{data.infrastructure.agents} Agents</Badge>
                      {data.infrastructure.memoryWatcher && (
                        <Badge colorScheme="purple" size="xs">WATCHER</Badge>
                      )}
                    </HStack>
                  </HStack>
                </Box>
              </VStack>
            </>
          )}

          {/* Pending Actions */}
          {data && data.ideMemory.pendingApprovals > 0 && (
            <>
              <Divider />
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Action Required</AlertTitle>
                  <AlertDescription fontSize="xs">
                    {data.ideMemory.pendingApprovals} memory approval{data.ideMemory.pendingApprovals > 1 ? 's' : ''} pending review
                  </AlertDescription>
                </Box>
              </Alert>
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

export default SystemOverviewWidget;
