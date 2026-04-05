/**
 * InlineVoiceChat - Integrated voice input for chat interfaces
 * 
 * Replaces text input area when voice mode is active.
 * Shares conversation history with parent chat component.
 * Matches dashboard theme using semantic tokens.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
  Spinner,
  Badge,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { 
  FiMic, 
  FiMicOff, 
  FiPhoneOff, 
  FiVolume2, 
  FiVolumeX,
  FiMessageSquare,
} from 'react-icons/fi';
import { PipecatClient } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';

// Nova agent WebRTC endpoint
// Port 18802 = Dashboard browser WebRTC (HTTPS via Tailscale Serve)
// Port 18800 = iOS WebRTC only (DO NOT USE from dashboard)
const NOVA_WEBRTC_URL = process.env.NEXT_PUBLIC_NOVA_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? 'https://rtx-workstation.tailb64e64.ts.net:18802'
    : 'http://localhost:18802');

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface InlineVoiceChatProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onAssistantMessage: (text: string, isPartial: boolean) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onSwitchToText: () => void;
  isActive: boolean;
}

// Animations
const pulseRing = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
`;

const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
`;

const speakingWave = keyframes`
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.4); }
`;

export function InlineVoiceChat({
  onTranscript,
  onAssistantMessage,
  onToolCall,
  onConnectionChange,
  onListeningChange,
  onSpeakingChange,
  onSwitchToText,
  isActive,
}: InlineVoiceChatProps) {
  // Theme colors
  const bgSubtle = useColorModeValue('gray.50', 'gray.800');
  const bgElevated = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textPrimary = useColorModeValue('gray.900', 'gray.50');
  const textSecondary = useColorModeValue('gray.500', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.400');
  
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  // Refs
  const clientRef = useRef<PipecatClient | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const assistantTextRef = useRef('');

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

  // Notify parent of connection changes
  useEffect(() => {
    onConnectionChange?.(connectionState);
  }, [connectionState, onConnectionChange]);

  // Auto-connect when active
  useEffect(() => {
    if (isActive && connectionState === 'disconnected') {
      connect();
    } else if (!isActive && connectionState === 'connected') {
      disconnect();
    }
  }, [isActive]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Connect to Nova
  const connect = useCallback(async () => {
    // Check WebRTC support before attempting connection
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      console.warn('[Voice] WebRTC not supported in this browser');
      setConnectionState('error');
      return;
    }

    if (clientRef.current) {
      await clientRef.current.disconnect();
    }

    setConnectionState('connecting');
    callStartTimeRef.current = new Date();
    setCallDuration(0);

    try {
      const transport = new SmallWebRTCTransport({
        webrtcRequestParams: {
          endpoint: `${NOVA_WEBRTC_URL}/connect`,
          requestData: {
            user_id: 'dashboard',
            audio_mode: 'server',
            client_type: 'dashboard',  // Separate VAD settings from iOS
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
          },
          onDisconnected: () => {
            setConnectionState('disconnected');
            setIsListening(false);
            setIsSpeaking(false);
            callStartTimeRef.current = null;
          },
          onError: () => {
            setConnectionState('error');
          },
          onUserStartedSpeaking: () => {
            setIsListening(true);
            onListeningChange?.(true);
          },
          onUserStoppedSpeaking: () => {
            setIsListening(false);
            onListeningChange?.(false);
          },
          onUserTranscript: (data) => {
            if (data.final) {
              onTranscript(data.text, true);
              setCurrentTranscript('');
            } else {
              setCurrentTranscript(data.text);
              onTranscript(data.text, false);
            }
          },
          onBotStartedSpeaking: () => {
            setIsSpeaking(true);
            onSpeakingChange?.(true);
          },
          onBotStoppedSpeaking: () => {
            setIsSpeaking(false);
            onSpeakingChange?.(false);
          },
          onBotLlmText: (data) => {
            assistantTextRef.current += data.text;
            onAssistantMessage(assistantTextRef.current, true);
          },
          onBotLlmStarted: () => {
            assistantTextRef.current = '';
          },
          onBotLlmStopped: () => {
            const text = assistantTextRef.current;
            if (text) {
              onAssistantMessage(text, false);
            }
          },
          onLLMFunctionCall: (data) => {
            onToolCall?.(data.function_name, data.args);
          },
        },
      });

      await client.connect();
      clientRef.current = client;

    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionState('error');
    }
  }, [onTranscript, onAssistantMessage, onToolCall]);

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

  // Get status text
  const getStatusText = () => {
    if (connectionState === 'connecting') return 'Connecting...';
    if (connectionState === 'error') return 'Connection Error';
    if (connectionState !== 'connected') return 'Ready to connect';
    if (isSpeaking) return 'Nova is speaking...';
    if (isListening) return 'Listening...';
    return 'Ready';
  };

  // Get orb color
  const getOrbColor = () => {
    if (connectionState !== 'connected') return 'gray.400';
    if (isSpeaking) return 'purple.500';
    if (isListening) return 'blue.500';
    return 'green.500';
  };

  if (!isActive) return null;

  return (
    <Box
      bg={bgSubtle}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      p={4}
    >
      <VStack spacing={4}>
        {/* Status bar */}
        <HStack w="full" justify="space-between">
          <HStack spacing={2}>
            <Box
              w={2}
              h={2}
              borderRadius="full"
              bg={connectionState === 'connected' ? 'green.400' : 
                  connectionState === 'connecting' ? 'yellow.400' : 'gray.400'}
            />
            <Text fontSize="sm" color={textSecondary}>
              {getStatusText()}
            </Text>
          </HStack>
          {connectionState === 'connected' && (
            <Badge colorScheme="purple" fontSize="xs">
              {formatDuration(callDuration)}
            </Badge>
          )}
        </HStack>

        {/* Current transcript preview */}
        {currentTranscript && (
          <Box
            w="full"
            p={3}
            bg={bgElevated}
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
          >
            <Text fontSize="sm" color={textSecondary} mb={1}>You're saying:</Text>
            <Text fontSize="sm" color={textPrimary}>{currentTranscript}</Text>
          </Box>
        )}

        {/* Voice orb and controls */}
        <HStack spacing={6} py={2}>
          {/* Mute button */}
          <Tooltip label={isMuted ? 'Unmute' : 'Mute'}>
            <IconButton
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              icon={isMuted ? <FiMicOff /> : <FiMic />}
              size="md"
              borderRadius="full"
              variant={isMuted ? 'solid' : 'ghost'}
              colorScheme={isMuted ? 'red' : 'gray'}
              onClick={toggleMute}
              isDisabled={connectionState !== 'connected'}
            />
          </Tooltip>

          {/* Voice orb */}
          <Box position="relative">
            {/* Pulse rings when active */}
            {(isListening || isSpeaking) && connectionState === 'connected' && (
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w="60px"
                h="60px"
                borderRadius="full"
                bg={getOrbColor()}
                opacity={0.3}
                animation={`${pulseRing} 1.5s ease-out infinite`}
              />
            )}
            
            {/* Main orb */}
            <Flex
              w="56px"
              h="56px"
              borderRadius="full"
              bg={getOrbColor()}
              align="center"
              justify="center"
              animation={connectionState === 'connected' ? `${breathe} 2s ease-in-out infinite` : undefined}
              boxShadow={connectionState === 'connected' ? `0 0 20px ${getOrbColor()}` : 'none'}
              cursor={connectionState === 'disconnected' ? 'pointer' : 'default'}
              onClick={connectionState === 'disconnected' ? connect : undefined}
              transition="all 0.3s ease"
              _hover={connectionState === 'disconnected' ? { transform: 'scale(1.05)' } : {}}
            >
              {connectionState === 'connecting' ? (
                <Spinner size="sm" color="white" />
              ) : isSpeaking ? (
                <HStack spacing={0.5}>
                  {[0, 1, 2, 3].map(i => (
                    <Box
                      key={i}
                      w="3px"
                      h="14px"
                      bg="white"
                      borderRadius="full"
                      animation={`${speakingWave} 0.4s ease-in-out infinite ${i * 0.1}s`}
                    />
                  ))}
                </HStack>
              ) : (
                <FiMic color="white" size={20} />
              )}
            </Flex>
          </Box>

          {/* Speaker mute button */}
          <Tooltip label={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}>
            <IconButton
              aria-label={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
              icon={isSpeakerMuted ? <FiVolumeX /> : <FiVolume2 />}
              size="md"
              borderRadius="full"
              variant={isSpeakerMuted ? 'solid' : 'ghost'}
              colorScheme={isSpeakerMuted ? 'orange' : 'gray'}
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              isDisabled={connectionState !== 'connected'}
            />
          </Tooltip>
        </HStack>

        {/* Action buttons */}
        <HStack spacing={3} w="full" justify="center">
          <Tooltip label="Switch to text input">
            <IconButton
              aria-label="Switch to text"
              icon={<FiMessageSquare />}
              size="sm"
              variant="ghost"
              onClick={() => {
                disconnect();
                onSwitchToText();
              }}
            />
          </Tooltip>
          
          {connectionState === 'connected' && (
            <Tooltip label="End voice session">
              <IconButton
                aria-label="End call"
                icon={<FiPhoneOff />}
                size="sm"
                colorScheme="red"
                variant="solid"
                onClick={disconnect}
              />
            </Tooltip>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}

export default InlineVoiceChat;
