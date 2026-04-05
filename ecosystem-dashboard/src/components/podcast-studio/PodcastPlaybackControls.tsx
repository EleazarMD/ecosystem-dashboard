import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiDownload, FiShare2, FiClock, FiMusic, FiZap } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PodcastPlaybackControlsProps {
  episode: any;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
}

export default function PodcastPlaybackControls({ 
  episode, 
  playbackSpeed = 1.0,
  onSpeedChange 
}: PodcastPlaybackControlsProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = episode.filePath;
    link.download = `${episode.projectTitle || 'podcast'}.${episode.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Episode Info Card */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        borderWidth="2px"
        borderColor="blue.500"
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontSize="12px" fontWeight="700" color={textColor}>
              📊 EPISODE INFO
            </Text>
            <Badge colorScheme="blue" fontSize="9px">
              {episode.format.toUpperCase()}
            </Badge>
          </HStack>

          <VStack align="stretch" spacing={2} fontSize="11px">
            <HStack justify="space-between">
              <Text color={mutedColor}>Duration:</Text>
              <HStack spacing={1}>
                <FiClock size={12} />
                <Text fontWeight="600" color={textColor}>
                  {formatDuration(episode.duration)}
                </Text>
              </HStack>
            </HStack>

            <HStack justify="space-between">
              <Text color={mutedColor}>TTS Provider:</Text>
              <Badge
                colorScheme={episode.provider === 'gemini' ? 'blue' : 'purple'}
                fontSize="9px"
              >
                {episode.provider === 'gemini' ? '🔵 Gemini' : '💎 OpenAI'}
              </Badge>
            </HStack>

            {episode.fileSize && (
              <HStack justify="space-between">
                <Text color={mutedColor}>File Size:</Text>
                <Text fontWeight="600" color={textColor}>
                  {formatFileSize(episode.fileSize)}
                </Text>
              </HStack>
            )}
          </VStack>
        </VStack>
      </Box>

      {/* Playback Speed Control */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        borderWidth="2px"
        borderColor="purple.500"
      >
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <FiZap />
              <Text fontSize="12px" fontWeight="700" color={textColor}>
                PLAYBACK SPEED
              </Text>
            </HStack>
            <Badge colorScheme="purple" fontSize="10px">
              {playbackSpeed.toFixed(1)}x
            </Badge>
          </HStack>

          <Slider
            value={playbackSpeed}
            min={0.5}
            max={2.0}
            step={0.1}
            onChange={(val) => onSpeedChange?.(val)}
          >
            <SliderTrack bg="purple.200">
              <SliderFilledTrack bg="purple.500" />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>

          <HStack justify="space-between" fontSize="10px" color={mutedColor}>
            <Text>0.5x</Text>
            <Text>1.0x</Text>
            <Text>2.0x</Text>
          </HStack>

          {/* Quick Speed Presets */}
          <HStack spacing={2}>
            {[0.75, 1.0, 1.25, 1.5].map((speed) => (
              <Button
                key={speed}
                size="xs"
                variant={playbackSpeed === speed ? 'solid' : 'outline'}
                colorScheme="purple"
                onClick={() => onSpeedChange?.(speed)}
                flex={1}
              >
                {speed}x
              </Button>
            ))}
          </HStack>
        </VStack>
      </Box>

      {/* Actions */}
      <Box
        p={4}
        bg={bgColor}
        borderRadius="xl"
        borderWidth="2px"
        borderColor="green.500"
      >
        <VStack align="stretch" spacing={3}>
          <Text fontSize="12px" fontWeight="700" color={textColor}>
            ⚡ QUICK ACTIONS
          </Text>

          <Button
            leftIcon={<FiDownload />}
            onClick={handleDownload}
            colorScheme="green"
            size="sm"
            w="full"
          >
            Download Episode
          </Button>

          <Button
            leftIcon={<FiShare2 />}
            variant="outline"
            colorScheme="green"
            size="sm"
            w="full"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + episode.filePath);
            }}
          >
            Copy Share Link
          </Button>
        </VStack>
      </Box>
    </VStack>
  );
}
