/**
 * TTS Settings Panel - Reusable Component
 * 
 * Gemini TTS configuration for read-aloud features
 * Used in: Workspace AI, Podcast Studio, etc.
 */

import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  FormControl,
  FormLabel,
  Badge,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { FiVolume2, FiZap, FiTrendingUp } from 'react-icons/fi';
import { GEMINI_VOICES, type TTSProvider } from '../../types/tts-voices';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TTSSettingsPanelProps {
  voice: string;
  speed: number;
  pitch: number;
  model?: 'google-gemini-2.5-flash-preview-tts' | 'google-gemini-2.5-pro-preview-tts';
  onVoiceChange: (voice: string) => void;
  onSpeedChange: (speed: number) => void;
  onPitchChange: (pitch: number) => void;
  onModelChange?: (model: 'google-gemini-2.5-flash-preview-tts' | 'google-gemini-2.5-pro-preview-tts') => void;
}

export const TTSSettingsPanel: React.FC<TTSSettingsPanelProps> = ({
  voice,
  speed,
  pitch,
  model = 'google-gemini-2.5-flash-preview-tts',
  onVoiceChange,
  onSpeedChange,
  onPitchChange,
  onModelChange,
}) => {
  const bgColor = useSemanticToken('surface.base');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  return (
    <VStack align="stretch" spacing={4}>
      {/* Model Selection */}
      {onModelChange && (
        <FormControl>
          <FormLabel fontSize="sm" mb={2}>
            <HStack>
              <Icon as={FiZap} boxSize={3} />
              <Text>TTS Model</Text>
            </HStack>
          </FormLabel>
          <Select
            size="sm"
            value={model}
            onChange={(e) => onModelChange(e.target.value as any)}
            bg={bgColor}
            borderColor={borderColor}
          >
            <option value="google-gemini-2.5-pro-preview-tts">
              ⭐ Gemini 2.5 Pro - Premium Quality
            </option>
            <option value="google-gemini-2.5-flash-preview-tts">
              ⚡ Gemini 2.5 Flash - Fast & Efficient
            </option>
          </Select>
          <Text fontSize="xs" color={mutedColor} mt={1}>
            {model === 'google-gemini-2.5-pro-preview-tts' 
              ? 'Highest quality, natural-sounding voice'
              : 'Fast synthesis, lower latency'}
          </Text>
        </FormControl>
      )}

      {/* Voice Selection */}
      <FormControl>
        <FormLabel fontSize="sm" mb={2}>
          <HStack>
            <Icon as={FiVolume2} boxSize={3} />
            <Text>Voice</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={voice}
          onChange={(e) => onVoiceChange(e.target.value)}
          bg={bgColor}
          borderColor={borderColor}
        >
          {GEMINI_VOICES.map((voiceOption, index) => (
            <option key={`${voiceOption.id}-${index}`} value={voiceOption.id}>
              {voiceOption.name} - {voiceOption.description}
            </option>
          ))}
        </Select>
        <HStack spacing={2} mt={1}>
          {voice && GEMINI_VOICES.find(v => v.id === voice) && (
            <>
              <Badge size="xs" colorScheme="purple" variant="subtle" fontSize="xs">
                {GEMINI_VOICES.find(v => v.id === voice)?.gender}
              </Badge>
              <Badge size="xs" colorScheme="blue" variant="subtle" fontSize="xs">
                {GEMINI_VOICES.find(v => v.id === voice)?.accent}
              </Badge>
            </>
          )}
        </HStack>
      </FormControl>

      {/* Speaking Speed */}
      <FormControl>
        <FormLabel fontSize="sm" mb={2}>
          <HStack justify="space-between">
            <HStack>
              <Icon as={FiTrendingUp} boxSize={3} />
              <Text>Speaking Speed</Text>
            </HStack>
            <Badge variant="subtle" colorScheme="gray" fontSize="xs">
              {speed.toFixed(2)}x
            </Badge>
          </HStack>
        </FormLabel>
        <Slider
          value={speed}
          min={0.5}
          max={2.0}
          step={0.1}
          onChange={onSpeedChange}
        >
          <SliderTrack>
            <SliderFilledTrack bg="blue.400" />
          </SliderTrack>
          <SliderThumb boxSize={4} />
        </Slider>
        <HStack justify="space-between" fontSize="xs" color={mutedColor} mt={1}>
          <Text>Slower (0.5x)</Text>
          <Text>Normal (1.0x)</Text>
          <Text>Faster (2.0x)</Text>
        </HStack>
      </FormControl>

      {/* Pitch */}
      <FormControl>
        <FormLabel fontSize="sm" mb={2}>
          <HStack justify="space-between">
            <HStack>
              <Text>🎵</Text>
              <Text>Pitch</Text>
            </HStack>
            <Badge variant="subtle" colorScheme="gray" fontSize="xs">
              {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}
            </Badge>
          </HStack>
        </FormLabel>
        <Slider
          value={pitch}
          min={-20}
          max={20}
          step={1}
          onChange={onPitchChange}
        >
          <SliderTrack>
            <SliderFilledTrack bg="purple.400" />
          </SliderTrack>
          <SliderThumb boxSize={4} />
        </Slider>
        <HStack justify="space-between" fontSize="xs" color={mutedColor} mt={1}>
          <Text>Lower (-20)</Text>
          <Text>Normal (0)</Text>
          <Text>Higher (+20)</Text>
        </HStack>
      </FormControl>

      {/* Info */}
      <Text fontSize="xs" color={mutedColor} fontStyle="italic">
        💡 These settings apply to all read-aloud features
      </Text>
    </VStack>
  );
};
