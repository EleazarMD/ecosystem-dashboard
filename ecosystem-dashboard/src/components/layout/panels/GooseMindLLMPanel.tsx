/**
 * GooseMind LLM Settings Panel
 * Configure model, temperature, max tokens, and inference settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Badge,
  Button,
  Select,
  Divider,
  useToast,
  Spinner,
  Icon,
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { FiCpu, FiSave, FiRefreshCw, FiZap, FiThermometer, FiVolume2, FiSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useQwenTTS, VOICE_CATEGORIES } from '@/hooks/useQwenTTS';

// Use HTTPS via Tailscale
const GOOSE_MIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface LLMModel {
  id: string;
  name: string;
  endpoint: string;
  speed: string;
  quality: string;
}

interface LLMConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  base_url: string;
  embedding_model: string;
}

export default function GooseMindLLMPanel() {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');
  const borderColor = useSemanticToken('border.subtle');
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('american_female_warm');

  // TTS Hook
  const {
    speakWithProfile,
    playProfilePreview,
    stop,
    isSpeaking,
    isLoading: ttsLoading,
    currentVoice,
  } = useQwenTTS();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modelsRes, configRes] = await Promise.all([
        fetch(`${GOOSE_MIND_API}/llm/models`),
        fetch(`${GOOSE_MIND_API}/llm/config`),
      ]);
      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models || []);
      }
      if (configRes.ok) {
        setConfig(await configRes.json());
      }
    } catch (error) {
      console.error('Error fetching LLM data:', error);
      toast({ title: 'Failed to load LLM settings', status: 'error', duration: 2000 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const response = await fetch(`${GOOSE_MIND_API}/llm/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        toast({ title: 'LLM settings saved', status: 'success', duration: 2000 });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast({ title: 'Failed to save settings', status: 'error', duration: 2000 });
    }
    setSaving(false);
  };

  const switchModel = async (modelId: string) => {
    try {
      const response = await fetch(`${GOOSE_MIND_API}/llm/switch/${modelId}`, {
        method: 'POST',
      });
      if (response.ok) {
        setConfig(prev => prev ? { ...prev, model: modelId } : null);
        toast({ title: `Switched to ${modelId}`, status: 'success', duration: 2000 });
      }
    } catch (error) {
      toast({ title: 'Model switch failed', status: 'error', duration: 2000 });
    }
  };

  if (loading) {
    return (
      <VStack py={8} spacing={3}>
        <Spinner size="md" color="blue.400" />
        <Text fontSize="sm" color={textSecondary}>Loading LLM settings...</Text>
      </VStack>
    );
  }

  return (
    <Box h="full" overflowY="auto" p={4}>
      <VStack spacing={4} align="stretch">
        {/* Model Selection */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiCpu} color="blue.400" boxSize={4} />
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>Active Model</Text>
          </HStack>
          <Select
            size="sm"
            value={config?.model || ''}
            onChange={(e) => switchModel(e.target.value)}
            bg={bgSubtle}
            borderColor={borderColor}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.speed})
              </option>
            ))}
          </Select>
          {config?.model && (
            <HStack mt={2} spacing={2}>
              <Badge colorScheme="blue" fontSize="xs">{config.model}</Badge>
              <Badge colorScheme="green" fontSize="xs" variant="outline">
                {models.find(m => m.id === config.model)?.quality || 'Unknown'}
              </Badge>
            </HStack>
          )}
        </Box>

        <Divider borderColor={borderColor} />

        {/* Temperature */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Icon as={FiThermometer} color="orange.400" boxSize={4} />
              <Text fontSize="sm" fontWeight="medium" color={textPrimary}>Temperature</Text>
            </HStack>
            <Badge colorScheme="orange" fontSize="xs">{config?.temperature?.toFixed(2) || '0.70'}</Badge>
          </HStack>
          <Slider
            value={config?.temperature || 0.7}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => setConfig(prev => prev ? { ...prev, temperature: v } : null)}
          >
            <SliderTrack bg={bgSubtle}>
              <SliderFilledTrack bg="orange.400" />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color={textSecondary}>Precise</Text>
            <Text fontSize="xs" color={textSecondary}>Creative</Text>
          </HStack>
        </Box>

        {/* Max Tokens */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack>
              <Icon as={FiZap} color="purple.400" boxSize={4} />
              <Text fontSize="sm" fontWeight="medium" color={textPrimary}>Max Tokens</Text>
            </HStack>
          </HStack>
          <NumberInput
            size="sm"
            value={config?.max_tokens || 4096}
            min={256}
            max={32768}
            step={256}
            onChange={(_, v) => setConfig(prev => prev ? { ...prev, max_tokens: v } : null)}
          >
            <NumberInputField bg={bgSubtle} borderColor={borderColor} />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="xs" color={textSecondary} mt={1}>
            Maximum response length
          </Text>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Endpoint Info */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" color={textPrimary} mb={2}>Endpoints</Text>
          <VStack align="stretch" spacing={2} p={3} bg={bgSubtle} borderRadius="md">
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Chat API</Text>
              <Text fontSize="xs" color={textPrimary} fontFamily="mono">
                {config?.base_url || 'localhost:8007'}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Embeddings</Text>
              <Text fontSize="xs" color={textPrimary} fontFamily="mono">
                {config?.embedding_model || 'NV-Embed-v2'}
              </Text>
            </HStack>
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Read Aloud / TTS Settings */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiVolume2} color="green.400" boxSize={4} />
            <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>Read Aloud Voice</Text>
          </HStack>
          <Select
            size="sm"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            bg={bgSubtle}
            borderColor={borderColor}
            mb={2}
          >
            {Object.entries(VOICE_CATEGORIES).map(([category, voices]) => (
              <optgroup key={category} label={category}>
                {voices.map((voiceId) => (
                  <option key={voiceId} value={voiceId}>
                    {voiceId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
          
          <HStack spacing={2}>
            <Tooltip label={isSpeaking ? 'Stop playback' : 'Preview voice'}>
              <Button
                size="sm"
                flex={1}
                leftIcon={isSpeaking ? <FiSquare /> : <FiVolume2 />}
                colorScheme={isSpeaking ? 'red' : 'green'}
                variant={isSpeaking ? 'solid' : 'outline'}
                onClick={() => {
                  if (isSpeaking) {
                    stop();
                  } else {
                    playProfilePreview(selectedVoice).catch(() => {
                      toast({ title: 'Voice preview failed', status: 'error', duration: 2000 });
                    });
                  }
                }}
                isLoading={ttsLoading}
              >
                {isSpeaking ? 'Stop' : 'Preview Voice'}
              </Button>
            </Tooltip>
          </HStack>
          
          <Text fontSize="xs" color={textSecondary} mt={2}>
            Uses Qwen TTS for natural voice synthesis
          </Text>
        </Box>

        {/* Save Button */}
        <HStack pt={2}>
          <Button
            size="sm"
            leftIcon={<FiSave />}
            colorScheme="blue"
            onClick={saveConfig}
            isLoading={saving}
            flex={1}
          >
            Save Settings
          </Button>
          <Tooltip label="Refresh">
            <Button size="sm" variant="outline" onClick={fetchData}>
              <FiRefreshCw />
            </Button>
          </Tooltip>
        </HStack>
      </VStack>
    </Box>
  );
}
