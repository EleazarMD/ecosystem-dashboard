import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Badge,
  Tooltip,
  Icon,
  SimpleGrid,
  useToast,
  Progress,
  Spinner,
} from '@chakra-ui/react';
import { FiZap, FiSliders, FiActivity, FiShield, FiInfo, FiCheck } from 'react-icons/fi';
import { EFFECTS_PRESETS, DEFAULT_EFFECTS } from '@/lib/audio-effects-presets';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EffectsSettings {
  noiseGate: {
    enabled: boolean;
    threshold: number;
  };
  eq: {
    enabled: boolean;
    lowCut: number;
    midBoost: number;
    highShelf: number;
  };
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  limiter: {
    enabled: boolean;
    ceiling: number;
  };
  normalize: boolean;
}

interface AudioEffectsRackProps {
  audioPath?: string; // Path to audio file to process
  settings: EffectsSettings;
  onSettingsChange: (settings: EffectsSettings) => void;
  onApplyPreset?: (preset: string) => void;
  onProcessingComplete?: (outputPath: string) => void;
}

export default function AudioEffectsRack({
  audioPath,
  settings,
  onSettingsChange,
  onApplyPreset,
  onProcessingComplete,
}: AudioEffectsRackProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const panelBg = useSemanticToken('surface.base');

  const updateSetting = (category: keyof EffectsSettings, key: string, value: any) => {
    const currentValue = settings[category];
    
    // Handle normalize separately (it's a boolean, not an object)
    if (category === 'normalize') {
      onSettingsChange({
        ...settings,
        normalize: value as boolean,
      });
      return;
    }
    
    // For object settings (noiseGate, eq, compressor, limiter)
    if (typeof currentValue === 'object' && currentValue !== null) {
      onSettingsChange({
        ...settings,
        [category]: {
          ...currentValue,
          [key]: value,
        },
      });
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = EFFECTS_PRESETS[presetId];
    if (preset) {
      onSettingsChange(preset);
      toast({
        title: `${presetId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} preset applied`,
        status: 'success',
        duration: 2000,
      });
    }
  };

  const processAudio = async () => {
    if (!audioPath) {
      toast({
        title: 'No audio file selected',
        description: 'Please select an audio file to process',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/podcast-studio/audio-jobs/apply-effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioPath,
          effects: settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process audio');
      }

      const result = await response.json();

      toast({
        title: '✅ Audio effects applied!',
        description: `Processed in ${result.processingTime}s`,
        status: 'success',
        duration: 5000,
      });

      if (onProcessingComplete) {
        onProcessingComplete(result.outputPath);
      }

    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: '❌ Processing failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const presets = [
    { id: 'clean-voice', name: 'Clean Voice', description: 'Minimal processing' },
    { id: 'radio-ready', name: 'Radio Ready', description: 'Professional broadcast sound' },
    { id: 'podcast-standard', name: 'Podcast Standard', description: 'Balanced for dialogue' },
    { id: 'loud-and-clear', name: 'Loud & Clear', description: 'Maximum presence' },
  ];

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
            <Icon as={FiZap} color="purple.500" />
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              Effects Rack
            </Text>
          </HStack>
          <Badge colorScheme="purple" fontSize="xs">
            Professional
          </Badge>
        </HStack>

        {/* Quick Presets */}
        <Box>
          <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={2}>
            Quick Presets
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {presets.map((preset) => (
              <Tooltip key={preset.id} label={preset.description}>
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.name}
                </Button>
              </Tooltip>
            ))}
          </HStack>
        </Box>

        {/* Processing Status */}
        {isProcessing && (
          <Box>
            <HStack spacing={2} mb={2}>
              <Spinner size="sm" color="purple.500" />
              <Text fontSize="sm" color={textColor}>Processing audio with FFmpeg...</Text>
            </HStack>
            <Progress size="xs" colorScheme="purple" isIndeterminate />
          </Box>
        )}

        {/* Apply Effects Button */}
        <Button
          leftIcon={<FiCheck />}
          colorScheme="purple"
          size="md"
          width="full"
          onClick={processAudio}
          isLoading={isProcessing}
          loadingText="Processing..."
          isDisabled={!audioPath || isProcessing}
        >
          Apply Effects to Audio
        </Button>

        {/* Normalize Toggle */}
        <Box
          p={3}
          bg={panelBg}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
        >
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="600" color={textColor}>
                Loudness Normalization
              </Text>
              <Text fontSize="xs" color={mutedColor}>
                Normalize to -16 LUFS (broadcast standard)
              </Text>
            </VStack>
            <Switch
              isChecked={settings.normalize}
              onChange={(e) => updateSetting('normalize', 'enabled', e.target.checked)}
              colorScheme="purple"
              size="lg"
            />
          </HStack>
        </Box>

        {/* Three-Panel Side-by-Side Effects Layout */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {/* Panel 1: Noise Gate & Limiter */}
          <Box
            p={4}
            bg={panelBg}
            borderRadius="md"
            border="1px solid"
            borderColor={borderColor}
          >
            <VStack align="stretch" spacing={4}>
              {/* Noise Gate */}
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={FiShield} color="green.500" />
                    <Text fontSize="sm" fontWeight="600">Noise Gate</Text>
                  </HStack>
                  <Switch
                    size="sm"
                    isChecked={settings.noiseGate.enabled}
                    onChange={(e) => updateSetting('noiseGate', 'enabled', e.target.checked)}
                    colorScheme="green"
                  />
                </HStack>
                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="xs" mb={0}>Threshold</FormLabel>
                    <Text fontSize="xs" color={mutedColor}>{settings.noiseGate.threshold} dB</Text>
                  </HStack>
                  <Slider
                    value={settings.noiseGate.threshold}
                    min={-60}
                    max={-10}
                    step={1}
                    onChange={(val) => updateSetting('noiseGate', 'threshold', val)}
                    colorScheme="green"
                    isDisabled={!settings.noiseGate.enabled}
                  >
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
              </VStack>

              {/* Limiter */}
              <VStack align="stretch" spacing={2} pt={2}>
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={FiShield} color="red.500" />
                    <Text fontSize="sm" fontWeight="600">Limiter</Text>
                  </HStack>
                  <Switch
                    size="sm"
                    isChecked={settings.limiter.enabled}
                    onChange={(e) => updateSetting('limiter', 'enabled', e.target.checked)}
                    colorScheme="red"
                  />
                </HStack>
                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="xs" mb={0}>Ceiling</FormLabel>
                    <Text fontSize="xs" color={mutedColor}>{settings.limiter.ceiling} dB</Text>
                  </HStack>
                  <Slider
                    value={settings.limiter.ceiling}
                    min={-3}
                    max={-0.1}
                    step={0.1}
                    onChange={(val) => updateSetting('limiter', 'ceiling', val)}
                    colorScheme="red"
                    isDisabled={!settings.limiter.enabled}
                  >
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
              </VStack>
            </VStack>
          </Box>

          {/* Panel 2: EQ */}
          <Box
            p={4}
            bg={panelBg}
            borderRadius="md"
            border="1px solid"
            borderColor={borderColor}
          >
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <Icon as={FiSliders} color="blue.500" />
                  <Text fontSize="sm" fontWeight="600">EQ (Equalizer)</Text>
                </HStack>
                <Switch
                  size="sm"
                  isChecked={settings.eq.enabled}
                  onChange={(e) => updateSetting('eq', 'enabled', e.target.checked)}
                  colorScheme="blue"
                />
              </HStack>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Low Cut (Rumble)</FormLabel>
                  <Text fontSize="xs" color={mutedColor}>{settings.eq.lowCut} Hz</Text>
                </HStack>
                <Slider
                  value={settings.eq.lowCut}
                  min={20}
                  max={150}
                  step={5}
                  onChange={(val) => updateSetting('eq', 'lowCut', val)}
                  colorScheme="blue"
                  isDisabled={!settings.eq.enabled}
                >
                  <SliderTrack><SliderFilledTrack /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Mid Boost (Presence)</FormLabel>
                  <Text fontSize="xs" color={mutedColor}>{settings.eq.midBoost} dB</Text>
                </HStack>
                <Slider
                  value={settings.eq.midBoost}
                  min={-6}
                  max={6}
                  step={0.5}
                  onChange={(val) => updateSetting('eq', 'midBoost', val)}
                  colorScheme="blue"
                  isDisabled={!settings.eq.enabled}
                >
                  <SliderTrack><SliderFilledTrack /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>High Shelf (Air)</FormLabel>
                  <Text fontSize="xs" color={mutedColor}>{settings.eq.highShelf} dB</Text>
                </HStack>
                <Slider
                  value={settings.eq.highShelf}
                  min={-6}
                  max={6}
                  step={0.5}
                  onChange={(val) => updateSetting('eq', 'highShelf', val)}
                  colorScheme="blue"
                  isDisabled={!settings.eq.enabled}
                >
                  <SliderTrack><SliderFilledTrack /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
            </VStack>
          </Box>

          {/* Panel 3: Compressor */}
          <Box
            p={4}
            bg={panelBg}
            borderRadius="md"
            border="1px solid"
            borderColor={borderColor}
          >
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <Icon as={FiActivity} color="orange.500" />
                  <Text fontSize="sm" fontWeight="600">Compressor</Text>
                </HStack>
                <Switch
                  size="sm"
                  isChecked={settings.compressor.enabled}
                  onChange={(e) => updateSetting('compressor', 'enabled', e.target.checked)}
                  colorScheme="orange"
                />
              </HStack>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Threshold</FormLabel>
                  <Text fontSize="xs" color={mutedColor}>{settings.compressor.threshold} dB</Text>
                </HStack>
                <Slider
                  value={settings.compressor.threshold}
                  min={-30}
                  max={-10}
                  step={1}
                  onChange={(val) => updateSetting('compressor', 'threshold', val)}
                  colorScheme="orange"
                  isDisabled={!settings.compressor.enabled}
                >
                  <SliderTrack><SliderFilledTrack /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <FormControl>
                <HStack justify="space-between">
                  <FormLabel fontSize="xs" mb={0}>Ratio</FormLabel>
                  <Text fontSize="xs" color={mutedColor}>{settings.compressor.ratio}:1</Text>
                </HStack>
                <Slider
                  value={settings.compressor.ratio}
                  min={1}
                  max={10}
                  step={0.5}
                  onChange={(val) => updateSetting('compressor', 'ratio', val)}
                  colorScheme="orange"
                  isDisabled={!settings.compressor.enabled}
                >
                  <SliderTrack><SliderFilledTrack /></SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>

              <HStack spacing={2}>
                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="xs" mb={0}>Attack</FormLabel>
                    <Text fontSize="xs" color={mutedColor}>{settings.compressor.attack}ms</Text>
                  </HStack>
                  <Slider
                    value={settings.compressor.attack}
                    min={1}
                    max={50}
                    step={1}
                    onChange={(val) => updateSetting('compressor', 'attack', val)}
                    colorScheme="orange"
                    size="sm"
                    isDisabled={!settings.compressor.enabled}
                  >
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>

                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel fontSize="xs" mb={0}>Release</FormLabel>
                    <Text fontSize="xs" color={mutedColor}>{settings.compressor.release}ms</Text>
                  </HStack>
                  <Slider
                    value={settings.compressor.release}
                    min={10}
                    max={300}
                    step={10}
                    onChange={(val) => updateSetting('compressor', 'release', val)}
                    colorScheme="orange"
                    size="sm"
                    isDisabled={!settings.compressor.enabled}
                  >
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                </FormControl>
              </HStack>
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
