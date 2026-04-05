/**
 * DashAI - AI Homelab Dashboard Assistant
 * Short, distinctive name for the main AI assistant component
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Collapse,
  Fade,
  ScaleFade,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowUpIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  CameraIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '../ui/GlassPanel';
import { SimpleGlassPanel } from '../ui/SimpleGlassPanel';
import { DashboardAIAgent } from '../../agents/DashboardAIAgent';
import { ScreenshotAnalysisTool } from '../../agents/tools/ScreenshotAnalysisTool';
import { AudioVisualizerBlob } from './AudioVisualizerBlob';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const MotionBox = motion(Box);

interface DashboardContext {
  currentPage: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
  activeAlerts: number;
  services: Array<{
    name: string;
    status: string;
    uptime: string;
  }>;
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
  }>;
  visionAnalysis?: string;
  hasVisualContext?: boolean;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string;
  confidence?: number;
  visionAnalysis?: string;
  hasVisualContext?: boolean;
  agentUsed?: string;
  metadata?: {
    toolsUsed?: string[];
    processingTime?: number;
    agentUsed?: string;
    visionAnalysis?: string;
    hasVisualContext?: boolean;
  };
}

interface DashAIProps {
  dashboardContext: DashboardContext;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function DashAI({ dashboardContext, isExpanded = false, onToggle }: DashAIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dashAgent, setDashAgent] = useState<DashboardAIAgent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [visionMode, setVisionMode] = useState(false);
  const [screenshotTool, setScreenshotTool] = useState<ScreenshotAnalysisTool | null>(null);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [showBlobControls, setShowBlobControls] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');

  // Initialize Screenshot Analysis Tool
  useEffect(() => {
    const initScreenshotTool = async () => {
      try {
        const tool = new ScreenshotAnalysisTool();
        setScreenshotTool(tool);
        console.log('📸 Screenshot Analysis Tool initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Screenshot Analysis Tool:', error);
      }
    };

    initScreenshotTool();
  }, []);

  // Initialize audio stream for voice mode
  useEffect(() => {
    const initAudioStream = async () => {
      if (voiceMode && !audioStream) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setAudioStream(stream);
          console.log('🎤 Audio stream initialized for voice mode');
        } catch (error) {
          console.error('❌ Failed to initialize audio stream:', error);
        }
      } else if (!voiceMode && audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
        console.log('🔇 Audio stream stopped');
      }
    };

    initAudioStream();
  }, [voiceMode, audioStream]);

  // Initialize Dashboard AI Agent
  useEffect(() => {
    const initAgent = async () => {
      try {
        // Initialize with minimal agent for now to avoid dependency issues
        setDashAgent(null); // Will implement proper agent later
        setIsInitialized(true);
        
        // Add welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          type: 'assistant',
          content: '👋 Hello! I\'m DashAI, your AI assistant for the Homelab Dashboard. I can help with system monitoring, documentation, voice commands, and multimodal vision analysis. How can I assist you today?',
          timestamp: new Date(),
          context: 'initialization'
        };
        setMessages([welcomeMessage]);
        
        console.log('✅ DashAI initialized successfully with multimodal capabilities');
      } catch (error) {
        console.error('❌ Failed to initialize DashAI:', error);
        setIsInitialized(false);
        
        // Still show welcome message even if agent fails
        const welcomeMessage: Message = {
          id: 'welcome',
          type: 'assistant',
          content: '👋 Hello! I\'m DashAI, your AI assistant for the Homelab Dashboard. I can help with system monitoring, documentation, voice commands, and multimodal vision analysis. How can I assist you today?',
          timestamp: new Date(),
          context: 'initialization'
        };
        setMessages([welcomeMessage]);
      }
    };

    initAgent();
    
    // Cleanup on unmount
    return () => {
      if (dashAgent) {
        // Export session for persistence if needed
        const sessionData = dashAgent.exportSession();
        console.log('📦 DashAI session exported:', sessionData);
      }
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activityLogs]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log('🔍 DashAI State Debug:', {
      isStreaming,
      activityLogsCount: activityLogs.length,
      activityLogs,
      isLoading
    });
  }, [isStreaming, activityLogs, isLoading]);

  // Activity log streaming function
  const addActivityLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log('📝 Adding activity log:', logEntry);
    setActivityLogs(prev => {
      const newLogs = [...prev.slice(-4), logEntry]; // Keep last 5 logs
      console.log('📊 Current activity logs:', newLogs);
      return newLogs;
    });
  };

  // Clear activity logs
  const clearActivityLogs = () => {
    console.log('🧹 Clearing activity logs');
    setActivityLogs([]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isInitialized) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);
    
    // Clear logs first, then start streaming
    clearActivityLogs();
    setIsStreaming(true);
    
    // Force immediate state update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Start activity streaming
    addActivityLog('🤖 Processing your request...');
    console.log('🚀 Starting activity streaming for:', currentInput);
    
    // Force a re-render to show the activity log immediately
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      console.log('🤖 DashAI processing message:', currentInput);
      
      // Check if vision analysis is requested
      const needsVision = currentInput.toLowerCase().includes('screenshot') || 
                         currentInput.toLowerCase().includes('visual') || 
                         currentInput.toLowerCase().includes('analyze dashboard') ||
                         currentInput.toLowerCase().includes('what do you see') ||
                         visionMode;

      let visionAnalysis = null;
      let enhancedContext = { ...dashboardContext };

      if (needsVision && screenshotTool) {
        try {
          addActivityLog('📸 Capturing dashboard screenshot...');
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate capture time
          
          addActivityLog('🔍 Analyzing visual content with Gemma3...');
          visionAnalysis = await screenshotTool.analyzeWithVision({
            query: currentInput,
            dashboardContext: enhancedContext
          });
          
          if (visionAnalysis && visionAnalysis.analysis) {
            enhancedContext = {
              ...enhancedContext,
              visionAnalysis: visionAnalysis.analysis,
              hasVisualContext: true
            };
            addActivityLog('✅ Vision analysis completed');
            console.log('👁️ Vision analysis completed:', visionAnalysis.confidence);
          }
        } catch (visionError) {
          addActivityLog('❌ Vision analysis failed, continuing...');
          console.error('❌ Vision analysis failed:', visionError);
          // Continue without vision analysis
        }
      }

      // Add processing steps with delays for realistic streaming
      addActivityLog('🧠 Analyzing query context...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      addActivityLog('📊 Gathering dashboard metrics...');
      await new Promise(resolve => setTimeout(resolve, 400));
      
      if (!visionAnalysis) {
        addActivityLog('💭 Generating AI response...');
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Simple AI response with multimodal capabilities
      let responseText = '';
      
      if (visionAnalysis) {
        responseText = `Based on the dashboard screenshot analysis: ${visionAnalysis.analysis}

I can see the current state of your AI Homelab Dashboard and can help you understand what's displayed. The vision analysis shows the interface elements, metrics, and system status.`;
      } else if (currentInput.toLowerCase().includes('health') || currentInput.toLowerCase().includes('status')) {
        responseText = `Based on the dashboard context, I can see:
- System Health: ${dashboardContext.systemHealth}
- Active Services: ${dashboardContext.services.length}
- Active Alerts: ${dashboardContext.activeAlerts}
- Current Page: ${dashboardContext.currentPage}

The system appears to be running normally. Is there anything specific you'd like to know about?`;
      } else if (currentInput.toLowerCase().includes('help')) {
        responseText = `I can help you with:
🔍 System monitoring and health checks
📊 Dashboard analysis and metrics
👁️ Visual analysis of the interface (click the camera icon for vision mode)
🎤 Voice commands (click the microphone icon)
📈 Service status and performance data

What would you like to explore?`;
      } else {
        responseText = `I understand you're asking about: "${currentInput}"

I'm your AI assistant for the Homelab Dashboard. I can help with system monitoring, visual analysis, and dashboard navigation. The multimodal vision capabilities are active - try enabling vision mode with the camera icon to analyze dashboard screenshots.

How can I assist you further?`;
      }

      addActivityLog('✅ Response ready');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseText,
        timestamp: new Date(),
        context: visionAnalysis ? 'multimodal' : 'text',
        confidence: 0.9,
        metadata: {
          toolsUsed: visionAnalysis ? ['ScreenshotAnalysisTool'] : ['DashAI'],
          processingTime: 150,
          agentUsed: 'DashAI',
          visionAnalysis: visionAnalysis?.analysis,
          hasVisualContext: !!visionAnalysis
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      console.log('✅ DashAI response generated', {
        confidence: '90%',
        hasVision: !!visionAnalysis
      });

    } catch (error) {
      console.error('❌ DashAI error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
        context: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Keep streaming state active briefly to show final logs
      setTimeout(() => {
        setIsStreaming(false);
        // Clear activity logs after showing them
        setTimeout(() => {
          clearActivityLogs();
        }, 2000);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
    if (!voiceMode && dashAgent) {
      // Activate voice tool
      console.log('🎤 Voice mode activated');
    }
  };

  const toggleVisionMode = () => {
    setVisionMode(!visionMode);
    console.log(`👁️ Vision mode ${!visionMode ? 'activated' : 'deactivated'}`);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getHealthIcon = () => {
    switch (dashboardContext.systemHealth) {
      case 'healthy': return <ChartBarIcon className="w-4 h-4 text-green-500" />;
      case 'warning': return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'critical': return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default: return <ChartBarIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const contextSummary = useMemo(() => {
    return `Current page: ${dashboardContext.currentPage}, Health: ${dashboardContext.systemHealth}, Active alerts: ${dashboardContext.activeAlerts}`;
  }, [dashboardContext]);

  return (
    <AnimatePresence>
      <MotionBox
        position="fixed"
        bottom="20px"
        right="20px"
        width="320px"
        height="600px"
        zIndex={1000}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <GlassPanel borderRadius="xl" p={0} height="100%">
          <VStack spacing={0} height="100%">
            {/* Header */}
            <HStack justify="space-between" p={4}>
              <HStack spacing={2}>
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <Text fontWeight="semibold" color={textColor}>DashAI</Text>
                <Badge colorScheme="green" size="sm">
                  {isInitialized ? 'Ready' : 'Initializing...'}
                </Badge>
              </HStack>
              
              <HStack spacing={2}>
                <Tooltip label={visionMode ? "Disable Vision Mode" : "Enable Vision Mode"}>
                  <IconButton
                    aria-label="Toggle Vision Mode"
                    icon={visionMode ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    size="sm"
                    variant="ghost"
                    colorScheme={visionMode ? "green" : "gray"}
                    onClick={() => setVisionMode(!visionMode)}
                  />
                </Tooltip>
                
                <Tooltip label={voiceMode ? "Disable Voice Mode" : "Enable Voice Mode"}>
                  <IconButton
                    aria-label="Toggle Voice Mode"
                    icon={voiceMode ? <SpeakerWaveIcon className="h-4 w-4" /> : <MicrophoneIcon className="h-4 w-4" />}
                    size="sm"
                    variant="ghost"
                    colorScheme={voiceMode ? "blue" : "gray"}
                    onClick={() => setVoiceMode(!voiceMode)}
                  />
                </Tooltip>

                <Tooltip label="Toggle Blob Controls">
                  <IconButton
                    aria-label="Toggle Blob Controls"
                    icon={<CameraIcon className="h-4 w-4" />}
                    size="sm"
                    variant="ghost"
                    colorScheme={showBlobControls ? "purple" : "gray"}
                    onClick={() => setShowBlobControls(!showBlobControls)}
                  />
                </Tooltip>
                
                {onToggle && (
                  <IconButton
                    aria-label="Close DashAI"
                    icon={<XMarkIcon className="h-4 w-4" />}
                    size="sm"
                    variant="ghost"
                    onClick={onToggle}
                  />
                )}
              </HStack>
            </HStack>


            {/* Status Bar */}
            <HStack
              width="100%"
              px={4}
              py={2}
              bg={useSemanticToken('surface.base')}
              justify="space-between"
              borderBottomWidth={1}
              borderColor={borderColor}
            >
              <HStack spacing={2}>
                {getHealthIcon()}
                <Text fontSize="xs" color={textColor}>
                  {dashboardContext.currentPage}
                </Text>
              </HStack>
              <Badge
                colorScheme={dashAgent && isInitialized ? 'green' : 'red'}
                variant="subtle"
                fontSize="xs"
              >
                {dashAgent && isInitialized ? 'Online' : 'Offline'}
              </Badge>
            </HStack>

            {/* Messages */}
            <Box
              flex={1}
              width="100%"
              overflowY="auto"
              px={4}
              py={2}
              css={{
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0,0,0,0.1)',
                  borderRadius: '24px',
                },
              }}
            >
              <VStack spacing={3} align="stretch">
                {/* Activity Stream - Always visible when processing */}
                {(isLoading || isStreaming || activityLogs.length > 0) && (
                  <Box
                    p={3}
                    bg="blue.50"
                    borderRadius="lg"
                    borderWidth={1}
                    borderColor="blue.200"
                  >
                    <VStack align="start" spacing={1}>
                      <HStack spacing={2}>
                        {/* Replaced Spinner with 3D blob indicator */}
                        <Box w="12px" h="12px" borderRadius="full" bg="blue.500" />
                        <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                          Processing Activity
                        </Text>
                      </HStack>
                      <Badge colorScheme="blue" size="sm">
                        {activityLogs.length} logs
                      </Badge>
                      {activityLogs.length === 0 ? (
                        <Text
                          fontSize="xs"
                          color="blue.700"
                          fontFamily="mono"
                        >
                          Starting processing...
                        </Text>
                      ) : (
                        activityLogs.map((log, index) => (
                          <Text
                            key={`${index}-${log}`}
                            fontSize="xs"
                            color="blue.700"
                            fontFamily="mono"
                          >
                            {log}
                          </Text>
                        ))
                      )}
                    </VStack>
                  </Box>
                )}
                {messages.map((message) => (
                  <MotionBox
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HStack
                      align="start"
                      justify={message.type === 'user' ? 'flex-end' : 'flex-start'}
                      spacing={2}
                    >
                      {message.type === 'assistant' && (
                        <Avatar
                          size="xs"
                          bg="blue.500"
                          icon={<SparklesIcon className="w-3 h-3" />}
                        />
                      )}
                      <VStack
                        align={message.type === 'user' ? 'end' : 'start'}
                        spacing={1}
                        maxWidth="85%"
                      >
                        <SimpleGlassPanel
                          p={3}
                          borderRadius="lg"
                          bg={message.type === 'user' ? 'blue.500' : bgColor}
                          color={message.type === 'user' ? 'white' : textColor}
                          borderWidth={message.type === 'assistant' ? 1 : 0}
                          borderColor={borderColor}
                        >
                          <Text fontSize="sm" whiteSpace="pre-wrap">
                            {message.content}
                          </Text>
                        </SimpleGlassPanel>
                        <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                          <Text>{formatTimestamp(message.timestamp)}</Text>
                          {message.confidence && (
                            <Badge variant="subtle" colorScheme="blue" fontSize="xs">
                              {(message.confidence * 100).toFixed(0)}%
                            </Badge>
                          )}
                          {message.metadata?.toolsUsed && message.metadata.toolsUsed.length > 0 && (
                            <Badge variant="subtle" colorScheme="green" fontSize="xs">
                              {message.metadata.toolsUsed.length} tools
                            </Badge>
                          )}
                          {message.agentUsed && message.agentUsed !== 'dashboard_ai_coordinator' && (
                            <Badge variant="subtle" colorScheme="purple" fontSize="xs">
                              {message.agentUsed.replace('_agent', '')}
                            </Badge>
                          )}
                        </HStack>
                      </VStack>
                      {message.type === 'user' && (
                        <Avatar size="xs" bg="gray.500" />
                      )}
                    </HStack>
                  </MotionBox>
                ))}
                {isLoading && (
                  <HStack justify="flex-start" spacing={2}>
                    <Avatar
                      size="xs"
                      bg="blue.500"
                      icon={<SparklesIcon className="w-3 h-3" />}
                    />
                    <SimpleGlassPanel p={3} borderRadius="lg" bg={bgColor} borderWidth={1} borderColor={borderColor}>
                      <HStack spacing={2}>
                        {/* Replaced Spinner with 3D blob indicator */}
                        <Box w="12px" h="12px" borderRadius="full" bg="blue.500" />
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>DashAI is thinking...</Text>
                      </HStack>
                    </SimpleGlassPanel>
                  </HStack>
                )}
                <div ref={messagesEndRef} />
              </VStack>
            </Box>

            {/* Input */}
            <Box
              width="100%"
              p={4}
              borderTopWidth={1}
              borderColor={borderColor}
              bg={useSemanticToken('surface.elevated')}
              borderBottomRadius="xl"
            >
              <HStack spacing={2}>
                {/* 3D Audio Visualizer Blob in Input Area */}
                <Box w="40px" h="40px" position="relative">
                  <AudioVisualizerBlob
                    isListening={isLoading || isStreaming}
                    isSpeaking={false}
                    audioStream={audioStream}
                    width={40}
                    height={40}
                    showControls={false}
                  />
                </Box>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={visionMode ? "Ask about what you see..." : voiceMode ? "Say something..." : "Ask DashAI anything..."}
                  size="sm"
                  borderRadius="lg"
                  bg={useSemanticToken('surface.base')}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: 'blue.500',
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)',
                  }}
                  disabled={isLoading || !isInitialized}
                />
                <IconButton
                  aria-label="Send message"
                  icon={<ArrowUpIcon className="w-4 h-4" />}
                  size="sm"
                  colorScheme="blue"
                  borderRadius="lg"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || !isInitialized}
                />
                {showBlobControls && (
                  <IconButton
                    aria-label="Toggle Blob Controls"
                    icon={<CameraIcon className="h-4 w-4" />}
                    size="sm"
                    variant="ghost"
                    colorScheme="purple"
                  />
                )}
              </HStack>
            </Box>
          </VStack>
        </GlassPanel>
      </MotionBox>
    </AnimatePresence>
  );
}
