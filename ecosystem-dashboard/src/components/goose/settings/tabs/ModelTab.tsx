/**
 * Model Tab Component
 * 
 * Allows users to select LLM model, adjust temperature, max tokens, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Select, FormControl, FormLabel,
  Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Input, Badge, Tooltip, Icon, Spinner,
  Alert, AlertIcon, AlertDescription,
} from '@chakra-ui/react';
import { FiZap, FiDollarSign, FiInfo } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ModelTabProps {
  agentId: string;
  value: {
    model: string;
    provider: string;
    temperature: number;
    maxTokens: number;
  };
  onChange: (value: any) => void;
}

interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  costPerRequest: string;
  inputCost: string;
  outputCost: string;
  isAvailable: boolean;
  description?: string;
}

export default function ModelTab({ agentId, value, onChange }: ModelTabProps) {
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = 'blue.500';

  // Load available models
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goose/available-models');
      
      if (!response.ok) {
        throw new Error('Failed to load models');
      }
      
      const data = await response.json();
      setModels(data.models);
      setError(null);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const selectedModel = models.find(m => m.id === value.model);

  const handleModelChange = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      onChange({
        ...value,
        model: modelId,
        provider: model.provider,
      });
    }
  };

  const handleTemperatureChange = (temp: number) => {
    onChange({ ...value, temperature: temp });
  };

  const handleMaxTokensChange = (tokens: string) => {
    const parsed = parseInt(tokens, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onChange({ ...value, maxTokens: parsed });
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" color={accentColor} />
        <Text mt={4} color={mutedColor}>Loading available models...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Model Selection */}
      <FormControl>
        <FormLabel display="flex" alignItems="center" gap={2}>
          <Icon as={FiZap} />
          <Text>LLM Model</Text>
        </FormLabel>
        <Select
          value={value.model}
          onChange={(e) => handleModelChange(e.target.value)}
          size="lg"
          bg={bgColor}
          borderColor={borderColor}
        >
          <optgroup label="Google Gemini (Recommended)">
            {models.filter(m => m.provider === 'google').map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.costPerRequest})
              </option>
            ))}
          </optgroup>
          <optgroup label="Anthropic Claude">
            {models.filter(m => m.provider === 'anthropic').map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.costPerRequest})
              </option>
            ))}
          </optgroup>
          <optgroup label="OpenAI">
            {models.filter(m => m.provider === 'openai').map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.costPerRequest})
              </option>
            ))}
          </optgroup>
        </Select>
        {selectedModel?.description && (
          <Text fontSize="sm" color={mutedColor} mt={2}>
            {selectedModel.description}
          </Text>
        )}
      </FormControl>

      {/* Cost Information */}
      {selectedModel && (
        <Box
          p={4}
          bg="blue.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="blue.200"
        >
          <HStack spacing={4}>
            <Icon as={FiDollarSign} color={accentColor} boxSize={5} />
            <VStack align="start" spacing={1} flex={1}>
              <Text fontSize="sm" fontWeight="semibold">Cost Estimate</Text>
              <HStack spacing={4} fontSize="xs" color={mutedColor}>
                <Text>Input: {selectedModel.inputCost}</Text>
                <Text>•</Text>
                <Text>Output: {selectedModel.outputCost}</Text>
                <Text>•</Text>
                <Text>Avg: {selectedModel.costPerRequest}/request</Text>
              </HStack>
            </VStack>
            <Badge colorScheme="green" fontSize="xs">
              {selectedModel.provider}
            </Badge>
          </HStack>
        </Box>
      )}

      {/* Temperature */}
      <FormControl>
        <FormLabel display="flex" alignItems="center" gap={2}>
          <Text>Temperature</Text>
          <Tooltip label="Controls randomness. Lower = more focused, Higher = more creative">
            <span>
              <Icon as={FiInfo} color={mutedColor} boxSize={4} />
            </span>
          </Tooltip>
          <Badge ml="auto" colorScheme="blue">
            {typeof value.temperature === 'number' ? value.temperature.toFixed(1) : '1.0'}
          </Badge>
        </FormLabel>
        <Slider
          value={typeof value.temperature === 'number' ? value.temperature : 1.0}
          onChange={handleTemperatureChange}
          min={0}
          max={2}
          step={0.1}
          colorScheme="blue"
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb boxSize={6}>
            <Box color={accentColor} as={FiZap} />
          </SliderThumb>
        </Slider>
        <HStack justify="space-between" mt={2} fontSize="xs" color={mutedColor}>
          <Text>Focused (0.0)</Text>
          <Text>Balanced (1.0)</Text>
          <Text>Creative (2.0)</Text>
        </HStack>
      </FormControl>

      {/* Max Tokens */}
      <FormControl>
        <FormLabel display="flex" alignItems="center" gap={2}>
          <Text>Max Tokens</Text>
          <Tooltip label="Maximum length of response. Higher = longer responses but higher cost">
            <span>
              <Icon as={FiInfo} color={mutedColor} boxSize={4} />
            </span>
          </Tooltip>
        </FormLabel>
        <Input
          type="number"
          value={value.maxTokens}
          onChange={(e) => handleMaxTokensChange(e.target.value)}
          min={100}
          max={32000}
          step={100}
          size="lg"
          bg={bgColor}
          borderColor={borderColor}
        />
        <Text fontSize="xs" color={mutedColor} mt={2}>
          Recommended: 4096 for general use, 8192 for complex tasks
        </Text>
      </FormControl>

      {/* Info Box */}
      <Box
        p={4}
        bg={useSemanticToken('surface.base')}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <HStack spacing={2} mb={2}>
          <Icon as={FiInfo} color={accentColor} />
          <Text fontSize="sm" fontWeight="semibold">Model Translation</Text>
        </HStack>
        <Text fontSize="xs" color={mutedColor}>
          Goose uses OpenAI-compatible interface. Non-OpenAI models (Gemini, Claude) are 
          automatically translated to OpenAI equivalents. AI Gateway handles routing to the 
          correct provider based on your service ID.
        </Text>
      </Box>

      {/* Provider Info */}
      <Box
        p={3}
        bg="yellow.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="yellow.200"
      >
        <Text fontSize="xs" color={mutedColor}>
          <strong>Note:</strong> Models are managed in AI Inferencing Service. 
          Changes here only affect this agent's model selection.
        </Text>
      </Box>
    </VStack>
  );
}
