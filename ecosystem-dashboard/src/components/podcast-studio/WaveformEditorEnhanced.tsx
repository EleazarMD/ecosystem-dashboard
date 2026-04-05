import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  SimpleGrid,
  Switch,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
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
  FiMinimize2,
  FiActivity,
  FiBarChart2,
} from 'react-icons/fi';

interface EffectsSettings {
  noiseGate: { enabled: boolean; threshold: number };
  eq: { enabled: boolean; lowCut: number; midBoost: number; highShelf: number };
  compressor: { enabled: boolean; threshold: number; ratio: number; attack: number; release: number };
  limiter: { enabled: boolean; ceiling: number };
}

interface WaveformEditorEnhancedProps {
  audioUrl?: string;
  duration?: number;
  onRegionSelect?: (start: number, end: number) => void;
  onCut?: (start: number, end: number) => void;
  effectsSettings?: EffectsSettings;
}

export default function WaveformEditorEnhanced({
  audioUrl,
  duration = 0,
  onRegionSelect,
  onCut,
  effectsSettings,
}: WaveformEditorEnhancedProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const eqCurveRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null);
  const [showSpectrum, setShowSpectrum] = useState(true);
  const [showEQCurve, setShowEQCurve] = useState(true);
  const [showCompression, setShowCompression] = useState(true);
  const [audioDuration, setAudioDuration] = useState(duration);
  const { isOpen: isFullscreen, onOpen: openFullscreen, onClose: closeFullscreen } = useDisclosure();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const waveColor = 'blue.400';
  const progressColor = 'blue.500';
  const panelBg = useSemanticToken('surface.base');

  // Draw EQ Curve based on settings
  const drawEQCurve = useCallback(() => {
    if (!eqCurveRef.current || !effectsSettings) return;

    const canvas = eqCurveRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!effectsSettings.eq.enabled) return;

    // Draw EQ curve
    ctx.strokeStyle = '#4299e1';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const { lowCut, midBoost, highShelf } = effectsSettings.eq;

    // Create frequency response curve
    for (let x = 0; x < width; x++) {
      const freq = (x / width) * 20000; // 0-20kHz
      let db = 0;

      // Low cut (high-pass filter)
      if (freq < lowCut) {
        db -= (lowCut - freq) / lowCut * 12; // Gradual rolloff
      }

      // Mid boost/cut (around 1-4kHz)
      if (freq > 500 && freq < 8000) {
        const midCenter = 2000;
        const distance = Math.abs(freq - midCenter) / midCenter;
        db += midBoost * (1 - distance);
      }

      // High shelf (above 8kHz)
      if (freq > 8000) {
        const shelf = (freq - 8000) / 12000;
        db += highShelf * Math.min(1, shelf);
      }

      // Convert dB to Y position
      const y = height / 2 - (db / 12) * (height / 2);

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw labels
    ctx.fillStyle = '#718096';
    ctx.font = '10px monospace';
    ctx.fillText('+6dB', 5, 15);
    ctx.fillText('0dB', 5, height / 2 + 5);
    ctx.fillText('-6dB', 5, height - 10);
    ctx.fillText(`Low: ${lowCut}Hz`, width - 80, height - 10);
    ctx.fillText(`Mid: ${midBoost.toFixed(1)}dB`, width / 2 - 40, 15);
    ctx.fillText(`High: ${highShelf.toFixed(1)}dB`, width - 80, 15);
  }, [effectsSettings]);

  // Draw Frequency Spectrum Analyzer
  const drawSpectrum = useCallback(() => {
    if (!spectrumRef.current) return;

    const canvas = spectrumRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate simulated spectrum data (in real implementation, use Web Audio API)
    const bars = 64;
    const barWidth = width / bars;

    for (let i = 0; i < bars; i++) {
      // Simulate frequency data (would come from AudioContext in real implementation)
      const value = Math.random() * 0.7 + 0.1;
      const barHeight = value * height;

      // Color gradient based on frequency
      const hue = (i / bars) * 120; // Green to red spectrum
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

      ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 2,
        barHeight
      );
    }

    // Draw frequency labels
    ctx.fillStyle = '#718096';
    ctx.font = '10px monospace';
    ctx.fillText('20Hz', 5, height - 5);
    ctx.fillText('1kHz', width / 2 - 20, height - 5);
    ctx.fillText('20kHz', width - 40, height - 5);
  }, []);

  // Redraw visualizations when effects change
  useEffect(() => {
    if (showEQCurve) {
      drawEQCurve();
    }
  }, [showEQCurve, drawEQCurve, effectsSettings]);

  // Animate spectrum analyzer
  useEffect(() => {
    if (!showSpectrum || !isPlaying) return;

    const interval = setInterval(() => {
      drawSpectrum();
    }, 50); // 20 FPS

    return () => clearInterval(interval);
  }, [showSpectrum, isPlaying, drawSpectrum]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;

    // Create audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
      console.log('🎵 Audio loaded, duration:', audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.remove();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('❌ Playback error:', error);
      });
    }
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleSkipBackward = () => {
    const newTime = Math.max(0, currentTime - 5);
    handleSeek(newTime);
  };

  const handleSkipForward = () => {
    const newTime = Math.min(audioDuration, currentTime + 5);
    handleSeek(newTime);
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
            <Icon as={FiActivity} color="blue.500" />
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              🌊 Professional Waveform Editor
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
            {effectsSettings?.eq.enabled && (
              <Badge colorScheme="green" fontSize="xs">
                EQ Active
              </Badge>
            )}
          </HStack>
        </HStack>

        {/* Visualization Toggles */}
        <SimpleGrid columns={3} spacing={2}>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="spectrum" mb="0" fontSize="xs">
              Spectrum
            </FormLabel>
            <Switch
              id="spectrum"
              size="sm"
              isChecked={showSpectrum}
              onChange={(e) => setShowSpectrum(e.target.checked)}
              colorScheme="blue"
            />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="eqcurve" mb="0" fontSize="xs">
              EQ Curve
            </FormLabel>
            <Switch
              id="eqcurve"
              size="sm"
              isChecked={showEQCurve}
              onChange={(e) => setShowEQCurve(e.target.checked)}
              colorScheme="green"
            />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="compression" mb="0" fontSize="xs">
              Compression
            </FormLabel>
            <Switch
              id="compression"
              size="sm"
              isChecked={showCompression}
              onChange={(e) => setShowCompression(e.target.checked)}
              colorScheme="orange"
            />
          </FormControl>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {/* Main Waveform Display */}
          <Box>
            <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2}>
              Waveform
            </Text>
            <Box
              ref={waveformRef}
              h="200px"
              bg={panelBg}
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

                      // Show compression effect
                      const compressedHeight = showCompression && effectsSettings?.compressor.enabled
                        ? Math.min(height, 70) // Simulate compression reducing peaks
                        : height;

                      return (
                        <Box
                          key={i}
                          h={`${compressedHeight}%`}
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

                  {/* Compression indicator */}
                  {showCompression && effectsSettings?.compressor.enabled && (
                    <Box
                      position="absolute"
                      top="8px"
                      right="8px"
                      bg="orange.500"
                      color="whiteAlpha.900"
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                      fontWeight="600"
                    >
                      -{(Math.random() * 6).toFixed(1)} dB GR
                    </Box>
                  )}
                </>
              ) : (
                <VStack h="full" justify="center" align="center" spacing={2}>
                  <Icon as={FiMaximize2} boxSize={12} color={mutedColor} />
                  <Text fontSize="sm" color={mutedColor}>
                    Generate audio to see waveform
                  </Text>
                </VStack>
              )}
            </Box>
          </Box>

          {/* Frequency Spectrum Analyzer */}
          {showSpectrum && (
            <Box>
              <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2}>
                Frequency Spectrum
              </Text>
              <Box
                h="200px"
                bg={panelBg}
                borderRadius="md"
                position="relative"
                border="2px solid"
                borderColor={borderColor}
              >
                <canvas
                  ref={spectrumRef}
                  width={400}
                  height={200}
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            </Box>
          )}

          {/* EQ Curve Visualization */}
          {showEQCurve && effectsSettings?.eq.enabled && (
            <Box>
              <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2}>
                EQ Response Curve
              </Text>
              <Box
                h="200px"
                bg={panelBg}
                borderRadius="md"
                position="relative"
                border="2px solid"
                borderColor={borderColor}
              >
                <canvas
                  ref={eqCurveRef}
                  width={400}
                  height={200}
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            </Box>
          )}

          {/* Effects Status Panel */}
          <Box>
            <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2}>
              Effects Chain Status
            </Text>
            <Box
              p={3}
              bg={panelBg}
              borderRadius="md"
              border="2px solid"
              borderColor={borderColor}
              h="200px"
              overflowY="auto"
            >
              <VStack align="stretch" spacing={2}>
                {effectsSettings?.noiseGate.enabled && (
                  <HStack justify="space-between" fontSize="xs">
                    <Text color={textColor}>🛡️ Noise Gate</Text>
                    <Badge colorScheme="green">{effectsSettings.noiseGate.threshold} dB</Badge>
                  </HStack>
                )}
                {effectsSettings?.eq.enabled && (
                  <HStack justify="space-between" fontSize="xs">
                    <Text color={textColor}>🎚️ EQ</Text>
                    <Badge colorScheme="blue">Active</Badge>
                  </HStack>
                )}
                {effectsSettings?.compressor.enabled && (
                  <HStack justify="space-between" fontSize="xs">
                    <Text color={textColor}>🎛️ Compressor</Text>
                    <Badge colorScheme="orange">{effectsSettings.compressor.ratio}:1</Badge>
                  </HStack>
                )}
                {effectsSettings?.limiter.enabled && (
                  <HStack justify="space-between" fontSize="xs">
                    <Text color={textColor}>🔒 Limiter</Text>
                    <Badge colorScheme="red">{effectsSettings.limiter.ceiling} dB</Badge>
                  </HStack>
                )}
              </VStack>
            </Box>
          </Box>
        </SimpleGrid>

        {/* Timeline Controls */}
        {audioUrl && (
          <>
            {/* Playback Timeline */}
            <Box>
              <Slider
                value={currentTime}
                min={0}
                max={audioDuration}
                step={0.1}
                onChange={(val) => handleSeek(val)}
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
                    onClick={handleSkipBackward}
                  />
                </Tooltip>
                <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
                  <IconButton
                    icon={isPlaying ? <FiPause /> : <FiPlay />}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    onClick={handlePlayPause}
                    colorScheme="blue"
                    isDisabled={!audioUrl}
                  />
                </Tooltip>
                <Tooltip label="Skip forward 5s">
                  <IconButton
                    icon={<FiSkipForward />}
                    aria-label="Skip forward"
                    onClick={handleSkipForward}
                  />
                </Tooltip>
              </ButtonGroup>

              {/* Zoom & View Controls */}
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
                <Tooltip label="Fullscreen">
                  <IconButton
                    icon={<FiMaximize2 />}
                    aria-label="Fullscreen"
                    onClick={openFullscreen}
                    colorScheme="purple"
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
          </>
        )}
      </VStack>

      {/* Fullscreen Modal */}
      <Modal isOpen={isFullscreen} onClose={closeFullscreen} size="full">
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
        <ModalContent bg={bgColor} m={4}>
          <ModalHeader>
            <HStack justify="space-between">
              <HStack>
                <Icon as={FiActivity} color="blue.500" boxSize={6} />
                <Text>Waveform Editor - Fullscreen</Text>
              </HStack>
              <HStack spacing={2}>
                <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                  {formatTime(currentTime)} / {formatTime(audioDuration)}
                </Badge>
                <Badge colorScheme={isPlaying ? 'green' : 'gray'} fontSize="md" px={3} py={1}>
                  {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                </Badge>
              </HStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} h="calc(100vh - 150px)">
              {/* Large Waveform Display */}
              <Box
                flex={1}
                w="full"
                position="relative"
                bg={panelBg}
                borderRadius="lg"
                border="2px solid"
                borderColor={borderColor}
              >
                {audioUrl ? (
                  <>
                    {/* Waveform bars - larger for fullscreen */}
                    <Box
                      position="absolute"
                      top="50%"
                      left="0"
                      right="0"
                      h="80%"
                      transform="translateY(-50%)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap="3px"
                      px={6}
                    >
                      {Array.from({ length: 120 }).map((_, i) => {
                        const progress = currentTime / audioDuration;
                        const isPast = i / 120 < progress;
                        const amplitude = 0.3 + Math.sin(i * 0.1) * 0.4 + Math.random() * 0.3;

                        return (
                          <Box
                            key={i}
                            flex={1}
                            h={`${amplitude * 100}%`}
                            bg={isPast ? progressColor : waveColor}
                            borderRadius="sm"
                            transition="all 0.3s"
                            opacity={isPast ? 0.6 : 1}
                          />
                        );
                      })}
                    </Box>

                    {/* Current time indicator */}
                    <Box
                      position="absolute"
                      left={`${(currentTime / audioDuration) * 100}%`}
                      top="0"
                      bottom="0"
                      w="2px"
                      bg="red.500"
                      zIndex={2}
                      boxShadow="0 0 10px rgba(255,0,0,0.5)"
                    >
                      <Box
                        position="absolute"
                        top="50%"
                        left="50%"
                        transform="translate(-50%, -50%)"
                        w="12px"
                        h="12px"
                        borderRadius="full"
                        bg="red.500"
                        border="2px solid white"
                      />
                    </Box>
                  </>
                ) : (
                  <VStack h="full" justify="center">
                    <Icon as={FiMaximize2} boxSize={16} color={mutedColor} />
                    <Text fontSize="lg" color={mutedColor}>No audio loaded</Text>
                  </VStack>
                )}
              </Box>

              {/* Fullscreen Playback Controls */}
              <VStack spacing={4} w="full">
                <Slider
                  value={currentTime}
                  min={0}
                  max={audioDuration}
                  step={0.1}
                  onChange={(val) => handleSeek(val)}
                  colorScheme="blue"
                  size="lg"
                >
                  <SliderTrack h={2}>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>

                <HStack spacing={4}>
                  <ButtonGroup size="lg" variant="solid" spacing={3}>
                    <Button
                      leftIcon={<FiSkipBack />}
                      onClick={handleSkipBackward}
                      colorScheme="gray"
                    >
                      -5s
                    </Button>
                    <Button
                      leftIcon={isPlaying ? <FiPause /> : <FiPlay />}
                      onClick={handlePlayPause}
                      colorScheme={isPlaying ? 'red' : 'green'}
                      size="lg"
                      px={8}
                      isDisabled={!audioUrl}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      rightIcon={<FiSkipForward />}
                      onClick={handleSkipForward}
                      colorScheme="gray"
                    >
                      +5s
                    </Button>
                  </ButtonGroup>

                  <Button
                    leftIcon={<FiMinimize2 />}
                    onClick={closeFullscreen}
                    colorScheme="purple"
                    variant="outline"
                  >
                    Exit Fullscreen
                  </Button>
                </HStack>
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
