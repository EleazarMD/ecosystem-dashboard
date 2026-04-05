/**
 * Capability Toggle Matrix
 * 
 * Visual matrix for managing agent capabilities across the ecosystem
 * with bulk operations and dependency visualization
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Switch,
  Button,
  ButtonGroup,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  IconButton,
  Tooltip,
  useToast,
  Alert,
  AlertIcon,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Flex,
  Divider
} from '@chakra-ui/react';
import {
  FaCheckSquare,
  FaSquare,
  FaSave,
  FaUndo,
  FaDownload,
  FaFilter,
  FaSearch,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'configuring' | 'deploying' | 'stopping';
  platform: string;
  lastHeartbeat: string;
  capabilities: Record<string, boolean>;
}

interface CapabilityDefinition {
  name: string;
  category: string;
  description: string;
  dependencies?: string[];
  conflicts?: string[];
  impact: 'Low' | 'Medium' | 'High';
  requiresRestart: boolean;
}

interface CapabilityToggleMatrixProps {
  agents: Agent[];
  onCapabilitiesUpdate: (agentId: string, capabilities: Record<string, boolean>) => Promise<void>;
}

export const CapabilityToggleMatrix: React.FC<CapabilityToggleMatrixProps> = ({
  agents,
  onCapabilitiesUpdate
}) => {
  const [localAgentCapabilities, setLocalAgentCapabilities] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const toast = useToast();

  // Capability definitions with metadata
  const capabilityDefinitions: Record<string, CapabilityDefinition> = {
    // Communication
    multi_agent_collaboration: {
      name: 'Multi-Agent Collaboration',
      category: 'Communication',
      description: 'Enables collaboration with other agents via A2A protocol',
      dependencies: ['a2a_protocol'],
      impact: 'Medium',
      requiresRestart: false
    },
    a2a_protocol: {
      name: 'A2A Protocol',
      category: 'Communication',
      description: 'Agent-to-Agent communication protocol support',
      impact: 'High',
      requiresRestart: true
    },
    websocket: {
      name: 'WebSocket',
      category: 'Communication',
      description: 'WebSocket connection support for real-time communication',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // AI Processing
    llm_inference: {
      name: 'LLM Inference',
      category: 'AI Processing',
      description: 'Large Language Model inference capabilities',
      dependencies: ['ai_gateway_integration'],
      impact: 'High',
      requiresRestart: false
    },
    continuous_learning: {
      name: 'Continuous Learning',
      category: 'AI Processing',
      description: 'Continuous learning and adaptation capabilities',
      dependencies: ['llm_inference'],
      impact: 'Medium',
      requiresRestart: false
    },
    query_optimization: {
      name: 'Query Optimization',
      category: 'AI Processing',
      description: 'Automatic query optimization and routing',
      impact: 'Low',
      requiresRestart: false
    },
    
    // Performance
    caching: {
      name: 'Caching',
      category: 'Performance',
      description: 'Response caching for improved performance',
      conflicts: ['real_time_updates'],
      impact: 'Low',
      requiresRestart: false
    },
    auto_sync: {
      name: 'Auto Sync',
      category: 'Performance',
      description: 'Automatic synchronization with external systems',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // Voice
    openai_realtime: {
      name: 'OpenAI Realtime',
      category: 'Voice',
      description: 'OpenAI Realtime API integration',
      dependencies: ['websocket'],
      impact: 'High',
      requiresRestart: true
    },
    neural_tts: {
      name: 'Neural TTS',
      category: 'Voice',
      description: 'Neural Text-to-Speech synthesis',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // Security
    conflict_resolution: {
      name: 'Conflict Resolution',
      category: 'Security',
      description: 'Automatic conflict detection and resolution',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // Monitoring
    logging: {
      name: 'Logging',
      category: 'Monitoring',
      description: 'Enhanced logging and audit trail',
      impact: 'Low',
      requiresRestart: false
    },
    real_time_updates: {
      name: 'Real-time Updates',
      category: 'Monitoring',
      description: 'Real-time status and metric updates',
      conflicts: ['caching'],
      impact: 'Low',
      requiresRestart: false
    }
  };

  const categories = Array.from(new Set(Object.values(capabilityDefinitions).map(def => def.category)));
  const capabilities = Object.keys(capabilityDefinitions);

  // Initialize local state
  useEffect(() => {
    const initialCapabilities: Record<string, Record<string, boolean>> = {};
    agents.forEach(agent => {
      initialCapabilities[agent.id] = { ...agent.capabilities };
    });
    setLocalAgentCapabilities(initialCapabilities);
  }, [agents]);

  // Check for changes
  useEffect(() => {
    const hasAnyChanges = agents.some(agent => 
      JSON.stringify(localAgentCapabilities[agent.id]) !== JSON.stringify(agent.capabilities)
    );
    setHasChanges(hasAnyChanges);
  }, [localAgentCapabilities, agents]);

  const handleCapabilityToggle = (agentId: string, capability: string, enabled: boolean) => {
    setLocalAgentCapabilities(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [capability]: enabled
      }
    }));

    // Handle dependencies and conflicts
    const definition = capabilityDefinitions[capability];
    
    if (enabled) {
      // Enable dependencies
      if (definition.dependencies) {
        definition.dependencies.forEach(dep => {
          if (localAgentCapabilities[agentId] && !localAgentCapabilities[agentId][dep]) {
            setLocalAgentCapabilities(prev => ({
              ...prev,
              [agentId]: {
                ...prev[agentId],
                [dep]: true
              }
            }));
          }
        });
      }
    } else {
      // Disable dependents
      Object.entries(capabilityDefinitions).forEach(([cap, def]) => {
        if (def.dependencies?.includes(capability) && localAgentCapabilities[agentId]?.[cap]) {
          setLocalAgentCapabilities(prev => ({
            ...prev,
            [agentId]: {
              ...prev[agentId],
              [cap]: false
            }
          }));
        }
      });
    }
  };

  const handleBulkToggle = (capability: string, enabled: boolean) => {
    if (selectedAgents.length === 0) {
      toast({
        title: 'No Agents Selected',
        description: 'Please select agents to apply bulk changes',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    selectedAgents.forEach(agentId => {
      handleCapabilityToggle(agentId, capability, enabled);
    });
  };

  const handleAgentSelection = (agentId: string, selected: boolean) => {
    setSelectedAgents(prev => 
      selected 
        ? [...prev, agentId]
        : prev.filter(id => id !== agentId)
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === agents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(agents.map(agent => agent.id));
    }
  };

  const handleApplyChanges = async () => {
    setIsApplying(true);
    try {
      const updates = agents
        .filter(agent => JSON.stringify(localAgentCapabilities[agent.id]) !== JSON.stringify(agent.capabilities))
        .map(agent => onCapabilitiesUpdate(agent.id, localAgentCapabilities[agent.id]));
      
      await Promise.all(updates);
      
      toast({
        title: 'Capabilities Updated',
        description: `Successfully updated capabilities for ${updates.length} agent(s)`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update agent capabilities',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRevertChanges = () => {
    const initialCapabilities: Record<string, Record<string, boolean>> = {};
    agents.forEach(agent => {
      initialCapabilities[agent.id] = { ...agent.capabilities };
    });
    setLocalAgentCapabilities(initialCapabilities);
    toast({
      title: 'Changes Reverted',
      description: 'All changes have been reverted',
      status: 'info',
      duration: 2000,
    });
  };

  const getFilteredCapabilities = () => {
    return capabilities.filter(capability => {
      const definition = capabilityDefinitions[capability];
      const matchesCategory = filterCategory === 'all' || definition.category === filterCategory;
      const matchesSearch = capability.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           definition.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'red';
      case 'Medium': return 'yellow';
      case 'Low': return 'green';
      default: return 'gray';
    }
  };

  const filteredCapabilities = getFilteredCapabilities();

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Card variant="outline">
        <CardHeader>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading as="h3" size="md">
                Capability Toggle Matrix
              </Heading>
              <Text color={useSemanticToken('text.secondary')}>
                Manage agent capabilities across {agents.length} agents
              </Text>
            </VStack>
            
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                leftIcon={<FaSave />}
                colorScheme="blue"
                isLoading={isApplying}
                loadingText="Applying..."
                isDisabled={!hasChanges}
                onClick={handleApplyChanges}
              >
                Apply Changes
              </Button>
              <Button
                leftIcon={<FaUndo />}
                isDisabled={!hasChanges}
                onClick={handleRevertChanges}
              >
                Revert
              </Button>
            </ButtonGroup>
          </Flex>
        </CardHeader>
      </Card>

      {hasChanges && (
        <Alert status="warning">
          <AlertIcon />
          You have unsaved capability changes that will affect {
            agents.filter(agent => 
              JSON.stringify(localAgentCapabilities[agent.id]) !== JSON.stringify(agent.capabilities)
            ).length
          } agent(s).
        </Alert>
      )}

      {/* Filters and Controls */}
      <Card variant="outline">
        <CardBody>
          <HStack spacing={4} mb={4}>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              maxW="200px"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
            
            <InputGroup maxW="300px">
              <InputLeftElement>
                <FaSearch />
              </InputLeftElement>
              <Input
                placeholder="Search capabilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
            
            <Button
              size="sm"
              leftIcon={<FaDownload />}
              variant="outline"
              onClick={() => {
                const matrixData = {
                  agents: agents.map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    capabilities: localAgentCapabilities[agent.id]
                  })),
                  timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(matrixData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'capability-matrix.json';
                a.click();
              }}
            >
              Export Matrix
            </Button>
          </HStack>

          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Selected agents: {selectedAgents.length} / {agents.length}
          </Text>
        </CardBody>
      </Card>

      {/* Matrix Table */}
      <Card variant="outline">
        <CardBody p={0}>
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th width="200px" position="sticky" left={0} bg={useSemanticToken('surface.elevated')} zIndex={1}>
                    <HStack>
                      <Checkbox
                        isChecked={selectedAgents.length === agents.length && agents.length > 0}
                        isIndeterminate={selectedAgents.length > 0 && selectedAgents.length < agents.length}
                        onChange={handleSelectAll}
                      />
                      <Text>Agent</Text>
                    </HStack>
                  </Th>
                  {filteredCapabilities.map(capability => {
                    const definition = capabilityDefinitions[capability];
                    return (
                      <Th key={capability} textAlign="center" minW="120px">
                        <VStack spacing={1}>
                          <Tooltip label={definition.description}>
                            <HStack spacing={1}>
                              <Text fontSize="xs" noOfLines={2}>
                                {definition.name}
                              </Text>
                              <FaInfoCircle size={10} />
                            </HStack>
                          </Tooltip>
                          <HStack spacing={1}>
                            <Badge size="xs" colorScheme={getImpactColor(definition.impact)}>
                              {definition.impact}
                            </Badge>
                            {definition.requiresRestart && (
                              <Badge size="xs" colorScheme="orange">
                                Restart
                              </Badge>
                            )}
                          </HStack>
                          <HStack spacing={1}>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="green"
                              onClick={() => handleBulkToggle(capability, true)}
                              isDisabled={selectedAgents.length === 0}
                            >
                              All On
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleBulkToggle(capability, false)}
                              isDisabled={selectedAgents.length === 0}
                            >
                              All Off
                            </Button>
                          </HStack>
                        </VStack>
                      </Th>
                    );
                  })}
                </Tr>
              </Thead>
              <Tbody>
                {agents.map(agent => (
                  <Tr key={agent.id}>
                    <Td position="sticky" left={0} bg={useSemanticToken('surface.elevated')} zIndex={1}>
                      <HStack>
                        <Checkbox
                          isChecked={selectedAgents.includes(agent.id)}
                          onChange={(e) => handleAgentSelection(agent.id, e.target.checked)}
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium" fontSize="sm">
                            {agent.name}
                          </Text>
                          <HStack spacing={1}>
                            <Badge size="xs" colorScheme="purple">
                              {agent.type}
                            </Badge>
                            <Badge size="xs" colorScheme={agent.status === 'active' ? 'green' : 'gray'}>
                              {agent.status}
                            </Badge>
                          </HStack>
                        </VStack>
                      </HStack>
                    </Td>
                    {filteredCapabilities.map(capability => {
                      const isEnabled = localAgentCapabilities[agent.id]?.[capability] || false;
                      const definition = capabilityDefinitions[capability];
                      
                      return (
                        <Td key={capability} textAlign="center">
                          <VStack spacing={1}>
                            <Switch
                              isChecked={isEnabled}
                              onChange={(e) => handleCapabilityToggle(agent.id, capability, e.target.checked)}
                              colorScheme="blue"
                              size="sm"
                            />
                            {definition.dependencies && isEnabled && (
                              <Tooltip label={`Requires: ${definition.dependencies.join(', ')}`}>
                                <FaExclamationTriangle size={10} color="orange" />
                              </Tooltip>
                            )}
                          </VStack>
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Legend */}
      <Card variant="outline">
        <CardBody>
          <VStack align="start" spacing={2}>
            <Heading as="h4" size="sm">Legend</Heading>
            <HStack wrap="wrap" spacing={4}>
              <HStack spacing={2}>
                <Badge colorScheme="red">High Impact</Badge>
                <Text fontSize="xs">Significant performance effect</Text>
              </HStack>
              <HStack spacing={2}>
                <Badge colorScheme="yellow">Medium Impact</Badge>
                <Text fontSize="xs">Moderate performance effect</Text>
              </HStack>
              <HStack spacing={2}>
                <Badge colorScheme="green">Low Impact</Badge>
                <Text fontSize="xs">Minimal performance effect</Text>
              </HStack>
              <HStack spacing={2}>
                <Badge colorScheme="orange">Restart</Badge>
                <Text fontSize="xs">Requires agent restart</Text>
              </HStack>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};
