/**
 * ReadAloud Button Component for Kids Portal
 * 
 * A child-friendly button that reads text aloud using TTS
 * Can be placed next to any text content (books, chat, documents)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  IconButton,
  Button,
  Tooltip,
  useToast,
  Box,
  HStack,
  Progress,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Select,
  Badge,
} from '@chakra-ui/react';
import { 
  FiVolume2, 
  FiVolumeX, 
  FiPause, 
  FiPlay,
  FiSettings,
  FiSquare,
} from 'react-icons/fi';

interface ReadAloudButtonProps {
  text: string;
  sourceType?: 'book' | 'chat' | 'document' | 'email';
  sourceId?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  colorScheme?: string;
  showSettings?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface TTSPreferences {
  voiceId: string;
  voiceName: string;
  speed: number;
  pitch: number;
  volume: number;
}

import { ALL_TTS_VOICES, UNIVERSAL_VOICES } from '@/lib/platform/tts-voices-config';

// Default voices shown before user preferences load
const DEFAULT_VOICES = UNIVERSAL_VOICES.map(v => ({
  id: v.id,
  name: v.name,
  emoji: v.emoji,
  description: v.description,
}));

export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  text,
  sourceType = 'document',
  sourceId,
  size = 'md',
  variant = 'icon',
  colorScheme = 'purple',
  showSettings = true,
  onStart,
  onEnd,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preferences, setPreferences] = useState<TTSPreferences>({
    voiceId: 'Zephyr',
    voiceName: 'Zephyr',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/child/tts/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load TTS preferences:', error);
    }
  };

  const savePreferences = async (newPrefs: Partial<TTSPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    
    try {
      await fetch('/api/child/tts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });
    } catch (error) {
      console.error('Failed to save TTS preferences:', error);
    }
  };

  const handlePlay = async () => {
    if (!text || text.trim().length === 0) {
      toast({
        title: 'Nothing to read',
        description: 'There is no text to read aloud.',
        status: 'info',
        duration: 2000,
      });
      return;
    }

    // If already playing, toggle pause
    if (isPlaying && audioRef.current) {
      if (isPaused) {
        audioRef.current.play();
        setIsPaused(false);
      } else {
        audioRef.current.pause();
        setIsPaused(true);
      }
      return;
    }

    setIsLoading(true);
    onStart?.();

    try {
      const response = await fetch('/api/child/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: preferences.voiceId,
          speed: preferences.speed,
          pitch: preferences.pitch,
          sourceType,
          sourceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate speech');
      }

      const data = await response.json();

      if (data.useBrowserTTS) {
        // Fallback to browser TTS
        useBrowserTTS(data.text, data.speed, data.pitch);
        return;
      }

      // Play audio
      const audio = new Audio(data.audioUrl);
      audioRef.current = audio;
      audio.volume = preferences.volume;
      audio.playbackRate = preferences.speed;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(0);
        onEnd?.();
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        toast({
          title: 'Playback error',
          description: 'Could not play the audio. Try again!',
          status: 'error',
          duration: 3000,
        });
        onError?.('Playback error');
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      await audio.play();

    } catch (error) {
      setIsLoading(false);
      const message = error instanceof Error ? error.message : 'Failed to read aloud';
      toast({
        title: 'Oops!',
        description: message,
        status: 'error',
        duration: 3000,
      });
      onError?.(message);
    }
  };

  const useBrowserTTS = (text: string, speed: number, pitch: number) => {
    if (!('speechSynthesis' in window)) {
      toast({
        title: 'Not supported',
        description: 'Your browser does not support text-to-speech.',
        status: 'warning',
        duration: 3000,
      });
      setIsLoading(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.volume = preferences.volume;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      onEnd?.();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsLoading(false);
      onError?.('Browser TTS error');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    onEnd?.();
  };

  const getButtonIcon = () => {
    if (isLoading) return <FiVolume2 className="animate-pulse" />;
    if (isPlaying && !isPaused) return <FiPause />;
    if (isPlaying && isPaused) return <FiPlay />;
    return <FiVolume2 />;
  };

  const getButtonLabel = () => {
    if (isLoading) return 'Loading...';
    if (isPlaying && !isPaused) return 'Pause';
    if (isPlaying && isPaused) return 'Resume';
    return 'Read Aloud';
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <HStack spacing={1}>
        <Tooltip label={getButtonLabel()} hasArrow>
          <IconButton
            aria-label={getButtonLabel()}
            icon={getButtonIcon()}
            size={size}
            colorScheme={isPlaying ? 'green' : colorScheme}
            variant={isPlaying ? 'solid' : 'ghost'}
            isLoading={isLoading}
            onClick={handlePlay}
            borderRadius="full"
          />
        </Tooltip>
        
        {isPlaying && (
          <Tooltip label="Stop" hasArrow>
            <IconButton
              aria-label="Stop"
              icon={<FiSquare />}
              size={size}
              colorScheme="red"
              variant="ghost"
              onClick={handleStop}
              borderRadius="full"
            />
          </Tooltip>
        )}

        {showSettings && !isPlaying && (
          <Popover placement="bottom-end">
            <PopoverTrigger>
              <IconButton
                aria-label="Voice settings"
                icon={<FiSettings />}
                size={size}
                variant="ghost"
                borderRadius="full"
              />
            </PopoverTrigger>
            <PopoverContent w="280px">
              <PopoverBody>
                <VoiceSettings 
                  preferences={preferences} 
                  onUpdate={savePreferences} 
                />
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
      </HStack>
    );
  }

  // Full button variant
  return (
    <Box>
      <HStack spacing={2}>
        <Button
          leftIcon={getButtonIcon()}
          size={size}
          colorScheme={isPlaying ? 'green' : colorScheme}
          variant={isPlaying ? 'solid' : 'outline'}
          isLoading={isLoading}
          loadingText="Loading..."
          onClick={handlePlay}
          borderRadius="full"
        >
          {getButtonLabel()}
        </Button>

        {isPlaying && (
          <IconButton
            aria-label="Stop"
            icon={<FiSquare />}
            size={size}
            colorScheme="red"
            variant="ghost"
            onClick={handleStop}
            borderRadius="full"
          />
        )}
      </HStack>

      {isPlaying && (
        <Progress 
          value={progress} 
          size="xs" 
          colorScheme="green" 
          mt={2} 
          borderRadius="full"
        />
      )}
    </Box>
  );
};

// Voice settings sub-component
const VoiceSettings: React.FC<{
  preferences: TTSPreferences;
  onUpdate: (prefs: Partial<TTSPreferences>) => void;
}> = ({ preferences, onUpdate }) => {
  return (
    <VStack spacing={4} align="stretch">
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>Voice</Text>
        <Select
          size="sm"
          value={preferences.voiceId}
          onChange={(e) => {
            const voice = DEFAULT_VOICES.find(v => v.id === e.target.value);
            onUpdate({ 
              voiceId: e.target.value,
              voiceName: voice?.name || e.target.value,
            });
          }}
        >
          {DEFAULT_VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.emoji} {voice.name} - {voice.description}
            </option>
          ))}
        </Select>
      </Box>

      <Box>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="sm" fontWeight="medium">Speed</Text>
          <Badge colorScheme="purple">{preferences.speed.toFixed(1)}x</Badge>
        </HStack>
        <Slider
          value={preferences.speed}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={(val) => onUpdate({ speed: val })}
        >
          <SliderTrack>
            <SliderFilledTrack bg="purple.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
        <HStack justify="space-between" fontSize="xs" color="gray.500">
          <Text>Slow</Text>
          <Text>Fast</Text>
        </HStack>
      </Box>

      <Box>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="sm" fontWeight="medium">Volume</Text>
          <Badge colorScheme="blue">{Math.round(preferences.volume * 100)}%</Badge>
        </HStack>
        <Slider
          value={preferences.volume}
          min={0}
          max={1}
          step={0.1}
          onChange={(val) => onUpdate({ volume: val })}
        >
          <SliderTrack>
            <SliderFilledTrack bg="blue.400" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>
    </VStack>
  );
};

export default ReadAloudButton;
