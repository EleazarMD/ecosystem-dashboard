/**
 * Agent Configuration Panel
 * 
 * Comprehensive configuration interface for individual agents
 * with real-time feature toggles and settings management
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
  FormControl,
  FormLabel,
  Input,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  ButtonGroup,
  Badge,
  Divider,
  SimpleGrid,
  Tooltip,
  IconButton,
  Alert,
  AlertIcon,
  useToast,
  Collapse,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Code,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import {
  FaSave,
  FaUndo,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaDownload,
  FaUpload,
  FaInfoCircle,
  FaSync
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
  performance: {
    responseTime: number;
    throughput: number;
    uptime: number;
    errorRate: number;
  };
  configuration: {
    features: Record<string, boolean>;
    resources: {
      cpu: number;
      memory: number;
      gpu?: number;
    };
    model?: string;
    environment: Record<string, string>;
  };
}

interface AgentConfigurationPanelProps {
  agent: Agent;
  onConfigurationUpdate: (newConfig: Agent['configuration']) => Promise<void>;
}

export const AgentConfigurationPanel: React.FC<AgentConfigurationPanelProps> = ({
  agent,
  onConfigurationUpdate
}) => {
  const [localConfig, setLocalConfig] = useState(agent.configuration);
  const [hasChanges, setHasChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showEnvironment, setShowEnvironment] = useState(false);

  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Feature definitions with descriptions and categories
  const featureDefinitions = {
    // Communication features
    multi_agent_collaboration: {
      category: 'Communication',
      description: 'Enables collaboration with other agents via A2A protocol',
      impact: 'Medium',
      requiresRestart: false
    },
    a2a_protocol: {
      category: 'Communication', 
      description: 'Agent-to-Agent communication protocol support',
      impact: 'High',
      requiresRestart: true
    },
    websocket: {
      category: 'Communication',
      description: 'WebSocket connection support for real-time communication',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // AI Processing features
    llm_inference: {
      category: 'AI Processing',
      description: 'Large Language Model inference capabilities',
      impact: 'High',
      requiresRestart: false
    },
    continuous_learning: {
      category: 'AI Processing',
      description: 'Continuous learning and adaptation capabilities',
      impact: 'Medium',
      requiresRestart: false
    },
    query_optimization: {
      category: 'AI Processing',
      description: 'Automatic query optimization and routing',
      impact: 'Low',
      requiresRestart: false
    },
    
    // Performance features
    caching: {
      category: 'Performance',
      description: 'Response caching for improved performance',
      impact: 'Low',
      requiresRestart: false
    },
    auto_sync: {
      category: 'Performance',
      description: 'Automatic synchronization with external systems',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // Voice features
    openai_realtime: {
      category: 'Voice',
      description: 'OpenAI Realtime API integration',
      impact: 'High',
      requiresRestart: true
    },
    noise_suppression: {
      category: 'Voice',
      description: 'Audio noise suppression and filtering',
      impact: 'Low',
      requiresRestart: false
    },
    voice_activity_detection: {
      category: 'Voice',
      description: 'Voice Activity Detection for audio processing',
      impact: 'Medium',
      requiresRestart: false
    },
    neural_tts: {
      category: 'Voice',
      description: 'Neural Text-to-Speech synthesis',
      impact: 'Medium',
      requiresRestart: false
    },
    
    // Security features
    conflict_resolution: {
      category: 'Security',
      description: 'Automatic conflict detection and resolution',
      impact: 'Medium',
      requiresRestart: false
    },
    backup_creation: {
      category: 'Security',
      description: 'Automated backup creation and management',
      impact: 'Low',
      requiresRestart: false
    },
    
    // Monitoring features
    logging: {
      category: 'Monitoring',
      description: 'Enhanced logging and audit trail',
      impact: 'Low',
      requiresRestart: false
    },
    real_time_updates: {
      category: 'Monitoring',
      description: 'Real-time status and metric updates',
      impact: 'Low',
      requiresRestart: false
    }
  };

  // Group features by category
  const featuresByCategory = Object.entries(localConfig.features).reduce((acc, [feature, enabled]) => {
    const definition = featureDefinitions[feature as keyof typeof featureDefinitions];
    const category = definition?.category || 'Other';
    
    if (!acc[category]) acc[category] = [];
    acc[category].push({ feature, enabled, definition });
    
    return acc;
  }, {} as Record<string, Array<{ feature: string; enabled: boolean; definition: any }>>);

  // Check for changes
  useEffect(() => {
    const configChanged = JSON.stringify(localConfig) !== JSON.stringify(agent.configuration);
    setHasChanges(configChanged);
  }, [localConfig, agent.configuration]);

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setLocalConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: enabled
      }
    }));
  };

  const handleResourceChange = (resource: string, value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        [resource]: value
      }
    }));
  };

  const handleEnvironmentChange = (key: string, value: string) => {
    setLocalConfig(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        [key]: value
      }
    }));
  };

  const handleApplyChanges = async () => {
    if (!hasChanges) return;

    setIsApplying(true);
    try {
      await onConfigurationUpdate(localConfig);
      toast({
        title: 'Configuration Applied',
        description: `Successfully updated configuration for ${agent.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Configuration Error',
        description: 'Failed to apply configuration changes',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRevertChanges = () => {
    setLocalConfig(agent.configuration);
    toast({
      title: 'Changes Reverted',
      description: 'All changes have been reverted to the last saved configuration',
      status: 'info',
      duration: 2000,
      isClosable: true,
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

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Card variant="outline">
        <CardHeader>
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading as="h3" size="md">
                {agent.name} Configuration
              </Heading>
              <HStack spacing={2}>
                <Badge colorScheme="blue">v{agent.version}</Badge>
                <Badge colorScheme="purple">{agent.type}</Badge>
                <Badge colorScheme={agent.status === 'active' ? 'green' : 'gray'}>
                  {agent.status}
                </Badge>
              </HStack>
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
          </HStack>
        </CardHeader>
      </Card>

      {hasChanges && (
        <Alert status="warning">
          <AlertIcon />
          You have unsaved changes. Click "Apply Changes" to update the agent configuration.
        </Alert>
      )}

      {/* Configuration Tabs */}
      <Card variant="outline">
        <CardBody p={0}>
          <Tabs colorScheme="blue" variant="enclosed">
            <TabList px={6} pt={4}>
              <Tab>Features</Tab>
              <Tab>Resources</Tab>
              <Tab>Environment</Tab>
              <Tab>Session State</Tab>
              <Tab>Advanced</Tab>
            </TabList>

            <TabPanels>
              {/* Features Tab */}
              <TabPanel px={6} pb={6}>
                <VStack spacing={6} align="stretch">
                  <Text color={useSemanticToken('text.secondary')}>
                    Enable or disable agent features. Some features may require a restart.
                  </Text>
                  
                  {Object.entries(featuresByCategory).map(([category, features]) => (
                    <Card key={category} variant="outline">
                      <CardHeader pb={2}>
                        <Heading as="h4" size="sm" color={useSemanticToken('text.secondary')}>
                          {category}
                        </Heading>
                      </CardHeader>
                      <CardBody pt={2}>
                        <VStack spacing={4} align="stretch">
                          {features.map(({ feature, enabled, definition }) => (
                            <HStack key={feature} justify="space-between" align="start">
                              <VStack align="start" spacing={1} flex={1}>
                                <HStack spacing={2}>
                                  <Text fontWeight="medium" fontSize="sm">
                                    {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </Text>
                                  {definition?.requiresRestart && (
                                    <Badge size="xs" colorScheme="orange">
                                      Restart Required
                                    </Badge>
                                  )}
                                  <Badge size="xs" colorScheme={getImpactColor(definition?.impact)}>
                                    {definition?.impact} Impact
                                  </Badge>
                                </HStack>
                                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                  {definition?.description || 'No description available'}
                                </Text>
                              </VStack>
                              <Switch
                                isChecked={enabled}
                                onChange={(e) => handleFeatureToggle(feature, e.target.checked)}
                                colorScheme="blue"
                              />
                            </HStack>
                          ))}
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              </TabPanel>

              {/* Resources Tab */}
              <TabPanel px={6} pb={6}>
                <VStack spacing={6} align="stretch">
                  <Text color={useSemanticToken('text.secondary')}>
                    Configure resource allocation for optimal performance.
                  </Text>
                  
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">CPU Cores</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4}>
                          <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                            {localConfig.resources.cpu}
                          </Text>
                          <Slider
                            value={localConfig.resources.cpu}
                            onChange={(value) => handleResourceChange('cpu', value)}
                            min={1}
                            max={16}
                            step={1}
                            colorScheme="blue"
                          >
                            <SliderTrack>
                              <SliderFilledTrack />
                            </SliderTrack>
                            <SliderThumb />
                          </Slider>
                          <HStack justify="space-between" w="full" fontSize="xs" color={useSemanticToken('text.secondary')}>
                            <Text>1 Core</Text>
                            <Text>16 Cores</Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Memory (MB)</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4}>
                          <Text fontSize="2xl" fontWeight="bold" color="green.500">
                            {localConfig.resources.memory}
                          </Text>
                          <Slider
                            value={localConfig.resources.memory}
                            onChange={(value) => handleResourceChange('memory', value)}
                            min={512}
                            max={16384}
                            step={512}
                            colorScheme="green"
                          >
                            <SliderTrack>
                              <SliderFilledTrack />
                            </SliderTrack>
                            <SliderThumb />
                          </Slider>
                          <HStack justify="space-between" w="full" fontSize="xs" color={useSemanticToken('text.secondary')}>
                            <Text>512 MB</Text>
                            <Text>16 GB</Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  {localConfig.model && (
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">AI Model</Heading>
                      </CardHeader>
                      <CardBody>
                        <FormControl>
                          <FormLabel fontSize="sm">Model Selection</FormLabel>
                          <Select
                            value={localConfig.model}
                            onChange={(e) => setLocalConfig(prev => ({ ...prev, model: e.target.value }))}
                          >
                            <option value="mistral:latest">Mistral 7B (Latest)</option>
                            <option value="llama3.2:3b">Llama 3.2 3B</option>
                            <option value="gemma2:9b">Gemma 2 9B</option>
                            <option value="gpt-4o-realtime-preview">GPT-4o Realtime (Voice only)</option>
                          </Select>
                        </FormControl>
                      </CardBody>
                    </Card>
                  )}
                </VStack>
              </TabPanel>

              {/* Environment Tab */}
              <TabPanel px={6} pb={6}>
                <VStack spacing={6} align="stretch">
                  <Text color={useSemanticToken('text.secondary')}>
                    Configure environment variables and runtime settings.
                  </Text>
                  
                  <Card variant="outline">
                    <CardHeader>
                      <Heading as="h4" size="sm">Environment Variables</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        {Object.entries(localConfig.environment).map(([key, value]) => (
                          <FormControl key={key}>
                            <FormLabel fontSize="sm">{key}</FormLabel>
                            <Input
                              value={value}
                              onChange={(e) => handleEnvironmentChange(key, e.target.value)}
                              size="sm"
                              placeholder={`Enter ${key}`}
                            />
                          </FormControl>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* Session State Tab */}
              <TabPanel px={6} pb={6}>
                <VStack spacing={6} align="stretch">
                  <Text color={useSemanticToken('text.secondary')}>
                    Real-time agent session information and connection status.
                  </Text>
                  
                  <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                    {/* Connection Status */}
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Connection Status</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack justify="space-between">
                            <Text fontSize="sm">Status</Text>
                            <Badge colorScheme={agent.status === 'active' ? 'green' : 'red'}>
                              {agent.status === 'active' ? 'Connected' : 'Disconnected'}
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Last Heartbeat</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Uptime</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {agent.performance?.uptime ? `${agent.performance.uptime}%` : 'N/A'}
                            </Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Platform</Text>
                            <Badge size="sm" colorScheme="blue">{agent.platform}</Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Active Capabilities */}
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Active Capabilities</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          {Object.entries(agent.capabilities).map(([capability, enabled]) => (
                            <HStack key={capability} justify="space-between">
                              <Text fontSize="sm">
                                {capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Text>
                              <Badge size="sm" colorScheme={enabled ? 'green' : 'gray'}>
                                {enabled ? 'Active' : 'Inactive'}
                              </Badge>
                            </HStack>
                          ))}
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Performance Metrics */}
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Performance Metrics</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          {agent.performance && (
                            <>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Response Time</Text>
                                <Text fontSize="sm" color="blue.500">
                                  {agent.performance.responseTime}ms
                                </Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Throughput</Text>
                                <Text fontSize="sm" color="green.500">
                                  {agent.performance.throughput} req/min
                                </Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Error Rate</Text>
                                <Text fontSize="sm" color={agent.performance.errorRate > 5 ? 'red.500' : 'green.500'}>
                                  {agent.performance.errorRate}%
                                </Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">CPU Usage</Text>
                                <Text fontSize="sm" color="orange.500">
                                  {agent.performance.cpuUsage}%
                                </Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm">Memory Usage</Text>
                                <Text fontSize="sm" color="purple.500">
                                  {agent.performance.memoryUsage}%
                                </Text>
                              </HStack>
                            </>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>

                    {/* Session Information */}
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Session Information</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={4} align="stretch">
                          <HStack justify="space-between">
                            <Text fontSize="sm">Session ID</Text>
                            <Code fontSize="xs">{agent.id}</Code>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Version</Text>
                            <Badge size="sm" colorScheme="purple">{agent.version}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Type</Text>
                            <Badge size="sm" colorScheme="cyan">{agent.type}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm">Started</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {new Date(agent.lastHeartbeat).toLocaleDateString()}
                            </Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  {/* Active Operations */}
                  <Card variant="outline">
                    <CardHeader>
                      <HStack justify="space-between">
                        <Heading as="h4" size="sm">Active Operations</Heading>
                        <Button size="xs" variant="ghost" leftIcon={<FaSync />}>
                          Refresh
                        </Button>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Operation</Th>
                            <Th>Status</Th>
                            <Th>Started</Th>
                            <Th>Duration</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <Tr>
                            <Td>Query Processing</Td>
                            <Td>
                              <Badge size="sm" colorScheme="green">Active</Badge>
                            </Td>
                            <Td>{new Date().toLocaleTimeString()}</Td>
                            <Td>2.3s</Td>
                          </Tr>
                          <Tr>
                            <Td>Memory Sync</Td>
                            <Td>
                              <Badge size="sm" colorScheme="blue">Idle</Badge>
                            </Td>
                            <Td>-</Td>
                            <Td>-</Td>
                          </Tr>
                          <Tr>
                            <Td>Health Check</Td>
                            <Td>
                              <Badge size="sm" colorScheme="green">Active</Badge>
                            </Td>
                            <Td>{new Date(Date.now() - 30000).toLocaleTimeString()}</Td>
                            <Td>30s</Td>
                          </Tr>
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* Advanced Tab */}
              <TabPanel px={6} pb={6}>
                <VStack spacing={6} align="stretch">
                  <Alert status="warning">
                    <AlertIcon />
                    Advanced settings can affect agent stability. Modify with caution.
                  </Alert>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Configuration Export</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3}>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                            Export current configuration as JSON
                          </Text>
                          <Button
                            size="sm"
                            leftIcon={<FaDownload />}
                            colorScheme="blue"
                            variant="outline"
                            onClick={() => {
                              const configJson = JSON.stringify(localConfig, null, 2);
                              const blob = new Blob([configJson], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-config.json`;
                              a.click();
                            }}
                          >
                            Export Configuration
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card variant="outline">
                      <CardHeader>
                        <Heading as="h4" size="sm">Configuration Import</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack spacing={3}>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                            Import configuration from JSON file
                          </Text>
                          <Button
                            size="sm"
                            leftIcon={<FaUpload />}
                            colorScheme="green"
                            variant="outline"
                            isDisabled
                          >
                            Import Configuration
                          </Button>
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            Coming soon
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </VStack>
  );
};
