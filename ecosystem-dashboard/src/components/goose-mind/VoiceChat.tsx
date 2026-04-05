/**
 * VoiceChat Component for GooseMind
 * Self-hosted voice agent: Whisper STT + LLM + Chatterbox/NeMo TTS
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Spinner,
  useToast,
  Tooltip,
  Circle,
  keyframes,
} from '@chakra-ui/react';
import { FiMic, FiMicOff, FiVolume2, FiVolumeX, FiSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const GOOSEMIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

// Pulse animation for recording indicator
const pulseAnimation = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
`;

interface VoiceChatProps {
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

interface VoiceServiceStatus {
  stt: { status: string };
  tts_chatterbox: { status: string };
  tts_nemo: { status: string };
}

export function VoiceChat({ onTranscript, onResponse, disabled }: VoiceChatProps) {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');
  const toast = useToast();

  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [serviceStatus, setServiceStatus] = useState<VoiceServiceStatus | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Check voice service status on mount
  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${GOOSEMIND_API}/voice/status`);
      if (response.ok) {
        setServiceStatus(await response.json());
      }
    } catch (error) {
      console.error('Failed to check voice status:', error);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Process the recorded audio
        if (audioChunksRef.current.length > 0) {
          await processAudio();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      setTranscript('');
      setResponseText('');

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to use voice chat.',
        status: 'error',
        duration: 3000,
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  }, [state]);

  const processAudio = async () => {
    try {
      // Combine audio chunks into a single blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          // Send to voice chat endpoint
          const response = await fetch(`${GOOSEMIND_API}/voice/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audio_base64: base64Audio,
              user_id: 'eleazar',
              tts_provider: 'chatterbox',
            }),
          });

          if (!response.ok) {
            throw new Error(`Voice chat failed: ${response.status}`);
          }

          const result = await response.json();
          
          setTranscript(result.transcript || '');
          setResponseText(result.response || '');
          
          if (onTranscript) onTranscript(result.transcript || '');
          if (onResponse) onResponse(result.response || '');

          // Play audio response if available and not muted
          if (result.audio_base64 && !isMuted) {
            await playAudioResponse(result.audio_base64);
          } else {
            setState('idle');
          }

        } catch (error) {
          console.error('Voice chat error:', error);
          toast({
            title: 'Voice chat failed',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'error',
            duration: 3000,
          });
          setState('idle');
        }
      };

    } catch (error) {
      console.error('Audio processing error:', error);
      setState('idle');
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    try {
      setState('speaking');
      
      // Decode base64 to audio
      const audioData = atob(base64Audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      
      audio.onended = () => {
        setState('idle');
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        console.error('Audio playback error');
        setState('idle');
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      setState('idle');
    }
  };

  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setState('idle');
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (audioElementRef.current && !isMuted) {
      audioElementRef.current.pause();
    }
  }, [isMuted]);

  const getStateColor = () => {
    switch (state) {
      case 'recording': return 'red.500';
      case 'processing': return 'orange.500';
      case 'speaking': return 'green.500';
      default: return 'blue.500';
    }
  };

  const getStateLabel = () => {
    switch (state) {
      case 'recording': return 'Listening...';
      case 'processing': return 'Processing...';
      case 'speaking': return 'Speaking...';
      default: return 'Ready';
    }
  };

  const isSTTAvailable = serviceStatus?.stt?.status === 'healthy';
  const isTTSAvailable = serviceStatus?.tts_chatterbox?.status === 'healthy' || 
                         serviceStatus?.tts_nemo?.status === 'healthy';

  return (
    <Box p={4} bg={bgSubtle} borderRadius="lg">
      <VStack spacing={4} align="stretch">
        {/* Status Header */}
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Circle 
              size="8px" 
              bg={getStateColor()}
              animation={state === 'recording' ? `${pulseAnimation} 1s infinite` : undefined}
            />
            <Text fontSize="sm" fontWeight="medium" color={textPrimary}>
              {getStateLabel()}
            </Text>
          </HStack>
          <HStack spacing={1}>
            {isSTTAvailable && (
              <Badge colorScheme="green" fontSize="xs">STT</Badge>
            )}
            {isTTSAvailable && (
              <Badge colorScheme="green" fontSize="xs">TTS</Badge>
            )}
            {!isSTTAvailable && !isTTSAvailable && (
              <Badge colorScheme="red" fontSize="xs">Offline</Badge>
            )}
          </HStack>
        </HStack>

        {/* Main Controls */}
        <HStack justify="center" spacing={4}>
          {/* Mute Toggle */}
          <Tooltip label={isMuted ? 'Unmute responses' : 'Mute responses'}>
            <IconButton
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              icon={isMuted ? <FiVolumeX /> : <FiVolume2 />}
              size="md"
              variant="ghost"
              onClick={toggleMute}
              isDisabled={disabled}
            />
          </Tooltip>

          {/* Main Mic Button */}
          {state === 'idle' ? (
            <Tooltip label="Hold to speak">
              <IconButton
                aria-label="Start recording"
                icon={<FiMic />}
                size="lg"
                colorScheme="blue"
                borderRadius="full"
                onClick={startRecording}
                isDisabled={disabled || !isSTTAvailable}
                w="60px"
                h="60px"
              />
            </Tooltip>
          ) : state === 'recording' ? (
            <Tooltip label="Release to send">
              <IconButton
                aria-label="Stop recording"
                icon={<FiSquare />}
                size="lg"
                colorScheme="red"
                borderRadius="full"
                onClick={stopRecording}
                w="60px"
                h="60px"
                animation={`${pulseAnimation} 1s infinite`}
              />
            </Tooltip>
          ) : state === 'processing' ? (
            <Box
              w="60px"
              h="60px"
              borderRadius="full"
              bg="orange.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Spinner color="white" size="md" />
            </Box>
          ) : (
            <Tooltip label="Stop speaking">
              <IconButton
                aria-label="Stop speaking"
                icon={<FiSquare />}
                size="lg"
                colorScheme="green"
                borderRadius="full"
                onClick={stopSpeaking}
                w="60px"
                h="60px"
              />
            </Tooltip>
          )}

          {/* Placeholder for symmetry */}
          <Box w="40px" />
        </HStack>

        {/* Transcript Display */}
        {transcript && (
          <Box p={3} bg="blue.900" borderRadius="md" opacity={0.9}>
            <Text fontSize="xs" color="blue.300" mb={1}>You said:</Text>
            <Text fontSize="sm" color="white">{transcript}</Text>
          </Box>
        )}

        {/* Response Display */}
        {responseText && (
          <Box p={3} bg="green.900" borderRadius="md" opacity={0.9}>
            <Text fontSize="xs" color="green.300" mb={1}>GooseMind:</Text>
            <Text fontSize="sm" color="white">{responseText}</Text>
          </Box>
        )}

        {/* Service Status Warning */}
        {!isSTTAvailable && (
          <Text fontSize="xs" color="orange.400" textAlign="center">
            ⚠️ Whisper STT service not available. Start with: docker-compose -f docker-compose.voice.yml up -d
          </Text>
        )}
      </VStack>
    </Box>
  );
}

export default VoiceChat;
