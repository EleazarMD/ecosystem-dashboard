import React from 'react';
import {
  Box,
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
  Switch,
  Textarea,
  Divider,
  Icon,
  Badge,
} from '@chakra-ui/react';
import { FiCpu, FiZap, FiMessageSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AISettingsPanelProps {
  // Model selection
  availableModels?: string[];
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  
  // Temperature
  temperature?: number;
  onTemperatureChange?: (temp: number) => void;
  
  // Max tokens
  maxTokens?: number;
  onMaxTokensChange?: (tokens: number) => void;
  
  // System prompt
  systemPrompt?: string;
  onSystemPromptChange?: (prompt: string) => void;
  enableSystemPrompt?: boolean;
  onEnableSystemPromptChange?: (enabled: boolean) => void;
}

/**
 * Generic AI Settings Panel - works on any page without context dependencies
 * Styled consistently with Podcast Studio panels
 */
export default function AISettingsPanel({
  availableModels = ['claude-sonnet-4-20250514', 'gemini-2.0-flash-exp', 'gpt-4o', 'claude-3-haiku'],
  selectedModel = 'gemini-2.0-flash-exp',
  onModelChange,
  temperature = 0.7,
  onTemperatureChange,
  maxTokens = 4000,
  onMaxTokensChange,
  systemPrompt = '',
  onSystemPromptChange,
  enableSystemPrompt = true,
  onEnableSystemPromptChange,
}: AISettingsPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header removed - title now in DynamicRightPanel header */}

      {/* Content */}
      <VStack spacing={4} p={4} align="stretch">
        
        {/* Model Selection */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="600" color={textColor} mb={2}>
            <HStack>
              <Icon as={FiZap} boxSize={3} color={useSemanticToken('interactive.secondary')} />
              <Text>AI Model</Text>
            </HStack>
          </FormLabel>
          <Select
            value={selectedModel}
            onChange={(e) => onModelChange?.(e.target.value)}
            size="sm"
            borderColor={borderColor}
            _hover={{ borderColor: useSemanticToken('interactive.primary') }}
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </Select>
        </FormControl>

        <Divider />

        {/* Temperature */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="600" color={textColor} mb={2}>
            <HStack justify="space-between">
              <Text>Temperature</Text>
              <Badge colorScheme="blue" fontSize="10px">{temperature.toFixed(2)}</Badge>
            </HStack>
          </FormLabel>
          <Text fontSize="10px" color={mutedColor} mb={2}>
            Controls randomness: 0 = focused, 1 = creative
          </Text>
          <Slider
            value={temperature}
            onChange={(val) => onTemperatureChange?.(val)}
            min={0}
            max={1}
            step={0.1}
            colorScheme="blue"
          >
            <SliderTrack bg={useSemanticToken('border.default')}>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="10px" color={mutedColor}>Precise</Text>
            <Text fontSize="10px" color={mutedColor}>Creative</Text>
          </HStack>
        </FormControl>

        <Divider />

        {/* Max Tokens */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="600" color={textColor} mb={2}>
            <HStack justify="space-between">
              <Text>Max Tokens</Text>
              <Badge colorScheme="green" fontSize="10px">{maxTokens}</Badge>
            </HStack>
          </FormLabel>
          <Text fontSize="10px" color={mutedColor} mb={2}>
            Maximum response length
          </Text>
          <Slider
            value={maxTokens}
            onChange={(val) => onMaxTokensChange?.(val)}
            min={500}
            max={8000}
            step={500}
            colorScheme="green"
          >
            <SliderTrack bg={useSemanticToken('border.default')}>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb boxSize={4} />
          </Slider>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="10px" color={mutedColor}>500</Text>
            <Text fontSize="10px" color={mutedColor}>8000</Text>
          </HStack>
        </FormControl>

        <Divider />

        {/* System Prompt */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="600" color={textColor} mb={2}>
            <HStack justify="space-between">
              <HStack>
                <Icon as={FiMessageSquare} boxSize={3} color={useSemanticToken('status.warning')} />
                <Text>System Prompt</Text>
              </HStack>
              <Switch
                size="sm"
                isChecked={enableSystemPrompt}
                onChange={(e) => onEnableSystemPromptChange?.(e.target.checked)}
                colorScheme="orange"
              />
            </HStack>
          </FormLabel>
          <Text fontSize="10px" color={mutedColor} mb={2}>
            Instructions for AI behavior
          </Text>
          <Textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange?.(e.target.value)}
            placeholder="Enter custom instructions..."
            size="sm"
            rows={4}
            borderColor={borderColor}
            isDisabled={!enableSystemPrompt}
            _hover={{ borderColor: useSemanticToken('status.warning') }}
          />
        </FormControl>

      </VStack>
    </VStack>
  );
}
