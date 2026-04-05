import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Badge,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiDownload,
  FiShare2,
  FiVolume2,
  FiRepeat,
} from 'react-icons/fi';

export default function AudioControlsPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(900); // 15 minutes in seconds
  const [volume, setVolume] = useState(80);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const cardBg = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <HStack justify="space-between" px={4} py={3}>
        <Text 
          fontSize="14px" 
          fontWeight="500" 
          color={textColor}
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
        >
          Audio Controls
        </Text>
        <Badge 
          colorScheme={isGenerating ? 'yellow' : generationProgress === 100 ? 'green' : 'gray'}
          fontSize="11px"
        >
          {isGenerating ? 'Generating...' : generationProgress === 100 ? 'Ready' : 'Not Generated'}
        </Badge>
      </HStack>

      {/* Generation Section */}
      {!isGenerating && generationProgress === 0 && (
        <Box px={4} py={4}>
          <Box
            bg={cardBg}
            border="2px solid"
            borderColor="green.500"
            borderRadius="2xl"
            boxShadow="lg"
            p={6}
            position="relative"
            overflow="hidden"
          >
            <VStack spacing={3} position="relative" zIndex={1}>
              <Button
                colorScheme="blue"
                w="full"
                size="lg"
                onClick={handleGenerate}
                leftIcon={<FiPlay />}
                fontSize="14px"
                fontWeight="600"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                borderRadius="xl"
                boxShadow="md"
                _hover={{ transform: 'scale(1.02)', boxShadow: 'lg' }}
                transition="all 0.2s ease"
              >
                Generate Audio
              </Button>
              <HStack spacing={2}>
                <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="green" fontWeight="600">
                  Gemini 2.5 TTS
                </Badge>
                <Badge fontSize="10px" px={2.5} py={0.5} borderRadius="full" colorScheme="teal" fontWeight="600">
                  Neural Voice
                </Badge>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <Box px={4} py={4}>
          <Box
            p={4}
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            border="1px solid"
            borderColor={useSemanticToken('border.default')}
          >
            <Text 
              fontSize="13px" 
              color={textColor} 
              mb={3}
              fontWeight="600"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              🎵 Generating podcast audio...
            </Text>
            <Progress value={generationProgress} colorScheme="blue" size="md" hasStripe isAnimated borderRadius="full" />
            <Text 
              fontSize="12px" 
              color={mutedColor} 
              mt={2}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              {generationProgress}% complete
            </Text>
          </Box>
        </Box>
      )}

      {/* Audio Player */}
      {generationProgress === 100 && (
        <>
          {/* Waveform Visualization Placeholder */}
          <Box
            mx={4}
            h="100px"
            bg={cardBg}
            border="1px solid"
            borderColor="purple.500"
            borderRadius="2xl"
            position="relative"
            overflow="hidden"
            boxShadow="md"
          >
            {/* Simple waveform bars */}
            <HStack h="full" spacing={1} align="center" justify="center" px={2}>
              {Array.from({ length: 50 }).map((_, i) => (
                <Box
                  key={i}
                  h={`${Math.random() * 60 + 20}%`}
                  w="2px"
                  bg="blue.400"
                  opacity={i < (currentTime / duration) * 50 ? 1 : 0.3}
                  transition="opacity 0.2s"
                />
              ))}
            </HStack>
          </Box>

          {/* Progress Bar */}
          <Box px={4}>
            <Slider
              value={currentTime}
              min={0}
              max={duration}
              onChange={setCurrentTime}
              focusThumbOnChange={false}
            >
              <SliderTrack bg={borderColor}>
                <SliderFilledTrack bg="blue.400" />
              </SliderTrack>
              <SliderThumb boxSize={3} />
            </Slider>
            <HStack justify="space-between" mt={1}>
              <Text 
                fontSize="11px" 
                color={mutedColor}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                {formatTime(currentTime)}
              </Text>
              <Text 
                fontSize="11px" 
                color={mutedColor}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                {formatTime(duration)}
              </Text>
            </HStack>
          </Box>

          {/* Playback Controls */}
          <Box px={4}>
            <HStack justify="center" spacing={4}>
              <IconButton
                aria-label="Previous"
                icon={<FiSkipBack />}
                variant="ghost"
                size="sm"
              />
              <IconButton
                aria-label={isPlaying ? 'Pause' : 'Play'}
                icon={isPlaying ? <FiPause /> : <FiPlay />}
                colorScheme="blue"
                size="lg"
                onClick={() => setIsPlaying(!isPlaying)}
              />
              <IconButton
                aria-label="Next"
                icon={<FiSkipForward />}
                variant="ghost"
                size="sm"
              />
            </HStack>
          </Box>

          {/* Volume Control */}
          <Box px={4}>
            <HStack spacing={3}>
              <FiVolume2 color={mutedColor} />
              <Slider
                value={volume}
                onChange={setVolume}
                min={0}
                max={100}
              >
                <SliderTrack bg={borderColor}>
                  <SliderFilledTrack bg="blue.400" />
                </SliderTrack>
                <SliderThumb boxSize={3} />
              </Slider>
              <Text 
                fontSize="11px" 
                color={mutedColor} 
                w="35px"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                {volume}%
              </Text>
            </HStack>
          </Box>

          {/* Export Options */}
          <Box px={4} pt={4}>
            <VStack spacing={3} align="stretch">
              <Text 
                fontSize="13px" 
                fontWeight="500" 
                color={textColor}
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
              >
                Export & Share
              </Text>
              <VStack spacing={2} width="full">
                <HStack spacing={2} width="full">
                  <Button
                    leftIcon={<FiDownload />}
                    size="sm"
                    flex={1}
                    variant="outline"
                    fontSize="13px"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    Download
                  </Button>
                  <Button
                    leftIcon={<FiShare2 />}
                    size="sm"
                    flex={1}
                    variant="outline"
                    fontSize="13px"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    Share
                  </Button>
                </HStack>
                <Button
                  colorScheme="purple"
                  size="sm"
                  width="full"
                  fontSize="13px"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  leftIcon={<span>📚</span>}
                >
                  Save to My Notion Library
                </Button>
              </VStack>
            </VStack>
          </Box>

          {/* Audio Info */}
          <Box
            mx={4}
            p={3}
            bg={cardBg}
            borderRadius="md"
          >
            <VStack align="stretch" spacing={1}>
              <HStack justify="space-between">
                <Text 
                  fontSize="12px" 
                  color={mutedColor}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  Format:
                </Text>
                <Text 
                  fontSize="12px" 
                  fontWeight="medium"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  MP3, 320kbps
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text 
                  fontSize="12px" 
                  color={mutedColor}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  Duration:
                </Text>
                <Text 
                  fontSize="12px" 
                  fontWeight="medium"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  {formatTime(duration)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text 
                  fontSize="12px" 
                  color={mutedColor}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  File Size:
                </Text>
                <Text 
                  fontSize="12px" 
                  fontWeight="medium"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  ~28 MB
                </Text>
              </HStack>
            </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
}
