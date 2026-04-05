/**
 * Voice Settings Panel for News Studio
 * 
 * Provides comprehensive voice configuration for news story audio generation:
 * - Voice selection mode (manual, rotation, random, category-based)
 * - TTS provider selection (Qwen, Gemini)
 * - Category-to-voice mapping
 * - Voice pool management
 * - Voice preview
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Select,
  Button,
  IconButton,
  Badge,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
  SimpleGrid,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
  useToast,
  Icon,
} from '@chakra-ui/react';
import { FiVolume2, FiPlay, FiPause, FiRefreshCw, FiCheck } from 'react-icons/fi';

// Voice selection modes
export type VoiceSelectionMode = 'manual' | 'rotation' | 'random' | 'category';

// TTS providers
export type TTSProvider = 'qwen' | 'gemini';

// Voice configuration interface
export interface VoiceConfig {
  enabled: boolean;
  provider: TTSProvider;
  selection_mode: VoiceSelectionMode;
  default_voice: string;
  voice_pool: string[];
  category_voices: Record<string, string[]>;
  settings: {
    temperature: number;
    speed: number;
    auto_generate: boolean;
  };
}

// Voice info from library
interface VoiceInfo {
  id: string;
  name: string;
  gender: string;
  accent: string;
  style: string;
  tone: string;
  use_cases: string[];
  provider: TTSProvider;
}

interface VoiceSettingsPanelProps {
  config: VoiceConfig;
  onChange: (config: VoiceConfig) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

const CATEGORIES = [
  { value: 'technology', label: 'Technology', color: 'cyan' },
  { value: 'science', label: 'Science', color: 'purple' },
  { value: 'business', label: 'Business', color: 'blue' },
  { value: 'politics', label: 'Politics', color: 'red' },
  { value: 'healthcare', label: 'Healthcare', color: 'green' },
];

const SELECTION_MODES = [
  { value: 'manual', label: 'Manual', description: 'Use the default voice for all stories' },
  { value: 'rotation', label: 'Rotation', description: 'Cycle through voices in order per category' },
  { value: 'random', label: 'Random', description: 'Randomly select from voice pool' },
  { value: 'category', label: 'Category-Based', description: 'Use specific voices for each category' },
];

export default function VoiceSettingsPanel({
  config,
  onChange,
  onSave,
  isSaving,
}: VoiceSettingsPanelProps) {
  const [qwenVoices, setQwenVoices] = useState<VoiceInfo[]>([]);
  const [geminiVoices, setGeminiVoices] = useState<VoiceInfo[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toast = useToast();

  // Fetch available voices
  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    try {
      // Fetch Qwen voices
      const qwenRes = await fetch('/api/ai-gateway/qwen-tts?action=library-voices');
      if (qwenRes.ok) {
        const data = await qwenRes.json();
        const voices = Object.entries(data.library_voices || {}).map(([id, info]: [string, any]) => ({
          id,
          name: info.name || id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          gender: info.gender || 'unknown',
          accent: info.accent || 'American',
          style: info.style || 'neutral',
          tone: info.tone || '',
          use_cases: info.use_cases || [],
          provider: 'qwen' as TTSProvider,
        }));
        // Filter out Mexican/Spanish voices for English news
        const englishVoices = voices.filter(v => !v.id.startsWith('mexican_') && !v.id.startsWith('spanish_'));
        setQwenVoices(englishVoices);
      }

      // Fetch Gemini voices (from preset voices)
      const geminiRes = await fetch('/api/ai-gateway/qwen-tts?action=preset-voices');
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const voices = Object.entries(data.presets || {})
          .filter(([_, info]: [string, any]) => info.source === 'gemini-tts')
          .map(([id, info]: [string, any]) => ({
            id,
            name: info.name || id,
            gender: info.gender || 'unknown',
            accent: info.accent || 'American',
            style: info.style || 'neutral',
            tone: info.tone || '',
            use_cases: info.use_cases || [],
            provider: 'gemini' as TTSProvider,
          }));
        setGeminiVoices(voices);
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      toast({
        title: 'Failed to load voices',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const availableVoices = config.provider === 'qwen' ? qwenVoices : geminiVoices;

  const handleConfigChange = (path: string, value: any) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  const handleVoicePoolToggle = (voiceId: string) => {
    const pool = config.voice_pool || [];
    const newPool = pool.includes(voiceId)
      ? pool.filter(v => v !== voiceId)
      : [...pool, voiceId];
    handleConfigChange('voice_pool', newPool);
  };

  const handleCategoryVoiceToggle = (category: string, voiceId: string) => {
    const categoryVoices = config.category_voices || {};
    const voices = categoryVoices[category] || [];
    const newVoices = voices.includes(voiceId)
      ? voices.filter(v => v !== voiceId)
      : [...voices, voiceId];
    handleConfigChange('category_voices', {
      ...categoryVoices,
      [category]: newVoices,
    });
  };

  const handlePreviewVoice = async (voiceId: string) => {
    if (isPlaying && playingVoice === voiceId) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voiceId);
    setIsPlaying(true);

    try {
      const response = await fetch('/api/ai-gateway/qwen-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          voice_id: voiceId,
          text: 'This is a preview of the voice for news story narration.',
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setPlayingVoice(null);
            URL.revokeObjectURL(url);
          };
        }
      } else {
        throw new Error('Preview failed');
      }
    } catch (error) {
      toast({
        title: 'Preview failed',
        description: 'Could not generate voice preview',
        status: 'error',
        duration: 3000,
      });
      setIsPlaying(false);
      setPlayingVoice(null);
    }
  };

  const getVoicesByGender = (gender: string) => 
    availableVoices.filter(v => v.gender.toLowerCase() === gender.toLowerCase());

  return (
    <VStack spacing={6} align="stretch">
      <audio ref={audioRef} />

      {/* Enable/Disable Audio */}
      <FormControl display="flex" alignItems="center">
        <FormLabel mb={0} fontWeight="semibold">Enable Audio Generation</FormLabel>
        <Switch
          isChecked={config.enabled}
          onChange={(e) => handleConfigChange('enabled', e.target.checked)}
          colorScheme="blue"
        />
      </FormControl>

      {config.enabled && (
        <>
          <Divider />

          {/* TTS Provider Selection */}
          <Box>
            <Heading size="sm" mb={3}>TTS Provider</Heading>
            <SimpleGrid columns={2} spacing={3}>
              <Box
                p={4}
                borderRadius="md"
                border="2px solid"
                borderColor={config.provider === 'qwen' ? 'blue.500' : 'gray.200'}
                bg={config.provider === 'qwen' ? 'blue.50' : 'white'}
                cursor="pointer"
                onClick={() => handleConfigChange('provider', 'qwen')}
                _hover={{ borderColor: 'blue.300' }}
              >
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">Qwen TTS</Text>
                    <Text fontSize="sm" color="gray.600">Local, high quality</Text>
                  </VStack>
                  {config.provider === 'qwen' && <Icon as={FiCheck} color="blue.500" />}
                </HStack>
              </Box>
              <Box
                p={4}
                borderRadius="md"
                border="2px solid"
                borderColor={config.provider === 'gemini' ? 'blue.500' : 'gray.200'}
                bg={config.provider === 'gemini' ? 'blue.50' : 'white'}
                cursor="pointer"
                onClick={() => handleConfigChange('provider', 'gemini')}
                _hover={{ borderColor: 'blue.300' }}
              >
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="bold">Gemini TTS</Text>
                    <Text fontSize="sm" color="gray.600">Cloud, expressive</Text>
                  </VStack>
                  {config.provider === 'gemini' && <Icon as={FiCheck} color="blue.500" />}
                </HStack>
              </Box>
            </SimpleGrid>
          </Box>

          <Divider />

          {/* Voice Selection Mode */}
          <Box>
            <Heading size="sm" mb={3}>Voice Selection Mode</Heading>
            <Select
              value={config.selection_mode}
              onChange={(e) => handleConfigChange('selection_mode', e.target.value)}
            >
              {SELECTION_MODES.map(mode => (
                <option key={mode.value} value={mode.value}>
                  {mode.label} - {mode.description}
                </option>
              ))}
            </Select>
          </Box>

          <Divider />

          {/* Mode-specific configuration */}
          {config.selection_mode === 'manual' && (
            <Box>
              <Heading size="sm" mb={3}>Default Voice</Heading>
              {isLoadingVoices ? (
                <Spinner size="sm" />
              ) : (
                <Select
                  value={config.default_voice}
                  onChange={(e) => handleConfigChange('default_voice', e.target.value)}
                  placeholder="Select a voice"
                >
                  <optgroup label="Male Voices">
                    {getVoicesByGender('male').map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.accent})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Female Voices">
                    {getVoicesByGender('female').map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.accent})
                      </option>
                    ))}
                  </optgroup>
                </Select>
              )}
              {config.default_voice && (
                <Button
                  size="sm"
                  mt={2}
                  leftIcon={<Icon as={isPlaying && playingVoice === config.default_voice ? FiPause : FiPlay} />}
                  onClick={() => handlePreviewVoice(config.default_voice)}
                  isLoading={isPlaying && playingVoice === config.default_voice}
                >
                  Preview
                </Button>
              )}
            </Box>
          )}

          {(config.selection_mode === 'rotation' || config.selection_mode === 'random') && (
            <Box>
              <Heading size="sm" mb={3}>Voice Pool</Heading>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Select voices to include in {config.selection_mode === 'rotation' ? 'rotation' : 'random selection'}
              </Text>
              {isLoadingVoices ? (
                <Spinner size="sm" />
              ) : (
                <Accordion allowMultiple>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="medium">Male Voices ({getVoicesByGender('male').length})</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel>
                      <Wrap spacing={2}>
                        {getVoicesByGender('male').map(voice => (
                          <WrapItem key={voice.id}>
                            <Tag
                              size="md"
                              variant={config.voice_pool?.includes(voice.id) ? 'solid' : 'outline'}
                              colorScheme="blue"
                              cursor="pointer"
                              onClick={() => handleVoicePoolToggle(voice.id)}
                            >
                              <TagLabel>{voice.name}</TagLabel>
                              {config.voice_pool?.includes(voice.id) && (
                                <TagCloseButton onClick={(e) => {
                                  e.stopPropagation();
                                  handleVoicePoolToggle(voice.id);
                                }} />
                              )}
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </AccordionPanel>
                  </AccordionItem>
                  <AccordionItem>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Text fontWeight="medium">Female Voices ({getVoicesByGender('female').length})</Text>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel>
                      <Wrap spacing={2}>
                        {getVoicesByGender('female').map(voice => (
                          <WrapItem key={voice.id}>
                            <Tag
                              size="md"
                              variant={config.voice_pool?.includes(voice.id) ? 'solid' : 'outline'}
                              colorScheme="pink"
                              cursor="pointer"
                              onClick={() => handleVoicePoolToggle(voice.id)}
                            >
                              <TagLabel>{voice.name}</TagLabel>
                              {config.voice_pool?.includes(voice.id) && (
                                <TagCloseButton onClick={(e) => {
                                  e.stopPropagation();
                                  handleVoicePoolToggle(voice.id);
                                }} />
                              )}
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              )}
              <Text fontSize="sm" color="gray.500" mt={2}>
                {config.voice_pool?.length || 0} voices selected
              </Text>
            </Box>
          )}

          {config.selection_mode === 'category' && (
            <Box>
              <Heading size="sm" mb={3}>Category Voice Mapping</Heading>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Assign specific voices to each news category
              </Text>
              {isLoadingVoices ? (
                <Spinner size="sm" />
              ) : (
                <Accordion allowMultiple>
                  {CATEGORIES.map(category => (
                    <AccordionItem key={category.value}>
                      <AccordionButton>
                        <HStack flex="1">
                          <Badge colorScheme={category.color}>{category.label}</Badge>
                          <Text fontSize="sm" color="gray.500">
                            ({config.category_voices?.[category.value]?.length || 0} voices)
                          </Text>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel>
                        <Wrap spacing={2}>
                          {availableVoices.map(voice => (
                            <WrapItem key={voice.id}>
                              <Tag
                                size="sm"
                                variant={config.category_voices?.[category.value]?.includes(voice.id) ? 'solid' : 'outline'}
                                colorScheme={category.color}
                                cursor="pointer"
                                onClick={() => handleCategoryVoiceToggle(category.value, voice.id)}
                              >
                                <TagLabel>{voice.name}</TagLabel>
                              </Tag>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </Box>
          )}

          <Divider />

          {/* Voice Settings */}
          <Box>
            <Heading size="sm" mb={3}>Voice Settings</Heading>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Temperature: {config.settings?.temperature?.toFixed(1) || 0.4}</FormLabel>
                <Slider
                  value={config.settings?.temperature || 0.4}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  onChange={(val) => handleConfigChange('settings.temperature', val)}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <FormHelperText>Lower = more consistent, Higher = more expressive</FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Speed: {config.settings?.speed?.toFixed(1) || 1.0}x</FormLabel>
                <Slider
                  value={config.settings?.speed || 1.0}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onChange={(val) => handleConfigChange('settings.speed', val)}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Auto-generate audio for new stories</FormLabel>
                <Switch
                  isChecked={config.settings?.auto_generate || false}
                  onChange={(e) => handleConfigChange('settings.auto_generate', e.target.checked)}
                />
              </FormControl>
            </VStack>
          </Box>

          {onSave && (
            <>
              <Divider />
              <Button
                colorScheme="blue"
                onClick={onSave}
                isLoading={isSaving}
                leftIcon={<Icon as={FiCheck} />}
              >
                Save Voice Settings
              </Button>
            </>
          )}
        </>
      )}
    </VStack>
  );
}

// Default voice configuration
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  provider: 'qwen',
  selection_mode: 'category',
  default_voice: 'american_male_anchor',
  voice_pool: [
    'american_male_anchor',
    'american_female_confident',
    'american_male_narrator',
    'british_female_sophisticated',
  ],
  category_voices: {
    technology: ['american_male_anchor', 'american_female_confident', 'american_male_narrator', 'american_male_executive'],
    science: ['american_male_narrator', 'british_female_sophisticated', 'american_female_confident', 'american_male_refined'],
    business: ['american_male_executive', 'british_female_sophisticated', 'american_male_anchor', 'british_female_anchor'],
    politics: ['british_female_sophisticated', 'american_male_anchor', 'american_male_narrator', 'american_male_executive'],
    healthcare: ['american_female_warm', 'american_male_executive', 'british_female_sophisticated', 'american_male_narrator'],
  },
  settings: {
    temperature: 0.4,
    speed: 1.0,
    auto_generate: false,
  },
};
