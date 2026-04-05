import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
  HStack,
  Divider,
  Avatar,
  Collapse,
  useDisclosure,
  Badge,
  Spinner,
  useToast,
  Tooltip
} from '@chakra-ui/react';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  ChatIcon,
  InfoOutlineIcon,
  CheckCircleIcon,
  WarningIcon,
  CloseIcon,
  AttachmentIcon,
  BellIcon
} from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import { usePageContext, PageContextType } from '../../hooks/usePageContext';
import { useRightSidebar } from '@/contexts/RightSidebarContext';
import { useDualPortAIGateway } from '@/lib/ai-gateway-dual-port-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

type Message = {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'error';
  evidence?: {
    type: string;
    content: string;
  }[];
};

type Evidence = {
  id: string;
  title: string;
  content: string;
  type: 'graph' | 'document' | 'code' | 'service';
  source: string;
};

type Action = {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'running' | 'completed' | 'failed';
  type: 'analysis' | 'command' | 'recommendation';
};

const KnowledgeGraphAgentSidebar: React.FC = () => {
  const { 
    isRightSidebarOpen: isOpen, 
    toggleRightSidebar, 
    rightSidebarWidth,
    setRightSidebarWidth
  } = useRightSidebar();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'evidence' | 'actions'>('chat');
  const [currentContext, setCurrentContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  
  // Get rich contextual information about the current page
  const pageContext = usePageContext();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const headingColor = useSemanticToken('text.primary');
  const textColor = useSemanticToken('text.secondary');
  const itemBg = useSemanticToken('surface.base');
  
  // Update sidebar content based on page context
  useEffect(() => {
    // Create a user-friendly context string
    let contextString = `${pageContext.pageType.charAt(0).toUpperCase() + pageContext.pageType.slice(1)}`;
    
    if (pageContext.section && pageContext.section !== 'overview') {
      contextString += ` › ${pageContext.section.charAt(0).toUpperCase() + pageContext.section.slice(1)}`;
    }
    
    if (pageContext.entityType) {
      contextString += ` › ${pageContext.entityType.charAt(0).toUpperCase() + pageContext.entityType.slice(1)}`;
    }
    
    if (pageContext.entityId) {
      const shortId = pageContext.entityId.length > 10 
        ? pageContext.entityId.substring(0, 10) + '...' 
        : pageContext.entityId;
      contextString += ` › ${shortId}`;
    }
    
    setCurrentContext(contextString);
    
    // When context changes, fetch contextual data from agent with rich context
    fetchAgentCard(pageContext);
  }, [pageContext]);
  
  // Scroll to bottom of messages when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Fetch agent card data based on rich page context
  const fetchAgentCard = async (context: PageContextType) => {
    try {
      setIsLoading(true);
      // Send the full context object as JSON in request body
      const response = await fetch('/api/agent/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: context
        })
      });
      if (!response.ok) throw new Error('Failed to fetch agent data');
      
      const data = await response.json();
      
      // Add welcome message if no messages yet
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          sender: 'agent',
          content: `Hello! I'm your Knowledge Graph Agent. I'm here to help with your ${currentContext} tasks.`,
          timestamp: new Date(),
          status: 'delivered'
        }]);
      }
      
      // Set available actions from card data
      if (data.actions && Array.isArray(data.actions)) {
        setActions(data.actions.map((action: any) => ({
          id: action.id || Math.random().toString(36).substring(7),
          title: action.title,
          description: action.description || '',
          status: 'available',
          type: action.type || 'recommendation'
        })));
      }
    } catch (error) {
      console.error('Error fetching agent card:', error);
      toast({
        title: 'Connection error',
        description: 'Could not connect to Knowledge Graph Agent',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const { aiClient, isFullyConnected, sendChatCompletion } = useDualPortAIGateway();
  const client = aiClient;

  /**
   * Agentic Query Classification for Sidebar Assistant
   */
  const classifyQuery = async (query: string) => {
    try {
      const classificationPrompt = `
Analyze this user query and classify it for optimal routing in an AI Homelab system:

Query: "${query}"

Respond with JSON:
{
  "domain": "knowledge_graph|infrastructure|ai_metrics|general|system_status",
  "confidence": 0.0-1.0,
  "intent": "brief description of user intent",
  "entities": ["key entities mentioned"],
  "requiresData": true/false
}

Examples:
- "How many memories do I have?" → knowledge_graph, high confidence
- "What's the system status?" → system_status, high confidence  
- "Hello" → general, low confidence
`;

      const response = await sendChatCompletion({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: classificationPrompt }],
        temperature: 0.1,
        max_tokens: 200
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.warn('Query classification failed, using fallback routing:', error);
      return {
        domain: 'general',
        confidence: 0.5,
        intent: 'General query',
        entities: [],
        requiresData: false
      };
    }
  };

    const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    if (typeof window === 'undefined') {
      return;
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      setRightSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      content: inputText,
      timestamp: new Date(),
      status: 'sent'
    };
    
    setMessages(prev => [...prev, newMessage]);
    const messageText = inputText;
    setInputText('');
    setIsLoading(true);
    
    try {
      // Step 1: Classify the query using agentic routing
      const classification = await classifyQuery(messageText);
      console.log('🎯 KnowledgeGraphAgentSidebar: Query classified as:', classification);
      
      let agentResponse: Message;
      
      // Step 2: Route based on classification
      if (classification.domain === 'knowledge_graph' && classification.confidence > 0.7) {
        // Route to Knowledge Graph Orchestrator
        try {
          const kgResponse = await fetch('/api/knowledge-graph/orchestrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: messageText,
              context: pageContext,
              maxAgents: 3,
              timeout: 15000
            })
          });
          
          if (kgResponse.ok) {
            const kgData = await kgResponse.json();
            agentResponse = {
              id: Math.random().toString(36).substring(7),
              sender: 'agent',
              content: kgData.result?.summary || kgData.result?.answer || 'Knowledge Graph response received.',
              timestamp: new Date(),
              status: 'delivered',
              evidence: kgData.result?.evidence?.map((e: any) => ({
                type: 'knowledge_graph',
                content: e.content || e.description || 'Evidence from Knowledge Graph'
              })) || []
            };
          } else {
            throw new Error('KG orchestrator unavailable');
          }
        } catch (kgError) {
          console.warn('KG routing failed, falling back to AI Gateway:', kgError);
          // Fallback to AI Gateway
          const aiResponse = await sendChatCompletion({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: messageText }]
          });
          
          agentResponse = {
            id: Math.random().toString(36).substring(7),
            sender: 'agent',
            content: aiResponse.choices[0].message.content,
            timestamp: new Date(),
            status: 'delivered',
            evidence: []
          };
        }
      } else {
        // Route to AI Gateway for general queries
        const aiResponse = await sendChatCompletion({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: messageText }]
        });
        
        agentResponse = {
          id: Math.random().toString(36).substring(7),
          sender: 'agent',
          content: aiResponse.choices[0].message.content,
          timestamp: new Date(),
          status: 'delivered',
          evidence: []
        };
      }
      
      setMessages(prev => [...prev, agentResponse]);
      
      // Update evidence panel if evidence was provided
      if (agentResponse.evidence && agentResponse.evidence.length > 0) {
        const newEvidence: Evidence[] = agentResponse.evidence.map((item: any) => ({
          id: Math.random().toString(36).substring(7),
          title: item.title || 'Evidence',
          content: item.content || '',
          type: item.type || 'document',
          source: item.source || 'AI Agent'
        }));
        
        setEvidence(prev => [...prev, ...newEvidence]);
      }
      
    } catch (error) {
      console.error('Error in agentic message handling:', error);
      toast({
        title: 'Error',
        description: 'Failed to get a response from the agent',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Update message status to error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'error' } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const executeAction = async (actionId: string) => {
    // Find the action
    const action = actions.find(a => a.id === actionId);
    if (!action) return;
    
    // Update action status to running
    setActions(prev => 
      prev.map(a => 
        a.id === actionId 
          ? { ...a, status: 'running' } 
          : a
      )
    );
    
    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'execute_action',
          parameters: {
            actionId,
            context: pageContext
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to execute action');
      
      const data = await response.json();
      
      // Update action status to completed
      setActions(prev => 
        prev.map(a => 
          a.id === actionId 
            ? { ...a, status: 'completed' } 
            : a
        )
      );
      
      // Add agent message with result
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        sender: 'agent',
        content: data.result || `Action ${action.title} completed successfully.`,
        timestamp: new Date(),
        status: 'delivered',
        evidence: data.evidence || []
      }]);
      
    } catch (error) {
      console.error('Error executing action:', error);
      
      // Update action status to failed
      setActions(prev => 
        prev.map(a => 
          a.id === actionId 
            ? { ...a, status: 'failed' } 
            : a
        )
      );
      
      toast({
        title: 'Error',
        description: `Failed to execute action: ${action.title}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Box 
      position="fixed"
      right={0}
      top="64px"
      bottom={0}
      width={isOpen ? `${rightSidebarWidth}px` : "48px"}
      bg={bgColor}
      borderLeft="1px solid"
      borderColor={borderColor}
      transition="width 0.3s ease"
      zIndex={10}
      overflowX="hidden"
      boxShadow={isOpen ? "lg" : "none"}
    >
      {/* Resize Handle */}
      {isOpen && (
        <Box
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="5px"
          cursor="col-resize"
          onMouseDown={handleMouseDown}
          zIndex={15}
        />
      )}

      {/* Collapse/Expand Button */}
      <IconButton
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        icon={isOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        position="absolute"
        left={0}
        top="10px"
        size="sm"
        onClick={toggleRightSidebar}
        zIndex={2}
      />
      
      {/* Sidebar Content - Only visible when expanded */}
      <Collapse in={isOpen} animateOpacity>
        <Box p={4} pt={12} h="100%">
          {/* Header */}
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <HStack>
              <Icon as={ChatIcon} color="purple.500" boxSize={5} />
              <Heading size="md" color={headingColor}>Knowledge Graph Agent</Heading>
            </HStack>
            <Badge colorScheme="purple" variant="solid">AI</Badge>
          </Flex>
          
          {/* Context Badge */}
          <HStack mb={4}>
            <InfoOutlineIcon color="blue.400" />
            <Text fontSize="sm" color={textColor}>Context:</Text>
            <Badge colorScheme="blue">{currentContext}</Badge>
          </HStack>
          
          {/* Tab Navigation */}
          <HStack spacing={4} mb={4} borderBottom="1px solid" borderColor={borderColor} pb={2}>
            <Button 
              size="sm" 
              variant={activeTab === 'chat' ? 'solid' : 'ghost'} 
              colorScheme={activeTab === 'chat' ? 'blue' : 'gray'}
              leftIcon={<ChatIcon />}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === 'evidence' ? 'solid' : 'ghost'} 
              colorScheme={activeTab === 'evidence' ? 'blue' : 'gray'}
              leftIcon={<InfoOutlineIcon />}
              onClick={() => setActiveTab('evidence')}
            >
              Evidence
              {evidence.length > 0 && (
                <Badge ml={2} colorScheme="blue" variant="solid" borderRadius="full">
                  {evidence.length}
                </Badge>
              )}
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === 'actions' ? 'solid' : 'ghost'} 
              colorScheme={activeTab === 'actions' ? 'blue' : 'gray'}
              leftIcon={<CheckCircleIcon />}
              onClick={() => setActiveTab('actions')}
            >
              Actions
              {actions.length > 0 && (
                <Badge ml={2} colorScheme="green" variant="solid" borderRadius="full">
                  {actions.length}
                </Badge>
              )}
            </Button>
          </HStack>
          
          {/* Tab Content */}
          <Box h="calc(100% - 180px)" overflowY="auto">
            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <VStack spacing={4} align="stretch" pb={4}>
                {messages.map(message => (
                  <Box 
                    key={message.id}
                    alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                    maxWidth="85%"
                    bg={message.sender === 'user' ? 'blue.500' : 'gray.100'}
                    color={message.sender === 'user' ? 'white' : 'black'}
                    borderRadius="lg"
                    px={3}
                    py={2}
                  >
                    <Text fontSize="sm">{message.content}</Text>
                    <Flex justifyContent="flex-end" fontSize="xs" opacity={0.7} mt={1}>
                      {message.status === 'error' ? (
                        <WarningIcon color="red.500" />
                      ) : message.sender === 'user' ? (
                        <Text>{message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      ) : (
                        <HStack spacing={1}>
                          <Text>{message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                          {message.evidence && message.evidence.length > 0 && (
                            <Tooltip label="Has evidence">
                              <AttachmentIcon cursor="pointer" onClick={() => setActiveTab('evidence')} />
                            </Tooltip>
                          )}
                        </HStack>
                      )}
                    </Flex>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </VStack>
            )}
            
            {/* Evidence Tab */}
            {activeTab === 'evidence' && (
              <VStack spacing={4} align="stretch" pb={4}>
                {evidence.length === 0 ? (
                  <Box textAlign="center" py={10}>
                    <InfoOutlineIcon boxSize={10} color={useSemanticToken('text.tertiary')} />
                    <Text mt={4} color={useSemanticToken('text.secondary')}>No evidence available yet</Text>
                  </Box>
                ) : (
                  evidence.map(item => (
                    <Box 
                      key={item.id}
                      p={3}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                      bg={itemBg}
                    >
                      <Flex justifyContent="space-between" alignItems="center" mb={2}>
                        <HStack>
                          <Badge 
                            colorScheme={
                              item.type === 'graph' ? 'purple' : 
                              item.type === 'document' ? 'blue' : 
                              item.type === 'code' ? 'green' : 'orange'
                            }
                          >
                            {item.type}
                          </Badge>
                          <Text fontWeight="bold" fontSize="sm">{item.title}</Text>
                        </HStack>
                      </Flex>
                      <Text fontSize="sm" noOfLines={3}>{item.content}</Text>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>Source: {item.source}</Text>
                    </Box>
                  ))
                )}
              </VStack>
            )}
            
            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <VStack spacing={4} align="stretch" pb={4}>
                {actions.length === 0 ? (
                  <Box textAlign="center" py={10}>
                    <InfoOutlineIcon boxSize={10} color={useSemanticToken('text.tertiary')} />
                    <Text mt={4} color={useSemanticToken('text.secondary')}>No actions available</Text>
                  </Box>
                ) : (
                  actions.map(action => (
                    <Box 
                      key={action.id}
                      p={3}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                      bg={itemBg}
                    >
                      <Flex justifyContent="space-between" alignItems="center" mb={2}>
                        <HStack>
                          <Badge 
                            colorScheme={
                              action.type === 'analysis' ? 'blue' : 
                              action.type === 'command' ? 'orange' : 'green'
                            }
                          >
                            {action.type}
                          </Badge>
                          <Text fontWeight="bold" fontSize="sm">{action.title}</Text>
                        </HStack>
                        {action.status === 'running' ? (
                          <Spinner size="sm" />
                        ) : action.status === 'completed' ? (
                          <CheckCircleIcon color="green.500" />
                        ) : action.status === 'failed' ? (
                          <WarningIcon color="red.500" />
                        ) : null}
                      </Flex>
                      <Text fontSize="sm" noOfLines={2}>{action.description}</Text>
                      <Button
                        size="sm"
                        mt={2}
                        colorScheme={action.type === 'analysis' ? 'blue' : action.type === 'command' ? 'orange' : 'green'}
                        isDisabled={action.status === 'running' || action.status === 'completed'}
                        isLoading={action.status === 'running'}
                        onClick={() => executeAction(action.id)}
                      >
                        {action.status === 'completed' ? 'Completed' : 'Execute'}
                      </Button>
                    </Box>
                  ))
                )}
              </VStack>
            )}
          </Box>
          
          {/* Input Area - Only visible on chat tab */}
          {activeTab === 'chat' && (
            <HStack mt={4} spacing={2}>
              <Input
                placeholder="Ask your Knowledge Graph Agent..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <IconButton
                aria-label="Send message"
                icon={isLoading ? <Spinner size="sm" /> : <ChatIcon />}
                colorScheme="blue"
                onClick={handleSendMessage}
                isLoading={isLoading}
                isDisabled={!inputText.trim()}
              />
            </HStack>
          )}
        </Box>
      </Collapse>
      
      {/* Collapsed View - Only visible when collapsed */}
      {!isOpen && (
        <VStack spacing={4} mt={12} align="center">
          <Tooltip label="Knowledge Graph Agent" placement="left">
            <IconButton
              aria-label="Chat with Knowledge Graph Agent"
              icon={<ChatIcon />}
              colorScheme="purple"
              size="sm"
              variant="ghost"
            />
          </Tooltip>
          {evidence.length > 0 && (
            <Tooltip label={`${evidence.length} Evidence items`} placement="left">
              <Box position="relative">
                <IconButton
                  aria-label="View evidence"
                  icon={<InfoOutlineIcon />}
                  colorScheme="blue"
                  size="sm"
                  variant="ghost"
                />
                <Badge
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  colorScheme="blue"
                  borderRadius="full"
                  fontSize="xs"
                >
                  {evidence.length}
                </Badge>
              </Box>
            </Tooltip>
          )}
          {actions.length > 0 && (
            <Tooltip label={`${actions.length} Actions available`} placement="left">
              <Box position="relative">
                <IconButton
                  aria-label="View actions"
                  icon={<CheckCircleIcon />}
                  colorScheme="green"
                  size="sm"
                  variant="ghost"
                />
                <Badge
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  colorScheme="green"
                  borderRadius="full"
                  fontSize="xs"
                >
                  {actions.length}
                </Badge>
              </Box>
            </Tooltip>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default KnowledgeGraphAgentSidebar;
