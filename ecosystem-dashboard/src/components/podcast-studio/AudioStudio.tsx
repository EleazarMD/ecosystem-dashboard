import React, { useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  IconButton,
  useToast,
  Progress,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  FormControl,
  FormLabel,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiDownload, FiArrowLeft, FiMusic, FiSettings, FiCheck } from 'react-icons/fi';
import { PodcastProject } from '../../pages/podcast-studio';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AudioStudioProps {
  project: PodcastProject;
  onUpdate: (project: PodcastProject) => void;
  onGenerationProgress: (progress: number) => void;
  onBack: () => void;
}

export default function AudioStudio({ project, onUpdate, onGenerationProgress, onBack }: AudioStudioProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [backgroundMusic, setBackgroundMusic] = useState(true);
  const [musicVolume, setMusicVolume] = useState(20);
  const toast = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const waveformBg = useSemanticToken('surface.highlight');

  const totalDuration = project.script.reduce((sum, turn) => sum + (turn.duration || 0), 0);
  const estimatedCost = (totalDuration / 600) * 0.0075; // ~$0.0075 per 10 min

  const handleGenerate = async () => {
    setIsGenerating(true);
    onUpdate({ ...project, status: 'generating' });
    
    // Simulate generation with progress updates
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      onGenerationProgress(i);
    }

    // Simulate audio URL
    onUpdate({
      ...project,
      audioUrl: 'https://example.com/podcast.mp3',
      status: 'ready',
    });

    setIsGenerating(false);
    onGenerationProgress(0);
    
    toast({
      title: 'Podcast generated!',
      description: 'Your podcast is ready to preview and download',
      status: 'success',
      duration: 5000,
    });
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleExport = (format: string) => {
    toast({
      title: `Exporting as ${format}`,
      description: 'Your podcast will download shortly',
      status: 'info',
      duration: 3000,
    });
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <Text fontSize="2xl" fontWeight="bold">
            Generate Audio
          </Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Create your podcast with Gemini 2.5 neural voices
          </Text>
        </VStack>
        <VStack align="end" spacing={0}>
          <Text fontSize="sm" fontWeight="medium">
            ~{Math.ceil(totalDuration / 60)} min podcast
          </Text>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
            Est. cost: ${estimatedCost.toFixed(4)}
          </Text>
        </VStack>
      </HStack>

      {/* Generation Settings */}
      {!project.audioUrl && (
        <Box p={6} bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
          <VStack spacing={6} align="stretch">
            <Text fontSize="lg" fontWeight="bold">
              Audio Settings
            </Text>

            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Background Music</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Add subtle music to enhance the podcast
                </Text>
              </VStack>
              <Switch
                size="lg"
                colorScheme="purple"
                isChecked={backgroundMusic}
                onChange={(e) => setBackgroundMusic(e.target.checked)}
              />
            </HStack>

            {backgroundMusic && (
              <FormControl>
                <FormLabel>Music Volume: {musicVolume}%</FormLabel>
                <Slider
                  value={musicVolume}
                  onChange={setMusicVolume}
                  min={0}
                  max={50}
                  step={5}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="purple.400" />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>
              </FormControl>
            )}

            <Box pt={2}>
              <Button
                leftIcon={<FiMusic />}
                rightIcon={isGenerating ? undefined : <FiCheck />}
                colorScheme="purple"
                size="lg"
                width="full"
                onClick={handleGenerate}
                isLoading={isGenerating}
                loadingText="Generating Audio..."
              >
                Generate Podcast Audio
              </Button>
            </Box>

            {/* Generation Info */}
            <Box p={4} bg={waveformBg} borderRadius="md">
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Text fontSize="sm" fontWeight="medium">
                    🎙️ {project.hosts.length} neural voices
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    💬 {project.script.length} conversation turns
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    ⚡ Gemini 2.5 Flash TTS
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    ⏱️ ~{Math.ceil(totalDuration / 20)}s generation time
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </Box>
      )}

      {/* Audio Player */}
      {project.audioUrl && (
        <VStack spacing={4} align="stretch">
          <Box p={6} bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
            <VStack spacing={6} align="stretch">
              {/* Waveform Visualization */}
              <Box
                h="120px"
                bg={waveformBg}
                borderRadius="md"
                position="relative"
                overflow="hidden"
              >
                <HStack h="full" align="end" justify="space-around" spacing={1} px={4}>
                  {Array.from({ length: 50 }).map((_, i) => (
                    <Box
                      key={i}
                      bg="purple.400"
                      width="4px"
                      height={`${Math.random() * 80 + 20}%`}
                      borderRadius="full"
                      transition="all 0.2s"
                      opacity={isPlaying && i < (currentTime / totalDuration) * 50 ? 1 : 0.3}
                    />
                  ))}
                </HStack>
              </Box>

              {/* Playback Controls */}
              <VStack spacing={4} align="stretch">
                <HStack justify="center" spacing={4}>
                  <IconButton
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    icon={isPlaying ? <FiPause /> : <FiPlay />}
                    size="lg"
                    colorScheme="purple"
                    borderRadius="full"
                    onClick={handlePlayPause}
                  />
                </HStack>

                <HStack justify="space-between" fontSize="sm" color={useSemanticToken('text.secondary')}>
                  <Text>0:00</Text>
                  <Text>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</Text>
                </HStack>

                <Progress value={(currentTime / totalDuration) * 100} colorScheme="purple" borderRadius="full" />
              </VStack>

              {/* Export Options */}
              <HStack spacing={3}>
                <Menu>
                  <MenuButton
                    as={Button}
                    leftIcon={<FiDownload />}
                    colorScheme="purple"
                    flex={1}
                  >
                    Export Podcast
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => handleExport('MP3')}>
                      🎵 MP3 Audio
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('WAV')}>
                      🎼 WAV Audio (High Quality)
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('Transcript')}>
                      📄 Transcript (SRT)
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('Show Notes')}>
                      📝 Show Notes (Markdown)
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('All')}>
                      📦 Complete Package (All Formats)
                    </MenuItem>
                  </MenuList>
                </Menu>

                <IconButton
                  aria-label="Settings"
                  icon={<FiSettings />}
                  variant="outline"
                  onClick={() => toast({ title: 'Settings coming soon', status: 'info' })}
                />
              </HStack>
            </VStack>
          </Box>

          {/* Success Message */}
          <Box p={4} bg="green.50" borderLeftWidth="4px" borderLeftColor="green.400" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={FiCheck} color="green.500" boxSize={5} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" color="green.700">
                  Podcast ready!
                </Text>
                <Text fontSize="sm" color="green.600">
                  Your {Math.ceil(totalDuration / 60)}-minute podcast with {project.hosts.length} AI hosts is ready to share
                </Text>
              </VStack>
            </HStack>
          </Box>
        </VStack>
      )}

      {/* Navigation */}
      <HStack justify="space-between">
        <Button
          leftIcon={<FiArrowLeft />}
          variant="ghost"
          onClick={onBack}
        >
          Back to Script
        </Button>
        {project.audioUrl && (
          <Button
            leftIcon={<FiDownload />}
            colorScheme="green"
            size="lg"
            onClick={() => handleExport('All')}
          >
            Download Complete Package
          </Button>
        )}
      </HStack>

      {/* Hidden Audio Element */}
      {project.audioUrl && (
        <audio
          ref={audioRef}
          src={project.audioUrl}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </VStack>
  );
}
