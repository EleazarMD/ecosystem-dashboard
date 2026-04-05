/**
 * Modern AI Assistant Component - Fully Modularized
 * Simplified version using extracted components
 * Complies with 500-line file limit
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  IconButton,
  useToast,
  Button,
  Tooltip,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Switch,
  FormControl,
  FormLabel,
  Avatar,
  Badge,
} from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { SimpleGlassPanel } from '../ui/SimpleGlassPanel';

const MotionBox = motion(Box);
import StreamingTextDisplay from './StreamingTextDisplay';
import { useVoiceService } from '../../hooks/useVoiceService';
import AEAudioReactiveLoader from './AEAudioReactiveLoader';
import { MicrophoneIcon } from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneSolid } from '@heroicons/react/24/solid';
import { WelcomeScreen } from './WelcomeScreen';
// import { AudioVisualizerBlob } from './AudioVisualizerBlob'; // Removed - Will redesign with Perplexity mobile style
import { Select } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { StreamingText, StreamingCaptions } from './StreamingText';
import { type Message } from './MessageBubble';
import { AIAssistantHeader } from './AIAssistantHeader';
import { AIAssistantInputPolished } from './AIAssistantInputPolished';
import { VoiceControls } from './VoiceControls';
import { CaptionDisplay } from './CaptionDisplay';
import { useMessageHandler } from './useMessageHandler';
import { ContextMCPClient } from '../../lib/context-mcp-client';

interface ModernAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResize: () => void;
  dashboardContext?: any;
}

const ModernAIAssistant: React.FC<ModernAIAssistantProps> = ({
  isOpen,
  onClose,
  width,
  onResize,
  dashboardContext = {},
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Disabled until voice service is started
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [showVoiceVisualizer, setShowVoiceVisualizer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  
  // Blob controls - Default to Circular Ring animation
  const [blobControls, setBlobControls] = useState({
    color: { r: 0.4, g: 0.6, b: 1.0 },
    size: 4,
    dynamism: 0.4,
    roughness: 3,
    glowIntensity: 1.5,
    animationSpeed: 0.5,
    shape: 'circularOrb' as any,
    subdivision: 60, // Segment count for circular ring
    wireframe: false,
  });

  // Initialize voice service with localStorage persistence
  const voiceService = useVoiceService((transcript) => {
    // Handle transcript from voice service
    console.log('📝 Voice transcript:', transcript);
  });
  
  const voiceProvider = voiceService.settings.provider;
  const voiceSettings = {
    voice: voiceService.settings.voice,
    speed: voiceService.settings.speed,
    pitch: voiceService.settings.pitch,
  };

  const updateBlobControls = (patch: Partial<typeof blobControls>) => {
    setBlobControls(prev => ({ ...prev, ...patch }));
  };
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  
  // Color theme
  const bg = useSemanticToken('surface.base');
  const surfaceBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const msgTextColor = useSemanticToken('text.primary');
  const statusBg = useSemanticToken('surface.base');

  // Extract voice service state
  const isVoiceConnected = voiceService.isConnected;
  const isVoiceListening = voiceService.isListening;
  const inputTranscript = voiceService.interimTranscript;
  const finalTranscript = voiceService.finalTranscript;
  const voiceError = voiceService.error || null;
  const ttsStreamText = voiceService.ttsStreamText;
  const ttsIsStreaming = voiceService.ttsIsStreaming;
  const isMicrophoneMuted = voiceService.isMicrophoneMuted;
  const startListening = voiceService.startListening;
  const stopListening = voiceService.stopListening;
  const toggleMicrophoneMute = voiceService.toggleMicrophoneMute;
  const sendTTSRequest = voiceService.sendTTSRequest;
  const connectVoice = voiceService.connect;
  const previewVoice = voiceService.previewVoice;
  
  // Adapter for compatibility
  const isTranscribing = isVoiceListening;
  const isResponseStreaming = ttsIsStreaming;
  const responseText = ttsStreamText;
  const clearResponseText = () => {};
  const clearTtsStream = voiceService.clearTtsStream || (() => {});
  const clearTranscript = () => {};
  const sendResponseForTTS = sendTTSRequest;

  // Additional state for UI (hook provides all voice functionality)

  // Caption and streaming text state
  const [captionsVisible, setCaptionsVisible] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [persistentCaptions, setPersistentCaptions] = useState(false);

  // Context MCP state
  const [activePages, setActivePages] = useState<any[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const contextClient = useRef(new ContextMCPClient());

  // Mock setter for compatibility (OpenAI manages this state)
  const setIsResponseStreaming = useCallback((value: boolean) => {
    console.log('🎙️ Response streaming state:', value);
    // OpenAI Realtime API manages this internally
  }, []);
  
  // Use the message handler hook
  const { sendMessage, isLoading, input, setInput } = useMessageHandler({
    messages,
    setMessages,
    isVoiceConnected,
    dashboardContext,
    isAudioMuted,
    voiceEnabled,
    setStreamingResponse,
    setIsResponseStreaming,
    setCaptionsVisible,
    setCurrentCaption,
    sendTTSRequest,
  });

  // Don't auto-connect - let user manually connect when needed
  // This prevents infinite reconnection loops when backend has issues
  useEffect(() => {
    // Disabled auto-connect to prevent infinite loops
    // User must manually start voice conversation
  }, [isOpen]);

  // Context MCP - Load active pages
  useEffect(() => {
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

    // Load immediately
    loadActivePages();

    // Refresh every 5 seconds
    const interval = setInterval(loadActivePages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Voice error handling
  useEffect(() => {
    // Exit early if there is no error
    if (!voiceError) {
      return;
    }

    // Now, voiceError is guaranteed to be non-null.
    // Let's determine if it's an Error object with a message property.
    const hasMessage = typeof voiceError === 'object' && voiceError !== null && 'message' in voiceError;
    const errorMessage = hasMessage ? (voiceError as { message: string }).message : String(voiceError);

    // Do not show a toast for a user-initiated microphone denial.
    if (errorMessage && errorMessage !== 'User denied microphone permission') {
      const timeoutId = setTimeout(() => {
        toast({
          title: 'Voice Service Error',
          description: errorMessage,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }, 1000);

      // Cleanup function to clear the timeout if the component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, [voiceError, toast]);

  // Process voice transcripts as messages
  const processedTranscripts = useRef(new Set<string>());
  
  useEffect(() => {
    if (finalTranscript && finalTranscript.trim() && !processedTranscripts.current.has(finalTranscript)) {
      console.log('🎤 Processing voice transcript as message:', finalTranscript);
      processedTranscripts.current.add(finalTranscript);
      sendMessage(finalTranscript);
      
      // Clear after 30 seconds to prevent memory buildup
      setTimeout(() => {
        processedTranscripts.current.delete(finalTranscript);
      }, 30000);
    }
  }, [finalTranscript, sendMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice input toggle handler - microphone control
  const handleVoiceToggle = useCallback(async () => {
    console.log('🎤 Voice toggle clicked:', { isConversationActive, isVoiceConnected, isVoiceListening });
    
    if (!isVoiceConnected) {
      try {
        console.log('🔌 Connecting voice service for microphone...');
        await connectVoice();
      } catch (error) {
        console.error('Failed to connect voice service:', error);
        return;
      }
    }

    if (isVoiceListening) {
      console.log('🛑 Stopping voice listening...');
      stopListening();
      setShowVoiceVisualizer(false);
    } else {
      console.log('🎙️ Starting voice listening...');
      startListening();
      setShowVoiceVisualizer(true);
    }
  }, [isVoiceConnected, isVoiceListening, connectVoice, startListening, stopListening]);

  // Conversation toggle handler
  const handleConversationToggle = useCallback(async () => {
    console.log('🎙️ Conversation toggle clicked:', { isConversationActive, isVoiceConnected });
    
    if (!isConversationActive) {
      // Starting conversation - connect voice service
      console.log('🚀 Starting conversation...');
      setIsConversationActive(true);
      if (!isVoiceConnected) {
        try {
          console.log('🔌 Connecting to voice service...');
          await connectVoice();
          console.log('✅ Voice service connected');
        } catch (error) {
          console.error('❌ Failed to connect voice service:', error);
          setIsConversationActive(false);
          return;
        }
      }
    } else {
      // Ending conversation - stop listening and disconnect
      console.log('🛑 Ending conversation...');
      setIsConversationActive(false);
      if (isVoiceListening) {
        stopListening();
      }
      setShowVoiceVisualizer(false);
    }
  }, [isConversationActive, isVoiceConnected, isVoiceListening, connectVoice, stopListening]);

  const handleCopyConversation = () => {
    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(conversationText);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  const handleClearConversation = () => {
    setMessages([]);
    setIsConversationActive(false);
    toast({
      title: 'Conversation cleared',
      status: 'info',
      duration: 2000,
    });
  };
  
  // Resize handle functionality
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      const deltaX = startX - ev.clientX;
      const newWidth = Math.max(350, Math.min(800, startWidth + deltaX));
      onResize(newWidth);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [width, onResize]);

  return (
    <>
      {/* Floating Streaming Text Display */}
      <StreamingTextDisplay
        isVisible={isOpen && (isTranscribing || isResponseStreaming || responseText.length > 0)}
        streamingText={isTranscribing ? inputTranscript : responseText}
        isStreaming={isTranscribing || isResponseStreaming}
        onSentenceComplete={(sentence) => {
          console.log('📝 Sentence completed:', sentence);
        }}
      />

      {/* After Effects Audio Reactive Visualizer */}
      <AEAudioReactiveLoader
        isActive={isOpen && isVoiceConnected}
        isListening={isVoiceListening}
        isSpeaking={ttsIsStreaming}
        position="bottom-right"
        size="medium"
      />

      <Box
        position="relative"
        h="full"
        w="full"
        bg={bg}
        display={isOpen ? 'flex' : 'none'}
        flexDirection="column"
      >
      {/* Header */}
      <AIAssistantHeader 
        onClose={onClose}
        onResize={onResize}
        onCopyConversation={handleCopyConversation}
        onClearConversation={handleClearConversation}
        hasMessages={messages.length > 0}
        isVoiceConnected={isVoiceConnected}
        isMicrophoneMuted={isMicrophoneMuted}
        contextPageCount={activePages.length}
        isContextActive={activePages.length > 0}
      />

      {/* Main Content */}
      <Box flex={1} overflow="hidden" position="relative">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <Box
            flex={1}
            width="100%"
            overflowY="auto"
            px={4}
            py={2}
            css={{
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-track': { width: '6px' },
              '&::-webkit-scrollbar-thumb': { 
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '24px'
              }
            }}
          >
            <VStack spacing={3} align="stretch">
              {messages.map((message) => (
                <MotionBox
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <HStack
                    align="start"
                    justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
                    spacing={2}
                  >
                    {message.role === 'assistant' && (
                      <Avatar
                        size="xs"
                        bg="purple.500"
                        icon={<SparklesIcon style={{ width: '12px', height: '12px' }} />}
                      />
                    )}
                    <VStack
                      align={message.role === 'user' ? 'end' : 'start'}
                      spacing={1}
                      maxWidth="85%"
                    >
                      <SimpleGlassPanel
                        p={3}
                        borderRadius="lg"
                        bg={message.role === 'user' ? 'blue.500' : surfaceBg}
                        color={message.role === 'user' ? 'white' : msgTextColor}
                        borderWidth={message.role === 'assistant' ? 1 : 0}
                        borderColor={borderColor}
                      >
                        <Text fontSize="sm" whiteSpace="pre-wrap">
                          {message.content}
                        </Text>
                      </SimpleGlassPanel>
                      <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {message.timestamp && (
                          <Text>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                        {message.confidence && (
                          <Badge variant="subtle" colorScheme="blue" fontSize="xs">
                            {(message.confidence * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {(message as any).metadata?.toolsUsed && (message as any).metadata.toolsUsed.length > 0 && (
                          <Badge variant="subtle" colorScheme="green" fontSize="xs">
                            {(message as any).metadata.toolsUsed.length} tools
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                    {message.role === 'user' && (
                      <Avatar size="xs" bg="gray.500" />
                    )}
                  </HStack>
                </MotionBox>
              ))}
              <div ref={messagesEndRef} />
            </VStack>
          </Box>
        )}

        {/* Audio Visualizer Removed - Will redesign with Perplexity mobile style */}

        {/* Streaming Text Display */}
        {isResponseStreaming && streamingResponse && (
          <Box
            position="absolute"
            top={(ttsIsStreaming || captionsVisible) ? '260px' : '50%'}
            left="50%"
            transform="translateX(-50%)"
            width="90%"
            maxWidth="600px"
            zIndex={10}
          >
            <StreamingText
              text={streamingResponse}
              isStreaming={isResponseStreaming}
              speed="normal"
              onComplete={() => setIsResponseStreaming(false)}
            />
          </Box>
        )}
        
        {/* Caption overlay */}
        <StreamingCaptions
          text={currentCaption}
          isVisible={captionsVisible && !isResponseStreaming}
          position="bottom"
        />

        {/* Caption Display */}
        <CaptionDisplay
          captionsVisible={captionsVisible}
          ttsStreamText={ttsStreamText}
          ttsIsStreaming={ttsIsStreaming}
          isVoiceListening={isVoiceListening}
          isMicrophoneMuted={isMicrophoneMuted}
          persistentCaptions={persistentCaptions}
        >
          <HStack spacing={2}>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setPersistentCaptions(!persistentCaptions)}
              opacity={0.6}
            >
              {persistentCaptions ? 'Auto-hide' : 'Keep open'}
            </Button>
            {ttsStreamText && (
              <Button size="xs" variant="ghost" onClick={clearTtsStream} opacity={0.6}>
                Clear
              </Button>
            )}
          </HStack>
        </CaptionDisplay>
      </Box>

      {/* Input Area - Polished Version */}
      <Box borderTop="1px solid" borderColor={borderColor} bg={surfaceBg}>
        <AIAssistantInputPolished
          inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          isVoiceListening={isVoiceListening}
          isVoiceConnected={isVoiceConnected}
          onStartListening={handleVoiceToggle}
          onStopListening={handleVoiceToggle}
          isAudioMuted={isAudioMuted}
          setIsAudioMuted={setIsAudioMuted}
          isMicrophoneMuted={isMicrophoneMuted}
          onToggleMicrophoneMute={toggleMicrophoneMute}
          onOpenSettings={() => setShowSettings(true)}
          isConversationActive={isConversationActive}
          onToggleConversation={handleConversationToggle}
        />
      </Box>
      
      {/* Resize Handle */}
      <Box 
        ref={resizeRef}
        position="absolute"
        left={-1}
        top={0}
        bottom={0}
        width="3px"
        cursor="col-resize"
        bg="transparent"
        transition="all 0.2s"
        _hover={{ 
          bg: 'gray.300',
          _dark: { bg: 'gray.600' }
        }}
        _active={{
          bg: 'blue.400',
          _dark: { bg: 'blue.600' }
        }}
        onMouseDown={handleResizeStart}
      />

      {/* Enhanced Voice & Visualization Settings Modal - Side by Side Layout */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} size="6xl">
        <ModalOverlay bg="transparent" />
        <ModalContent maxW="900px" bg={surfaceBg} borderRadius="xl" border="1px solid" borderColor={borderColor}>
          <ModalHeader pb={2} fontSize="lg" fontWeight="600">
            Voice & Visualization Settings
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <HStack spacing={8} align="flex-start">
              {/* Left Side - Voice Settings */}
              <VStack spacing={4} align="stretch" flex={1}>
                <Text fontSize="md" fontWeight="600" color="blue.500">
                  🎤 Voice Settings
                </Text>
                
                {/* Service Provider Selection */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    Service Provider
                  </Text>
                  <Select 
                    value={voiceProvider} 
                    onChange={(e) => {
                      const newProvider = e.target.value as 'openai' | 'gemini';
                      voiceService.switchProvider(newProvider);
                    }}
                    size="sm"
                  >
                    <option value="gemini">🌐 Gemini TTS (Recommended)</option>
                    <option value="openai">⚡ OpenAI Realtime</option>
                  </Select>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    {voiceProvider === 'gemini' 
                      ? '✓ Gemini Flash/Pro — 30 voices, ~$0.01 per request' 
                      : '⚡ Fast, real-time streaming'}
                  </Text>
                </Box>
                
                {/* Voice Controls */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    Controls
                  </Text>
                  <VStack spacing={3}>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel htmlFor="voice-enabled" mb="0" fontSize="sm">
                        Voice Input
                      </FormLabel>
                      <Switch
                        id="voice-enabled"
                        isChecked={voiceEnabled}
                        onChange={(e) => setVoiceEnabled(e.target.checked)}
                        colorScheme="blue"
                      />
                    </FormControl>
                    
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel htmlFor="audio-muted" mb="0" fontSize="sm">
                        Audio Output
                      </FormLabel>
                      <Switch
                        id="audio-muted"
                        isChecked={!isAudioMuted}
                        onChange={(e) => setIsAudioMuted(!e.target.checked)}
                        colorScheme="blue"
                      />
                    </FormControl>

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel htmlFor="voice-visualizer" mb="0" fontSize="sm">
                        Voice Visualizer
                      </FormLabel>
                      <Switch
                        id="voice-visualizer"
                        isChecked={showVoiceVisualizer}
                        onChange={(e) => setShowVoiceVisualizer(e.target.checked)}
                        colorScheme="blue"
                      />
                    </FormControl>
                  </VStack>
                </Box>

                {/* Voice Selection */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    {voiceProvider === 'gemini' ? 'Gemini Voice' : 'OpenAI Voice'}
                  </Text>
                  <Select 
                    value={voiceSettings.voice} 
                    onChange={(e) => voiceService.updateSettings({ voice: e.target.value })}
                    size="sm"
                  >
                    {voiceProvider === 'gemini' ? (
                      <>
                        <option value="Puck">Puck (Male) ⭐</option>
                        <option value="Charon">Charon (Deep Male)</option>
                        <option value="Kore">Kore (Female)</option>
                        <option value="Zephyr">Zephyr (Warm Male)</option>
                        <option value="Aoede">Aoede (Warm Female)</option>
                        <option value="Fenrir">Fenrir (Authoritative Male)</option>
                      </>
                    ) : (
                      <>
                        <option value="alloy">Alloy (Neutral)</option>
                        <option value="echo">Echo (Male)</option>
                        <option value="fable">Fable (British Male)</option>
                        <option value="onyx">Onyx (Deep Male)</option>
                        <option value="nova">Nova (Female)</option>
                        <option value="shimmer">Shimmer (Soft Female)</option>
                      </>
                    )}
                  </Select>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    {voiceProvider === 'gemini' 
                      ? 'Gemini Flash TTS — natural, conversational voices' 
                      : 'OpenAI voices optimized for real-time conversation'}
                  </Text>
                </Box>

                {/* Voice Parameters */}
                {voiceProvider === 'gemini' && (
                  <Box>
                    <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                      Voice Parameters
                    </Text>
                    <VStack spacing={3}>
                      <HStack justify="space-between" w="100%">
                        <Text fontSize="sm">Speaking Rate</Text>
                        <Box w="120px">
                          <input
                            type="range"
                            min="0.25"
                            max="4.0"
                            step="0.25"
                            value={voiceSettings.speed}
                            onChange={(e) => voiceService.updateSettings({ speed: parseFloat(e.target.value) })}
                            style={{ width: '100%' }}
                          />
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{voiceSettings.speed}x</Text>
                        </Box>
                      </HStack>

                      <HStack justify="space-between" w="100%">
                        <Text fontSize="sm">Pitch</Text>
                        <Box w="120px">
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            step="1"
                            value={(voiceSettings.pitch - 1) * 20}
                            onChange={(e) => voiceService.updateSettings({ pitch: 1 + (parseFloat(e.target.value) / 20) })}
                            style={{ width: '100%' }}
                          />
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{((voiceSettings.pitch - 1) * 20) > 0 ? '+' : ''}{((voiceSettings.pitch - 1) * 20).toFixed(0)}</Text>
                        </Box>
                      </HStack>
                    </VStack>
                  </Box>
                )}

                {/* Test Voice Button */}
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={async () => {
                    setIsPreviewingVoice(true);
                    const success = await previewVoice();
                    if (!success) {
                      toast({
                        title: 'Voice Service Not Available',
                        description: `The voice service on port 8770 is not running. Start it with: cd adk-voice-assistant && ./start-unified-voice.sh`,
                        status: 'warning',
                        duration: 8000,
                        isClosable: true,
                      });
                    } else {
                      toast({
                        title: 'Voice Preview Playing',
                        description: `Testing ${voiceService.settings.provider === 'gemini' ? 'Gemini' : 'OpenAI'} voice: ${voiceService.settings.voice}`,
                        status: 'success',
                        duration: 3000,
                      });
                    }
                    setTimeout(() => setIsPreviewingVoice(false), 3000);
                  }}
                  isLoading={isPreviewingVoice}
                  loadingText="Playing..."
                  width="full"
                >
                  🔊 Test Voice
                </Button>

                {/* Status Section */}
                <Box bg={statusBg} p={3} borderRadius="md">
                  <Text fontSize="xs" fontWeight="600" color={useSemanticToken('text.secondary')} mb={2}>Connection Status</Text>
                  
                  <VStack spacing={2} align="stretch">
                    <HStack spacing={2} justify="space-between">
                      <HStack spacing={2}>
                        <Box 
                          w="6px" 
                          h="6px" 
                          borderRadius="full" 
                          bg={isVoiceConnected ? 'green.400' : 'red.400'} 
                        />
                        <Text fontSize="xs">
                          Service
                        </Text>
                      </HStack>
                      <Text fontSize="xs" fontWeight="600" color={isVoiceConnected ? 'green.500' : 'red.500'}>
                        {isVoiceConnected ? 'Connected' : 'Disconnected'}
                      </Text>
                    </HStack>
                    
                    <HStack spacing={2} justify="space-between">
                      <HStack spacing={2}>
                        <Box 
                          w="6px" 
                          h="6px" 
                          borderRadius="full" 
                          bg={voiceProvider === 'gemini' ? 'blue.400' : 'orange.400'} 
                        />
                        <Text fontSize="xs">
                          Provider
                        </Text>
                      </HStack>
                      <Text fontSize="xs" fontWeight="600">
                        {voiceProvider === 'gemini' ? '🌐 Gemini TTS' : '⚡ OpenAI'}
                      </Text>
                    </HStack>
                    
                    <HStack spacing={2} justify="space-between">
                      <HStack spacing={2}>
                        <Box 
                          w="6px" 
                          h="6px" 
                          borderRadius="full" 
                          bg={isVoiceListening ? 'blue.400' : 'gray.400'}
                        />
                        <Text fontSize="xs">
                          Listening
                        </Text>
                      </HStack>
                      <Text fontSize="xs" fontWeight="600" color={isVoiceListening ? 'blue.500' : 'gray.500'}>
                        {isVoiceListening ? 'Active' : 'Inactive'}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>

              {/* Right Side - 3D Visualization Settings */}
              <VStack spacing={4} align="stretch" flex={1}>
                <Text fontSize="md" fontWeight="600" color="purple.500">
                  🎨 3D Visualization
                </Text>

                {/* Shape Selection */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    3D Shape
                  </Text>
                  <Select 
                    value={blobControls.shape} 
                    onChange={(e) => updateBlobControls({ shape: e.target.value as any })}
                    size="sm"
                  >
                    <option value="circularOrb">Nebula Sphere</option>
                    <option value="perplexityOrb">Perplexity Dots</option>
                    <option value="icosahedron">Icosahedron</option>
                    <option value="sphere">Sphere</option>
                    <option value="octahedron">Octahedron</option>
                    <option value="tetrahedron">Tetrahedron</option>
                    <option value="dodecahedron">Dodecahedron</option>
                    <option value="box">Box</option>
                    <option value="cone">Cone</option>
                    <option value="cylinder">Cylinder</option>
                  </Select>
                </Box>

                {/* Visual Parameters */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    Visual Parameters
                  </Text>
                  <VStack spacing={3}>
                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Size</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="2"
                          max="8"
                          step="0.5"
                          value={blobControls.size}
                          onChange={(e) => updateBlobControls({ size: parseFloat(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.size}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Dynamism</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={blobControls.dynamism}
                          onChange={(e) => updateBlobControls({ dynamism: parseFloat(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.dynamism}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Glow Intensity</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="0.5"
                          max="3.0"
                          step="0.1"
                          value={blobControls.glowIntensity}
                          onChange={(e) => updateBlobControls({ glowIntensity: parseFloat(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.glowIntensity}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Animation Speed</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={blobControls.animationSpeed}
                          onChange={(e) => updateBlobControls({ animationSpeed: parseFloat(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.animationSpeed}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Roughness</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={blobControls.roughness}
                          onChange={(e) => updateBlobControls({ roughness: parseInt(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.roughness}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">
                        {blobControls.shape === 'circularOrb' ? 'Segments' : 
                         blobControls.shape === 'perplexityOrb' ? 'Particles' : 'Detail Level'}
                      </Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min={blobControls.shape === 'circularOrb' ? "30" : "100"}
                          max={blobControls.shape === 'circularOrb' ? "120" : "500"}
                          step={blobControls.shape === 'circularOrb' ? "10" : "50"}
                          value={blobControls.subdivision || (blobControls.shape === 'circularOrb' ? 60 : 300)}
                          onChange={(e) => updateBlobControls({ subdivision: parseInt(e.target.value) })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
                          {blobControls.subdivision || (blobControls.shape === 'circularOrb' ? 60 : 300)}
                        </Text>
                      </Box>
                    </HStack>
                  </VStack>
                </Box>

                {/* Color Controls */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    Color Settings
                  </Text>
                  <VStack spacing={3}>
                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Red</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={blobControls.color.r}
                          onChange={(e) => updateBlobControls({ 
                            color: { ...blobControls.color, r: parseFloat(e.target.value) }
                          })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.color.r}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Green</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={blobControls.color.g}
                          onChange={(e) => updateBlobControls({ 
                            color: { ...blobControls.color, g: parseFloat(e.target.value) }
                          })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.color.g}</Text>
                      </Box>
                    </HStack>

                    <HStack justify="space-between" w="100%">
                      <Text fontSize="sm">Blue</Text>
                      <Box w="120px">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={blobControls.color.b}
                          onChange={(e) => updateBlobControls({ 
                            color: { ...blobControls.color, b: parseFloat(e.target.value) }
                          })}
                          style={{ width: '100%' }}
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">{blobControls.color.b}</Text>
                      </Box>
                    </HStack>
                  </VStack>
                </Box>

                {/* Wireframe Mode */}
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={3} color={useSemanticToken('text.secondary')}>
                    Render Mode
                  </Text>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="wireframe-mode" mb="0" fontSize="sm">
                      Wireframe
                    </FormLabel>
                    <Switch
                      id="wireframe-mode"
                      isChecked={blobControls.wireframe || false}
                      onChange={(e) => updateBlobControls({ wireframe: e.target.checked })}
                      colorScheme="purple"
                    />
                  </FormControl>
                </Box>
              </VStack>
            </HStack>
          </ModalBody>

          <ModalFooter pt={2}>
            <Button colorScheme="blue" size="sm" onClick={() => setShowSettings(false)}>
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
    </>
  );
};

export default ModernAIAssistant;
