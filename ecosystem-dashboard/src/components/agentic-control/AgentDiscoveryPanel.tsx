/**
 * Agent Discovery Panel
 * 
 * ADK/A2A compatible agent discovery and connection interface
 * for the Agentic Control Dashboard
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Button,
  Badge,
  IconButton,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Wrap,
  WrapItem,
  Switch,
} from '@chakra-ui/react';
import {
  FaSearch,
  FaPlug,
  FaPlay,
  FaStop,
  FaSync,
  FaFilter,
  FaNetworkWired,
  FaTools,
  FaRobot,
  FaCloud,
  FaDesktop,
  FaMobile,
  FaServer,
  FaCircle,
  FaExclamationTriangle,
  FaClock,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import { adkLayer } from '../../lib/adk-a2a-integration/ADKCompatibilityLayer';
import { AgentCard, AgentConnection, ADKTool } from '../../types/agent';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  classifyAgentProject, 
  getUniqueProjects, 
  filterAgentsByProject, 
  getProjectStats,
  ProjectInfo 
} from '../../utils/agentProjects';

interface AgentDiscoveryPanelProps {
  adkLayer: any; // ADKCompatibilityLayer instance
  onAgentSelect?: (agentCard: AgentCard) => void;
}

export const AgentDiscoveryPanel: React.FC<AgentDiscoveryPanelProps> = ({ adkLayer, onAgentSelect }) => {
  const [discoveredAgents, setDiscoveredAgents] = useState<AgentCard[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [availableTools, setAvailableTools] = useState<ADKTool[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null);
  const [agentDetails, setAgentDetails] = useState<any>(null);
  const [connectionInProgress, setConnectionInProgress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showProjectStats, setShowProjectStats] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const toast = useToast();

  useEffect(() => {
    if (adkLayer) {
      loadDiscoveredAgents();
      loadConnections();
      loadAvailableTools();
      setupEventListeners();
    }
  }, [adkLayer]);

  const loadDiscoveredAgents = async () => {
    try {
      const agents = await adkLayer.discoverAgents();
      setDiscoveredAgents(agents);
    } catch (error) {
      console.error('Failed to load discovered agents:', error);
    }
  };

  const loadConnections = () => {
    try {
      const conns = adkLayer.getConnections();
      setConnections(conns);
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  };

  const loadAvailableTools = () => {
    try {
      const tools = adkLayer.getAvailableTools();
      setAvailableTools(tools);
    } catch (error) {
      console.error('Failed to load available tools:', error);
    }
  };

  const setupEventListeners = () => {
    adkLayer.on('agent_discovered', (agent: AgentCard) => {
      setDiscoveredAgents(prev => {
        const existing = prev.find(a => a.id === agent.id);
        if (existing) {
          return prev.map(a => a.id === agent.id ? agent : a);
        }
        return [...prev, agent];
      });
      toast({
        title: 'Agent Discovered',
        description: `${agent.name} is now available`,
        status: 'info',
        duration: 3000
      });
    });

    adkLayer.on('agent_connected', (connection: AgentConnection) => {
      setConnections(prev => [...prev.filter(c => c.agentCard.id !== connection.agentCard.id), connection]);
      toast({
        title: 'Agent Connected',
        description: `Connected to ${connection.agentCard.name}`,
        status: 'success',
        duration: 3000
      });
    });

    adkLayer.on('agent_disconnected', (connection: AgentConnection) => {
      setConnections(prev => prev.filter(c => c.id !== connection.id));
      toast({
        title: 'Agent Disconnected',
        description: `Disconnected from ${connection.agentCard.name}`,
        status: 'warning',
        duration: 3000
      });
    });

    adkLayer.on('tools_discovered', (tools: ADKTool[]) => {
      setAvailableTools(tools);
    });
  };

  const handleRefreshDiscovery = async () => {
    setIsDiscovering(true);
    try {
      await adkLayer.refreshDiscovery();
      await loadDiscoveredAgents();
      toast({
        title: 'Discovery Refreshed',
        description: 'Agent discovery completed successfully',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      toast({
        title: 'Discovery Failed',
        description: error instanceof Error ? error.message : 'Failed to refresh discovery',
        status: 'error',
        duration: 4000
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleConnectAgent = async (agentCard: AgentCard) => {
    try {
      await adkLayer.connectToAgent(agentCard.id);
      loadConnections();
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${agentCard.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 4000
      });
    }
  };

  const handleDisconnectAgent = async (agentId: string) => {
    try {
      await adkLayer.disconnectFromAgent(agentId);
      loadConnections();
    } catch (error) {
      toast({
        title: 'Disconnection Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect',
        status: 'error',
        duration: 4000
      });
    }
  };

  const handleAgentDetails = (agentCard: AgentCard) => {
    setSelectedAgent(agentCard);
    onOpen();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <FaCircle color="green" />;
      case 'offline':
        return <FaCircle color="red" />;
      case 'busy':
        return <FaClock color="orange" />;
      case 'error':
        return <FaExclamationTriangle color="red" />;
      default:
        return <FaCircle color="gray" />;
    }
  };

  const getConnectionStatus = (agentId: string) => {
    const connection = connections.find(c => c.agentCard.id === agentId);
    return connection?.status || 'disconnected';
  };

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'assistant':
        return <FaRobot />;
      case 'service':
        return <FaServer />;
      case 'tool':
        return <FaTools />;
      default:
        return <FaNetworkWired />;
    }
  };

  const filteredAgents = discoveredAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    const matchesType = typeFilter === 'all' || agent.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const agentTypes = Array.from(new Set(discoveredAgents.map(a => a.type)));

  return (
    <Box>
      {/* Discovery Controls */}
      <Card mb={6} bg={cardBg}>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <Heading size="md">Agent Discovery</Heading>
            <Button
              leftIcon={isDiscovering ? <Spinner size="sm" /> : <FaSync />}
              onClick={handleRefreshDiscovery}
              isLoading={isDiscovering}
              colorScheme="blue"
              size="sm"
            >
              Refresh Discovery
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          <HStack spacing={4} mb={4}>
            <InputGroup maxW="300px">
              <InputLeftElement>
                <FaSearch color={useSemanticToken('text.secondary')} />
              </InputLeftElement>
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            <Select
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              maxW="150px"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="busy">Busy</option>
              <option value="error">Error</option>
            </Select>
            
            <Select
              placeholder="All Types"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              maxW="150px"
            >
              {agentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          </HStack>

          {/* Summary Stats */}
          <SimpleGrid columns={4} spacing={4} mb={4}>
            <Card size="sm" variant="outline">
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {discoveredAgents.length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Discovered</Text>
              </CardBody>
            </Card>
            <Card size="sm" variant="outline">
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {connections.filter(c => c.status === 'connected').length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Connected</Text>
              </CardBody>
            </Card>
            <Card size="sm" variant="outline">
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {availableTools.length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Tools</Text>
              </CardBody>
            </Card>
            <Card size="sm" variant="outline">
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {discoveredAgents.filter(a => a.status === 'online').length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Online</Text>
              </CardBody>
            </Card>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Agent Cards Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filteredAgents.map((agent) => {
          const connectionStatus = getConnectionStatus(agent.id);
          const isConnected = connectionStatus === 'connected';
          
          return (
            <Card
              key={agent.id}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
              bg={cardBg}
              borderColor={isConnected ? 'green.200' : borderColor}
              borderWidth={isConnected ? '2px' : '1px'}
              onClick={() => onAgentSelect?.(agent)}
            >
              <CardHeader pb={2}>
                <Flex justify="space-between" align="start">
                  <HStack spacing={3}>
                    <Box color="blue.500" fontSize="lg">
                      {getAgentTypeIcon(agent.type)}
                    </Box>
                    <VStack align="start" spacing={0}>
                      <Heading size="sm">{agent.name}</Heading>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>v{agent.version}</Text>
                    </VStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Tooltip label={`Status: ${agent.status}`}>
                      <Box fontSize="sm">
                        {getStatusIcon(agent.status)}
                      </Box>
                    </Tooltip>
                    <Badge
                      size="sm"
                      colorScheme={isConnected ? 'green' : 'gray'}
                      variant={isConnected ? 'solid' : 'outline'}
                    >
                      {connectionStatus}
                    </Badge>
                  </VStack>
                </Flex>
              </CardHeader>
              
              <CardBody pt={0}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={3} noOfLines={2}>
                  {agent.description}
                </Text>
                
                {/* Capabilities */}
                <Box mb={3}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Capabilities:</Text>
                  <Flex wrap="wrap" gap={1}>
                    {(() => {
                      const caps = Array.isArray(agent.capabilities) 
                        ? agent.capabilities 
                        : (agent.capabilities && typeof agent.capabilities === 'object' 
                            ? Object.keys(agent.capabilities) 
                            : []);
                      return (
                        <>
                          {caps.slice(0, 3).map((cap, idx) => (
                            <Badge key={idx} size="xs" variant="outline">
                              {typeof cap === 'object' && cap !== null ? cap.name : String(cap)}
                            </Badge>
                          ))}
                          {caps.length > 3 && (
                            <Badge size="xs" variant="outline" color={useSemanticToken('text.secondary')}>
                              +{caps.length - 3}
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                  </Flex>
                </Box>

                {/* Action Buttons */}
                <HStack spacing={2}>
                  {isConnected ? (
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<FaStop />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnectAgent(agent.id);
                      }}
                      flex={1}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      leftIcon={<FaPlug />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectAgent(agent);
                      }}
                      flex={1}
                      isDisabled={agent.status !== 'online'}
                    >
                      Connect
                    </Button>
                  )}
                  <IconButton
                    aria-label="Agent details"
                    icon={<FaNetworkWired />}
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgentDetails(agent);
                    }}
                  />
                </HStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>

      {filteredAgents.length === 0 && (
        <Alert status="info">
          <AlertIcon />
          {discoveredAgents.length === 0 
            ? 'No agents discovered. Try refreshing discovery.'
            : 'No agents match the current filters.'}
        </Alert>
      )}

      {/* Agent Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Box color="blue.500" fontSize="lg">
                {selectedAgent && getAgentTypeIcon(selectedAgent.type)}
              </Box>
              <VStack align="start" spacing={0}>
                <Text>{selectedAgent?.name}</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  {selectedAgent?.type} • v{selectedAgent?.version}
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {selectedAgent && (
              <Tabs>
                <TabList>
                  <Tab>Overview</Tab>
                  <Tab>Capabilities</Tab>
                  <Tab>Connection</Tab>
                  <Tab>Metadata</Tab>
                </TabList>
                
                <TabPanels>
                  <TabPanel>
                    <VStack align="start" spacing={4}>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Description</Text>
                        <Text>{selectedAgent.description}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Status</Text>
                        <HStack>
                          {getStatusIcon(selectedAgent.status)}
                          <Text>{selectedAgent.status}</Text>
                        </HStack>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Last Seen</Text>
                        <Text>{new Date(selectedAgent.lastSeen).toLocaleString()}</Text>
                      </Box>
                    </VStack>
                  </TabPanel>
                  
                  <TabPanel>
                    <VStack align="start" spacing={3}>
                      {(() => {
                        const caps = Array.isArray(selectedAgent.capabilities) 
                          ? selectedAgent.capabilities 
                          : (selectedAgent.capabilities && typeof selectedAgent.capabilities === 'object' 
                              ? Object.entries(selectedAgent.capabilities).map(([key, val]) => ({ name: key, category: 'general', description: String(val) }))
                              : []);
                        return caps.map((cap, idx) => (
                          <Box key={idx} p={3} borderWidth={1} borderRadius="md" w="full">
                            <HStack justify="space-between" mb={2}>
                              <Text fontWeight="bold">{typeof cap === 'object' && cap !== null ? cap.name : String(cap)}</Text>
                              <Badge colorScheme="blue">{typeof cap === 'object' && cap !== null ? cap.category : 'general'}</Badge>
                            </HStack>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {typeof cap === 'object' && cap !== null ? cap.description : ''}
                            </Text>
                          </Box>
                        ));
                      })()}
                    </VStack>
                  </TabPanel>
                  
                  <TabPanel>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Protocol</Text>
                        <Badge>{selectedAgent.connection.protocol}</Badge>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Endpoint</Text>
                        <Text fontFamily="mono" fontSize="sm">
                          {selectedAgent.connection.endpoint}
                        </Text>
                      </Box>
                      {selectedAgent.connection.port && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Port</Text>
                          <Text>{selectedAgent.connection.port}</Text>
                        </Box>
                      )}
                      <Box>
                        <Text fontWeight="bold" mb={2}>Authentication</Text>
                        <Text>
                          {selectedAgent.connection.authentication?.type || 'none'} 
                          {selectedAgent.connection.authentication?.required && ' (required)'}
                        </Text>
                      </Box>
                    </VStack>
                  </TabPanel>
                  
                  <TabPanel>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Platform</Text>
                        <Text>{selectedAgent.metadata.platform}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Runtime</Text>
                        <Text>{selectedAgent.metadata.runtime}</Text>
                      </Box>
                      {selectedAgent.metadata.framework && (
                        <Box>
                          <Text fontWeight="bold" mb={2}>Framework</Text>
                          <Text>{selectedAgent.metadata.framework}</Text>
                        </Box>
                      )}
                      <Box>
                        <Text fontWeight="bold" mb={2}>Tags</Text>
                        <Flex wrap="wrap" gap={1}>
                          {selectedAgent.metadata.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline">{tag}</Badge>
                          ))}
                        </Flex>
                      </Box>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Close
            </Button>
            {selectedAgent && getConnectionStatus(selectedAgent.id) === 'connected' ? (
              <Button
                colorScheme="red"
                onClick={() => {
                  handleDisconnectAgent(selectedAgent.id);
                  onClose();
                }}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                colorScheme="blue"
                onClick={() => {
                  handleConnectAgent(selectedAgent);
                  onClose();
                }}
                isDisabled={selectedAgent?.status !== 'online'}
              >
                Connect
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AgentDiscoveryPanel;
