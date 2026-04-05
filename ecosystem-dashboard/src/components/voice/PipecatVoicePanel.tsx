/**
 * Pipecat Voice Panel - iOS-style WebRTC voice agent modal
 * 
 * Connects to Nova agent via Pipecat SmallWebRTCTransport with:
 * - Server-side STT (Whisper) + TTS (Qwen)
 * - Full tool calling and OpenClaw delegation
 * - Real-time conversation transcript
 * - Session history management
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
  useToast,
  Spinner,
  Badge,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Avatar,
  Divider,
  Tooltip,
  ScaleFade,
  SlideFade,
  useColorModeValue,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { 
  FiMic, 
  FiMicOff, 
  FiPhone, 
  FiPhoneOff, 
  FiVolume2, 
  FiVolumeX,
  FiClock,
  FiMessageSquare,
  FiMinimize2,
  FiMaximize2,
  FiChevronDown,
  FiSettings,
  FiTrash2,
} from 'react-icons/fi';
import { PipecatClient, RTVIEvent, TransportState } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

// Nova agent WebRTC endpoint
// Nova serves HTTP on port 18800 with /connect endpoint
// Use Tailscale Serve HTTPS on port 18802 for Dashboard browser access (avoids mixed-content issues)
// iOS uses HTTP directly on port 18800 via Tailscale IP
const NOVA_WEBRTC_URL = process.env.NEXT_PUBLIC_NOVA_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? 'https://rtx-workstation.tailb64e64.ts.net:18802'
    : 'http://localhost:18800');

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ThinkingActivity {
  id: string;
  type: 'tool_call' | 'search' | 'thinking' | 'delegation';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;
  timestamp: Date;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isPartial?: boolean;
}

interface ConversationSession {
  id: string;
  title: string;
  startTime: Date;
  turns: ConversationTurn[];
  duration?: number;
}

// Animations
const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
`;

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const listeningPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 20px 8px rgba(59, 130, 246, 0.2); }
`;

const speakingWave = keyframes`
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export function PipecatVoicePanel() {
  const toast = useToast();
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Conversation state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [assistantPartialText, setAssistantPartialText] = useState('');
  
  // Session history
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Thinking state
  const [activities, setActivities] = useState<ThinkingActivity[]>([]);
  const [thinkingText, setThinkingText] = useState('');
  const thinkingTextRef = useRef('');
  
  // Processing status from server reasoning events
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [reasoningText, setReasoningText] = useState('');
  const reasoningTextRef = useRef('');
  
  // Refs
  const clientRef = useRef<PipecatClient | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const callStartTimeRef = useRef<Date | null>(null);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionState === 'connected' && callStartTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTimeRef.current!.getTime()) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [connectionState]);

  // Auto-scroll conversation
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, assistantPartialText]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Create new session
  const createSession = useCallback(() => {
    const sessionId = `session-${Date.now()}`;
    const session: ConversationSession = {
      id: sessionId,
      title: `Conversation ${sessions.length + 1}`,
      startTime: new Date(),
      turns: [],
    };
    setSessions(prev => [session, ...prev]);
    setCurrentSessionId(sessionId);
    setConversation([]);
    return sessionId;
  }, [sessions.length]);

  // Save current conversation to session
  const saveCurrentSession = useCallback(() => {
    if (currentSessionId && conversation.length > 0) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, turns: conversation, duration: callDuration }
          : s
      ));
    }
  }, [currentSessionId, conversation, callDuration]);

  // Load session
  const loadSession = useCallback((session: ConversationSession) => {
    setConversation(session.turns);
    setCurrentSessionId(session.id);
    onHistoryClose();
  }, [onHistoryClose]);

  // Connect to Nova
  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
    }

    setConnectionState('connecting');
    callStartTimeRef.current = new Date();
    setCallDuration(0);
    createSession();

    try {
      const transport = new SmallWebRTCTransport({
        webrtcRequestParams: {
          endpoint: `${NOVA_WEBRTC_URL}/connect`,
          requestData: {
            user_id: 'dashboard',
            audio_mode: 'server',
          },
        },
      });

      const client = new PipecatClient({
        transport,
        enableMic: true,
        enableCam: false,
        callbacks: {
          onConnected: () => {
            setConnectionState('connected');
            toast({
              title: 'Connected to Nova',
              status: 'success',
              duration: 2000,
              position: 'top',
            });
          },
          onDisconnected: () => {
            saveCurrentSession();
            setConnectionState('disconnected');
            setIsListening(false);
            setIsSpeaking(false);
            setAssistantPartialText('');
            callStartTimeRef.current = null;
          },
          onError: () => {
            setConnectionState('error');
            toast({
              title: 'Connection error',
              status: 'error',
              duration: 5000,
              position: 'top',
            });
          },
          onUserStartedSpeaking: () => {
            setIsListening(true);
          },
          onUserStoppedSpeaking: () => {
            setIsListening(false);
          },
          onUserTranscript: (data) => {
            if (data.final) {
              setConversation(prev => [...prev, {
                role: 'user',
                text: data.text,
                timestamp: new Date(),
              }]);
              setCurrentTranscript('');
            } else {
              setCurrentTranscript(data.text);
            }
          },
          onBotStartedSpeaking: () => {
            setIsSpeaking(true);
          },
          onBotStoppedSpeaking: () => {
            setIsSpeaking(false);
          },
          onBotLlmText: (data) => {
            thinkingTextRef.current += data.text;
            setThinkingText(thinkingTextRef.current);
            setAssistantPartialText(thinkingTextRef.current);
          },
          onBotLlmStarted: () => {
            thinkingTextRef.current = '';
            setThinkingText('');
            setAssistantPartialText('');
            setActivities([]);
          },
          onBotLlmStopped: () => {
            const text = thinkingTextRef.current;
            if (text) {
              setConversation(prev => [...prev, {
                role: 'assistant',
                text: text,
                timestamp: new Date(),
              }]);
              setAssistantPartialText('');
            }
          },
          onLLMFunctionCall: (data) => {
            const activity: ThinkingActivity = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: data.function_name.includes('search') ? 'search' : 
                    data.function_name.includes('openclaw') ? 'delegation' : 'tool_call',
              name: data.function_name,
              status: 'running',
              detail: JSON.stringify(data.args).slice(0, 100),
              timestamp: new Date(),
            };
            setActivities(prev => [...prev, activity]);
          },
          onServerMessage: (data: any) => {
            // Real-time reasoning/thinking events from ConversationPersistence processor
            if (data.phase) {
              // Lifecycle phases: thinking → responding → tool_call → done
              setProcessingStatus(data.phase);
              if (data.phase === 'thinking') {
                reasoningTextRef.current = '';
                setReasoningText('');
              } else if (data.phase === 'done') {
                // Keep reasoning text visible briefly, then clear
                setTimeout(() => {
                  setProcessingStatus('');
                  reasoningTextRef.current = '';
                  setReasoningText('');
                }, 500);
              }
            }
            if (data.type === 'thinkingUpdate' && data.text) {
              // Streaming LLM text for the reasoning card
              reasoningTextRef.current += data.text;
              setReasoningText(reasoningTextRef.current);
            }
            if (data.type === 'heartbeat' && data.text) {
              // Status pulse (e.g. "Still working on it...")
              setProcessingStatus(data.text);
            }
            if (data.type === 'thinking' && data.text) {
              // Tool/delegation reasoning updates
              const activity: ThinkingActivity = {
                id: `thinking-${Date.now()}`,
                type: 'thinking',
                name: 'Reasoning',
                status: 'running',
                detail: data.text,
                timestamp: new Date(),
              };
              setActivities(prev => [...prev, activity]);
            }
          },
        },
      });

      await client.connect();
      clientRef.current = client;

    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionState('error');
      toast({
        title: 'Failed to connect',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        position: 'top',
      });
    }
  }, [toast, createSession, saveCurrentSession]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnectionState('disconnected');
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.enableMic(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Get orb color based on state
  const getOrbColor = () => {
    if (connectionState !== 'connected') return 'gray.600';
    if (isSpeaking) return 'purple.400';
    if (isListening) return 'blue.400';
    return 'green.400';
  };

  const getOrbGradient = () => {
    if (connectionState !== 'connected') return 'linear(to-br, gray.500, gray.700)';
    if (isSpeaking) return 'linear(to-br, purple.400, pink.500)';
    if (isListening) return 'linear(to-br, blue.400, cyan.500)';
    return 'linear(to-br, green.400, teal.500)';
  };

  const getOrbAnimation = () => {
    if (connectionState !== 'connected') return undefined;
    if (isSpeaking) return `${breathe} 0.5s ease-in-out infinite`;
    if (isListening) return `${listeningPulse} 1.5s ease-in-out infinite`;
    return `${breathe} 3s ease-in-out infinite`;
  };

  const getStatusText = () => {
    if (connectionState === 'connecting') return 'Connecting...';
    if (connectionState === 'error') return 'Connection Error';
    if (connectionState !== 'connected') return 'Tap to Connect';
    if (isSpeaking) return 'Nova is speaking...';
    if (isListening) return 'Listening...';
    return 'Ready';
  };

  // Glassmorphism styles
  const glassStyle = {
    bg: 'rgba(20, 20, 30, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  return (
    <Flex
      direction="column"
      h="100%"
      bgGradient="linear(to-b, gray.900, gray.800)"
      color="white"
      position="relative"
      overflow="hidden"
    >
      {/* Ambient background glow */}
      <Box
        position="absolute"
        top="-50%"
        left="-50%"
        w="200%"
        h="200%"
        bgGradient={`radial(${getOrbColor()} 0%, transparent 50%)`}
        opacity={0.15}
        pointerEvents="none"
        transition="all 0.5s ease"
      />

      {/* Header */}
      <HStack 
        justify="space-between" 
        p={4} 
        {...glassStyle}
        borderRadius="0"
        borderBottom="1px solid rgba(255,255,255,0.05)"
      >
        <HStack spacing={3}>
          <Avatar 
            size="sm" 
            name="Nova" 
            bg="purple.500"
            icon={<FiMic />}
          />
          <VStack align="start" spacing={0}>
            <Text fontSize="md" fontWeight="semibold">Nova</Text>
            <HStack spacing={2}>
              <Box
                w={2}
                h={2}
                borderRadius="full"
                bg={connectionState === 'connected' ? 'green.400' : 
                    connectionState === 'connecting' ? 'yellow.400' : 'gray.500'}
              />
              <Text fontSize="xs" color="gray.400">
                {connectionState === 'connected' ? formatDuration(callDuration) : getStatusText()}
              </Text>
            </HStack>
          </VStack>
        </HStack>
        
        <HStack spacing={2}>
          <Tooltip label="Conversation History">
            <IconButton
              aria-label="History"
              icon={<FiClock />}
              size="sm"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
              onClick={onHistoryOpen}
            />
          </Tooltip>
          <Tooltip label={isMinimized ? 'Expand' : 'Minimize'}>
            <IconButton
              aria-label="Toggle size"
              icon={isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
              size="sm"
              variant="ghost"
              color="gray.400"
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
              onClick={() => setIsMinimized(!isMinimized)}
            />
          </Tooltip>
        </HStack>
      </HStack>

      {/* Main content area */}
      <Flex 
        direction="column" 
        flex={1} 
        overflow="hidden"
        transition="all 0.3s ease"
        opacity={isMinimized ? 0 : 1}
        maxH={isMinimized ? 0 : '100%'}
      >
        {/* Conversation transcript */}
        <Box
          flex={1}
          overflowY="auto"
          px={4}
          py={3}
          css={{
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: '4px' },
          }}
        >
          {conversation.length === 0 && !currentTranscript && !assistantPartialText ? (
            <Flex 
              direction="column" 
              align="center" 
              justify="center" 
              h="100%" 
              opacity={0.5}
            >
              <FiMessageSquare size={48} />
              <Text mt={4} fontSize="sm" color="gray.500">
                {connectionState === 'connected' 
                  ? 'Start speaking to begin the conversation'
                  : 'Connect to start a conversation'}
              </Text>
            </Flex>
          ) : (
            <VStack align="stretch" spacing={3}>
              {conversation.map((turn, i) => (
                <Box
                  key={i}
                  animation={`${fadeInUp} 0.3s ease`}
                  alignSelf={turn.role === 'user' ? 'flex-end' : 'flex-start'}
                  maxW="85%"
                >
                  <Box
                    bg={turn.role === 'user' 
                      ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                      : 'rgba(255,255,255,0.08)'}
                    bgGradient={turn.role === 'user' 
                      ? 'linear(135deg, blue.500, blue.600)'
                      : undefined}
                    p={3}
                    borderRadius="2xl"
                    borderBottomRightRadius={turn.role === 'user' ? 'sm' : '2xl'}
                    borderBottomLeftRadius={turn.role === 'assistant' ? 'sm' : '2xl'}
                    boxShadow="lg"
                  >
                    <Text fontSize="sm" lineHeight="tall">{turn.text}</Text>
                  </Box>
                  <Text 
                    fontSize="2xs" 
                    color="gray.600" 
                    mt={1}
                    textAlign={turn.role === 'user' ? 'right' : 'left'}
                    px={2}
                  >
                    {turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              ))}
              
              {/* Current user transcript (live) */}
              {currentTranscript && (
                <Box alignSelf="flex-end" maxW="85%" animation={`${fadeInUp} 0.2s ease`}>
                  <Box
                    bgGradient="linear(135deg, blue.500, blue.600)"
                    p={3}
                    borderRadius="2xl"
                    borderBottomRightRadius="sm"
                    opacity={0.7}
                    boxShadow="lg"
                  >
                    <Text fontSize="sm" lineHeight="tall">{currentTranscript}</Text>
                    <HStack spacing={1} mt={1}>
                      {[0, 1, 2].map(i => (
                        <Box
                          key={i}
                          w={1}
                          h={1}
                          borderRadius="full"
                          bg="white"
                          animation={`${breathe} 1s ease-in-out infinite ${i * 0.2}s`}
                        />
                      ))}
                    </HStack>
                  </Box>
                </Box>
              )}
              
              {/* Assistant partial response (streaming) */}
              {assistantPartialText && (
                <Box alignSelf="flex-start" maxW="85%" animation={`${fadeInUp} 0.2s ease`}>
                  <Box
                    bg="rgba(255,255,255,0.08)"
                    p={3}
                    borderRadius="2xl"
                    borderBottomLeftRadius="sm"
                    boxShadow="lg"
                  >
                    <Text fontSize="sm" lineHeight="tall">{assistantPartialText}</Text>
                    <Box
                      h="2px"
                      w="60px"
                      mt={2}
                      borderRadius="full"
                      bgGradient="linear(to-r, purple.400, pink.400, purple.400)"
                      bgSize="200% 100%"
                      animation={`${shimmer} 1.5s linear infinite`}
                    />
                  </Box>
                </Box>
              )}
              
              {/* Reasoning card — real-time LLM decision transparency */}
              {(processingStatus || reasoningText) && (
                <Box 
                  alignSelf="flex-start" 
                  maxW="90%"
                  bg="rgba(59, 130, 246, 0.08)"
                  border="1px solid rgba(59, 130, 246, 0.2)"
                  p={3}
                  borderRadius="xl"
                >
                  <HStack mb={reasoningText ? 2 : 0} spacing={2}>
                    {processingStatus === 'thinking' && (
                      <Spinner size="xs" color="blue.400" speed="0.8s" />
                    )}
                    {processingStatus === 'responding' && (
                      <Box w={2} h={2} borderRadius="full" bg="green.400" />
                    )}
                    {processingStatus === 'done' && (
                      <Box w={2} h={2} borderRadius="full" bg="gray.500" />
                    )}
                    {!['thinking', 'responding', 'done', ''].includes(processingStatus) && (
                      <Spinner size="xs" color="purple.400" speed="1s" />
                    )}
                    <Text fontSize="xs" fontWeight="semibold" color="blue.300">
                      {processingStatus === 'thinking' ? 'Thinking…' :
                       processingStatus === 'responding' ? 'Responding…' :
                       processingStatus === 'done' ? 'Done' :
                       processingStatus === 'tool_call' ? 'Calling tool…' :
                       processingStatus === 'delegating' ? 'Delegating…' :
                       processingStatus || 'Processing…'}
                    </Text>
                  </HStack>
                  {reasoningText && (
                    <Box
                      fontSize="xs"
                      color="gray.400"
                      maxH="120px"
                      overflowY="auto"
                      whiteSpace="pre-wrap"
                      lineHeight="1.5"
                      fontFamily="mono"
                      opacity={0.85}
                      css={{
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '2px' },
                      }}
                    >
                      {reasoningText.length > 500 ? '…' + reasoningText.slice(-500) : reasoningText}
                    </Box>
                  )}
                </Box>
              )}

              {/* Tool activities */}
              {activities.length > 0 && (
                <Box 
                  alignSelf="flex-start" 
                  maxW="85%"
                  bg="rgba(139, 92, 246, 0.15)"
                  border="1px solid rgba(139, 92, 246, 0.3)"
                  p={3}
                  borderRadius="xl"
                >
                  <HStack mb={2}>
                    <Spinner size="xs" color="purple.400" />
                    <Text fontSize="xs" fontWeight="semibold" color="purple.300">
                      Working...
                    </Text>
                  </HStack>
                  <VStack align="stretch" spacing={1}>
                    {activities.slice(-3).map(activity => (
                      <HStack key={activity.id} fontSize="xs">
                        <Box
                          w={1.5}
                          h={1.5}
                          borderRadius="full"
                          bg={activity.status === 'running' ? 'yellow.400' : 'green.400'}
                        />
                        <Text color="gray.400" noOfLines={1}>{activity.name}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
              
              <div ref={conversationEndRef} />
            </VStack>
          )}
        </Box>

        {/* Orb and status */}
        <Flex 
          direction="column" 
          align="center" 
          py={6}
          {...glassStyle}
          borderRadius="0"
          borderTop="1px solid rgba(255,255,255,0.05)"
        >
          {/* Status indicator */}
          <Text fontSize="xs" color="gray.500" mb={4} letterSpacing="wider" textTransform="uppercase">
            {getStatusText()}
          </Text>
          
          {/* Orb */}
          <Box position="relative" mb={6}>
            {/* Pulse rings */}
            {(isListening || isSpeaking) && connectionState === 'connected' && (
              <>
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  w="100px"
                  h="100px"
                  borderRadius="full"
                  bg={getOrbColor()}
                  opacity={0.2}
                  animation={`${pulseRing} 2s ease-out infinite`}
                />
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  w="100px"
                  h="100px"
                  borderRadius="full"
                  bg={getOrbColor()}
                  opacity={0.2}
                  animation={`${pulseRing} 2s ease-out infinite 0.5s`}
                />
              </>
            )}
            
            {/* Main orb */}
            <Box
              w="80px"
              h="80px"
              borderRadius="full"
              bgGradient={getOrbGradient()}
              animation={getOrbAnimation()}
              boxShadow={`0 0 60px ${getOrbColor()}, inset 0 0 30px rgba(255,255,255,0.2)`}
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor={connectionState === 'disconnected' ? 'pointer' : 'default'}
              onClick={connectionState === 'disconnected' ? connect : undefined}
              transition="all 0.3s ease"
              _hover={connectionState === 'disconnected' ? { transform: 'scale(1.05)' } : {}}
            >
              {connectionState === 'connecting' ? (
                <Spinner size="lg" color="white" thickness="3px" />
              ) : (
                <Box color="white" opacity={0.9}>
                  {isSpeaking ? (
                    <HStack spacing={1}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <Box
                          key={i}
                          w="3px"
                          h="16px"
                          bg="white"
                          borderRadius="full"
                          animation={`${speakingWave} 0.5s ease-in-out infinite ${i * 0.1}s`}
                        />
                      ))}
                    </HStack>
                  ) : (
                    <FiMic size={28} />
                  )}
                </Box>
              )}
            </Box>
          </Box>

          {/* Control buttons */}
          <HStack spacing={4}>
            {connectionState === 'connected' ? (
              <>
                <Tooltip label={isMuted ? 'Unmute' : 'Mute'}>
                  <IconButton
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    icon={isMuted ? <FiMicOff /> : <FiMic />}
                    size="lg"
                    borderRadius="full"
                    bg={isMuted ? 'red.500' : 'whiteAlpha.200'}
                    color="white"
                    _hover={{ bg: isMuted ? 'red.600' : 'whiteAlpha.300' }}
                    onClick={toggleMute}
                  />
                </Tooltip>
                
                <Tooltip label="End Call">
                  <IconButton
                    aria-label="End call"
                    icon={<FiPhoneOff />}
                    size="lg"
                    borderRadius="full"
                    bg="red.500"
                    color="white"
                    _hover={{ bg: 'red.600', transform: 'scale(1.05)' }}
                    onClick={disconnect}
                    px={8}
                  />
                </Tooltip>
                
                <Tooltip label={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}>
                  <IconButton
                    aria-label={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                    icon={isSpeakerMuted ? <FiVolumeX /> : <FiVolume2 />}
                    size="lg"
                    borderRadius="full"
                    bg={isSpeakerMuted ? 'orange.500' : 'whiteAlpha.200'}
                    color="white"
                    _hover={{ bg: isSpeakerMuted ? 'orange.600' : 'whiteAlpha.300' }}
                    onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                  />
                </Tooltip>
              </>
            ) : connectionState === 'connecting' ? (
              <IconButton
                aria-label="Connecting"
                icon={<Spinner />}
                size="lg"
                borderRadius="full"
                bg="whiteAlpha.200"
                color="white"
                isDisabled
              />
            ) : (
              <Tooltip label="Start Call">
                <IconButton
                  aria-label="Connect"
                  icon={<FiPhone />}
                  size="lg"
                  borderRadius="full"
                  bg="green.500"
                  color="white"
                  _hover={{ bg: 'green.600', transform: 'scale(1.05)' }}
                  onClick={connect}
                  px={8}
                />
              </Tooltip>
            )}
          </HStack>
        </Flex>
      </Flex>

      {/* History Drawer */}
      <Drawer isOpen={isHistoryOpen} placement="right" onClose={onHistoryClose} size="sm">
        <DrawerOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.100">
            <HStack>
              <FiClock />
              <Text>Conversation History</Text>
            </HStack>
          </DrawerHeader>
          <DrawerBody p={0}>
            {sessions.length === 0 ? (
              <Flex direction="column" align="center" justify="center" h="200px" opacity={0.5}>
                <FiMessageSquare size={32} />
                <Text mt={3} fontSize="sm">No previous conversations</Text>
              </Flex>
            ) : (
              <VStack align="stretch" spacing={0}>
                {sessions.map((session) => (
                  <Box
                    key={session.id}
                    p={4}
                    borderBottomWidth="1px"
                    borderColor="whiteAlpha.100"
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.50' }}
                    onClick={() => loadSession(session)}
                    bg={session.id === currentSessionId ? 'whiteAlpha.100' : 'transparent'}
                  >
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="medium" fontSize="sm">{session.title}</Text>
                      {session.duration && (
                        <Badge colorScheme="purple" fontSize="2xs">
                          {formatDuration(session.duration)}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {session.startTime.toLocaleDateString()} at {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text fontSize="xs" color="gray.600" mt={1} noOfLines={1}>
                      {session.turns.length > 0 
                        ? session.turns[0].text.slice(0, 50) + '...'
                        : 'Empty conversation'}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Flex>
  );
}

export default PipecatVoicePanel;
