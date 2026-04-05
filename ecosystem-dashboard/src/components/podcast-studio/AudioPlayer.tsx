import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  Tooltip,
  Button,
  Spinner,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiDownload } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  filename?: string;
  title?: string;
  subtitle?: string;
  language?: string;
  compact?: boolean;
}

export default function AudioPlayer({ 
  audioUrl, 
  duration = 0, 
  filename = 'podcast.wav',
  title,
  subtitle,
  language,
  compact = false 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Smooth progress update using requestAnimationFrame
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      setCurrentTime(audio.currentTime);
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying]);

  // Start/stop animation frame based on play state
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updateProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setAudioDuration(audio.duration);
      // CRITICAL: Ensure playback rate is 1.0 (normal speed)
      audio.playbackRate = 1.0;
    };
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setError('Failed to load audio');
      setIsPlaying(false);
      setIsLoading(false);
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      // Ensure playback rate stays at 1.0
      audio.playbackRate = 1.0;
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        setError(null);
        // Ensure normal playback rate before playing
        audio.playbackRate = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError('Playback failed. Please try again.');
      setIsPlaying(false);
    }
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = value;
    setVolume(value);
    if (value > 0 && isMuted) {
      setIsMuted(false);
      audio.muted = false;
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = audioDuration || duration || 0;

  const isSpanish = language === 'spanish';
  const displayTitle = title || '🎙️ Generated Podcast';
  const trackBg = useSemanticToken('surface.sunken');
  const textSecondary = useSemanticToken('text.secondary');

  // Compact mode for inline/embedded use
  if (compact) {
    return (
      <Box
        p={2}
        bg={bgColor}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
      >
        <audio ref={audioRef} src={audioUrl} preload="auto" crossOrigin="anonymous" />
        
        <HStack spacing={2}>
          <IconButton
            aria-label={isPlaying ? 'Pause' : 'Play'}
            icon={isLoading ? <Spinner size="xs" /> : isPlaying ? <FiPause /> : <FiPlay />}
            onClick={togglePlay}
            colorScheme="blue"
            size="sm"
            borderRadius="full"
            isDisabled={isLoading || !!error}
          />
          
          <VStack spacing={0} flex={1} align="stretch">
            <Slider
              value={currentTime}
              min={0}
              max={totalDuration || 1}
              step={0.1}
              onChange={handleSeek}
              focusThumbOnChange={false}
              size="sm"
            >
              <SliderTrack bg={trackBg} h="4px">
                <SliderFilledTrack bg="blue.500" />
              </SliderTrack>
              <SliderThumb boxSize={2} />
            </Slider>
            <HStack justify="space-between" fontSize="9px" color={textSecondary}>
              <Text>{formatTime(currentTime)}</Text>
              <Text>{formatTime(totalDuration)}</Text>
            </HStack>
          </VStack>
          
          <Tooltip label={isMuted ? 'Unmute' : 'Mute'}>
            <IconButton
              aria-label="Toggle mute"
              icon={isMuted ? <FiVolumeX /> : <FiVolume2 />}
              onClick={toggleMute}
              variant="ghost"
              size="xs"
            />
          </Tooltip>
        </HStack>
      </Box>
    );
  }

  // Full mode with metadata
  console.log('🎵 AudioPlayer rendering:', { audioUrl, duration, totalDuration, isLoading, error });
  
  return (
    <Box
      p={3}
      bg={bgColor}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <audio ref={audioRef} src={audioUrl} preload="auto" crossOrigin="anonymous" />
      
      <VStack spacing={2} align="stretch">
        {/* Header with title and download */}
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={0} flex={1}>
            <HStack spacing={1}>
              <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                {displayTitle}
              </Text>
              {isSpanish && (
                <Text fontSize="xs">🇪🇸</Text>
              )}
            </HStack>
            {subtitle && (
              <Text fontSize="10px" color={textSecondary} noOfLines={1}>
                {subtitle}
              </Text>
            )}
          </VStack>
          <Tooltip label="Download audio">
            <IconButton
              aria-label="Download"
              icon={<FiDownload />}
              size="xs"
              variant="ghost"
              onClick={handleDownload}
            />
          </Tooltip>
        </HStack>

        {error && (
          <Box p={1.5} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontSize="10px" color="red.600">⚠️ {error}</Text>
          </Box>
        )}

        {/* Progress bar */}
        <VStack spacing={0} align="stretch">
          <Slider
            value={currentTime}
            min={0}
            max={totalDuration || 1}
            step={0.1}
            onChange={handleSeek}
            focusThumbOnChange={false}
          >
            <SliderTrack bg={trackBg} h="6px" borderRadius="full">
              <SliderFilledTrack bg="blue.500" />
            </SliderTrack>
            <SliderThumb boxSize={3} />
          </Slider>
          
          <HStack justify="space-between" fontSize="10px" color={textSecondary} mt={0.5}>
            <Text>{formatTime(currentTime)}</Text>
            <Text>{formatTime(totalDuration)}</Text>
          </HStack>
        </VStack>

        {/* Controls */}
        <HStack spacing={2}>
          <IconButton
            aria-label={isPlaying ? 'Pause' : 'Play'}
            icon={isLoading ? <Spinner size="sm" /> : isPlaying ? <FiPause /> : <FiPlay />}
            onClick={togglePlay}
            colorScheme="blue"
            size="md"
            borderRadius="full"
            isDisabled={isLoading || !!error}
          />

          <HStack flex={1} spacing={1}>
            <Tooltip label={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton
                aria-label="Toggle mute"
                icon={isMuted ? <FiVolumeX /> : <FiVolume2 />}
                onClick={toggleMute}
                variant="ghost"
                size="xs"
              />
            </Tooltip>
            
            <Slider
              value={isMuted ? 0 : volume}
              min={0}
              max={1}
              step={0.01}
              onChange={handleVolumeChange}
              maxW="80px"
              size="sm"
            >
              <SliderTrack bg={trackBg} h="4px">
                <SliderFilledTrack bg="blue.500" />
              </SliderTrack>
              <SliderThumb boxSize={2} />
            </Slider>
          </HStack>
        </HStack>
      </VStack>
    </Box>
  );
}
