/**
 * Agent Core Settings - Reusable component for common AI agent settings
 * Used across Workspace AI, Page AI, Podcast Studio, AI Research, etc.
 * 
 * Includes:
 * - Agent Mode (Direct API vs Goose)
 * - AI Model selection
 * - Response Style
 * - Creativity (Temperature)
 * - Context Window
 */

import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  FormControl,
  FormLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Icon,
  Badge,
  Switch,
  Box,
} from '@chakra-ui/react';
import { FiCpu, FiZap } from 'react-icons/fi';
import { AgencyModeSelector } from '../workspace/AgencyModeSelector';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface AgentCoreSettingsProps {
  // Agent Mode
  useGoose?: boolean;
  onUseGooseChange?: (useGoose: boolean) => void;
  agencyMode?: 'autonomous' | 'manual' | 'smart' | 'chat';
  onAgencyModeChange?: (mode: 'autonomous' | 'manual' | 'smart' | 'chat') => void;
  showAgentMode?: boolean;  // Allow hiding agent mode selector

  // Model Selection
  model?: string;
  onModelChange?: (model: string) => void;
  availableModels?: Array<{
    value: string;
    label: string;
    provider?: string;
    recommended?: boolean;
    speed?: string;
  }>;

  // Response Style
  responseStyle?: 'concise' | 'balanced' | 'detailed';
  onResponseStyleChange?: (style: 'concise' | 'balanced' | 'detailed') => void;
  showResponseStyle?: boolean;  // Allow hiding response style

  // Temperature/Creativity
  temperature?: number;
  onTemperatureChange?: (temp: number) => void;

  // Context Window
  contextSize?: number;
  onContextSizeChange?: (size: number) => void;
  contextSizes?: number[];
  contextLabels?: string[];
  showContextWindow?: boolean;  // Allow hiding context window
}

