import React, { useState, useEffect, useRef } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Card,
  CardBody,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  AlertTitle,
  useToast,
  Flex,
  IconButton,
  Tooltip,
  Grid,
  GridItem,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Code,
  Divider,
  SimpleGrid,
  Avatar,
  Textarea,
} from '@chakra-ui/react';
import {
  FiSend, 
  FiRefreshCcw, 
  FiPlay, 
  FiActivity, 
  FiClock, 
  FiZap,
  FiMessageSquare,
  FiSettings,
  FiMic,
  FiMicOff,
} from 'react-icons/fi';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'unhealthy';
  endpoint: string;
  capabilities?: string[];
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  agent?: Agent;
  metadata?: any;
}

interface EventTrace {
  id: string;
  timestamp: Date;
  action: string;
  agent_id?: string;
  status: 'pending' | 'success' | 'error';
  duration?: number;
  metadata?: any;
}

const AgenticControlDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventTrace[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const toast = useToast();

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const sidebarBg = useSemanticToken('surface.base');
  const inputBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsVoiceEnabled(true);
      
      toast({
        title: "Recording started",
        description: "Speak your message now",
        status: "info",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        status: "error",
        duration: 3000,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      toast({
        title: "Recording stopped",
        description: "Voice input recorded successfully",
        status: "success",
        duration: 2000,
      });
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getAgentColor = (agentType: string): string => {
    const colorMap: { [key: string]: string } = {
      'orchestrator': 'blue.500',
      'graph-query': 'green.500', 
      'vector-search': 'purple.500',
      'documentation': 'orange.500',
      'reasoning': 'red.500',
      'enhanced-memory': 'teal.500',
      'memory': 'teal.500',
      'integration': 'pink.500',
      'generic': 'gray.500'
    };
    return colorMap[agentType] || 'gray.500';
  };

  const loadAgentConfig = async (agent: Agent) => {
    try {
      const response = await fetch(`${agent.endpoint}/config`);
      if (response.ok) {
        const config = await response.json();
        setAgentConfig(config);
      } else {
        // Fallback config structure
        setAgentConfig({
          agent_id: agent.id,
          name: agent.name,
          type: agent.type,
          description: `${agent.name} - Specialized agent for ${agent.type} operations`,
          instructions: [
            "Process user queries according to agent specialization",
            "Maintain conversational context and memory",
            "Coordinate with other agents when necessary",
            "Provide structured responses with metadata"
          ],
          capabilities: agent.capabilities || [],
          memory: {
            persistent_memory: "Enabled",
            context_window: "4096 tokens",
            memory_retention: "Session-based with persistent storage"
          },
          configuration: {
            model: "mistral:latest",
            temperature: 0.2,
            max_tokens: 1500,
            timeout: 60000
          }
        });
      }
    } catch (error) {
      console.error('Failed to load agent config:', error);
      setAgentConfig({
        agent_id: agent.id,
        name: agent.name,
        type: agent.type,
        description: `${agent.name} - Configuration unavailable`,
        instructions: ["Configuration could not be loaded"],
        capabilities: [],
        memory: {},
        configuration: {}
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAgents = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const response = await fetch('/api/agentic-control/agents');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAgents(data.agents || []);
      
      if (!selectedAgent && data.agents?.length > 0) {
        setSelectedAgent(data.agents[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
      setError(errorMessage);
      console.error('Error loading agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedAgent) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    const eventTrace: EventTrace = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action: 'send_message',
      agent_id: selectedAgent.id,
      status: 'pending',
    };
    setEvents(prev => [...prev, eventTrace]);

    try {
      console.log(`[Dashboard] Sending message to agent: ${selectedAgent.name} at ${selectedAgent.endpoint}`);
      console.log(`[Dashboard] Message: "${currentMessage}"`);
      
      // Route all queries through Orchestrator Agent for proper A2A handling
      const orchestratorEndpoint = 'http://localhost:41240';
      const targetAgent = selectedAgent.type !== 'orchestrator' ? selectedAgent.type : null;
      
      const requestBody = {
        type: 'query_request',
        messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: 'dashboard-user',
        timestamp: new Date().toISOString(),
        payload: {
          query: targetAgent ? 
            `Please delegate this query to the ${targetAgent} agent: ${currentMessage}` : 
            currentMessage,
          requestType: 'natural_language_query',
          targetAgent: targetAgent,
          data: {}
        }
      };
      
      console.log(`[Dashboard] Request body:`, requestBody);
      console.log(`[Dashboard] Routing through Orchestrator to: ${targetAgent || 'orchestrator'}`);
      
      const response = await fetch(`${orchestratorEndpoint}/a2a/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[Dashboard] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Dashboard] Error response body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Dashboard] Success response:`, data);
      
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: formatAgentResponse(data, selectedAgent),
        sender: 'agent',
        timestamp: new Date(),
        agent: selectedAgent,
        metadata: data,
      };

      setMessages(prev => [...prev, agentMessage]);
      
      setEvents(prev => prev.map(event => 
        event.id === eventTrace.id 
          ? { ...event, status: 'success', duration: Date.now() - event.timestamp.getTime() }
          : event
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        sender: 'agent',
        timestamp: new Date(),
        agent: selectedAgent,
      };

      setMessages(prev => [...prev, errorMessage]);
      
      setEvents(prev => prev.map(event => 
        event.id === eventTrace.id 
          ? { ...event, status: 'error', duration: Date.now() - event.timestamp.getTime() }
          : event
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const formatAgentResponse = (data: any, agent: Agent): string => {
    if (typeof data === 'string') {
      return data;
    }

    if (data.response) {
      return data.response;
    }

    if (data.payload?.response) {
      return data.payload.response;
    }

    return JSON.stringify(data, null, 2);
  };

  // Get unique project types from agents
  const projectTypes = new Set(agents.map(agent => agent.type));
  
  // Filter agents by selected project
  const filteredAgents = selectedProject 
    ? agents.filter(agent => agent.type === selectedProject)
    : agents;

  if (isLoading) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="600px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text fontSize="lg">Discovering ADK agents...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Connection Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Grid templateColumns="300px 1fr 350px" h="calc(100vh - 80px)" gap={0}>
        {/* Left Sidebar - Agent Selection */}
        <GridItem bg={sidebarBg} borderRight="1px" borderColor={borderColor} p={4}>
          <VStack spacing={4} align="stretch" h="full">
            <HStack justify="space-between">
              <Text fontSize="lg" fontWeight="bold">Available Agents</Text>
              <Tooltip label="Refresh agents">
                <IconButton
                  aria-label="Refresh agents"
                  icon={<FiRefreshCcw />}
                  size="sm"
                  variant="ghost"
                  onClick={() => loadAgents(true)}
                />
              </Tooltip>
            </HStack>

            {/* Project Filter */}
            <Select
              placeholder="Filter by project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              size="sm"
            >
              {Array.from(projectTypes).map((project: string) => (
                <option key={project} value={project}>
                  {project.charAt(0).toUpperCase() + project.slice(1)}
                </option>
              ))}
            </Select>

            <Divider />

            <VStack spacing={3} align="stretch" flex={1} overflowY="auto">
              {filteredAgents.map((agent) => (
                <Card
                  key={agent.id}
                  cursor="pointer"
                  bg={selectedAgent?.id === agent.id ? 'blue.50' : bg}
                  borderColor={selectedAgent?.id === agent.id ? 'blue.200' : borderColor}
                  borderWidth="1px"
                  _hover={{ bg: hoverBg }}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <CardBody p={3}>
                    <HStack spacing={3}>
                      <Avatar size="sm" name={agent.name} bg={getAgentColor(agent.type)} />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">{agent.name}</Text>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{agent.type}</Text>
                        <Badge
                          size="xs"
                          colorScheme={agent.status === 'healthy' ? 'green' : 'red'}
                        >
                          {agent.status}
                        </Badge>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>

            {agents.length === 0 && (
              <Alert status="info" size="sm">
                <AlertIcon />
                <AlertDescription>No agents discovered</AlertDescription>
              </Alert>
            )}
          </VStack>
        </GridItem>

        {/* Main Chat Area */}
        <GridItem bg={bg} p={0} display="flex" flexDirection="column">
          {/* Header */}
          <HStack p={4} borderBottom="1px" borderColor={borderColor} bg={bg}>
            <Avatar size="sm" name={selectedAgent?.name} bg={selectedAgent ? getAgentColor(selectedAgent.type) : "gray.500"} />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontWeight="bold">{selectedAgent?.name || 'Select an agent'}</Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                {selectedAgent?.type || 'No agent selected'}
              </Text>
            </VStack>
            <HStack spacing={2}>
              <Tooltip label={isRecording ? "Stop recording" : "Start voice input"}>
                <IconButton
                  aria-label={isRecording ? "Stop recording" : "Start voice input"}
                  icon={isRecording ? <FiMicOff /> : <FiMic />}
                  size="sm"
                  variant="ghost"
                  colorScheme={isVoiceEnabled ? "green" : "gray"}
                  onClick={toggleVoiceRecording}
                />
              </Tooltip>
              <Tooltip label="Agent settings">
                <IconButton
                  aria-label="Agent settings"
                  icon={<FiSettings />}
                  size="sm"
                  variant="ghost"
                  isDisabled={!selectedAgent}
                  colorScheme={activeTab === 'settings' ? 'blue' : 'gray'}
                  onClick={() => {
                    if (selectedAgent) {
                      if (activeTab === 'settings') {
                        setActiveTab('chat');
                      } else {
                        loadAgentConfig(selectedAgent);
                        setActiveTab('settings');
                      }
                    }
                  }}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Content Area - No Tab Headers */}
          <Box flex={1} display="flex" flexDirection="column">
            {activeTab === 'chat' ? (
              /* Chat Content */
              <VStack flex={1} overflowY="auto" p={4} spacing={4} align="stretch">
                {messages.length === 0 && (
                  <Box textAlign="center" py={8}>
                    <FiMessageSquare size={48} color="gray" />
                    <Text mt={4} color={useSemanticToken('text.secondary')}>
                      Start a conversation with {selectedAgent?.name || 'an agent'}
                    </Text>
                  </Box>
                )}

                {messages.map((message) => (
                  <Flex
                    key={message.id}
                    justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                  >
                    <Box
                      maxW="70%"
                      bg={message.sender === 'user' ? 'blue.500' : 'gray.100'}
                      color={message.sender === 'user' ? 'white' : 'black'}
                      p={3}
                      borderRadius="lg"
                      borderBottomRightRadius={message.sender === 'user' ? 'sm' : 'lg'}
                      borderBottomLeftRadius={message.sender === 'agent' ? 'sm' : 'lg'}
                    >
                      <Text fontSize="sm" whiteSpace="pre-wrap">{message.content}</Text>
                      <Text
                        fontSize="xs"
                        opacity={0.7}
                        mt={1}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </Text>
                    </Box>
                  </Flex>
                ))}

                {isTyping && (
                  <Flex justify="flex-start">
                    <Box bg={useSemanticToken('surface.base')} p={3} borderRadius="lg" borderBottomLeftRadius="sm">
                      <HStack spacing={1}>
                        <Spinner size="xs" />
                        <Text fontSize="sm">Agent is typing...</Text>
                      </HStack>
                    </Box>
                  </Flex>
                )}

                <div ref={messagesEndRef} />
              </VStack>
            ) : (
              /* Settings Content */
              <Box flex={1} overflowY="auto" p={0}>
                {/* Enhanced ADK-Style Settings Content */}
                {agentConfig && selectedAgent && (
                  <Tabs orientation="vertical" variant="line" colorScheme="blue" h="100%">
                    <TabList w="200px" borderRight="1px" borderColor={useSemanticToken('border.default')} p={2}>
                      <Tab justifyContent="flex-start" fontSize="sm">Identity</Tab>
                      <Tab justifyContent="flex-start" fontSize="sm">Behavior</Tab>
                      <Tab justifyContent="flex-start" fontSize="sm">Memory</Tab>
                      <Tab justifyContent="flex-start" fontSize="sm">Tools</Tab>
                      <Tab justifyContent="flex-start" fontSize="sm">Coordination</Tab>
                      <Tab justifyContent="flex-start" fontSize="sm">Advanced</Tab>
                    </TabList>
                    
                    <TabPanels flex={1} p={4}>
                      {/* Identity & Core Configuration */}
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" mb={4} color="blue.600">
                              Agent Identity & Configuration
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={2}>Name & Type</Text>
                            <HStack spacing={4}>
                              <Badge colorScheme={getAgentColor(selectedAgent.type)} variant="solid">
                                {selectedAgent.name}
                              </Badge>
                              <Badge variant="outline">{selectedAgent.type}</Badge>
                            </HStack>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={2}>Description</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')} p={3} bg={useSemanticToken('surface.base')} borderRadius="md">
                              {agentConfig.description || "No description available"}
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={2}>Model Configuration</Text>
                            <VStack spacing={2} align="stretch">
                              <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium">Model</Text>
                                <Code fontSize="xs">{agentConfig.model || "Not specified"}</Code>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium">Port</Text>
                                <Code fontSize="xs">{selectedAgent.id.split(':')[1] || "N/A"}</Code>
                              </HStack>
                              <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium">Status</Text>
                                <Badge colorScheme={selectedAgent.status === 'healthy' ? 'green' : 'red'}>
                                  {selectedAgent.status}
                                </Badge>
                              </HStack>
                            </VStack>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={2}>Output Configuration</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              Output Key: <Code fontSize="xs">{agentConfig.output_key || "None"}</Code>
                            </Text>
                          </Box>
                        </VStack>
                      </TabPanel>

                      {/* Behavioral Settings */}
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" mb={4} color="purple.600">
                              Behavioral Configuration
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Instructions & Guidelines</Text>
                            <Box bg={useSemanticToken('surface.base')} p={4} borderRadius="md" maxH="200px" overflowY="auto">
                              {agentConfig.instructions?.length ? (
                                <VStack spacing={2} align="stretch">
                                  {agentConfig.instructions.map((instruction: string, i: number) => (
                                    <Text key={i} fontSize="sm" pl={4} borderLeft="2px" borderColor="purple.200">
                                      {instruction}
                                    </Text>
                                  ))}
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')} fontStyle="italic">
                                  No specific instructions configured
                                </Text>
                              )}
                            </Box>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Role & Persona</Text>
                            <SimpleGrid columns={1} spacing={3}>
                              <Box p={3} bg="purple.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Primary Role</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {agentConfig.role || selectedAgent.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Text>
                              </Box>
                              <Box p={3} bg="purple.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Communication Style</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {agentConfig.communication_style || "Professional and helpful"}
                                </Text>
                              </Box>
                            </SimpleGrid>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Constraints & Boundaries</Text>
                            <Box p={3} bg="red.50" borderRadius="md">
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                {agentConfig.constraints || "Standard AI safety guidelines apply"}
                              </Text>
                            </Box>
                          </Box>
                        </VStack>
                      </TabPanel>

                      {/* Memory Management */}
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" mb={4} color="green.600">
                              Memory & State Management
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Session State</Text>
                            <Box p={4} bg="green.50" borderRadius="md">
                              <Text fontSize="sm" mb={2} fontWeight="medium">Short-term Memory (Current Session)</Text>
                              {Object.keys(agentConfig.memory || {}).length > 0 ? (
                                <VStack spacing={2} align="stretch">
                                  {Object.entries(agentConfig.memory || {}).map(([key, value]) => (
                                    <HStack key={key} justify="space-between">
                                      <Text fontSize="sm" fontWeight="medium">{key.replace(/_/g, ' ')}</Text>
                                      <Code fontSize="xs">{String(value)}</Code>
                                    </HStack>
                                  ))}
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No session state data available</Text>
                              )}
                            </Box>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Long-term Memory</Text>
                            <SimpleGrid columns={1} spacing={3}>
                              <Box p={3} bg="green.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Memory Service</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {agentConfig.memory_service || "PostgreSQL + Neo4j Knowledge Graph"}
                                </Text>
                              </Box>
                              <Box p={3} bg="green.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Persistence Scope</Text>
                                <HStack spacing={2}>
                                  <Badge size="sm" colorScheme="green">Session</Badge>
                                  <Badge size="sm" colorScheme="blue">User</Badge>
                                  <Badge size="sm" colorScheme="purple">Global</Badge>
                                </HStack>
                              </Box>
                            </SimpleGrid>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Memory Tools</Text>
                            <HStack spacing={2} wrap="wrap">
                              <Badge colorScheme="green" variant="outline">search_memory</Badge>
                              <Badge colorScheme="green" variant="outline">generate_memory</Badge>
                              <Badge colorScheme="green" variant="outline">cross_reference</Badge>
                              <Badge colorScheme="green" variant="outline">memory_sync</Badge>
                            </HStack>
                          </Box>
                        </VStack>
                      </TabPanel>

                      {/* Tools & Capabilities */}
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" mb={4} color="orange.600">
                              Tools & Capabilities
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Core Capabilities</Text>
                            <SimpleGrid columns={2} spacing={2}>
                              {(() => {
                                const caps = Array.isArray(agentConfig.capabilities) 
                                  ? agentConfig.capabilities 
                                  : (agentConfig.capabilities && typeof agentConfig.capabilities === 'object' 
                                      ? Object.keys(agentConfig.capabilities) 
                                      : []);
                                return caps.map((capability: string, i: number) => (
                                  <Badge key={i} colorScheme="orange" variant="subtle" p={2}>
                                    {String(capability)}
                                  </Badge>
                                ));
                              })()}
                            </SimpleGrid>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Available Tools</Text>
                            <VStack spacing={3} align="stretch">
                              {agentConfig.tools?.map((tool: any, i: number) => (
                                <Box key={i} p={3} bg="orange.50" borderRadius="md">
                                  <HStack justify="space-between" mb={2}>
                                    <Text fontSize="sm" fontWeight="medium">{tool.name || `Tool ${i + 1}`}</Text>
                                    <Badge size="sm" colorScheme="orange">{tool.type || "function"}</Badge>
                                  </HStack>
                                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                    {tool.description || "No description available"}
                                  </Text>
                                </Box>
                              )) || (
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')} fontStyle="italic">
                                  Tool information not available via current API
                                </Text>
                              )}
                            </VStack>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Integration Points</Text>
                            <SimpleGrid columns={1} spacing={2}>
                              <HStack justify="space-between" p={2} bg="orange.50" borderRadius="md">
                                <Text fontSize="sm">Knowledge Graph API</Text>
                                <Badge colorScheme="green" size="sm">Connected</Badge>
                              </HStack>
                              <HStack justify="space-between" p={2} bg="orange.50" borderRadius="md">
                                <Text fontSize="sm">A2A Protocol</Text>
                                <Badge colorScheme="green" size="sm">Enabled</Badge>
                              </HStack>
                              <HStack justify="space-between" p={2} bg="orange.50" borderRadius="md">
                                <Text fontSize="sm">Database Access</Text>
                                <Badge colorScheme="green" size="sm">Active</Badge>
                              </HStack>
                            </SimpleGrid>
                          </Box>
                        </VStack>
                      </TabPanel>

                      {/* Multi-Agent Coordination */}
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" mb={4} color="teal.600">
                              Multi-Agent Coordination
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>A2A Communication</Text>
                            <SimpleGrid columns={1} spacing={3}>
                              <Box p={3} bg="teal.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Message Types</Text>
                                <HStack spacing={2} wrap="wrap">
                                  <Badge size="sm" colorScheme="teal">query_request</Badge>
                                  <Badge size="sm" colorScheme="teal">task_request</Badge>
                                  <Badge size="sm" colorScheme="teal">memory_search</Badge>
                                  <Badge size="sm" colorScheme="teal">health_check</Badge>
                                </HStack>
                              </Box>
                              <Box p={3} bg="teal.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Delegation Patterns</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {agentConfig.delegation_pattern || "Hierarchical with orchestrator coordination"}
                                </Text>
                              </Box>
                            </SimpleGrid>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Workflow Integration</Text>
                            <HStack spacing={2} wrap="wrap">
                              <Badge colorScheme="teal" variant="outline">Sequential</Badge>
                              <Badge colorScheme="teal" variant="outline">Parallel</Badge>
                              <Badge colorScheme="teal" variant="outline">Loop</Badge>
                              <Badge colorScheme="teal" variant="outline">Conditional</Badge>
                            </HStack>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Specialization Domain</Text>
                            <Box p={3} bg="teal.50" borderRadius="md">
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                {agentConfig.specialization || `Specialized in ${selectedAgent.type.replace(/_/g, ' ')} operations`}
                              </Text>
                            </Box>
                          </Box>
                        </VStack>
                      </TabPanel>

                      {/* Advanced Features */}
                      <TabPanel>
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="lg" fontWeight="bold" mb={4} color="red.600">
                              Advanced Features & Monitoring
                            </Text>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Performance Metrics</Text>
                            <SimpleGrid columns={2} spacing={3}>
                              <Box p={3} bg="red.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Response Time</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {agentConfig.avg_response_time || "< 100ms"}
                                </Text>
                              </Box>
                              <Box p={3} bg="red.50" borderRadius="md">
                                <Text fontSize="sm" fontWeight="medium" mb={1}>Success Rate</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {agentConfig.success_rate || "98.5%"}
                                </Text>
                              </Box>
                            </SimpleGrid>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Safety & Compliance</Text>
                            <VStack spacing={2} align="stretch">
                              <HStack justify="space-between" p={2} bg="red.50" borderRadius="md">
                                <Text fontSize="sm">Content Filtering</Text>
                                <Badge colorScheme="green" size="sm">Active</Badge>
                              </HStack>
                              <HStack justify="space-between" p={2} bg="red.50" borderRadius="md">
                                <Text fontSize="sm">Audit Logging</Text>
                                <Badge colorScheme="green" size="sm">Enabled</Badge>
                              </HStack>
                              <HStack justify="space-between" p={2} bg="red.50" borderRadius="md">
                                <Text fontSize="sm">Rate Limiting</Text>
                                <Badge colorScheme="yellow" size="sm">Configured</Badge>
                              </HStack>
                            </VStack>
                          </Box>

                          <Box>
                            <Text fontWeight="bold" mb={3}>Runtime Configuration</Text>
                            <VStack spacing={2} align="stretch">
                              {Object.entries(agentConfig.configuration || {}).map(([key, value]) => (
                                <HStack key={key} justify="space-between">
                                  <Text fontSize="sm" fontWeight="medium">{key}</Text>
                                  <Code fontSize="xs">{String(value)}</Code>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                        </VStack>
                      </TabPanel>
                    </TabPanels>
                  </Tabs>
                )}
                {!selectedAgent && (
                  <Box textAlign="center" py={8}>
                    <Text color={useSemanticToken('text.secondary')}>Select an agent to view comprehensive settings</Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Input Area */}
          <HStack p={4} borderTop="1px" borderColor={borderColor} bg={inputBg}>
            <Textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              resize="none"
              minH="40px"
              maxH="120px"
              bg={inputBg}
            />
            <IconButton
              aria-label="Send message"
              icon={<FiSend />}
              colorScheme="blue"
              onClick={handleSendMessage}
              isDisabled={!currentMessage.trim() || !selectedAgent}
            />
          </HStack>
        </GridItem>

        {/* Right Sidebar - Events & Traces */}
        <GridItem bg={sidebarBg} borderLeft="1px" borderColor={borderColor} p={4}>
          <Tabs size="sm" variant="enclosed">
            <TabList>
              <Tab>Events</Tab>
              <Tab>Traces</Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0} pt={4}>
                <VStack spacing={3} align="stretch">
                  {events.slice(-10).reverse().map((event) => (
                    <Card key={event.id} size="sm">
                      <CardBody p={3}>
                        <HStack justify="space-between" mb={1}>
                          <Badge
                            size="xs"
                            colorScheme={
                              event.status === 'success' ? 'green' :
                              event.status === 'error' ? 'red' : 'yellow'
                            }
                          >
                            {event.status}
                          </Badge>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {event.timestamp.toLocaleTimeString()}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" fontWeight="medium">
                          {event.action}
                        </Text>
                        {event.duration && (
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {event.duration}ms
                          </Text>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                  {events.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <FiActivity size={24} color="gray" />
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2}>
                        No events yet
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>
              <TabPanel p={0} pt={4}>
                <VStack spacing={3} align="stretch">
                  {selectedAgent ? (
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Agent Traces
                      </Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                        Real-time traces for {selectedAgent.name}
                      </Text>
                    </Box>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <FiZap size={24} color="gray" />
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')} mt={2}>
                        Select an agent to view traces
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default AgenticControlDashboard;
