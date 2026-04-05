/**
 * Goose Advanced Settings - Reusable component for advanced Goose parameters
 * 
 * Can be used across all agent contexts:
 * - Workspace AI Settings
 * - Page AI Settings  
 * - Dashboard AI Settings
 * - Any other agent configuration
 * 
 * Includes:
 * - Session Management (max turns, context strategy, auto-compact)
 * - Multi-Model Configuration (lead/worker, planning)
 * - Tool Behavior (execution mode, router, toolshim)
 * - Security & Monitoring (prompt injection, debug, costs)
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
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
  Switch,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Divider,
  Icon,
  Badge,
  Tooltip,
  Collapse,
  IconButton,
  Box,
} from '@chakra-ui/react';
import {
  FiClock, 
  FiLayers, 
  FiShield, 
  FiSettings,
  FiChevronDown,
  FiChevronRight,
  FiZap,
  FiCpu,
  FiActivity
} from 'react-icons/fi';

export interface GooseAdvancedSettingsProps {
  // Session Management
  maxTurns?: number;
  onMaxTurnsChange?: (turns: number) => void;
  contextStrategy?: 'summarize' | 'prompt' | 'truncate';
  onContextStrategyChange?: (strategy: 'summarize' | 'prompt' | 'truncate') => void;
  autoCompactThreshold?: number;
  onAutoCompactThresholdChange?: (threshold: number) => void;
  sessionAutosave?: boolean;
  onSessionAutosaveChange?: (enabled: boolean) => void;
  
  // Multi-Model Configuration
  enableLeadWorker?: boolean;
  onEnableLeadWorkerChange?: (enabled: boolean) => void;
  leadModel?: string;
  onLeadModelChange?: (model: string) => void;
  leadTurns?: number;
  onLeadTurnsChange?: (turns: number) => void;
  enablePlanning?: boolean;
  onEnablePlanningChange?: (enabled: boolean) => void;
  plannerModel?: string;
  onPlannerModelChange?: (model: string) => void;
  
  // Tool Behavior (Note: Tool execution mode is handled by Agent Mode in basic settings)
  enableRouter?: boolean;
  onEnableRouterChange?: (enabled: boolean) => void;
  enableToolshim?: boolean;
  onEnableToolshimChange?: (enabled: boolean) => void;
  toolOutputPriority?: number;
  onToolOutputPriorityChange?: (priority: number) => void;
  
  // Security & Monitoring
  securityPromptEnabled?: boolean;
  onSecurityPromptEnabledChange?: (enabled: boolean) => void;
  securityThreshold?: number;
  onSecurityThresholdChange?: (threshold: number) => void;
  debugEnabled?: boolean;
  onDebugEnabledChange?: (enabled: boolean) => void;
  showCosts?: boolean;
  onShowCostsChange?: (enabled: boolean) => void;
  
  // Available models for dropdowns
  availableModels?: Array<{
    value: string;
    label: string;
    provider?: string;
  }>;
  
  // UI Control
  showSectionHeaders?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const GooseAdvancedSettings: React.FC<GooseAdvancedSettingsProps> = ({
  // Session Management defaults
  maxTurns = 25,
  onMaxTurnsChange,
  contextStrategy = 'prompt',
  onContextStrategyChange,
  autoCompactThreshold = 0.6,
  onAutoCompactThresholdChange,
  sessionAutosave = true,
  onSessionAutosaveChange,
  
  // Multi-Model defaults
  enableLeadWorker = false,
  onEnableLeadWorkerChange,
  leadModel = 'claude-sonnet-4-20250514',
  onLeadModelChange,
  leadTurns = 3,
  onLeadTurnsChange,
  enablePlanning = false,
  onEnablePlanningChange,
  plannerModel = 'gpt-4o',
  onPlannerModelChange,
  
  // Tool Behavior defaults (execution mode handled by Agent Mode in basic settings)
  enableRouter = true,
  onEnableRouterChange,
  enableToolshim = true,
  onEnableToolshimChange,
  toolOutputPriority = 0.2,
  onToolOutputPriorityChange,
  
  // Security & Monitoring defaults
  securityPromptEnabled = true,
  onSecurityPromptEnabledChange,
  securityThreshold = 0.8,
  onSecurityThresholdChange,
  debugEnabled = false,
  onDebugEnabledChange,
  showCosts = false,
  onShowCostsChange,
  
  // Available models
  availableModels = [
    { value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet', provider: 'Anthropic' },
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'Anthropic' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI' },
  ],
  
  // UI Control
  showSectionHeaders = true,
  collapsible = false,
  defaultExpanded = false,
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    session: defaultExpanded,
    multiModel: defaultExpanded,
    tools: defaultExpanded,
    security: defaultExpanded,
  });

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const sectionBg = useSemanticToken('surface.base');

  const toggleSection = (section: string) => {
    if (collapsible) {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    }
  };

  const SectionHeader = ({ 
    title, 
    icon, 
    section, 
    badge 
  }: { 
    title: string; 
    icon: any; 
    section: string; 
    badge?: string;
  }) => (
    <HStack 
      justify="space-between" 
      cursor={collapsible ? 'pointer' : 'default'}
      onClick={() => toggleSection(section)}
      p={2}
      borderRadius="md"
      bg={showSectionHeaders ? sectionBg : 'transparent'}
      _hover={collapsible ? { bg: hoverBg } : {}}
    >
      <HStack>
        <Icon as={icon} boxSize={4} color="blue.500" />
        <Text fontSize="sm" fontWeight="600" color={textColor}>
          {title}
        </Text>
        {badge && (
          <Badge size="sm" colorScheme="blue" variant="subtle">
            {badge}
          </Badge>
        )}
      </HStack>
      {collapsible && (
        <Icon 
          as={expandedSections[section] ? FiChevronDown : FiChevronRight} 
          boxSize={4} 
          color={mutedColor}
        />
      )}
    </HStack>
  );

  return (
    <VStack spacing={4} align="stretch">
      
      {/* Session Management */}
      <Box>
        {showSectionHeaders && (
          <SectionHeader 
            title="Session Management" 
            icon={FiClock} 
            section="session"
            badge="Conversation Control"
          />
        )}
        <Collapse in={!collapsible || expandedSections.session}>
          <VStack spacing={3} align="stretch" pt={showSectionHeaders ? 2 : 0}>
            
            {/* Max Turns */}
            <FormControl>
              <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                Max Turns
                <Tooltip label="Maximum number of conversation turns before auto-summarization">
                  <Icon as={FiActivity} boxSize={3} ml={1} />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={maxTurns} 
                onChange={(_, val) => onMaxTurnsChange?.(val || 25)}
                min={5} 
                max={100}
                size="sm"
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            {/* Context Strategy */}
            <FormControl>
              <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                Context Strategy
              </FormLabel>
              <Select 
                value={contextStrategy} 
                onChange={(e) => onContextStrategyChange?.(e.target.value as any)}
                size="sm"
              >
                <option value="prompt">Prompt User</option>
                <option value="summarize">Auto Summarize</option>
                <option value="truncate">Truncate Old</option>
              </Select>
            </FormControl>

            {/* Auto-Compact Threshold */}
            <FormControl>
              <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                Auto-Compact Threshold: {Math.round(autoCompactThreshold * 100)}%
              </FormLabel>
              <Slider
                value={autoCompactThreshold}
                onChange={(val) => onAutoCompactThresholdChange?.(val)}
                min={0.1}
                max={1.0}
                step={0.1}
                size="sm"
              >
                <SliderTrack>
                  <SliderFilledTrack bg="blue.400" />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>

            {/* Session Autosave */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Auto-save Sessions
                </FormLabel>
                <Switch
                  isChecked={sessionAutosave}
                  onChange={(e) => onSessionAutosaveChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

          </VStack>
        </Collapse>
      </Box>

      {showSectionHeaders && <Divider />}

      {/* Multi-Model Configuration */}
      <Box>
        {showSectionHeaders && (
          <SectionHeader 
            title="Multi-Model Setup" 
            icon={FiLayers} 
            section="multiModel"
            badge="Advanced"
          />
        )}
        <Collapse in={!collapsible || expandedSections.multiModel}>
          <VStack spacing={3} align="stretch" pt={showSectionHeaders ? 2 : 0}>
            
            {/* Lead/Worker Pattern */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Enable Lead/Worker Pattern
                  <Tooltip label="Use a powerful lead model for planning, then switch to a faster worker model">
                    <Icon as={FiActivity} boxSize={3} ml={1} />
                  </Tooltip>
                </FormLabel>
                <Switch
                  isChecked={enableLeadWorker}
                  onChange={(e) => onEnableLeadWorkerChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

            {enableLeadWorker && (
              <>
                <FormControl>
                  <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                    Lead Model
                  </FormLabel>
                  <Select 
                    value={leadModel} 
                    onChange={(e) => onLeadModelChange?.(e.target.value)}
                    size="sm"
                  >
                    {availableModels.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                    Lead Turns
                  </FormLabel>
                  <NumberInput 
                    value={leadTurns} 
                    onChange={(_, val) => onLeadTurnsChange?.(val || 3)}
                    min={1} 
                    max={10}
                    size="sm"
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </>
            )}

            {/* Planning Mode */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Enable Planning Mode
                </FormLabel>
                <Switch
                  isChecked={enablePlanning}
                  onChange={(e) => onEnablePlanningChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

            {enablePlanning && (
              <FormControl>
                <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                  Planner Model
                </FormLabel>
                <Select 
                  value={plannerModel} 
                  onChange={(e) => onPlannerModelChange?.(e.target.value)}
                  size="sm"
                >
                  {availableModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

          </VStack>
        </Collapse>
      </Box>

      {showSectionHeaders && <Divider />}

      {/* Tool Behavior */}
      <Box>
        {showSectionHeaders && (
          <SectionHeader 
            title="Tool Behavior" 
            icon={FiSettings} 
            section="tools"
            badge="Execution Control"
          />
        )}
        <Collapse in={!collapsible || expandedSections.tools}>
          <VStack spacing={3} align="stretch" pt={showSectionHeaders ? 2 : 0}>
            
            {/* Note: Tool Execution Mode is handled by Agent Mode in basic settings */}
            
            {/* Tool Router */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Intelligent Tool Selection
                </FormLabel>
                <Switch
                  isChecked={enableRouter}
                  onChange={(e) => onEnableRouterChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

            {/* Toolshim */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Tool Call Interpretation
                </FormLabel>
                <Switch
                  isChecked={enableToolshim}
                  onChange={(e) => onEnableToolshimChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

            {/* Tool Output Priority */}
            <FormControl>
              <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                Output Priority Filter: {Math.round(toolOutputPriority * 100)}%
              </FormLabel>
              <Slider
                value={toolOutputPriority}
                onChange={(val) => onToolOutputPriorityChange?.(val)}
                min={0.0}
                max={1.0}
                step={0.1}
                size="sm"
              >
                <SliderTrack>
                  <SliderFilledTrack bg="green.400" />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>

          </VStack>
        </Collapse>
      </Box>

      {showSectionHeaders && <Divider />}

      {/* Security & Monitoring */}
      <Box>
        {showSectionHeaders && (
          <SectionHeader 
            title="Security & Monitoring" 
            icon={FiShield} 
            section="security"
            badge="Safety"
          />
        )}
        <Collapse in={!collapsible || expandedSections.security}>
          <VStack spacing={3} align="stretch" pt={showSectionHeaders ? 2 : 0}>
            
            {/* Security Prompt Detection */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Prompt Injection Detection
                </FormLabel>
                <Switch
                  isChecked={securityPromptEnabled}
                  onChange={(e) => onSecurityPromptEnabledChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

            {securityPromptEnabled && (
              <FormControl>
                <FormLabel fontSize="xs" color={mutedColor} mb={1}>
                  Detection Threshold: {Math.round(securityThreshold * 100)}%
                </FormLabel>
                <Slider
                  value={securityThreshold}
                  onChange={(val) => onSecurityThresholdChange?.(val)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  size="sm"
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="red.400" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </FormControl>
            )}

            {/* Debug Logging */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Debug Logging
                </FormLabel>
                <Switch
                  isChecked={debugEnabled}
                  onChange={(e) => onDebugEnabledChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

            {/* Show Costs */}
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                  Show API Costs
                </FormLabel>
                <Switch
                  isChecked={showCosts}
                  onChange={(e) => onShowCostsChange?.(e.target.checked)}
                  size="sm"
                />
              </HStack>
            </FormControl>

          </VStack>
        </Collapse>
      </Box>

    </VStack>
  );
};
