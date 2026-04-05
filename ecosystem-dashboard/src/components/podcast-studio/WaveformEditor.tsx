import React, { useEffect, useRef, useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Badge,
  Tooltip,
  Icon,
  ButtonGroup,
} from '@chakra-ui/react';
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiZoomIn,
  FiZoomOut,
  FiScissors,
  FiCrosshair,
  FiMaximize2,
} from 'react-icons/fi';

interface WaveformEditorProps {
  audioUrl?: string;
  duration?: number;
  onRegionSelect?: (start: number, end: number) => void;
  onCut?: (start: number, end: number) => void;
}

export default function WaveformEditor({
  audioUrl,
  duration = 0,
  onRegionSelect,
  onCut,
}: WaveformEditorProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const waveColor = useSemanticToken('interactive.base');
  const progressColor = useSemanticToken('interactive.active');

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return;

    // WaveSurfer.js will be initialized here
    // For now, we'll create a placeholder visualization
    console.log('🌊 Waveform ready for:', audioUrl);

    return () => {
      // Cleanup
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleCutRegion = () => {
    if (selectedRegion) {
      onCut?.(selectedRegion.start, selectedRegion.end);
      setSelectedRegion(null);
    }
  };

  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
    >
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiMaximize2} color="blue.500" />
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              🌊 Waveform Editor
            </Text>
          </HStack>
          <HStack spacing={2}>
            {selectedRegion && (
              <Badge colorScheme="blue" fontSize="xs">
                {formatTime(selectedRegion.start)} - {formatTime(selectedRegion.end)}
              </Badge>
            )}
            <Badge colorScheme="purple" fontSize="xs">
              Zoom: {zoom.toFixed(1)}x
            </Badge>
          </HStack>
        </HStack>

        {/* Waveform Display */}
        <Box
          ref={waveformRef}
          h="200px"
          bg={useSemanticToken('surface.sunken')}
          borderRadius="md"
          position="relative"
          overflow="hidden"
          border="2px solid"
          borderColor={borderColor}
        >
          {audioUrl ? (
            <>
              {/* Placeholder waveform visualization */}
              <Box
                position="absolute"
                top="50%"
                left="0"
                right="0"
                h="100%"
                transform="translateY(-50%)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap="2px"
                px={4}
              >
                {/* Generate fake waveform bars */}
                {Array.from({ length: 100 }).map((_, i) => {
                  const height = Math.random() * 80 + 20;
                  const isInRegion = selectedRegion
                    ? i >= (selectedRegion.start / duration) * 100 &&
                    i <= (selectedRegion.end / duration) * 100
                    : false;
                  return (
                    <Box
                      key={i}
                      h={`${height}%`}
                      w="full"
                      bg={isInRegion ? progressColor : waveColor}
                      opacity={isInRegion ? 0.8 : 0.6}
                      borderRadius="sm"
                      transition="all 0.2s"
                      cursor="pointer"
                      _hover={{ opacity: 1 }}
                    />
                  );
                })}
              </Box>

              {/* Playhead */}
              {duration > 0 && (
                <Box
                  position="absolute"
                  top="0"
                  bottom="0"
                  left={`${(currentTime / duration) * 100}%`}
                  w="2px"
                  bg="red.500"
                  zIndex={10}
                  transition="left 0.1s linear"
                >
                  <Box
                    position="absolute"
                    top="-4px"
                    left="-4px"
                    w="10px"
                    h="10px"
                    bg="red.500"
                    borderRadius="full"
                  />
                </Box>
              )}

              {/* Time display */}
              <Box
                position="absolute"
                bottom="8px"
                left="8px"
                bg="blackAlpha.700"
                color="whiteAlpha.900"
                px={2}
                py={1}
                borderRadius="md"
                fontSize="xs"
                fontWeight="600"
              >
                {formatTime(currentTime)} / {formatTime(duration)}
              </Box>
            </>
          ) : (
            <VStack h="full" justify="center" align="center" spacing={2}>
              <Icon as={FiMaximize2} boxSize={12} color={mutedColor} />
              <Text fontSize="sm" color={mutedColor}>
                Generate audio to see waveform
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                Visual editing will be available after generation
              </Text>
            </VStack>
          )}
        </Box>

        {/* Timeline Controls */}
        {audioUrl && (
          <>
            {/* Playback Timeline */}
            <Box>
              <Slider
                value={currentTime}
                min={0}
                max={duration}
                step={0.1}
                onChange={(val) => setCurrentTime(val)}
                colorScheme="blue"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </Box>

            {/* Control Buttons */}
            <HStack justify="space-between">
              {/* Playback Controls */}
              <ButtonGroup size="sm" variant="outline" spacing={2}>
                <Tooltip label="Skip backward 5s">
                  <IconButton
                    icon={<FiSkipBack />}
                    aria-label="Skip backward"
                    onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
                  />
                </Tooltip>
                <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
                  <IconButton
                    icon={isPlaying ? <FiPause /> : <FiPlay />}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    onClick={handlePlayPause}
                    colorScheme="blue"
                  />
                </Tooltip>
                <Tooltip label="Skip forward 5s">
                  <IconButton
                    icon={<FiSkipForward />}
                    aria-label="Skip forward"
                    onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}
                  />
                </Tooltip>
              </ButtonGroup>

              {/* Zoom Controls */}
              <ButtonGroup size="sm" variant="outline" spacing={2}>
                <Tooltip label="Zoom out">
                  <IconButton
                    icon={<FiZoomOut />}
                    aria-label="Zoom out"
                    onClick={handleZoomOut}
                    isDisabled={zoom <= 0.5}
                  />
                </Tooltip>
                <Tooltip label="Zoom in">
                  <IconButton
                    icon={<FiZoomIn />}
                    aria-label="Zoom in"
                    onClick={handleZoomIn}
                    isDisabled={zoom >= 5}
                  />
                </Tooltip>
              </ButtonGroup>

              {/* Edit Controls */}
              <ButtonGroup size="sm" variant="outline" spacing={2}>
                <Tooltip label="Add marker">
                  <IconButton
                    icon={<FiCrosshair />}
                    aria-label="Add marker"
                    onClick={() => console.log('Add marker at', currentTime)}
                  />
                </Tooltip>
                {selectedRegion && (
                  <Tooltip label="Cut selected region">
                    <IconButton
                      icon={<FiScissors />}
                      aria-label="Cut region"
                      onClick={handleCutRegion}
                      colorScheme="red"
                    />
                  </Tooltip>
                )}
              </ButtonGroup>
            </HStack>

            {/* Instructions */}
            <Box
              p={2}
              bg={useSemanticToken('surface.highlight')}
              borderRadius="md"
              fontSize="xs"
              color={mutedColor}
            >
              <Text>
                <strong>💡 Tip:</strong> Click and drag on the waveform to select a region for editing.
                Use zoom controls for precise edits. Markers help you remember important positions.
              </Text>
            </Box>
          </>
        )}
      </VStack>
    </Box>
  );
}
