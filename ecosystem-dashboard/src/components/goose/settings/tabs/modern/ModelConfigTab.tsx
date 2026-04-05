/**
 * Modern Model Configuration Tab
 * 
 * Unified model settings including:
 * - Agent mode (Autonomous/Manual/Smart/Chat)
 * - Model selection with cost estimates
 * - Temperature and max tokens
 * - Advanced settings (collapsible)
 */

import React, { useState } from 'react';
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  Badge,
  Icon,
  Tooltip,
  Divider,
  Card,
  CardBody,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import {
  FiZap,
  FiDollarSign,
  FiInfo,
  FiCpu,
  FiActivity,
} from 'react-icons/fi';
import { GooseAdvancedSettings } from '../../../../shared/GooseAdvancedSettings';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface ModelConfigTabProps {
  config: any;
  onChange: (updates: any) => void;
}

export default function ModelConfigTab({ config, onChange }: ModelConfigTabProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  const models = [
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'Anthropic', cost: '$0.003', speed: 'Fast' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', cost: '$0.015', recommended: true },
    { value: 'claude-opus-4', label: 'Claude Opus 4', provider: 'Anthropic', cost: '$0.075', quality: 'Premium' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', cost: '$0.005' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', cost: '$0.001', speed: 'Fast' },
  ];

  const selectedModel = models.find(m => m.value === config.model);

  return (
    <VStack spacing={6} align="stretch">
      
      {/* Agent Mode is handled in WorkspaceAISettingsPanel - not duplicated here */}

      {/* Model Selection */}
      <FormControl>
        <FormLabel fontSize="sm" fontWeight="600" color={textColor}>
          <HStack>
            <Icon as={FiZap} boxSize={4} />
            <Text>AI Model</Text>
          </HStack>
        </FormLabel>
        <Select
          value={config.model}
          onChange={(e) => onChange({ model: e.target.value })}
          size="md"
          fontWeight="500"
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label} ({model.provider}) - {model.cost}/req
              {model.recommended && ' ⭐'}
              {model.speed && ` • ${model.speed}`}
              {model.quality && ` • ${model.quality}`}
            </option>
          ))}
        </Select>
        {selectedModel && (
          <Card mt={3} bg={cardBg} size="sm">
            <CardBody>
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <Icon as={FiDollarSign} boxSize={4} color="green.500" />
                  <Text fontSize="xs" fontWeight="600" color={textColor}>
                    Cost Estimate
                  </Text>
                </HStack>
                <Badge colorScheme="green" fontSize="xs">
                  {selectedModel.provider}
                </Badge>
              </HStack>
              <Text fontSize="xs" color={mutedColor} mt={2}>
                Avg: {selectedModel.cost}/request
              </Text>
            </CardBody>
          </Card>
        )}
      </FormControl>

      {/* Temperature */}
      <FormControl>
        <FormLabel fontSize="sm" fontWeight="600" color={textColor}>
          <HStack justify="space-between">
            <HStack>
              <Text>Temperature</Text>
              <Tooltip label="Controls randomness. Lower = focused, Higher = creative">
                <Icon as={FiInfo} boxSize={3} color={mutedColor} />
              </Tooltip>
            </HStack>
            <Badge colorScheme="blue" fontSize="xs">
              {Number(config.temperature ?? 0.7).toFixed(1)}
            </Badge>
          </HStack>
        </FormLabel>
        <Slider
          value={Number(config.temperature ?? 0.7)}
          onChange={(val) => onChange({ temperature: val })}
          min={0}
          max={2}
          step={0.1}
          colorScheme="blue"
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb boxSize={5} />
        </Slider>
        <HStack justify="space-between" mt={1}>
          <Text fontSize="xs" color={mutedColor}>Focused (0.0)</Text>
          <Text fontSize="xs" color={mutedColor}>Balanced (1.0)</Text>
          <Text fontSize="xs" color={mutedColor}>Creative (2.0)</Text>
        </HStack>
      </FormControl>

      {/* Max Tokens */}
      <FormControl>
        <FormLabel fontSize="sm" fontWeight="600" color={textColor}>
          Max Tokens
        </FormLabel>
        <NumberInput
          value={Number(config.maxTokens || 8192)}
          onChange={(_, val) => onChange({ maxTokens: val })}
          min={1024}
          max={32768}
          step={1024}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Recommended: 4096 for general use, 8192 for complex tasks
        </Text>
      </FormControl>

      <Divider />

      {/* Advanced Settings */}
      <Accordion allowToggle>
        <AccordionItem border="none">
          <AccordionButton px={0} _hover={{ bg: 'transparent' }}>
            <HStack flex="1" spacing={2}>
              <Icon as={FiActivity} boxSize={4} color="purple.500" />
              <Text fontSize="sm" fontWeight="600" color={textColor}>
                Advanced Settings
              </Text>
              <Badge size="sm" colorScheme="purple" variant="subtle">
                Optional
              </Badge>
            </HStack>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4} px={0}>
            <GooseAdvancedSettings
              maxTurns={config.maxTurns}
              contextStrategy={config.contextStrategy}
              autoCompactThreshold={config.autoCompactThreshold}
              sessionAutosave={config.sessionAutosave}
              enableLeadWorker={config.enableLeadWorker}
              leadModel={config.leadModel}
              leadTurns={config.leadTurns}
              enablePlanning={config.enablePlanning}
              plannerModel={config.plannerModel}
              enableRouter={config.enableRouter}
              enableToolshim={config.enableToolshim}
              toolOutputPriority={config.toolOutputPriority}
              securityPromptEnabled={config.securityPromptEnabled}
              securityThreshold={config.securityThreshold}
              debugEnabled={config.debugEnabled}
              showCosts={config.showCosts}
              onMaxTurnsChange={(val) => onChange({ maxTurns: val })}
              onContextStrategyChange={(val) => onChange({ contextStrategy: val })}
              onAutoCompactThresholdChange={(val) => onChange({ autoCompactThreshold: val })}
              onSessionAutosaveChange={(val) => onChange({ sessionAutosave: val })}
              onEnableLeadWorkerChange={(val) => onChange({ enableLeadWorker: val })}
              onLeadModelChange={(val) => onChange({ leadModel: val })}
              onLeadTurnsChange={(val) => onChange({ leadTurns: val })}
              onEnablePlanningChange={(val) => onChange({ enablePlanning: val })}
              onPlannerModelChange={(val) => onChange({ plannerModel: val })}
              onEnableRouterChange={(val) => onChange({ enableRouter: val })}
              onEnableToolshimChange={(val) => onChange({ enableToolshim: val })}
              onToolOutputPriorityChange={(val) => onChange({ toolOutputPriority: val })}
              onSecurityPromptEnabledChange={(val) => onChange({ securityPromptEnabled: val })}
              onSecurityThresholdChange={(val) => onChange({ securityThreshold: val })}
              onDebugEnabledChange={(val) => onChange({ debugEnabled: val })}
              onShowCostsChange={(val) => onChange({ showCosts: val })}
              availableModels={models}
              showSectionHeaders={true}
              collapsible={true}
              defaultExpanded={false}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </VStack>
  );
}
