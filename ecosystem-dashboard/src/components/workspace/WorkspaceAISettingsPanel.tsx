import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Switch,
  FormControl,
  FormLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Icon,
  Badge,
  Tooltip,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Input,
  Button,
  Collapse,
} from '@chakra-ui/react';
import {
  FiCpu,
  FiDatabase,
  FiSearch,
  FiSettings,
  FiInfo,
  FiZap,
  FiFileText,
  FiServer,
  FiBox,
  FiFolder,
  FiChevronDown,
  FiChevronRight,
  FiVolume2,
  FiGlobe,
  FiCloud,
  FiShield,
} from 'react-icons/fi';
import { AgencyModeSelector } from './AgencyModeSelector';
import { MCPServersSection, type MCPServersConfig } from '../goose/MCPServersSection';
import { AgentCoreSettings } from '../shared/AgentCoreSettings';
import { GooseAdvancedSettings } from '../shared/GooseAdvancedSettings';
import { PerformanceSettingsPanel } from './PerformanceSettingsPanel';
import { DeepResearchSettings } from './DeepResearchSettings';
import { TTSSettingsPanel } from '../shared/TTSSettingsPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface WorkspaceAISettingsPanelProps {
  // Model settings
  model?: string;
  onModelChange?: (model: string) => void;

  // Temperature/creativity
  temperature?: number;
  onTemperatureChange?: (temp: number) => void;

  // Response style
  responseStyle?: 'concise' | 'balanced' | 'detailed';
  onResponseStyleChange?: (style: 'concise' | 'balanced' | 'detailed') => void;

  // Knowledge sources
  knowledgeSources?: {
    currentPage: boolean;
    workspace: boolean;
    databases: boolean;
    knowledgeGraph: boolean;
  };
  onKnowledgeSourcesChange?: (sources: any) => void;

  // MCP servers
  mcpServers?: MCPServersConfig;
  onMCPServersChange?: (servers: MCPServersConfig) => void;
  mcpLoading?: boolean;

  // Search scope
  searchScope?: 'current' | 'workspace' | 'all';
  onSearchScopeChange?: (scope: 'current' | 'workspace' | 'all') => void;

  // Context window
  contextSize?: number;
  onContextSizeChange?: (size: number) => void;

  // Agent mode
  useGoose?: boolean;
  onUseGooseChange?: (useGoose: boolean) => void;

  // Agency mode (Goose approval level)
  agencyMode?: 'autonomous' | 'manual' | 'smart' | 'chat';
  onAgencyModeChange?: (mode: 'autonomous' | 'manual' | 'smart' | 'chat') => void;

  // Filesystem access
  workingDirectory?: string;
  onWorkingDirectoryChange?: (directory: string) => void;

  // Web Search Settings
  webSearchProvider?: 'perplexity' | 'perplexica';
  onWebSearchProviderChange?: (provider: 'perplexity' | 'perplexica') => void;

  // Deep Research settings
  deepResearchMaxTokens?: number;
  onDeepResearchMaxTokensChange?: (tokens: number) => void;
  deepResearchModel?: 'sonar-pro' | 'sonar-reasoning';
  onDeepResearchModelChange?: (model: 'sonar-pro' | 'sonar-reasoning') => void;
  deepResearchClarificationQuestions?: number;
  onDeepResearchClarificationQuestionsChange?: (count: number) => void;
  deepResearchSourceRecency?: 'day' | 'week' | 'month' | 'year' | 'any';
  onDeepResearchSourceRecencyChange?: (recency: 'day' | 'week' | 'month' | 'year' | 'any') => void;
  deepResearchAutoPlanning?: boolean;
  onDeepResearchAutoPlanningChange?: (enabled: boolean) => void;
}

