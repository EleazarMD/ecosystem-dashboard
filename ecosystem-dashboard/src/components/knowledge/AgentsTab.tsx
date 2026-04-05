import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Badge,
  HStack,
  VStack,
  Spinner,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  useToast,
  Button,
  Divider,
} from '@chakra-ui/react';
import { FiCpu, FiServer, FiActivity, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  capabilities: string[];
  endpoint: string;
  version: string;
  description: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  model?: string;
  health: {
    overall: number;
    components: {
      connectivity: number;
      performance: number;
      resources: number;
      dependencies: number;
      security: number;
    };
    trend: 'stable' | 'improving' | 'degrading';
  };
}

const AgentsTab: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const toast = useToast();

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agentic-control/agents');
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await response.json();
      
      if (data.success && data.agents) {
        // Filter to show Knowledge Graph agents (not the dashboard coordinator)
        const kgAgents = data.agents.filter((agent: Agent) => 
          agent.id !== 'dashboard-ai-coordinator'
        );
        setAgents(kgAgents);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error fetching agents',
        description: 'Failed to load agent status. Retrying...',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAgents, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <StatArrow type="increase" />;
      case 'degrading':
        return <StatArrow type="decrease" />;
      default:
        return null;
    }
  };

  if (loading && agents.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text mt={4} color={useSemanticToken('text.secondary')}>Loading Knowledge Graph agents...</Text>
      </Box>
    );
  }

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalAgents = agents.length;

  return (
    <Box>
      {/* Header Stats */}
      <Card mb={6}>
        <CardBody>
          <Flex justify="space-between" align="center">
            <HStack spacing={8}>
              <Stat>
                <StatLabel>Active Agents</StatLabel>
                <StatNumber color="green.500">{activeAgents}/{totalAgents}</StatNumber>
                <StatHelpText>Knowledge Graph Ecosystem</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>System Health</StatLabel>
                <StatNumber>
                  {Math.round((activeAgents / totalAgents) * 100)}%
                </StatNumber>
                <StatHelpText>
                  {getTrendIcon('stable')}
                  Operational
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Last Update</StatLabel>
                <StatNumber fontSize="md">{lastUpdate.toLocaleTimeString()}</StatNumber>
                <StatHelpText>Auto-refresh: 30s</StatHelpText>
              </Stat>
            </HStack>
            <Button
              leftIcon={<Icon as={FiRefreshCw} />}
              colorScheme="purple"
              variant="outline"
              onClick={fetchAgents}
              isLoading={loading}
              size="sm"
            >
              Refresh
            </Button>
          </Flex>
        </CardBody>
      </Card>

      {/* Agents Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {agents.map((agent) => (
          <Card
            key={agent.id}
            borderWidth={2}
            borderColor={agent.status === 'active' ? 'green.200' : 'gray.200'}
            _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardHeader pb={2}>
              <Flex justify="space-between" align="start">
                <VStack align="start" spacing={1} flex={1}>
                  <HStack>
                    <Icon
                      as={agent.status === 'active' ? FiCheck : FiX}
                      color={agent.status === 'active' ? 'green.500' : 'red.500'}
                    />
                    <Heading size="sm">{agent.name}</Heading>
                  </HStack>
                  <Badge colorScheme={getStatusColor(agent.status)} fontSize="xs">
                    {agent.status.toUpperCase()}
                  </Badge>
                </VStack>
                <Icon as={FiServer} boxSize={6} color="purple.400" />
              </Flex>
            </CardHeader>

            <CardBody pt={2}>
              <VStack align="stretch" spacing={3}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} noOfLines={2}>
                  {agent.description}
                </Text>

                <Divider />

                {/* Model and Version */}
                <HStack justify="space-between" fontSize="xs">
                  <Text color={useSemanticToken('text.secondary')}>Model:</Text>
                  <Badge colorScheme="blue" fontSize="xs">{agent.model || 'N/A'}</Badge>
                </HStack>
                <HStack justify="space-between" fontSize="xs">
                  <Text color={useSemanticToken('text.secondary')}>Version:</Text>
                  <Text fontFamily="mono">{agent.version}</Text>
                </HStack>

                <Divider />

                {/* Health Metrics */}
                <VStack align="stretch" spacing={2}>
                  <Flex justify="space-between" align="center">
                    <HStack>
                      <Icon as={FiActivity} color="purple.400" />
                      <Text fontSize="xs" fontWeight="semibold">Health</Text>
                    </HStack>
                    <Badge colorScheme={agent.health.overall > 90 ? 'green' : agent.health.overall > 70 ? 'yellow' : 'red'}>
                      {agent.health.overall}%
                    </Badge>
                  </Flex>

                  <SimpleGrid columns={2} spacing={2} fontSize="xs">
                    <Flex justify="space-between">
                      <Text color={useSemanticToken('text.secondary')}>CPU:</Text>
                      <Text fontWeight="medium">{agent.cpuUsage}%</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text color={useSemanticToken('text.secondary')}>Memory:</Text>
                      <Text fontWeight="medium">{agent.memoryUsage}%</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text color={useSemanticToken('text.secondary')}>Uptime:</Text>
                      <Text fontWeight="medium">{agent.uptime.toFixed(1)}%</Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text color={useSemanticToken('text.secondary')}>Trend:</Text>
                      <HStack spacing={1}>
                        {getTrendIcon(agent.health.trend)}
                        <Text fontWeight="medium">{agent.health.trend}</Text>
                      </HStack>
                    </Flex>
                  </SimpleGrid>
                </VStack>

                <Divider />

                {/* Capabilities */}
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color={useSemanticToken('text.secondary')} mb={2}>
                    Capabilities:
                  </Text>
                  <Flex flexWrap="wrap" gap={1}>
                    {(() => {
                      const caps = Array.isArray(agent.capabilities) 
                        ? agent.capabilities 
                        : (agent.capabilities && typeof agent.capabilities === 'object' 
                            ? Object.keys(agent.capabilities) 
                            : []);
                      return (
                        <>
                          {caps.slice(0, 4).map((cap, idx) => (
                            <Badge key={idx} colorScheme="purple" fontSize="2xs" variant="subtle">
                              {String(cap)}
                            </Badge>
                          ))}
                          {caps.length > 4 && (
                            <Badge colorScheme="gray" fontSize="2xs" variant="subtle">
                              +{caps.length - 4}
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                  </Flex>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {agents.length === 0 && !loading && (
        <Card>
          <CardBody textAlign="center" py={10}>
            <Icon as={FiServer} boxSize={12} color={useSemanticToken('text.tertiary')} mb={4} />
            <Heading size="md" color={useSemanticToken('text.secondary')} mb={2}>No Agents Found</Heading>
            <Text color={useSemanticToken('text.tertiary')}>
              Knowledge Graph agents are not currently running or registered.
            </Text>
            <Button
              mt={4}
              colorScheme="purple"
              variant="outline"
              leftIcon={<Icon as={FiRefreshCw} />}
              onClick={fetchAgents}
            >
              Retry
            </Button>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default AgentsTab;
