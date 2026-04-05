import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  SimpleGrid,
  Spinner,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
  Tag,
  List,
  ListItem,
  Collapse,
  IconButton,
  Badge,
  Tooltip,
  Alert,
  AlertIcon,
  Text,
  Flex,
  HStack,
  VStack,
  Button,
  Stack,
  Center,
  Wrap,
  WrapItem,
  Container,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Spacer,
  BoxProps
} from '@chakra-ui/react';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon, InfoIcon, RepeatIcon, SettingsIcon } from '@chakra-ui/icons';
import useSWR from 'swr';
import { fetcher } from '../../lib/fetcher';
import { useAgentRegistry } from '../../context/AgentRegistryContext';
import { AgentRegistryEventType } from '../../lib/agent-registry-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Define the Capability interface
interface Capability {
  name: string;
  description: string;
  category: string;
  agentCount: number;
  agents: string[];
}

/**
 * Capabilities Explorer Component
 * 
 * Displays a searchable list of capabilities with details about which agents implement them
 * with real-time updates using the AHIS client
 */
const CapabilitiesExplorer: React.FC = () => {
  // Get the Agent Registry client from context
  const { client, isConnected, lastEvent } = useAgentRegistry();
  
  // State for search and expanded capabilities
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCapabilities, setExpandedCapabilities] = useState<string[]>([]);
  const [localCapabilitiesData, setLocalCapabilitiesData] = useState<any>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // Fetch capabilities data from the dashboard API
  const { data, error, isLoading, mutate } = useSWR('/api/proxy/agent-registry/dashboard/capabilities', fetcher, {
    refreshInterval: 60000, // Refresh every minute as a fallback
  });
  
  // Update local data when API data changes
  useEffect(() => {
    if (data?.success && data?.data) {
      setLocalCapabilitiesData(data.data);
      setLastUpdateTime(new Date());
    }
  }, [data]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!client || !isConnected) return;
    
    // Define event types that should trigger a refresh
    const refreshEvents = [
      AgentRegistryEventType.CAPABILITY_REGISTERED,
      AgentRegistryEventType.CAPABILITY_UPDATED,
      AgentRegistryEventType.CAPABILITY_REMOVED,
      AgentRegistryEventType.AGENT_REGISTERED,
      AgentRegistryEventType.AGENT_UPDATED,
      AgentRegistryEventType.AGENT_REMOVED
    ];
    
    // Subscribe to events
    const unsubscribers = refreshEvents.map(eventType =>
      client.subscribe(eventType, () => {
        // Refresh data when an event occurs
        mutate();
        setLastUpdateTime(new Date());
      })
    );
    
    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [client, isConnected, mutate]);
  
  // Try to get data from AHIS client if API fails
  useEffect(() => {
    if (error && client && isConnected) {
      client.getDashboardCapabilities()
        .then(capabilitiesData => {
          if (capabilitiesData) {
            setLocalCapabilitiesData(capabilitiesData);
            setLastUpdateTime(new Date());
          }
        })
        .catch(err => console.error('Failed to get capabilities data from AHIS client:', err));
    }
  }, [error, client, isConnected]);
  
  // Handle expanding/collapsing a capability
  const handleToggleCapability = (capabilityId: string) => {
    setExpandedCapabilities(prev => 
      prev.includes(capabilityId) 
        ? prev.filter(id => id !== capabilityId)
        : [...prev, capabilityId]
    );
  };
  
  if (isLoading && !localCapabilitiesData) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Spinner size="xl" />
      </Box>
    );
  }
  
  if ((error || !data?.success) && !localCapabilitiesData) {
    return (
      <Box p={2}>
        <Alert status="error">
          <AlertIcon />
          Failed to load capabilities data. Please check your connection to the AHIS server.
        </Alert>
      </Box>
    );
  }
  
  // Get capabilities from local data
  const capabilities: Capability[] = localCapabilitiesData?.capabilities || [];
  
  // Filter capabilities based on search term
  const filteredCapabilities = capabilities.filter(capability => {
    const searchLower = searchTerm.toLowerCase();
    return (
      capability.name.toLowerCase().includes(searchLower) ||
      capability.description?.toLowerCase().includes(searchLower) ||
      capability.category?.toLowerCase().includes(searchLower) ||
      capability.agents.some(agent => agent.toLowerCase().includes(searchLower))
    );
  });
  
  // Sort capabilities by agent count (most used first)
  const sortedCapabilities = [...filteredCapabilities].sort((a, b) => b.agentCount - a.agentCount);
  
  return (
    <Box width="100%">
      <Card>
        <CardBody>
          <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Heading as="h2" size="md">
              Capabilities Explorer
            </Heading>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              {localCapabilitiesData?.capabilities?.length || 0} capabilities found
            </Text>
            
            <HStack spacing={2}>
              <Tag 
                colorScheme={isConnected ? 'green' : 'red'}
                size="sm"
                variant="outline"
              >
                {isConnected ? 'Connected to AHIS' : 'Disconnected'}
              </Tag>
              <Tooltip label="Refresh data">
                <IconButton
                  aria-label="Refresh data"
                  icon={<RepeatIcon />}
                  size="sm"
                  onClick={mutate}
                />
              </Tooltip>
            </HStack>
          </Flex>
          
          <Divider mb={2} />
          
          {/* Search field */}
          <Box mb={3}>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color={useSemanticToken('text.tertiary')} />
              </InputLeftElement>
              <Input
                placeholder="Search capabilities"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Box>
          
          {/* Capabilities summary */}
          <Box mb={3}>
            <SimpleGrid columns={[1, null, 2]} spacing={4}>
              <Box p={4} borderWidth="1px" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {capabilities.length}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Total Capabilities
                </Text>
              </Box>
              <Box p={4} borderWidth="1px" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {capabilities.reduce((sum: number, cap: Capability) => sum + cap.agentCount, 0)}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Total Implementations
                </Text>
              </Box>
            </SimpleGrid>
          </Box>
          
          {/* Capabilities list */}
          <Box borderWidth="1px" borderRadius="md" overflow="hidden">
            <List spacing={0}>
              {sortedCapabilities.length > 0 ? (
                sortedCapabilities.map((capability) => (
                  <React.Fragment key={capability.name}>
                    <ListItem 
                      p={3}
                      borderBottomWidth="1px"
                      _hover={{ bg: 'gray.50' }}
                      cursor="pointer"
                      onClick={() => handleToggleCapability(capability.name)}
                    >
                      <Flex justifyContent="space-between" alignItems="center" width="100%">
                        <Box>
                          <Flex alignItems="center">
                            <Text fontWeight="medium">{capability.name}</Text>
                            <Tooltip label="Number of agents implementing this capability">
                              <Badge ml={2} colorScheme="blue">
                                {capability.agentCount}
                              </Badge>
                            </Tooltip>
                          </Flex>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={1}>
                            {capability.description || 'No description available'}
                          </Text>
                        </Box>
                        <IconButton
                          aria-label="Toggle details"
                          icon={expandedCapabilities.includes(capability.name) ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCapability(capability.name);
                          }}
                        />
                      </Flex>
                    </ListItem>
                    <Collapse in={expandedCapabilities.includes(capability.name)} animateOpacity>
                      <Box p={4} bg={useSemanticToken('surface.base')}>
                        <Text fontWeight="medium" mb={2}>
                          Implemented by {capability.agentCount} agent{capability.agentCount !== 1 ? 's' : ''}:
                        </Text>
                        <Wrap spacing={2}>
                          {capability.agents.map((agentId: string) => (
                            <WrapItem key={agentId}>
                              <Tag size="md" colorScheme="blue" variant="outline">
                                {agentId}
                              </Tag>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </Box>
                    </Collapse>
                  </React.Fragment>
                ))
              ) : (
                <ListItem p={4}>
                  <Box textAlign="center">
                    <Text fontWeight="medium">No capabilities found</Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {searchTerm ? "Try adjusting your search query" : "No capabilities have been registered"}
                    </Text>
                  </Box>
                </ListItem>
              )}
            </List>
          </Box>
          
          {/* Footer info */}
          <Flex justifyContent="flex-end" mt={2}>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              {filteredCapabilities.length} capabilities found | Last updated: {lastUpdateTime ? lastUpdateTime.toLocaleString() : 'Unknown'}
            </Text>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
};

export default CapabilitiesExplorer;