export default function WorkspaceAISettingsPanel({
  model = 'gemini-2.5-pro',
  onModelChange,
  temperature = 0.7,
  onTemperatureChange,
  responseStyle = 'balanced',
  onResponseStyleChange,
  knowledgeSources = {
    currentPage: true,
    workspace: true,
    databases: false,
    knowledgeGraph: false,
  },
  onKnowledgeSourcesChange,
  mcpServers = {
    workspace: true,
    notion: false,
    github: false,
    filesystem: false,
    knowledgeGraph: false,
    custom: [],
  },
  onMCPServersChange,
  mcpLoading = false,
  searchScope = 'workspace',
  onSearchScopeChange,
  contextSize = 8192,
  onContextSizeChange,
  useGoose = false,
  onUseGooseChange,
  agencyMode = 'autonomous',
  onAgencyModeChange,
  workingDirectory = '/Users/eleazar/Projects/AIHomelab',
  onWorkingDirectoryChange,
  webSearchProvider = 'perplexity',
  onWebSearchProviderChange,
  // Deep Research defaults
  deepResearchMaxTokens = 8000,
  onDeepResearchMaxTokensChange,
  deepResearchModel = 'sonar-pro',
  onDeepResearchModelChange,
  deepResearchClarificationQuestions = 3,
  onDeepResearchClarificationQuestionsChange,
  deepResearchSourceRecency = 'any',
  onDeepResearchSourceRecencyChange,
  deepResearchAutoPlanning = true,
  onDeepResearchAutoPlanningChange,
}: WorkspaceAISettingsPanelProps) {
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const accentBlue = useSemanticToken('interactive.primary');
  const accentPurple = useSemanticToken('interactive.secondary');
  const accentGreen = useSemanticToken('status.success');
  const accordionBg = useSemanticToken('surface.elevated');
  const accordionHoverBg = useSemanticToken('surface.hover');

  // State for collapsible sections
  const [mcpExpanded, setMcpExpanded] = useState(true); // Default open for MCP
  const [knowledgeSourcesExpanded, setKnowledgeSourcesExpanded] = useState(false);

  // Internal state for agencyMode - always use internal state for UI
  // Default to 'autonomous' if prop is undefined
  const [internalAgencyMode, setInternalAgencyMode] = useState<'autonomous' | 'manual' | 'smart' | 'chat'>(agencyMode || 'autonomous');

  // Sync internal state when prop changes (from parent or database load)
  useEffect(() => {
    console.log('[WorkspaceAISettings] agencyMode prop changed:', agencyMode, 'current internal:', internalAgencyMode);
    if (agencyMode && agencyMode !== internalAgencyMode) {
      setInternalAgencyMode(agencyMode);
      console.log('[WorkspaceAISettings] Updated internal agencyMode to:', agencyMode);
    }
  }, [agencyMode]);

  // Always use internal state for UI rendering
  const effectiveAgencyMode = internalAgencyMode;

  // Debug log effective mode
  useEffect(() => {
    console.log('[WorkspaceAISettings] Effective agencyMode for UI:', effectiveAgencyMode);
  }, [effectiveAgencyMode]);

  // Handler that saves to database AND updates local state
  const handleAgencyModeChange = async (mode: 'autonomous' | 'manual' | 'smart' | 'chat') => {
    // Update local state immediately for UI feedback
    setInternalAgencyMode(mode);

    // Call parent callback if provided
    if (onAgencyModeChange) {
      onAgencyModeChange(mode);
    }

    // Save to database for workspace-ai agent
    try {
      const response = await fetch('/api/goose/settings/workspace-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyMode: mode }),
      });

      if (!response.ok) {
        console.error('[WorkspaceAISettings] Failed to save agencyMode:', await response.text());
      } else {
        console.log('[WorkspaceAISettings] ✅ Saved agencyMode to database:', mode);
      }
    } catch (error) {
      console.error('[WorkspaceAISettings] Error saving agencyMode:', error);
    }
  };

  // TTS Settings State
  const [ttsSettings, setTTSSettings] = useState({
    voice: 'Puck', // Default Gemini voice
    speed: 1.0,
    pitch: 0,
    model: 'google-gemini-2.5-flash-preview-tts' as 'google-gemini-2.5-flash-preview-tts' | 'google-gemini-2.5-pro-preview-tts',
  });

  // State for advanced Goose settings (with defaults from database)
  const [advancedSettings, setAdvancedSettings] = useState({
    maxTurns: 25,
    contextStrategy: 'prompt' as 'summarize' | 'prompt' | 'truncate',
    autoCompactThreshold: 0.6,
    sessionAutosave: true,
    enableLeadWorker: false,
    leadModel: 'claude-sonnet-4-20250514',
    leadTurns: 3,
    enablePlanning: false,
    plannerModel: 'gpt-4o',
    // Note: toolExecutionMode is handled by agencyMode in basic settings
    enableRouter: true,
    enableToolshim: true,
    toolOutputPriority: 0.2,
    securityPromptEnabled: true,
    securityThreshold: 0.8,
    debugEnabled: false,
    showCosts: false,
  });

  // Debug logging
  console.log('⚙️ [SettingsPanel] useGoose received:', useGoose);

  // Modern LLM models for workspace AI
  // ⚠️ IMPORTANT: Use actual API model names that AI Gateway supports
  const workspaceModels = [
    // === Cloud Models ===
    { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'Anthropic', speed: 'Fastest' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', badge: 'Best' },
    { value: 'claude-4-sonnet', label: 'Claude 4 Sonnet', provider: 'Anthropic', badge: 'Latest' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'Anthropic', speed: 'Fast' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', provider: 'Anthropic', speed: 'Fast' },
    { value: 'gemini-2-0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', speed: 'Fast' },
    { value: 'gemini-2-0-flash-lite', label: 'Gemini 2.0 Flash Lite', provider: 'Google', speed: 'Fastest' },
    { value: 'gemini-1-5-pro', label: 'Gemini 1.5 Pro', provider: 'Google', badge: 'Premium' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash', provider: 'Google', speed: 'Fast' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', provider: 'Google' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', speed: 'Fast' },
    { value: 'o1-preview', label: 'o1 Preview (Reasoning)', provider: 'OpenAI', reasoning: true },
    { value: 'o1-mini', label: 'o1 Mini (Reasoning)', provider: 'OpenAI', reasoning: true, speed: 'Fast' },

    // === NVIDIA NIM Models (XRT Workstation - Local) ===
    // Data from ai_inferencing_db.provider_models table
    // Tailscale IP: 100.108.41.22, different ports per model
    {
      value: 'xrt-llama-3.3-70b',
      label: 'Llama 3.3 70B (NIM)',
      provider: 'NVIDIA NIM',
      badge: 'Default',
      speed: 'Fast',
      local: true,
      endpoint: 'http://100.108.41.22:8002', // Port 8002 for this model
      actualModelName: 'meta/llama-3.3-70b-instruct',
      useCase: ['chat', 'general'],
      recommended: true, // Latest Llama 70B
    },
    {
      value: 'xrt-llama-3.1-70b',
      label: 'Llama 3.1 70B (NIM)',
      provider: 'NVIDIA NIM',
      badge: 'Local',
      speed: 'Fast',
      local: true,
      endpoint: 'http://100.108.41.22:8001', // Port 8001 for this model
      actualModelName: 'meta/llama-3.1-70b-instruct',
      useCase: ['chat', 'general'],
    },
    {
      value: 'xrt-mistral-7b',
      label: 'Mistral 7B (NIM)',
      provider: 'NVIDIA NIM',
      badge: 'Local',
      speed: 'Fastest',
      local: true,
      endpoint: 'http://100.108.41.22:8003', // Port 8003 for this model
      actualModelName: 'nim/mistralai/mistral-7b-instruct-v03',
      useCase: ['agent', 'tool-use'],
      recommendedFor: 'goose-agent',
    },
  ];

  const contextSizes = [4096, 8192, 16384, 32768];
  const contextLabels = ['4K', '8K', '16K', '32K'];

  return (
    <VStack
      spacing={0}
      align="stretch"
      h="full"
      overflowY="auto"
      bg={bgColor}
      css={{
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: borderColor,
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: useSemanticToken('border.strong'),
        },
      }}
    >
      {/* Header */}
      <Box
        px={3}
        py={2}
        borderBottom="1px solid"
        borderColor={borderColor}
        bg="transparent"
        boxShadow="none"
      >
        <HStack justify="space-between">
          <HStack spacing={1.5}>
            <Icon as={FiZap} color={accentBlue} boxSize={3.5} />
            <Text fontSize="sm" fontWeight="700" color={accentBlue}>AI Settings</Text>
          </HStack>
          <Tooltip label="Configure AI assistant behavior for your workspace">
            <IconButton
              aria-label="Info"
              icon={<FiInfo />}
              size="xs"
              variant="ghost"
              color={mutedColor}
            />
          </Tooltip>
        </HStack>
      </Box>

      {/* Content */}
      <VStack spacing={1.5} px={2.5} py={1.5} align="stretch">

        {/* Core Agent Settings - Reusable Component - showAgentMode explicitly enabled */}
        <AgentCoreSettings
          showAgentMode={true}
          useGoose={useGoose}
          onUseGooseChange={onUseGooseChange}
          agencyMode={effectiveAgencyMode}
          onAgencyModeChange={handleAgencyModeChange}
          model={model}
          onModelChange={onModelChange}
          availableModels={workspaceModels}
          responseStyle={responseStyle}
          onResponseStyleChange={onResponseStyleChange}
          temperature={temperature}
          onTemperatureChange={onTemperatureChange}
          contextSize={contextSize}
          onContextSizeChange={onContextSizeChange}
          contextSizes={contextSizes}
          contextLabels={contextLabels}
        />

        <Divider />

        {/* Advanced Goose Settings - Collapsible */}
        {useGoose && (
          <>
            {/* TTS Settings - Collapsed by default */}
            <Accordion allowToggle sx={{ '& .chakra-accordion__item': { border: 'none !important', boxShadow: 'none !important' } }}>
              <AccordionItem
                border="none"
                boxShadow="none"
                bg={accordionBg}
                borderRadius="lg"
                overflow="hidden"
                mb={2}
                transition="all 0.2s"
              >
                <AccordionButton
                  px={2}
                  py={1.5}
                  bg={accordionBg}
                  _hover={{ bg: accordionHoverBg }}
                  _expanded={{ bg: accordionBg }}
                >
                  <HStack flex="1" textAlign="left" spacing={1.5}>
                    <Icon as={FiVolume2} boxSize={3.5} color="purple.500" />
                    <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                      Read Aloud (Gemini TTS)
                    </Text>
                    <Badge colorScheme="purple" fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                      AI Voice
                    </Badge>
                  </HStack>
                  <AccordionIcon color={mutedColor} boxSize={5} />
                </AccordionButton>
                <AccordionPanel px={3} pb={3} pt={0}>
                  <TTSSettingsPanel
                    voice={ttsSettings.voice}
                    speed={ttsSettings.speed}
                    pitch={ttsSettings.pitch}
                    model={ttsSettings.model}
                    onVoiceChange={(voice) => setTTSSettings(prev => ({ ...prev, voice }))}
                    onSpeedChange={(speed) => setTTSSettings(prev => ({ ...prev, speed }))}
                    onPitchChange={(pitch) => setTTSSettings(prev => ({ ...prev, pitch }))}
                    onModelChange={(model) => setTTSSettings(prev => ({ ...prev, model }))}
                  />
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
            {/* Web Search Settings - Collapsed by default */}
            <Accordion allowToggle sx={{ '& .chakra-accordion__item': { border: 'none !important', boxShadow: 'none !important' } }}>
              <AccordionItem
                border="none"
                boxShadow="none"
                bg={accordionBg}
                borderRadius="lg"
                overflow="hidden"
                mb={2}
                transition="all 0.2s"
              >
                <AccordionButton
                  px={2}
                  py={1.5}
                  bg={accordionBg}
                  _hover={{ bg: accordionHoverBg }}
                  _expanded={{ bg: accordionBg }}
                >
                  <HStack flex="1" textAlign="left" spacing={1.5}>
                    <Icon as={FiGlobe} boxSize={3.5} color="blue.500" />
                    <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                      Web Search Provider
                    </Text>
                    <Badge colorScheme={webSearchProvider === 'perplexica' ? 'green' : 'blue'} fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                      {webSearchProvider === 'perplexica' ? 'Local' : 'Cloud'}
                    </Badge>
                  </HStack>
                  <AccordionIcon color={mutedColor} boxSize={5} />
                </AccordionButton>
                <AccordionPanel px={3} pb={3} pt={0}>
                  <VStack align="stretch" spacing={3}>
                    <Text fontSize="xs" color={mutedColor}>
                      Choose between Perplexity (Cloud) for deep research or Perplexica (Local) for private queries.
                    </Text>
                    <HStack spacing={2}>
                      <Button
                        size="xs"
                        flex={1}
                        variant={webSearchProvider === 'perplexity' ? 'solid' : 'outline'}
                        colorScheme="blue"
                        onClick={() => onWebSearchProviderChange && onWebSearchProviderChange('perplexity')}
                        leftIcon={<Icon as={FiCloud} />}
                      >
                        Perplexity
                      </Button>
                      <Button
                        size="xs"
                        flex={1}
                        variant={webSearchProvider === 'perplexica' ? 'solid' : 'outline'}
                        colorScheme="green"
                        onClick={() => onWebSearchProviderChange && onWebSearchProviderChange('perplexica')}
                        leftIcon={<Icon as={FiShield} />}
                      >
                        Perplexica
                      </Button>
                    </HStack>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            {/* Deep Research - Collapsed by default */}
            <Accordion allowToggle sx={{ '& .chakra-accordion__item': { border: 'none !important', boxShadow: 'none !important' } }}>
              <AccordionItem
                border="none"
                boxShadow="none"
                bg={accordionBg}
                borderRadius="lg"
                overflow="hidden"
                mb={2}
                transition="all 0.2s"
              >
                <AccordionButton
                  px={2}
                  py={1.5}
                  bg={accordionBg}
                  _hover={{ bg: accordionHoverBg }}
                  _expanded={{ bg: accordionBg }}
                >
                  <HStack flex="1" textAlign="left" spacing={1.5}>
                    <Icon as={FiSearch} boxSize={3.5} color="orange.500" />
                    <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                      Deep Research Settings
                    </Text>
                    <Badge colorScheme="orange" fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                      Perplexity
                    </Badge>
                  </HStack>
                  <AccordionIcon color={mutedColor} boxSize={5} />
                </AccordionButton>
                <AccordionPanel px={3} pb={3} pt={0}>
                  <DeepResearchSettings
                    maxTokens={deepResearchMaxTokens}
                    onMaxTokensChange={onDeepResearchMaxTokensChange}
                    researchModel={deepResearchModel}
                    onResearchModelChange={onDeepResearchModelChange}
                    clarificationQuestions={deepResearchClarificationQuestions}
                    onClarificationQuestionsChange={onDeepResearchClarificationQuestionsChange}
                    sourceRecency={deepResearchSourceRecency}
                    onSourceRecencyChange={onDeepResearchSourceRecencyChange}
                    autoPlanning={deepResearchAutoPlanning}
                    onAutoPlanningChange={onDeepResearchAutoPlanningChange}
                  />
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            <Accordion allowToggle sx={{ '& .chakra-accordion__item': { border: 'none !important', boxShadow: 'none !important' } }}>
              <AccordionItem
                border="none"
                boxShadow="none"
                bg={accordionBg}
                borderRadius="lg"
                overflow="hidden"
                mb={2}
                transition="all 0.2s"
              >
                <AccordionButton
                  px={2}
                  py={1.5}
                  bg={accordionBg}
                  _hover={{ bg: accordionHoverBg }}
                  _expanded={{ bg: accordionBg }}
                >
                  <HStack flex="1" textAlign="left" spacing={1.5}>
                    <Icon as={FiSettings} boxSize={3.5} color="cyan.500" />
                    <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                      Advanced Goose Settings
                    </Text>
                    <Badge colorScheme="cyan" fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                      Optional
                    </Badge>
                  </HStack>
                  <AccordionIcon color={mutedColor} boxSize={5} />
                </AccordionButton>
                <AccordionPanel px={3} pb={3} pt={0}>
                  <GooseAdvancedSettings
                    {...advancedSettings}
                    onMaxTurnsChange={(val) => setAdvancedSettings(prev => ({ ...prev, maxTurns: val }))}
                    onContextStrategyChange={(val) => setAdvancedSettings(prev => ({ ...prev, contextStrategy: val }))}
                    onAutoCompactThresholdChange={(val) => setAdvancedSettings(prev => ({ ...prev, autoCompactThreshold: val }))}
                    onSessionAutosaveChange={(val) => setAdvancedSettings(prev => ({ ...prev, sessionAutosave: val }))}
                    onEnableLeadWorkerChange={(val) => setAdvancedSettings(prev => ({ ...prev, enableLeadWorker: val }))}
                    onLeadModelChange={(val) => setAdvancedSettings(prev => ({ ...prev, leadModel: val }))}
                    onLeadTurnsChange={(val) => setAdvancedSettings(prev => ({ ...prev, leadTurns: val }))}
                    onEnablePlanningChange={(val) => setAdvancedSettings(prev => ({ ...prev, enablePlanning: val }))}
                    onPlannerModelChange={(val) => setAdvancedSettings(prev => ({ ...prev, plannerModel: val }))}
                    onEnableRouterChange={(val) => setAdvancedSettings(prev => ({ ...prev, enableRouter: val }))}
                    onEnableToolshimChange={(val) => setAdvancedSettings(prev => ({ ...prev, enableToolshim: val }))}
                    onToolOutputPriorityChange={(val) => setAdvancedSettings(prev => ({ ...prev, toolOutputPriority: val }))}
                    onSecurityPromptEnabledChange={(val) => setAdvancedSettings(prev => ({ ...prev, securityPromptEnabled: val }))}
                    onSecurityThresholdChange={(val) => setAdvancedSettings(prev => ({ ...prev, securityThreshold: val }))}
                    onDebugEnabledChange={(val) => setAdvancedSettings(prev => ({ ...prev, debugEnabled: val }))}
                    onShowCostsChange={(val) => setAdvancedSettings(prev => ({ ...prev, showCosts: val }))}
                    availableModels={workspaceModels}
                    showSectionHeaders={true}
                    collapsible={true}
                    defaultExpanded={false}
                  />
                </AccordionPanel>
              </AccordionItem>

              {/* Performance Settings */}
              <AccordionItem
                border="none"
                boxShadow="none"
                bg={accordionBg}
                borderRadius="lg"
                overflow="hidden"
                mb={2}
                transition="all 0.2s"
              >
                <AccordionButton
                  px={2}
                  py={1.5}
                  bg={accordionBg}
                  _hover={{ bg: accordionHoverBg }}
                  _expanded={{ bg: accordionBg }}
                >
                  <HStack flex="1" textAlign="left" spacing={1.5}>
                    <Icon as={FiZap} boxSize={3.5} color="yellow.500" />
                    <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                      Performance Optimizations
                    </Text>
                    <Badge colorScheme="yellow" fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                      New
                    </Badge>
                  </HStack>
                  <AccordionIcon color={mutedColor} boxSize={5} />
                </AccordionButton>
                <AccordionPanel px={3} pb={3} pt={0}>
                  <PerformanceSettingsPanel
                    agentId="workspace-ai"
                  />
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </>
        )}

        {/* MCP Servers - Prominently displayed when using Goose */}
        {useGoose && mcpServers && (
          <Box
            border="none"
            boxShadow="none"
            bg={accordionBg}
            borderRadius="lg"
            overflow="hidden"
            mb={2}
            transition="all 0.2s"
          >
            {/* Collapsible Header */}
            <HStack
              px={2}
              py={1.5}
              justify="space-between"
              cursor="pointer"
              onClick={() => setMcpExpanded(!mcpExpanded)}
              _hover={{ bg: 'gray.50' }}
              transition="all 0.2s"
            >
              <HStack spacing={1.5}>
                <Icon as={FiServer} boxSize={3.5} color="blue.500" />
                <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                  MCP Servers
                </Text>
                <Badge colorScheme="blue" fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                  Context Protocol
                </Badge>
              </HStack>
              <Icon
                as={mcpExpanded ? FiChevronDown : FiChevronRight}
                boxSize={5}
                color={mutedColor}
                transition="transform 0.2s"
              />
            </HStack>

            {/* Content */}
            <Collapse in={mcpExpanded} animateOpacity>
              <Box px={3} pb={3} pt={0}>
                <MCPServersSection
                  agentId="workspace-ai"
                  mcpServers={mcpServers}
                  onMCPServersChange={onMCPServersChange!}
                  initialExpanded={true}
                  isLoading={mcpLoading}
                  hideHeader={true}
                />
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Knowledge Sources */}
        <Box
          mb={2}
          borderRadius="lg"
          bg={accordionBg}
          border="none"
          boxShadow="none"
          overflow="hidden"
          transition="all 0.2s"
        >
          {/* Collapsible Header */}
          <HStack
            px={2}
            py={1.5}
            justify="space-between"
            cursor="pointer"
            onClick={() => setKnowledgeSourcesExpanded(!knowledgeSourcesExpanded)}
            _hover={{ bg: 'gray.50' }}
            transition="all 0.2s"
          >
            <HStack spacing={1.5}>
              <Icon as={FiDatabase} boxSize={3.5} color="green.500" />
              <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">Knowledge Sources</Text>
            </HStack>
            <Icon
              as={knowledgeSourcesExpanded ? FiChevronDown : FiChevronRight}
              boxSize={5}
              color={mutedColor}
              transition="transform 0.2s"
            />
          </HStack>

          {/* Collapsible Content */}
          <Collapse in={knowledgeSourcesExpanded} animateOpacity>
            <VStack spacing={2} align="stretch" px={3} pb={3} pt={0}>
              <HStack justify="space-between">
                <Text fontSize="xs" color={textColor} fontWeight="500">Current Page</Text>
                <Switch
                  size="sm"
                  colorScheme="green"
                  isChecked={knowledgeSources.currentPage}
                  onChange={(e) =>
                    onKnowledgeSourcesChange?.({
                      ...knowledgeSources,
                      currentPage: e.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="xs" color={textColor} fontWeight="500">Workspace Pages</Text>
                <Switch
                  size="sm"
                  colorScheme="green"
                  isChecked={knowledgeSources.workspace}
                  onChange={(e) =>
                    onKnowledgeSourcesChange?.({
                      ...knowledgeSources,
                      workspace: e.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="xs" color={textColor} fontWeight="500">Databases</Text>
                <Switch
                  size="sm"
                  colorScheme="green"
                  isChecked={knowledgeSources.databases}
                  onChange={(e) =>
                    onKnowledgeSourcesChange?.({
                      ...knowledgeSources,
                      databases: e.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack justify="space-between">
                <HStack spacing={1}>
                  <Text fontSize="xs" color={textColor} fontWeight="500">Knowledge Graph</Text>
                  <Badge colorScheme="purple" fontSize="2xs" px={1.5} py={0}>RAG</Badge>
                </HStack>
                <Switch
                  size="sm"
                  colorScheme="green"
                  isChecked={knowledgeSources.knowledgeGraph}
                  onChange={(e) =>
                    onKnowledgeSourcesChange?.({
                      ...knowledgeSources,
                      knowledgeGraph: e.target.checked,
                    })
                  }
                />
              </HStack>
            </VStack>
          </Collapse>
        </Box>

        {/* RAG Settings Accordion */}
        <Accordion allowToggle mb={2} sx={{ '& .chakra-accordion__item': { border: 'none !important', boxShadow: 'none !important' } }}>
          <AccordionItem
            border="none"
            boxShadow="none"
            bg={accordionBg}
            borderRadius="lg"
            overflow="hidden"
            transition="all 0.2s"
          >
            <AccordionButton px={2} py={1.5} bg={accordionBg} _hover={{ bg: accordionHoverBg }} _expanded={{ bg: accordionBg }}>
              <HStack flex="1" textAlign="left" spacing={1.5}>
                <Icon as={FiBox} boxSize={3.5} color="purple.500" />
                <Text fontSize="xs" fontWeight="600" color={textColor} lineHeight="1.2">
                  Advanced RAG Settings
                </Text>
                <Badge colorScheme="purple" fontSize="2xs" px={2} py={0.5} textTransform="uppercase">
                  Experimental
                </Badge>
              </HStack>
              <AccordionIcon color={mutedColor} boxSize={5} />
            </AccordionButton>
            <AccordionPanel px={3} pb={3} pt={0}>
              <VStack spacing={3} align="stretch">
                <FormControl>
                  <FormLabel fontSize="xs" color={mutedColor}>
                    Chunk Size
                  </FormLabel>
                  <Select size="sm" defaultValue="512" borderColor={borderColor}>
                    <option value="256">256 tokens</option>
                    <option value="512">512 tokens</option>
                    <option value="1024">1024 tokens</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color={mutedColor}>
                    Similarity Threshold
                  </FormLabel>
                  <Slider defaultValue={0.7} min={0.5} max={0.95} step={0.05}>
                    <SliderTrack bg={useSemanticToken('surface.elevated')}>
                      <SliderFilledTrack bg="purple.500" />
                    </SliderTrack>
                    <SliderThumb boxSize={3} />
                  </Slider>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color={mutedColor}>
                    Max Retrieved Chunks
                  </FormLabel>
                  <Select size="sm" defaultValue="5" borderColor={borderColor}>
                    <option value="3">3 chunks</option>
                    <option value="5">5 chunks</option>
                    <option value="10">10 chunks</option>
                  </Select>
                </FormControl>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>

        {/* Info Box */}
        <Box
          p={3}
          bg={accordionBg}
          borderRadius="md"
          borderLeft="3px solid"
          borderColor="blue.500"
          boxShadow="sm"
        >
          <VStack align="start" spacing={1}>
            <HStack spacing={1.5}>
              <Text fontSize="xs" fontWeight="600" color={accentBlue}>
                💡 Workspace AI Tips
              </Text>
            </HStack>
            <Text fontSize="xs" color={accentGreen}>
              • Enable Knowledge Graph for RAG-powered answers
            </Text>
            <Text fontSize="xs" color={accentPurple}>
              • Use MCP servers to access external data sources
            </Text>
            <Text fontSize="xs" color={accentBlue}>
              • Adjust creativity for different tasks
            </Text>
          </VStack>
        </Box>
      </VStack>
    </VStack>
  );
}
