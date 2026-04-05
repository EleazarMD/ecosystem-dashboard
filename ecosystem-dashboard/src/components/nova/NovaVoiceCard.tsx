import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Flex,
  Tooltip,
  useColorModeValue,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import { Mic, MicOff, Volume2, VolumeX, Activity, Brain, Zap } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface NovaVoiceCardProps {
  userId?: string;
  onSessionStateChange?: (active: boolean) => void;
}

export default function NovaVoiceCard({ userId = 'default', onSessionStateChange }: NovaVoiceCardProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioLevelDecayRef = useRef<NodeJS.Timeout | null>(null);

  // Color tokens
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textPrimary = useColorModeValue('gray.900', 'gray.100');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.400');
  const successColor = useColorModeValue('green.500', 'green.400');
  const dangerColor = useColorModeValue('red.500', 'red.400');

  // Poll for active session status
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`/api/nova/mirror/status?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          const wasActive = isSessionActive;
          setIsSessionActive(data.active);
          
          if (data.active !== wasActive && onSessionStateChange) {
            onSessionStateChange(data.active);
          }
          
          if (!data.active && isSessionActive) {
            setIsListening(false);
            setIsSpeaking(false);
            setIsThinking(false);
          }
        }
      } catch (error) {
        console.error('[NovaVoiceCard] Failed to check session status:', error);
      }
    };

    const poller = setInterval(checkSession, 3000);
    checkSession();
    return () => clearInterval(poller);
  }, [userId, isSessionActive, onSessionStateChange]);

  // Subscribe to SSE mirror stream when session is active
  useEffect(() => {
    if (!isSessionActive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const es = new EventSource(`/api/nova/mirror/stream?user_id=${userId}`);
    eventSourceRef.current = es;

    es.addEventListener('user_transcript', (e) => {
      const { text, isFinal } = JSON.parse(e.data);
      if (isFinal) {
        setConversationHistory(prev => [...prev, {
          role: 'user',
          content: text,
          timestamp: new Date(),
        }]);
        setCurrentTranscript('');
      } else {
        setCurrentTranscript(text);
      }
    });

    es.addEventListener('assistant_text', (e) => {
      const { text, isFinal } = JSON.parse(e.data);
      if (isFinal) {
        setIsThinking(false);
        setThinkingText(null);
        setCurrentToolCall(null);
        setConversationHistory(prev => [...prev, {
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        }]);
        setAssistantResponse('');
      } else {
        setAssistantResponse(text);
      }
    });

    es.addEventListener('speaking_state', (e) => {
      const { who, active } = JSON.parse(e.data);
      if (who === 'user') {
        setIsListening(active);
      } else if (who === 'bot') {
        setIsSpeaking(active);
      }
    });

    es.addEventListener('thinking', (e) => {
      const { phase, text } = JSON.parse(e.data);
      setIsThinking(phase !== 'done');
      if (text) setThinkingText(text);
      if (phase === 'done') {
        setCurrentToolCall(null);
      }
    });

    es.addEventListener('tool_call', (e) => {
      const { name } = JSON.parse(e.data);
      setCurrentToolCall(name);
      setIsThinking(true);
    });

    es.addEventListener('audio_level', (e) => {
      const { who, level } = JSON.parse(e.data);
      if (who === 'user' || who === 'bot') {
        setAudioLevel(level);
        
        // Clear previous decay timer
        if (audioLevelDecayRef.current) {
          clearTimeout(audioLevelDecayRef.current);
        }
        
        // Decay audio level to 0 after 200ms of no updates
        audioLevelDecayRef.current = setTimeout(() => {
          setAudioLevel(0);
        }, 200);
      }
    });

    es.addEventListener('session_end', () => {
      setIsSessionActive(false);
      setIsListening(false);
      setIsSpeaking(false);
      setIsThinking(false);
    });

    es.addEventListener('session_start', (e) => {
      const { conversation_id } = JSON.parse(e.data);
      if (conversation_id) setConversationId(conversation_id);
    });

    es.onerror = () => {
      console.log('[NovaVoiceCard] SSE reconnecting...');
    };

    return () => {
      es.close();
      if (audioLevelDecayRef.current) {
        clearTimeout(audioLevelDecayRef.current);
      }
    };
  }, [isSessionActive, userId]);

  const handleMicToggle = useCallback(async () => {
    const action = isListening ? 'stop' : 'start';
    try {
      await fetch('/api/nova/mirror/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId }),
      });
      console.log(`[NovaVoiceCard] Sent ${action} listening command`);
    } catch (error) {
      console.error('[NovaVoiceCard] Failed to send control command:', error);
    }
  }, [isListening, userId]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isSessionActive) {
    return (
      <Box
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="xl"
        p={6}
      >
        <VStack spacing={4}>
          <Activity size={48} color={textSecondary} />
          <Text color={textSecondary} fontSize="sm">
            No active Nova session
          </Text>
          <Text color={textSecondary} fontSize="xs" textAlign="center">
            Start a voice session on your iOS device to see real-time activity here
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        p={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
        alignItems="center"
        justifyContent="space-between"
      >
        <HStack spacing={3}>
          <Activity size={20} color={accentColor} />
          <Text fontWeight="semibold" color={textPrimary}>
            Nova Voice Session
          </Text>
          {conversationId && (
            <Badge colorScheme="blue" fontSize="xs">
              {conversationId.slice(0, 8)}
            </Badge>
          )}
        </HStack>
        
        <HStack spacing={2}>
          {isThinking && (
            <Tooltip label="Thinking">
              <Box>
                <Brain size={18} color={accentColor} />
              </Box>
            </Tooltip>
          )}
          {isListening && (
            <Tooltip label="Listening">
              <Box>
                <Mic size={18} color={successColor} />
              </Box>
            </Tooltip>
          )}
          {isSpeaking && (
            <Tooltip label="Speaking">
              <Box>
                <Volume2 size={18} color={dangerColor} />
              </Box>
            </Tooltip>
          )}
        </HStack>
      </Flex>

      {/* Waveform visualization */}
      {(isListening || isSpeaking) && (
        <Box px={4} py={2} bg={useColorModeValue('gray.50', 'gray.900')}>
          <HStack spacing={1} justify="center" align="center" h="40px">
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.max(4, audioLevel * 40 * (1 - Math.abs(i - 10) / 10));
              return (
                <Box
                  key={i}
                  w="3px"
                  h={`${height}px`}
                  bg={isListening ? successColor : dangerColor}
                  borderRadius="full"
                  transition="height 0.1s ease-out"
                />
              );
            })}
          </HStack>
        </Box>
      )}

      {/* Thinking/Tool status */}
      {isThinking && (
        <Box px={4} py={3} bg={useColorModeValue('blue.50', 'blue.900')} borderBottomWidth="1px" borderColor={borderColor}>
          <HStack spacing={2}>
            <Spinner size="sm" color={accentColor} />
            {currentToolCall ? (
              <HStack spacing={2}>
                <Zap size={16} color={accentColor} />
                <Text fontSize="sm" color={textPrimary}>
                  Using: <strong>{currentToolCall}</strong>
                </Text>
              </HStack>
            ) : thinkingText ? (
              <Text fontSize="sm" color={textPrimary} noOfLines={2}>
                {thinkingText}
              </Text>
            ) : (
              <Text fontSize="sm" color={textSecondary}>
                Thinking...
              </Text>
            )}
          </HStack>
        </Box>
      )}

      {/* Current transcript/response */}
      {(currentTranscript || assistantResponse) && (
        <Box px={4} py={3} bg={useColorModeValue('gray.50', 'gray.900')} borderBottomWidth="1px" borderColor={borderColor}>
          {currentTranscript && (
            <Text fontSize="sm" color={textSecondary} fontStyle="italic">
              {currentTranscript}...
            </Text>
          )}
          {assistantResponse && (
            <Text fontSize="sm" color={textPrimary}>
              {assistantResponse}
            </Text>
          )}
        </Box>
      )}

      {/* Conversation history */}
      <Box maxH="400px" overflowY="auto" p={4}>
        <VStack spacing={3} align="stretch">
          {conversationHistory.length === 0 ? (
            <Text color={textSecondary} fontSize="sm" textAlign="center" py={8}>
              Conversation will appear here...
            </Text>
          ) : (
            conversationHistory.map((msg, idx) => (
              <Box
                key={idx}
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="80%"
              >
                <Box
                  bg={msg.role === 'user' ? accentColor : useColorModeValue('gray.100', 'gray.700')}
                  color={msg.role === 'user' ? 'white' : textPrimary}
                  px={4}
                  py={2}
                  borderRadius="lg"
                >
                  <Text fontSize="sm">{msg.content}</Text>
                </Box>
                <Text fontSize="xs" color={textSecondary} mt={1} textAlign={msg.role === 'user' ? 'right' : 'left'}>
                  {formatTime(msg.timestamp)}
                </Text>
              </Box>
            ))
          )}
        </VStack>
      </Box>

      {/* Controls */}
      <Flex
        p={4}
        borderTopWidth="1px"
        borderColor={borderColor}
        justifyContent="center"
      >
        <Tooltip label={isListening ? 'Stop listening' : 'Start listening'}>
          <IconButton
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
            icon={isListening ? <MicOff size={20} /> : <Mic size={20} />}
            colorScheme={isListening ? 'red' : 'green'}
            size="lg"
            borderRadius="full"
            onClick={handleMicToggle}
          />
        </Tooltip>
      </Flex>
    </Box>
  );
}
