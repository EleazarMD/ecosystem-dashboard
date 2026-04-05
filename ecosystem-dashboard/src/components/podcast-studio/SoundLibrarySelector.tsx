import React, { useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Badge,
  Icon,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Collapse,
  Button,
  Tooltip,
} from '@chakra-ui/react';
import { FiMusic, FiVolume2, FiPlay, FiPause, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { INTRO_ASSETS, OUTRO_ASSETS, type AudioAsset, type ProductionConfig } from '@/lib/sound-library';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SoundLibrarySelectorProps {
  value: ProductionConfig;
  onChange: (config: ProductionConfig) => void;
}

export default function SoundLibrarySelector({ value, onChange }: SoundLibrarySelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<'intro' | 'outro' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const handlePreview = (asset: AudioAsset, type: 'intro' | 'outro') => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // If clicking the same button, just stop
    if (playingAudio === type) {
      setPlayingAudio(null);
      return;
    }

    // Play new audio
    const audio = new Audio(asset.filePath);
    audio.volume = type === 'intro' ? (value.introVolume || 0.4) : (value.outroVolume || 0.4);
    audio.onended = () => {
      setPlayingAudio(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      console.error('Failed to load audio:', asset.filePath);
      setPlayingAudio(null);
      audioRef.current = null;
    };
    
    audioRef.current = audio;
    setPlayingAudio(type);
    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
      setPlayingAudio(null);
    });
  };

  const handleIntroChange = (assetId: string) => {
    onChange({
      ...value,
      introAssetId: assetId || undefined
    });
  };

  const handleOutroChange = (assetId: string) => {
    onChange({
      ...value,
      outroAssetId: assetId || undefined
    });
  };

  const selectedIntro = INTRO_ASSETS.find(a => a.id === value.introAssetId);
  const selectedOutro = OUTRO_ASSETS.find(a => a.id === value.outroAssetId);

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      p={4}
    >
      <HStack justify="space-between" mb={isExpanded ? 3 : 0}>
        <HStack>
          <Icon as={FiMusic} color="purple.500" boxSize={5} />
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              🎵 Production Music
            </Text>
            {(selectedIntro || selectedOutro) && !isExpanded && (
              <Text fontSize="xs" color={mutedColor}>
                {selectedIntro && `Intro: ${selectedIntro.name}`}
                {selectedIntro && selectedOutro && ' • '}
                {selectedOutro && `Outro: ${selectedOutro.name}`}
              </Text>
            )}
          </VStack>
        </HStack>
        <IconButton
          aria-label="Toggle production music"
          icon={<Icon as={isExpanded ? FiChevronUp : FiChevronDown} />}
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
        />
      </HStack>

      <Collapse in={isExpanded} animateOpacity>
        <VStack spacing={4} align="stretch">
          {/* Intro Music */}
          <Box>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" mb={1}>
                🎬 Intro Music
              </FormLabel>
              <Select
                size="sm"
                fontSize="xs"
                value={value.introAssetId || ''}
                onChange={(e) => handleIntroChange(e.target.value)}
                placeholder="None"
              >
                {INTRO_ASSETS.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.duration}s) - {asset.mood}
                  </option>
                ))}
              </Select>
            </FormControl>

            {selectedIntro && (
              <VStack align="stretch" spacing={2} mt={2} pl={2}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color={mutedColor}>
                    {selectedIntro.description}
                  </Text>
                  <Tooltip label={playingAudio === 'intro' ? 'Stop' : 'Preview'}>
                    <IconButton
                      aria-label="Preview intro"
                      icon={<Icon as={playingAudio === 'intro' ? FiPause : FiPlay} />}
                      size="xs"
                      colorScheme={playingAudio === 'intro' ? 'red' : 'purple'}
                      variant="ghost"
                      onClick={() => handlePreview(selectedIntro, 'intro')}
                    />
                  </Tooltip>
                </HStack>
                {/* Placement selector */}
                <FormControl>
                  <FormLabel fontSize="xs" mb={1} color={mutedColor}>Placement:</FormLabel>
                  <Select
                    size="sm"
                    fontSize="xs"
                    value={value.introPlacement || 'after-greeting'}
                    onChange={(e) => onChange({ ...value, introPlacement: e.target.value as any })}
                  >
                    <option value="after-greeting">🎙️ After Host Greeting (fades in under setup)</option>
                    <option value="before">🎵 Before Speech (traditional)</option>
                  </Select>
                </FormControl>

                <HStack spacing={4}>
                  <HStack flex={1}>
                    <Icon as={FiVolume2} boxSize={3} color={mutedColor} />
                    <Text fontSize="xs" color={mutedColor}>Volume:</Text>
                    <Slider
                      value={(value.introVolume || 0.4) * 100}
                      onChange={(val) => onChange({ ...value, introVolume: val / 100 })}
                      min={0}
                      max={100}
                      size="sm"
                    >
                      <SliderTrack>
                        <SliderFilledTrack bg="purple.400" />
                      </SliderTrack>
                      <SliderThumb boxSize={3} />
                    </Slider>
                    <Text fontSize="xs" color={mutedColor} minW="35px">
                      {Math.round((value.introVolume || 0.4) * 100)}%
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontSize="xs" color={mutedColor}>Fade In:</Text>
                    <Switch
                      size="sm"
                      isChecked={value.introFadeIn !== false}
                      onChange={(e) => onChange({ ...value, introFadeIn: e.target.checked })}
                    />
                  </HStack>
                </HStack>

                {/* Fade duration (only for after-greeting mode) */}
                {(value.introPlacement || 'after-greeting') === 'after-greeting' && (
                  <HStack>
                    <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">Fade Duration:</Text>
                    <Slider
                      value={value.introFadeDurationMs || 3000}
                      onChange={(val) => onChange({ ...value, introFadeDurationMs: val })}
                      min={1000}
                      max={8000}
                      step={500}
                      size="sm"
                    >
                      <SliderTrack>
                        <SliderFilledTrack bg="purple.400" />
                      </SliderTrack>
                      <SliderThumb boxSize={3} />
                    </Slider>
                    <Text fontSize="xs" color={mutedColor} minW="35px">
                      {((value.introFadeDurationMs || 3000) / 1000).toFixed(1)}s
                    </Text>
                  </HStack>
                )}

                {(value.introPlacement || 'after-greeting') === 'after-greeting' && (
                  <Text fontSize="9px" color={mutedColor} fontStyle="italic">
                    Turn 1 plays clean, then music fades in under the conversation setup
                  </Text>
                )}
              </VStack>
            )}
          </Box>

          {/* Outro Music */}
          <Box>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="600" mb={1}>
                🎬 Outro Music
              </FormLabel>
              <Select
                size="sm"
                fontSize="xs"
                value={value.outroAssetId || ''}
                onChange={(e) => handleOutroChange(e.target.value)}
                placeholder="None"
              >
                {OUTRO_ASSETS.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.duration}s) - {asset.mood}
                  </option>
                ))}
              </Select>
            </FormControl>

            {selectedOutro && (
              <VStack align="stretch" spacing={2} mt={2} pl={2}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color={mutedColor}>
                    {selectedOutro.description}
                  </Text>
                  <Tooltip label={playingAudio === 'outro' ? 'Stop' : 'Preview'}>
                    <IconButton
                      aria-label="Preview outro"
                      icon={<Icon as={playingAudio === 'outro' ? FiPause : FiPlay} />}
                      size="xs"
                      colorScheme={playingAudio === 'outro' ? 'red' : 'purple'}
                      variant="ghost"
                      onClick={() => handlePreview(selectedOutro, 'outro')}
                    />
                  </Tooltip>
                </HStack>
                <HStack spacing={4}>
                  <HStack flex={1}>
                    <Icon as={FiVolume2} boxSize={3} color={mutedColor} />
                    <Text fontSize="xs" color={mutedColor}>Volume:</Text>
                    <Slider
                      value={(value.outroVolume || 0.4) * 100}
                      onChange={(val) => onChange({ ...value, outroVolume: val / 100 })}
                      min={0}
                      max={100}
                      size="sm"
                    >
                      <SliderTrack>
                        <SliderFilledTrack bg="purple.400" />
                      </SliderTrack>
                      <SliderThumb boxSize={3} />
                    </Slider>
                    <Text fontSize="xs" color={mutedColor} minW="35px">
                      {Math.round((value.outroVolume || 0.4) * 100)}%
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontSize="xs" color={mutedColor}>Fade Out:</Text>
                    <Switch
                      size="sm"
                      isChecked={value.outroFadeOut !== false}
                      onChange={(e) => onChange({ ...value, outroFadeOut: e.target.checked })}
                    />
                  </HStack>
                </HStack>
              </VStack>
            )}
          </Box>

          {/* Info Badge */}
          <Badge colorScheme="blue" fontSize="9px" p={2}>
            💡 Tip: Intro/outro music will be automatically added to your podcast audio
          </Badge>
        </VStack>
      </Collapse>
    </Box>
  );
}