export const AgentCoreSettings: React.FC<AgentCoreSettingsProps> = ({
  useGoose = false,
  onUseGooseChange,
  agencyMode = 'autonomous',
  onAgencyModeChange,
  showAgentMode = true,

  model = 'claude-sonnet-4-20250514',
  onModelChange,
  availableModels = [
    { value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet (Anthropic)', provider: 'Anthropic', recommended: true },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', provider: 'Google', speed: 'Fast' },
    { value: 'gpt-4o', label: 'GPT-4o (OpenAI)', provider: 'OpenAI' },
  ],

  responseStyle = 'balanced',
  onResponseStyleChange,
  showResponseStyle = true,

  temperature = 0.7,
  onTemperatureChange,

  contextSize = 4096,
  onContextSizeChange,
  contextSizes = [2048, 4096, 8192, 16384],
  contextLabels = ['2K', '4K', '8K', '16K'],
  showContextWindow = true,
}) => {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  // Debug logging
  React.useEffect(() => {
    console.log('[AgentCoreSettings] Received props:', { useGoose, agencyMode, hasOnChange: !!onAgencyModeChange });
    console.log('[AgentCoreSettings] showAgentMode:', showAgentMode);
  }, [useGoose, agencyMode, onAgencyModeChange, showAgentMode]);

  return (
    <VStack spacing={1.5} align="stretch">

      {/* Agent Mode - DEBUGGING: Temporarily showing always */}
      <FormControl>
        <FormLabel fontSize="xs" fontWeight="700" color={textColor} mb={1}>
          Agent Mode
        </FormLabel>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="xs" color={mutedColor} fontWeight="500">
            {useGoose ? 'Goose (Agentic)' : 'Direct API'}
          </Text>
          <Switch
            size="sm"
            colorScheme="blue"
            isChecked={useGoose}
            onChange={(e) => onUseGooseChange?.(e.target.checked)}
          />
        </HStack>

        {/* Agency Mode Selector - Only show when Goose enabled */}
        {useGoose && onAgencyModeChange && (
          <>
            {console.log('[AgentCoreSettings] Rendering AgencyModeSelector with value:', agencyMode)}
            <AgencyModeSelector
              value={agencyMode}
              onChange={onAgencyModeChange}
            />
          </>
        )}
      </FormControl>
      <Box h="1px" bg={useSemanticToken('glass.background')} my={0.5} />

      {/* AI Model Selection */}
      <FormControl>
        <FormLabel fontSize="xs" fontWeight="700" color={textColor} mb={0.5}>
          <HStack spacing={1.5}>
            <Icon as={FiCpu} boxSize={3} color="purple.600" />
            <Text>AI Model</Text>
          </HStack>
        </FormLabel>
        <Select
          value={model}
          onChange={(e) => onModelChange?.(e.target.value)}
          size="sm"
          borderColor={borderColor}
          fontSize="xs"
          _hover={{ borderColor: 'blue.400' }}
        >
          {availableModels.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label} {m.recommended ? '⭐' : ''}
            </option>
          ))}
        </Select>
        {model && availableModels.find(m => m.value === model) && (
          <Text fontSize="2xs" color={mutedColor} mt={0} lineHeight="1.2">
            {availableModels.find(m => m.value === model)?.provider
              ? `🤖 ${availableModels.find(m => m.value === model)?.provider} - `
              : ''}
            {availableModels.find(m => m.value === model)?.speed
              ? availableModels.find(m => m.value === model)?.speed
              : 'Excellent for reasoning and analysis'}
          </Text>
        )}
      </FormControl>

      <Box h="1px" bg={useSemanticToken('glass.background')} my={0.5} />

      {/* Response Style - Optional */}
      {showResponseStyle && (
        <>
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color={textColor} mb={0.5}>
              Response Style
            </FormLabel>
            <Select
              value={responseStyle}
              onChange={(e) => onResponseStyleChange?.(e.target.value as any)}
              size="sm"
              borderColor={borderColor}
              fontSize="xs"
              _hover={{ borderColor: 'blue.400' }}
            >
              <option value="concise">⚡ Concise - Quick responses</option>
              <option value="balanced">⚖️ Balanced - Moderate detail</option>
              <option value="detailed">📚 Detailed - Comprehensive</option>
            </Select>
          </FormControl>
          <Box h="1px" bg={useSemanticToken('glass.background')} my={0.5} />
        </>
      )}

      {/* Creativity (Temperature) */}
      <FormControl>
        <FormLabel fontSize="xs" fontWeight="700" color={textColor} mb={0.5}>
          <HStack justify="space-between">
            <Text>Creativity</Text>
            <Badge
              fontSize="2xs"
              px={1.5}
              py={0}
              bg={useSemanticToken('surface.elevated')}
              color={textColor}
              borderRadius="full"
            >
              {temperature.toFixed(1)}
            </Badge>
          </HStack>
        </FormLabel>
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
          <SliderThumb boxSize={3} />
        </Slider>
        <HStack justify="space-between" mt={0}>
          <Text fontSize="2xs" color={mutedColor}>Precise</Text>
          <Text fontSize="2xs" color={mutedColor}>Creative</Text>
        </HStack>
        <Text fontSize="2xs" color={mutedColor} mt={0} lineHeight="1.2">
          Lower values for factual tasks, higher for brainstorming
        </Text>
      </FormControl>

      {/* Context Window - Optional */}
      {showContextWindow && (
        <>
          <Box h="1px" bg={useSemanticToken('glass.background')} my={0.5} />
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color={textColor} mb={0.5}>
              <HStack justify="space-between">
                <Text>Context Window</Text>
                <Badge
                  fontSize="2xs"
                  px={1.5}
                  py={0}
                  bg={useSemanticToken('surface.elevated')}
                  color={textColor}
                  borderRadius="full"
                >
                  {contextLabels[contextSizes.indexOf(contextSize)] || contextLabels[1]}
                </Badge>
              </HStack>
            </FormLabel>
            <Slider
              value={contextSizes.indexOf(contextSize)}
              onChange={(val) => onContextSizeChange?.(contextSizes[val])}
              min={0}
              max={contextSizes.length - 1}
              step={1}
              colorScheme="purple"
            >
              <SliderTrack bg={useSemanticToken('border.default')}>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb boxSize={3} />
            </Slider>
            <HStack justify="space-between" mt={0}>
              <Text fontSize="2xs" color={mutedColor}>Focused</Text>
              <Text fontSize="2xs" color={mutedColor}>Comprehensive</Text>
            </HStack>
            <Text fontSize="2xs" color={mutedColor} mt={0} lineHeight="1.2">
              Amount of context to include from workspace
            </Text>
          </FormControl>
        </>
      )}
    </VStack>
  );
};
