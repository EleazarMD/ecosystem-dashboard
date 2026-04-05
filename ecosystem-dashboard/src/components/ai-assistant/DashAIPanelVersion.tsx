import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, VStack, HStack, Text, Textarea, Button, Badge, IconButton, Spinner, Tooltip, Divider, Progress, Flex, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { XMarkIcon, ChatBubbleLeftRightIcon, ChartBarIcon, ServerIcon, CpuChipIcon, BoltIcon, TrashIcon, UserGroupIcon, CameraIcon, MicrophoneIcon, SpeakerWaveIcon, PaperAirplaneIcon, EyeIcon } from '@heroicons/react/24/outline';
import { DashboardAIAgent } from '../../agents/DashboardAIAgent';
import { getDashboardAgentInstance } from '../../lib/dashboard-agent-instance';
import { ContextMCPClient } from '../../lib/context-mcp-client';
import { gooseClient, GooseSession } from '../../services/goose/GooseClient';

type Message = {
  id: string;
  content: string;
  timestamp: Date;
  confidence?: number;
  toolsUsed?: string[];
  agentUsed?: 'gemini' | 'goose' | 'vision' | 'dashboard';
  isStreaming?: boolean;
  streamedContent?: string;
};

type AgentMode = 'auto' | 'gemini-only' | 'goose-only';

type DashAIPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResize: (width: number) => void;
  dashboardContext?: any;
};

const DashAIPanelVersion: React.FC<DashAIPanelProps> = ({ isOpen, onClose, width, onResize, dashboardContext = {} }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dashAgent, setDashAgent] = useState<DashboardAIAgent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [activePages, setActivePages] = useState<any[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  
  // Goose ACP integration
  const [gooseSession, setGooseSession] = useState<GooseSession | null>(null);
  const [gooseInitialized, setGooseInitialized] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('auto');
  const [contextPreview, setContextPreview] = useState<any>(null);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextClient = useRef(new ContextMCPClient());

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  useEffect(() => {
    if (!dashAgent) {
      try {
        const agent = getDashboardAgentInstance();
        setDashAgent(agent);
        setIsInitialized(true);
      } catch (e) {
        console.error('Failed to init DashboardAIAgent', e);
      }
    }
  }, [dashAgent]);

  // Initialize Goose session
  useEffect(() => {
    const initGoose = async () => {
      try {
        console.log('[DashAI] Initializing Goose ACP session...');
        const session = await gooseClient.createSession('dashboard-main', {
          pageTitle: 'AI Homelab Dashboard',
          blockCount: activePages.length,
          workspaceId: 'ecosystem',
        });
        setGooseSession(session);
        setGooseInitialized(true);
        console.log('[DashAI] ✅ Goose session created:', session.id);
      } catch (error) {
        console.error('[DashAI] Failed to initialize Goose:', error);
        setGooseInitialized(false);
      }
    };

    if (isOpen && !gooseSession) {
      initGoose();
    }

    // Cleanup on unmount
    return () => {
      if (gooseSession) {
        gooseClient.deleteSession(gooseSession.id).catch(console.error);
      }
    };
  }, [isOpen, gooseSession, activePages.length]);

  const resizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // Load active pages when context tab is selected
  useEffect(() => {
    if (activeTab === 'context') {
      loadActivePages();
      const interval = setInterval(loadActivePages, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const loadActivePages = async () => {
    try {
      setContextLoading(true);
      const pages = await contextClient.current.getActivePages();
      setActivePages(pages || []);
    } catch (error) {
      console.error('Failed to load active pages:', error);
      setActivePages([]);
    } finally {
      setContextLoading(false);
    }
  };

  const simulateStreaming = useCallback((content: string, messageId: string) => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        const chunk = content.slice(0, currentIndex + Math.ceil(Math.random() * 3));
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, streamedContent: chunk } : m)));
        currentIndex = chunk.length;
      } else {
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, isStreaming: false, streamedContent: undefined } : m)));
        setStreamingMessageId(null);
        clearInterval(interval);
      }
    }, 50);
  }, []);

  /**
   * Classify message to determine which agent to use
   */
  const classifyMessage = (message: string): 'goose' | 'gemini' => {
    const lowerMessage = message.toLowerCase();
    
    // Force modes
    if (agentMode === 'goose-only') return 'goose';
    if (agentMode === 'gemini-only') return 'gemini';
    
    // Goose patterns (tool-heavy operations)
    const goosePatterns = [
      /create|edit|update|delete.*(page|database|workspace)/,
      /search.*(knowledge.*graph|workspace)/,
      /query.*database/,
      /research|investigate.*issue/,
      /organize|manage.*workspace/,
      /perplexity|web.*search/,
    ];
    
    // Gemini patterns (fast analysis)
    const geminiPatterns = [
      /what.*(cpu|memory|disk|metric|status)/,
      /show.*(metric|status|health)/,
      /analyze.*(screenshot|visual|image)/,
      /quick|fast|simple.*query/,
    ];
    
    if (goosePatterns.some(p => p.test(lowerMessage))) {
      return 'goose';
    }
    
    if (geminiPatterns.some(p => p.test(lowerMessage))) {
      return 'gemini';
    }
    
    // Default to Gemini for speed
    return 'gemini';
  };

  /**
   * Fetch system metrics for context
   */
  const fetchSystemMetrics = async () => {
    try {
      // Try to fetch from system status API
      const response = await fetch('/api/system/status', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          cpu: data.cpu || null,
          memory: data.memory || null,
          disk: data.disk || null,
          services: data.services || [],
        };
      }
    } catch (error) {
      console.debug('[DashAI] System metrics unavailable:', error);
    }
    return null;
  };

  /**
   * Get recent user actions from message history
   */
  const getRecentActions = () => {
    return messages
      .filter(m => m.id.startsWith('user-'))
      .slice(-5)
      .map(m => ({
        query: m.content,
        timestamp: m.timestamp.toISOString(),
      }));
  };

  /**
   * Build comprehensive dashboard context for Goose
   */
  const buildDashboardContext = async () => {
    try {
      console.log('[DashAI] Building comprehensive context...');
      
      // Fetch page context from Context MCP
      const pageContext = await contextClient.current.getPageContext('dashboard');
      
      // Fetch system metrics
      const systemMetrics = await fetchSystemMetrics();
      
      // Build rich context object
      const enrichedContext = {
        // Base dashboard context
        ...dashboardContext,
        
        // Page context from Context MCP
        pageContext: pageContext ? {
          pageId: pageContext.pageId,
          pageTitle: pageContext.pageTitle,
          pageType: pageContext.pageType,
          entities: pageContext.entities || [],
          metrics: pageContext.metrics || [],
          filters: pageContext.filters || [],
          selections: pageContext.selections || [],
          timestamp: pageContext.timestamp,
        } : null,
        
        // Active pages
        activePages: activePages.map(page => ({
          id: page.id || page.pageId,
          title: page.title || page.pageTitle,
          type: page.type || page.pageType,
        })),
        
        // System health and metrics
        systemHealth: systemHealth || systemMetrics,
        systemMetrics,
        
        // User activity
        userActivity: {
          recentActions: getRecentActions(),
          messageCount: messages.length,
          sessionDuration: Date.now() - (messages[0]?.timestamp.getTime() || Date.now()),
        },
        
        // Agent state
        agentState: {
          gooseInitialized,
          geminiInitialized: isInitialized,
          currentMode: agentMode,
          voiceMode: isVoiceMode,
        },
        
        // Metadata
        contextMetadata: {
          timestamp: new Date().toISOString(),
          version: '2.0',
          source: 'DashAI-Panel',
        },
      };
      
      console.log('[DashAI] Context built with', {
        pageContext: !!pageContext,
        activePages: activePages.length,
        systemMetrics: !!systemMetrics,
        recentActions: getRecentActions().length,
      });
      
      return enrichedContext;
    } catch (error) {
      console.error('[DashAI] Error building context:', error);
      // Return minimal context on error
      return {
        ...dashboardContext,
        timestamp: new Date().toISOString(),
        error: 'Failed to build full context',
      };
    }
  };

  /**
   * Handle message via Goose ACP with streaming
   */
  const handleViaGoose = async (message: string, messageId: string): Promise<string> => {
    if (!gooseSession || !gooseInitialized) {
      throw new Error('Goose session not initialized');
    }

    console.log('[DashAI] Routing to Goose ACP with streaming...');
    const context = await buildDashboardContext();
    
    return new Promise((resolve, reject) => {
      gooseClient.sendMessageStream(
        {
          sessionId: gooseSession.id,
          message,
          context,
        },
        // onChunk
        (chunk) => {
          setMessages(prev => prev.map(m => 
            m.id === messageId 
              ? { ...m, isStreaming: true, streamedContent: (m.streamedContent || '') + chunk }
              : m
          ));
        },
        // onComplete
        (fullMessage) => {
          setMessages(prev => prev.map(m => 
            m.id === messageId 
              ? { ...m, isStreaming: false, streamedContent: undefined, content: fullMessage }
              : m
          ));
          resolve(fullMessage);
        },
        // onError
        (error) => {
          reject(new Error(error));
        }
      );
    });
  };

  /**
   * Handle message via Gemini (existing agent)
   */
  const handleViaGemini = async (message: string): Promise<string> => {
    if (!dashAgent || !isInitialized) {
      throw new Error('Gemini agent not initialized');
    }

    console.log('[DashAI] Routing to Gemini...');
    return await dashAgent.run(message, dashboardContext);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (!isInitialized && !gooseInitialized) {
      console.warn('[DashAI] No agents initialized');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setIsLoading(true);

    // Create AI message placeholder for streaming
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      timestamp: new Date(),
      confidence: 90,
      agentUsed: 'dashboard',
      isStreaming: true,
      streamedContent: '',
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Classify and route
      const agentChoice = classifyMessage(messageText);
      console.log(`[DashAI] Classified as: ${agentChoice}`);
      
      let result: string;
      let agentUsed: Message['agentUsed'];
      
      if (agentChoice === 'goose' && gooseInitialized) {
        // Update agent before streaming starts
        setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, agentUsed: 'goose' } : m));
        result = await handleViaGoose(messageText, aiMessageId);
        agentUsed = 'goose';
      } else if (isInitialized) {
        // Update agent
        setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, agentUsed: 'gemini' } : m));
        result = await handleViaGemini(messageText);
        agentUsed = 'gemini';
        // Update with final result for non-streaming
        setMessages(prev => prev.map(m => 
          m.id === aiMessageId 
            ? { ...m, content: result, isStreaming: false, streamedContent: undefined }
            : m
        ));
      } else {
        throw new Error('No agent available');
      }
    } catch (error) {
      console.error('[DashAI] Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        confidence: 0,
        agentUsed: 'dashboard',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      const deltaX = startX - ev.clientX;
      const newWidth = Math.max(300, Math.min(800, startWidth + deltaX));
      onResize(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [width, onResize]);

  const handleClearConversation = () => {
    setMessages([]);
  };

  const handleConversationalAgent = () => {
    // Switch to conversational mode or trigger specific agent
    console.log('Switching to conversational agent mode');
  };

  const handleScreenCapture = async () => {
    try {
      // Trigger screen capture functionality
      console.log('Initiating dashboard snapshot');
      // This would integrate with the vision agent for screenshot analysis
      const response = await dashAgent?.run('Take a screenshot of the current dashboard and analyze it', dashboardContext) || 'Dashboard snapshot feature not available';
      const newMessage: Message = {
        id: Date.now().toString(),
        content: response,
        timestamp: new Date(),
        agentUsed: 'vision'
      };
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Screen capture failed:', error);
    }
  };

  const handleVoiceToggle = () => {
    setIsVoiceMode(!isVoiceMode);
    console.log('Toggling voice mode:', !isVoiceMode);
  };

  const handleConversationalAgentEnhanced = async () => {
    try {
      const contextualPrompt = `Based on the current dashboard state: ${JSON.stringify(dashboardContext)}, provide intelligent insights and recommendations.`;
      const response = await dashAgent?.run(contextualPrompt, dashboardContext) || 'Conversational agent not available';
      const newMessage: Message = {
        id: Date.now().toString(),
        content: response,
        timestamp: new Date(),
        agentUsed: 'gemini',
        confidence: 95
      };
      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Conversational agent failed:', error);
    }
  };

  // Auto-refresh system health
  useEffect(() => {
    const fetchSystemHealth = async () => {
      if (dashboardContext?.health) {
        setSystemHealth(dashboardContext.health);
      }
    };
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [dashboardContext]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'chat', label: 'Chat', icon: <ChatBubbleLeftRightIcon width={16} height={16} /> },
    { id: 'context', label: 'Context', icon: <EyeIcon width={16} height={16} />, badge: activePages.length > 0 ? activePages.length : undefined },
    { id: 'health', label: 'Health', icon: <ChartBarIcon width={16} height={16} /> },
    { id: 'services', label: 'Services', icon: <ServerIcon width={16} height={16} /> },
    { id: 'resources', label: 'Resources', icon: <CpuChipIcon width={16} height={16} /> },
    { id: 'performance', label: 'Performance', icon: <BoltIcon width={16} height={16} /> }
  ];

  return (
    <Box position="fixed" top={0} right={0} width={`${width}px`} height="100vh" bg={bgColor} borderLeft="1px solid" borderColor={borderColor} zIndex={1000} display="flex" flexDirection="column" boxShadow="xl">
      {/* Header */}
      <HStack p={4} justify="space-between" bg={bgColor}>
        <HStack spacing={3}>
          <Box w={2} h={2} bg="green.400" borderRadius="full" />
          <VStack align="start" spacing={0}>
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="medium" color={textColor}>AI Assistant</Text>
              {activePages.length > 0 && (
                <Badge colorScheme="purple" variant="solid" fontSize="9px" px={1.5} py={0.5}>
                  🧠 Context Active
                </Badge>
              )}
              {/* Agent Status Indicators */}
              {gooseInitialized && (
                <Badge colorScheme="green" variant="subtle" fontSize="9px" px={1.5} py={0.5}>
                  🦢 Goose
                </Badge>
              )}
              {isInitialized && (
                <Badge colorScheme="blue" variant="subtle" fontSize="9px" px={1.5} py={0.5}>
                  ⚡ Gemini
                </Badge>
              )}
            </HStack>
            <HStack spacing={2}>
              {activePages.length > 0 && (
                <Text fontSize="9px" color={mutedColor}>
                  Seeing {activePages.length} page{activePages.length > 1 ? 's' : ''}
                </Text>
              )}
              {/* Agent Mode Selector */}
              <Menu>
                <MenuButton
                  as={Button}
                  size="xs"
                  variant="ghost"
                  fontSize="9px"
                  px={1.5}
                  py={0.5}
                  h="auto"
                  minH="auto"
                  color={mutedColor}
                  _hover={{ color: textColor }}
                >
                  Mode: {agentMode === 'auto' ? 'Auto' : agentMode === 'goose-only' ? 'Goose' : 'Gemini'}
                </MenuButton>
                <MenuList fontSize="sm">
                  <MenuItem onClick={() => setAgentMode('auto')} icon={agentMode === 'auto' ? <Text>✓</Text> : undefined}>
                    Auto (Smart Routing)
                  </MenuItem>
                  <MenuItem onClick={() => setAgentMode('goose-only')} icon={agentMode === 'goose-only' ? <Text>✓</Text> : undefined} isDisabled={!gooseInitialized}>
                    Goose Only (Tools)
                  </MenuItem>
                  <MenuItem onClick={() => setAgentMode('gemini-only')} icon={agentMode === 'gemini-only' ? <Text>✓</Text> : undefined} isDisabled={!isInitialized}>
                    Gemini Only (Fast)
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </VStack>
        </HStack>
        <HStack spacing={1}>
          <Tooltip label="Clear conversation history" placement="bottom">
            <IconButton 
              aria-label="Clear Conversation" 
              icon={<TrashIcon width={14} height={14} />} 
              size="xs" 
              variant="ghost" 
              onClick={handleClearConversation}
              isDisabled={messages.length === 0}
              colorScheme="red"
              _hover={{ bg: 'red.50' }}
            />
          </Tooltip>
          <Tooltip label={isVoiceMode ? 'Disable voice mode' : 'Enable voice mode'} placement="bottom">
            <IconButton 
              aria-label="Voice Mode" 
              icon={<MicrophoneIcon width={14} height={14} />} 
              size="xs" 
              variant={isVoiceMode ? 'solid' : 'ghost'}
              onClick={handleVoiceToggle}
              colorScheme="blue"
              _hover={{ bg: 'blue.50' }}
            />
          </Tooltip>
          <Tooltip label="Capture and analyze dashboard" placement="bottom">
            <IconButton 
              aria-label="Dashboard Snapshot" 
              icon={<CameraIcon width={14} height={14} />} 
              size="xs" 
              variant="ghost" 
              onClick={handleScreenCapture}
              colorScheme="green"
              _hover={{ bg: 'green.50' }}
              isLoading={isLoading}
            />
          </Tooltip>
          <Tooltip label="Get intelligent insights" placement="bottom">
            <IconButton 
              aria-label="Smart Insights" 
              icon={<UserGroupIcon width={14} height={14} />} 
              size="xs" 
              variant="ghost" 
              onClick={handleConversationalAgentEnhanced}
              colorScheme="purple"
              _hover={{ bg: 'purple.50' }}
            />
          </Tooltip>
          <IconButton aria-label="Close AI Assistant" icon={<XMarkIcon width={16} height={16} />} size="sm" variant="ghost" onClick={onClose} />
        </HStack>
      </HStack>

      {/* Tab Navigation */}
      <HStack spacing={0} bg={bgColor}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            flex={1}
            leftIcon={tab.icon}
            onClick={() => setActiveTab(tab.id)}
            bg={activeTab === tab.id ? useSemanticToken('surface.highlight') : 'transparent'}
            color={activeTab === tab.id ? 'blue.500' : textColor}
            borderRadius={0}
            borderBottom={activeTab === tab.id ? '2px solid' : '2px solid transparent'}
            borderBottomColor={activeTab === tab.id ? 'blue.500' : 'transparent'}
            _hover={{ bg: useSemanticToken('surface.hover') }}
            fontSize="xs"
            fontWeight="medium"
            py={3}
            position="relative"
          >
            {tab.label}
            {tab.badge !== undefined && (
              <Badge 
                position="absolute" 
                top="-2px" 
                right="4px" 
                colorScheme="purple" 
                variant="solid"
                borderRadius="full"
                fontSize="9px"
                px={1.5}
                minW="16px"
                textAlign="center"
              >
                {tab.badge}
              </Badge>
            )}
          </Button>
        ))}
      </HStack>

      {/* Tab Content */}
      <VStack flex={1} spacing={4} p={4} align="stretch" overflowY="auto" css={{ '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { background: borderColor, borderRadius: '24px' } }}>
        {activeTab === 'chat' && (
          <VStack spacing={3} p={4} align="stretch">
            {messages.length === 0 ? (
              <Box textAlign="center" py={8}>
                <VStack spacing={4}>
                  <Box w={12} h={12} bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                    <ChatBubbleLeftRightIcon width={24} height={24} color="blue.500" />
                  </Box>
                  <VStack spacing={2}>
                    <Text color={textColor} fontSize="md" fontWeight="medium">
                      AI Homelab Assistant
                    </Text>
                    <Text color={mutedColor} fontSize="sm" textAlign="center">
                      I can help you monitor, analyze, and troubleshoot your AI Homelab ecosystem.
                    </Text>
                  </VStack>
                  <VStack spacing={1} fontSize="xs" color={mutedColor}>
                    <HStack>
                      <Badge colorScheme="purple" variant="solid" fontSize="9px">NEW</Badge>
                      <Text fontWeight="semibold">Context-aware! I can see what you're looking at</Text>
                    </HStack>
                    <Text>• Ask about system health and performance</Text>
                    <Text>• Get insights from real-time monitoring data</Text>
                    <Text>• Capture and analyze dashboard screenshots</Text>
                    <Text>• Voice interaction support</Text>
                    <Text color="purple.500" fontWeight="medium" mt={2}>
                      Try: "What am I looking at?" or "What's on this page?"
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            ) : (
              messages.map((message) => (
                <Box key={message.id} p={4} bg={message.id.startsWith('user-') ? 'blue.50' : 'gray.50'} borderRadius="lg" borderLeft={message.id.startsWith('user-') ? '4px solid' : '4px solid'} borderLeftColor={message.id.startsWith('user-') ? 'blue.400' : 'green.400'}>
                  <HStack justify="space-between" mb={3}>
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                        {message.id.startsWith('user-') ? '👤 You' : '🤖 AI Assistant'}
                      </Text>
                      {message.agentUsed && (
                        <Badge 
                          size="sm" 
                          colorScheme={
                            message.agentUsed === 'goose' ? 'green' : 
                            message.agentUsed === 'gemini' ? 'blue' : 
                            message.agentUsed === 'vision' ? 'purple' : 'gray'
                          } 
                          variant="subtle"
                        >
                          {message.agentUsed === 'goose' ? '🦢 Goose' : 
                           message.agentUsed === 'gemini' ? '⚡ Gemini' : 
                           message.agentUsed === 'vision' ? '👁️ Vision' : message.agentUsed}
                        </Badge>
                      )}
                      {message.confidence && (
                        <Badge size="sm" colorScheme={message.confidence > 80 ? 'green' : message.confidence > 60 ? 'yellow' : 'red'} variant="subtle">
                          {message.confidence}% confidence
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color={mutedColor}>
                      {message.timestamp.toLocaleTimeString()}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color={textColor} whiteSpace="pre-wrap" lineHeight={1.6}>
                    {message.isStreaming ? (message.streamedContent || '') : message.content}
                    {message.isStreaming && <Spinner size="xs" ml={2} color="blue.500" />}
                  </Text>
                  {message.toolsUsed && message.toolsUsed.length > 0 && (
                    <HStack mt={3} spacing={1} flexWrap="wrap">
                      <Text fontSize="xs" color={mutedColor} fontWeight="medium">Tools used:</Text>
                      {message.toolsUsed.map((tool, idx) => (
                        <Badge key={idx} size="xs" colorScheme="blue" variant="outline">{tool}</Badge>
                      ))}
                    </HStack>
                  )}
                </Box>
              ))
            )}
          </VStack>
        )}
        {activeTab === 'context' && (
          <VStack p={4} spacing={4} align="stretch">
            <Box>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="semibold" color={textColor}>🧠 Context Intelligence</Text>
                <Badge colorScheme="purple" variant="solid">NEW</Badge>
              </HStack>
              <Text fontSize="sm" color={mutedColor} mb={4}>
                I can now see what you're looking at in real-time! This helps me give better, context-aware responses.
              </Text>
            </Box>

            <Divider />

            <Box>
              <Text fontSize="md" fontWeight="semibold" color={textColor} mb={3}>🎯 New Capabilities</Text>
              <VStack spacing={2} align="stretch">
                <HStack>
                  <Box w={2} h={2} bg="green.400" borderRadius="full" />
                  <Text fontSize="sm" color={textColor}>See entities (agents, services, databases) on your page</Text>
                </HStack>
                <HStack>
                  <Box w={2} h={2} bg="green.400" borderRadius="full" />
                  <Text fontSize="sm" color={textColor}>Access real-time metrics and performance data</Text>
                </HStack>
                <HStack>
                  <Box w={2} h={2} bg="green.400" borderRadius="full" />
                  <Text fontSize="sm" color={textColor}>Understand your active filters and selections</Text>
                </HStack>
                <HStack>
                  <Box w={2} h={2} bg="green.400" borderRadius="full" />
                  <Text fontSize="sm" color={textColor}>Track historical page changes</Text>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            <Box>
              <HStack justify="space-between" mb={3}>
                <Text fontSize="md" fontWeight="semibold" color={textColor}>📄 Active Pages Streaming Context</Text>
                {contextLoading && <Spinner size="sm" color="blue.500" />}
              </HStack>
              
              {activePages.length > 0 ? (
                <VStack spacing={2} align="stretch">
                  {activePages.map((page, idx) => (
                    <Box 
                      key={idx} 
                      p={3} 
                      bg={useSemanticToken('surface.highlight')} 
                      borderRadius="md" 
                      borderLeft="4px solid" 
                      borderLeftColor="purple.400"
                    >
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            {page.pageTitle || page.page_title}
                          </Text>
                          <Badge size="sm" colorScheme="purple" variant="subtle">
                            {page.pageType || page.page_type || 'monitoring'}
                          </Badge>
                        </VStack>
                        <Badge colorScheme="green" variant="solid">Live</Badge>
                      </HStack>
                      
                      {page.summary && (
                        <VStack align="start" spacing={1} mt={2}>
                          <HStack fontSize="xs" color={mutedColor}>
                            <Text fontWeight="medium">{page.summary.entityCount || 0} entities</Text>
                            <Text>•</Text>
                            <Text fontWeight="medium">{page.summary.metricCount || 0} metrics</Text>
                            {page.summary.activeFilters > 0 && (
                              <>
                                <Text>•</Text>
                                <Text fontWeight="medium">{page.summary.activeFilters} filters</Text>
                              </>
                            )}
                          </HStack>
                          {page.summary.topEntities && page.summary.topEntities.length > 0 && (
                            <HStack spacing={1} mt={1} flexWrap="wrap">
                              {page.summary.topEntities.slice(0, 3).map((entity: string, i: number) => (
                                <Badge key={i} size="xs" colorScheme="blue" variant="outline">
                                  {entity}
                                </Badge>
                              ))}
                            </HStack>
                          )}
                        </VStack>
                      )}
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Box 
                  p={4} 
                  bg={useSemanticToken('surface.base')} 
                  borderRadius="md" 
                  textAlign="center"
                >
                  <Text fontSize="sm" color={mutedColor}>
                    No pages currently streaming context.
                  </Text>
                  <Text fontSize="xs" color={mutedColor} mt={2}>
                    Navigate to Knowledge Graph or AI Inferencing to enable context streaming.
                  </Text>
                </Box>
              )}
            </Box>

            <Divider />

            <Box>
              <Text fontSize="md" fontWeight="semibold" color={textColor} mb={3}>💬 Try These Context-Aware Queries</Text>
              <VStack spacing={2} align="stretch">
                {[
                  'What am I looking at?',
                  'What agents are on this page?',
                  'Show me the metrics',
                  'What has changed?',
                  'What pages am I viewing?'
                ].map((query, idx) => (
                  <Box 
                    key={idx}
                    p={2}
                    bg={useSemanticToken('surface.highlight')}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ bg: useSemanticToken('surface.hover') }}
                    onClick={() => {
                      setInput(query);
                      setActiveTab('chat');
                    }}
                  >
                    <Text fontSize="sm" color="blue.600">"{query}"</Text>
                  </Box>
                ))}
              </VStack>
            </Box>

            <Divider />

            {/* Context Preview Section */}
            <Box>
              <HStack justify="space-between" mb={3}>
                <Text fontSize="md" fontWeight="semibold" color={textColor}>📊 Context Data Preview</Text>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    const ctx = await buildDashboardContext();
                    setContextPreview(ctx);
                    setShowContextDetails(!showContextDetails);
                  }}
                >
                  {showContextDetails ? 'Hide' : 'Show'} Details
                </Button>
              </HStack>
              
              {showContextDetails && contextPreview ? (
                <Box
                  p={3}
                  bg={useSemanticToken('surface.base')}
                  borderRadius="md"
                  fontSize="xs"
                  fontFamily="mono"
                  maxH="300px"
                  overflowY="auto"
                >
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text fontWeight="bold" color="purple.500">Page Context:</Text>
                      <Badge colorScheme={contextPreview.pageContext ? 'green' : 'gray'}>
                        {contextPreview.pageContext ? 'Active' : 'None'}
                      </Badge>
                    </HStack>
                    {contextPreview.pageContext && (
                      <Box pl={4} fontSize="xs">
                        <Text>• Entities: {contextPreview.pageContext.entities?.length || 0}</Text>
                        <Text>• Metrics: {contextPreview.pageContext.metrics?.length || 0}</Text>
                        <Text>• Filters: {contextPreview.pageContext.filters?.length || 0}</Text>
                      </Box>
                    )}
                    
                    <HStack justify="space-between" mt={2}>
                      <Text fontWeight="bold" color="blue.500">Active Pages:</Text>
                      <Badge colorScheme="blue">{contextPreview.activePages?.length || 0}</Badge>
                    </HStack>
                    
                    <HStack justify="space-between" mt={2}>
                      <Text fontWeight="bold" color="green.500">System Metrics:</Text>
                      <Badge colorScheme={contextPreview.systemMetrics ? 'green' : 'gray'}>
                        {contextPreview.systemMetrics ? 'Available' : 'N/A'}
                      </Badge>
                    </HStack>
                    {contextPreview.systemMetrics && (
                      <Box pl={4} fontSize="xs">
                        <Text>• CPU: {contextPreview.systemMetrics.cpu ? 'Available' : 'N/A'}</Text>
                        <Text>• Memory: {contextPreview.systemMetrics.memory ? 'Available' : 'N/A'}</Text>
                        <Text>• Services: {contextPreview.systemMetrics.services?.length || 0}</Text>
                      </Box>
                    )}
                    
                    <HStack justify="space-between" mt={2}>
                      <Text fontWeight="bold" color="orange.500">User Activity:</Text>
                      <Badge colorScheme="orange">
                        {contextPreview.userActivity?.recentActions?.length || 0} actions
                      </Badge>
                    </HStack>
                    
                    <HStack justify="space-between" mt={2}>
                      <Text fontWeight="bold" color="cyan.500">Agent State:</Text>
                      <HStack spacing={1}>
                        {contextPreview.agentState?.gooseInitialized && (
                          <Badge colorScheme="green" fontSize="9px">Goose</Badge>
                        )}
                        {contextPreview.agentState?.geminiInitialized && (
                          <Badge colorScheme="blue" fontSize="9px">Gemini</Badge>
                        )}
                      </HStack>
                    </HStack>
                    
                    <Text fontSize="9px" color={mutedColor} mt={2}>
                      Last updated: {contextPreview.contextMetadata?.timestamp}
                    </Text>
                  </VStack>
                </Box>
              ) : (
                <Box
                  p={3}
                  bg={useSemanticToken('surface.base')}
                  borderRadius="md"
                  textAlign="center"
                >
                  <Text fontSize="sm" color={mutedColor}>
                    Click "Show Details" to see what context is sent to Goose
                  </Text>
                </Box>
              )}
            </Box>

            <Divider />

            <Box p={3} bg={useSemanticToken('surface.highlight')} borderRadius="md" borderLeft="4px solid" borderLeftColor="yellow.400">
              <HStack spacing={2} mb={2}>
                <Text fontSize="sm" fontWeight="semibold">🔧 Context Tools Available</Text>
              </HStack>
              <VStack align="start" spacing={1} fontSize="xs" color={mutedColor}>
                <Text>• <strong>get_page_context</strong> - Current page intelligence</Text>
                <Text>• <strong>get_context_history</strong> - Historical analysis</Text>
                <Text>• <strong>get_active_pages</strong> - Multi-page overview</Text>
              </VStack>
            </Box>
          </VStack>
        )}
        {activeTab === 'health' && (
          <VStack p={4} spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>System Health Overview</Text>
            {systemHealth ? (
              <VStack spacing={3} align="stretch">
                <Box p={3} bg="green.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="green.400">
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="medium">Overall Status</Text>
                    <Badge colorScheme="green">Healthy</Badge>
                  </HStack>
                </Box>
                <Progress value={85} colorScheme="green" size="sm" borderRadius="md" />
                <Text fontSize="xs" color={mutedColor}>Last updated: {new Date().toLocaleTimeString()}</Text>
              </VStack>
            ) : (
              <Box p={4} textAlign="center">
                <Spinner size="md" color="blue.500" />
                <Text mt={2} fontSize="sm" color={mutedColor}>Loading health data...</Text>
              </Box>
            )}
          </VStack>
        )}
        {activeTab === 'services' && (
          <VStack p={4} spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>Services Status</Text>
            <VStack spacing={2} align="stretch">
              {['AI Gateway', 'Knowledge Graph', 'AHIS Core', 'PostgreSQL'].map((service, idx) => (
                <HStack key={idx} justify="space-between" p={2} bg={useSemanticToken('surface.base')} borderRadius="md">
                  <Text fontSize="sm">{service}</Text>
                  <Badge colorScheme="green" size="sm">Running</Badge>
                </HStack>
              ))}
            </VStack>
          </VStack>
        )}
        {activeTab === 'resources' && (
          <VStack p={4} spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>Resource Usage</Text>
            <VStack spacing={3} align="stretch">
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">CPU Usage</Text>
                  <Text fontSize="sm" color={mutedColor}>34%</Text>
                </HStack>
                <Progress value={34} colorScheme="blue" size="sm" borderRadius="md" />
              </Box>
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Memory Usage</Text>
                  <Text fontSize="sm" color={mutedColor}>58%</Text>
                </HStack>
                <Progress value={58} colorScheme="yellow" size="sm" borderRadius="md" />
              </Box>
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Disk Usage</Text>
                  <Text fontSize="sm" color={mutedColor}>42%</Text>
                </HStack>
                <Progress value={42} colorScheme="green" size="sm" borderRadius="md" />
              </Box>
            </VStack>
          </VStack>
        )}
        {activeTab === 'performance' && (
          <VStack p={4} spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>Performance Metrics</Text>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between" p={3} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium">Response Time</Text>
                <Text fontSize="sm" color="blue.600">67ms</Text>
              </HStack>
              <HStack justify="space-between" p={3} bg="green.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium">Uptime</Text>
                <Text fontSize="sm" color="green.600">99.9%</Text>
              </HStack>
              <HStack justify="space-between" p={3} bg="purple.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium">Requests/min</Text>
                <Text fontSize="sm" color="purple.600">234</Text>
              </HStack>
            </VStack>
            <Text color={mutedColor} fontSize="xs" mt={2}>Analyze performance bottlenecks and optimization opportunities</Text>
          </VStack>
        )}
      </VStack>

      <HStack px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={bgColor} fontSize="xs" color={mutedColor} justify="space-between">
        <HStack spacing={4}>
          <HStack spacing={1}>
            <Box w={1.5} h={1.5} bg={isInitialized ? 'green.400' : 'red.400'} borderRadius="full" />
            <Text>{isInitialized ? 'Connected' : 'Disconnected'}</Text>
          </HStack>
          <Text>{messages.length} messages</Text>
        </HStack>
        {streamingMessageId && (
          <HStack spacing={1}>
            <Spinner size="xs" />
            <Text>Streaming</Text>
          </HStack>
        )}
      </HStack>

      {/* Input Area - Only show for chat tab */}
      {activeTab === 'chat' && (
        <Box p={4} borderTop="1px solid" borderColor={borderColor} bg={bgColor}>
          <HStack spacing={3} align="end">
            <Box position="relative" flex={1}>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your AI Homelab ecosystem..."
                resize="none"
                minH="100px"
                maxH="180px"
                fontSize="xs"
                pr="80px"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <HStack position="absolute" bottom={2} right={2} spacing={1}>
                <Text fontSize="xs" color={mutedColor}>
                  {input.length}/1000
                </Text>
                <IconButton
                  aria-label="Clear input"
                  icon={<XMarkIcon width={12} height={12} />}
                  size="xs"
                  variant="ghost"
                  onClick={() => setInput('')}
                  isDisabled={!input}
                />
              </HStack>
            </Box>
            <IconButton
              aria-label="Analyze"
              onClick={handleSendMessage} 
              isDisabled={!input.trim() || isLoading || !dashAgent || !isInitialized} 
              isLoading={isLoading} 
              colorScheme="blue" 
              size="lg"
              icon={isLoading ? <Spinner size="sm" /> : <PaperAirplaneIcon width={20} height={20} />}
            />
          </HStack>
        </Box>
      )}

      {/* Status Bar */}
      <HStack px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={bgColor} fontSize="xs" color={mutedColor} justify="space-between">
        <HStack spacing={4}>
          <HStack spacing={1}>
            <Box w={1.5} h={1.5} bg={isInitialized ? 'green.400' : 'red.400'} borderRadius="full" />
            <Text>{isInitialized ? 'Connected' : 'Disconnected'}</Text>
          </HStack>
          <Text>{messages.length} messages</Text>
          {streamingMessageId && <Text>Streaming...</Text>}
        </HStack>
        <Text>{activeTab === 'chat' ? 'Chat Mode' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View`}</Text>
      </HStack>

      {/* Resize Handle */}
      <Box ref={resizeRef} position="absolute" left={-2} top={0} bottom={0} width={4} cursor="col-resize" bg="transparent" _hover={{ bg: 'blue.100', _dark: { bg: 'blue.900' } }} onMouseDown={handleResizeStart} />
    </Box>
  );
};

export default DashAIPanelVersion;
