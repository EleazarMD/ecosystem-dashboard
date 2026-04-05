import React, { useState, useCallback, useEffect } from 'react';
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
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  Button,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { FiCpu, FiZap, FiGlobe, FiFileText, FiInfo, FiImage, FiBookmark, FiSave, FiTrash2, FiChevronDown } from 'react-icons/fi';
import {
  type ResearchPreset,
  BUILT_IN_PRESETS,
  getAllPresets,
  saveCustomPreset,
  deleteCustomPreset,
} from '@/lib/research/presets';
import {
  type ScheduledResearch,
  getScheduledResearch,
  deleteScheduledResearch as deleteScheduledResearchFn,
  toggleScheduledResearch as toggleScheduledResearchFn,
} from '@/lib/research/scheduled-research';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DeepResearchSettingsPanelProps {
  // Model settings
  model?: string;
  onModelChange?: (model: string) => void;

  // Clarifying workflow toggle
  enableClarification?: boolean;
  onEnableClarificationChange?: (enabled: boolean) => void;

  // Deep research settings
  mode?: 'synchronous' | 'asynchronous';
  onModeChange?: (mode: 'synchronous' | 'asynchronous') => void;

  // Audience level for clarification questions
  audienceLevel?: 'clinical_researcher' | 'data_scientist' | 'software_engineer' | 'entrepreneur' | 'content_creator' | 'investor' | 'mba_executive' | 'general';
  onAudienceLevelChange?: (level: string) => void;

  // Image generation tool state
  standaloneImageMode?: boolean;

  // Output formats
  outputFormats?: {
    academicReport: boolean;
    executiveSummary: boolean;
    podcastScript: boolean;
    presentationSlides: boolean;
    visualInfographic?: boolean; // O1 Pro only
    newsStory?: boolean; // Daily News Stories integration
  };
  onOutputFormatsChange?: (formats: any) => void;

  // Data sources
  dataSources?: {
    webResearch: boolean;
    knowledgeGraph: boolean;
    codeAnalysis: boolean;
    customMCP: boolean;
    emailIntelligence: boolean; // Hermes Core email data
    contactNetwork: boolean; // Neo4j contact relationships
  };
  onDataSourcesChange?: (sources: any) => void;

  // Research depth
  researchDepth?: number;
  onResearchDepthChange?: (depth: number) => void;

  // Reasoning effort (TPM and quality control)
  reasoningEffort?: 'low' | 'medium' | 'high';
  onReasoningEffortChange?: (effort: 'low' | 'medium' | 'high') => void;

  // Synthesis GPT (format-specific output conversion)
  enableSynthesis?: boolean;
  onEnableSynthesisChange?: (enabled: boolean) => void;

  // Perplexity-specific settings
  sonarModel?: 'sonar-deep-research' | 'sonar-pro' | 'sonar-reasoning' | 'sonar';
  onSonarModelChange?: (model: string) => void;
  sourceRecency?: 'day' | 'week' | 'month' | 'year' | 'any';
  onSourceRecencyChange?: (recency: string) => void;
  searchDomainFocus?: string;
  onSearchDomainFocusChange?: (domain: string) => void;

  // Multi-Model Consensus
  enableConsensus?: boolean;
  onEnableConsensusChange?: (enabled: boolean) => void;
  consensusModels?: string[];
  onConsensusModelsChange?: (models: string[]) => void;

  // PDF attachment context
  hasPdfAttachment?: boolean;
  pendingAttachments?: Array<{ name: string; size: number; type: string }>;
}

export default function DeepResearchSettingsPanel({
  model = 'o3-mini',
  onModelChange,
  enableClarification = true,
  onEnableClarificationChange,
  mode = 'asynchronous',
  onModeChange,
  audienceLevel = 'general',
  onAudienceLevelChange,
  standaloneImageMode = false,
  outputFormats = {
    academicReport: true,
    executiveSummary: false,
    podcastScript: false,
    presentationSlides: false,
  },
  onOutputFormatsChange,
  dataSources = {
    webResearch: true,
    knowledgeGraph: false,
    codeAnalysis: false,
    customMCP: false,
    emailIntelligence: false,
    contactNetwork: false,
  },
  onDataSourcesChange,
  researchDepth = 3,
  onResearchDepthChange,
  reasoningEffort = 'medium',
  onReasoningEffortChange,
  enableSynthesis = true,
  onEnableSynthesisChange,
  sonarModel = 'sonar-deep-research',
  onSonarModelChange,
  sourceRecency = 'any',
  onSourceRecencyChange,
  searchDomainFocus = '',
  onSearchDomainFocusChange,
  enableConsensus = false,
  onEnableConsensusChange,
  consensusModels = ['perplexity', 'o3-mini'],
  onConsensusModelsChange,
  hasPdfAttachment = false,
  pendingAttachments = [],
}: DeepResearchSettingsPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  // Model options for deep research - simplified to cost-effective options
  const deepResearchModels = [
    { value: 'perplexity', label: '🔍 Perplexity', cost: '$1-5', recommended: true },
    { value: 'gemini-deep-research', label: '🔬 Gemini Deep Research', cost: '$2-12' },
    { value: 'o3-mini', label: '⚡ OpenAI o3-mini', cost: '$1-3' },
  ];

  // PDF analysis models - shown when a PDF is attached
  const pdfAnalysisModels = [
    { value: 'auto', label: '🤖 Auto (Smart Selection)', cost: 'Varies', recommended: true },
    { value: 'gemini-pdf', label: '📄 Gemini (Large PDFs)', cost: '$0.01-0.10' },
    { value: 'qwen-vlm', label: '🖼️ Dual Model (VLM + Qwen3)', cost: 'Free (Local)' },
    { value: 'qwen3', label: '⚡ Qwen3-32B (Text-Only)', cost: 'Free (Local)' },
  ];

  // Use PDF models when a PDF is attached, otherwise use research models
  const availableModels = hasPdfAttachment ? pdfAnalysisModels : deepResearchModels;

  // Auto-disable web search when PDF is attached (PDF analysis doesn't need web search)
  useEffect(() => {
    if (hasPdfAttachment && dataSources.webResearch) {
      onDataSourcesChange?.({ ...dataSources, webResearch: false });
    }
  }, [hasPdfAttachment]);

  // Model-specific token limits
  const modelTokenLimits: Record<string, number[]> = {
    'perplexity': [8000, 16000, 32000, 48000, 64000],
    'gemini-deep-research': [32000, 64000, 128000, 256000, 500000],
    'o3-mini': [10000, 25000, 50000, 75000, 100000],
  };

  const modelToolCallLimits: Record<string, number[]> = {
    'perplexity': [10, 15, 20, 25, 30],
    'gemini-deep-research': [10, 20, 50, 100, 200],
    'o3-mini': [3, 5, 8, 12, 15],
  };

  // Get current model's limits
  const currentTokenLimits = modelTokenLimits[model || 'o3-mini'] || modelTokenLimits['o3-mini'];
  const currentToolCallLimits = modelToolCallLimits[model || 'o3-mini'] || modelToolCallLimits['o3-mini'];

  // Dynamic depth labels based on model
  const depthLabels = currentTokenLimits.map((tokens, index) => {
    const searches = currentToolCallLimits[index];
    const tokenLabel = tokens >= 1000 ? `${Math.round(tokens / 1000)}K` : `${tokens}`;
    return `Depth ${index + 1} (${tokenLabel}, ${searches} searches)`;
  });

  // Model capabilities
  const isPerplexity = model === 'perplexity';
  const isGeminiDeepResearch = model === 'gemini-deep-research';
  const isO3Mini = model === 'o3-mini';
  const supportsClarification = isO3Mini; // Only o3-mini supports clarification workflow
  const isDeepResearchModel = isGeminiDeepResearch;

  // ── Presets ──
  const toast = useToast();
  const [presets, setPresets] = useState<ResearchPreset[]>(() => getAllPresets());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const refreshPresets = useCallback(() => setPresets(getAllPresets()), []);

  // ── Scheduled Research ──
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledResearch[]>(() => getScheduledResearch());
  const refreshScheduledJobs = useCallback(() => setScheduledJobs(getScheduledResearch()), []);

  const applyPreset = useCallback((preset: ResearchPreset) => {
    onModelChange?.(preset.model);
    onAudienceLevelChange?.(preset.audienceLevel);
    onResearchDepthChange?.(preset.researchDepth);
    onReasoningEffortChange?.(preset.reasoningEffort);
    onEnableClarificationChange?.(preset.enableClarification);
    onEnableSynthesisChange?.(preset.enableSynthesis);
    onModeChange?.(preset.mode);
    onOutputFormatsChange?.(preset.outputFormats);
    onDataSourcesChange?.({ ...preset.dataSources });
    if (preset.sonarModel) onSonarModelChange?.(preset.sonarModel);
    if (preset.sourceRecency) onSourceRecencyChange?.(preset.sourceRecency);
    if (preset.searchDomainFocus !== undefined) onSearchDomainFocusChange?.(preset.searchDomainFocus);
    setActivePresetId(preset.id);
    toast({ title: `${preset.icon} ${preset.name}`, description: 'Preset applied', status: 'success', duration: 1500, position: 'bottom-right' });
  }, [onModelChange, onAudienceLevelChange, onResearchDepthChange, onReasoningEffortChange, onEnableClarificationChange, onEnableSynthesisChange, onModeChange, onOutputFormatsChange, onDataSourcesChange, onSonarModelChange, onSourceRecencyChange, onSearchDomainFocusChange, toast]);

  const handleSavePreset = useCallback(() => {
    const name = prompt('Preset name:');
    if (!name) return;
    const id = `custom-${Date.now()}`;
    const preset: ResearchPreset = {
      id,
      name,
      icon: '📌',
      description: 'Custom preset',
      builtIn: false,
      model: model || 'o3-mini',
      sonarModel,
      audienceLevel: audienceLevel || 'general',
      researchDepth,
      reasoningEffort: reasoningEffort || 'medium',
      enableClarification: enableClarification ?? true,
      enableSynthesis: enableSynthesis ?? true,
      mode: mode || 'asynchronous',
      sourceRecency,
      searchDomainFocus,
      outputFormats: { ...outputFormats },
      dataSources: { ...dataSources },
    };
    saveCustomPreset(preset);
    refreshPresets();
    setActivePresetId(id);
    toast({ title: '📌 Preset saved', description: name, status: 'success', duration: 2000, position: 'bottom-right' });
  }, [model, sonarModel, audienceLevel, researchDepth, reasoningEffort, enableClarification, enableSynthesis, mode, sourceRecency, searchDomainFocus, outputFormats, dataSources, refreshPresets, toast]);

  const handleDeletePreset = useCallback((id: string) => {
    deleteCustomPreset(id);
    refreshPresets();
    if (activePresetId === id) setActivePresetId(null);
    toast({ title: 'Preset deleted', status: 'info', duration: 1500, position: 'bottom-right' });
  }, [activePresetId, refreshPresets, toast]);

  const builtInPresets = presets.filter((p) => p.builtIn);
  const customPresets = presets.filter((p) => !p.builtIn);

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor}>
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiZap} color={mutedColor} />
            <Text fontSize="md" fontWeight="600" color={textColor}>
              Research Settings
            </Text>
          </HStack>
          <Tooltip label="Configure LLM models and research parameters">
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

      {/* Tabbed Content */}
      <Tabs variant="soft-rounded" colorScheme="purple" size="sm" flex="1" display="flex" flexDirection="column">
        <TabList px={4} pt={3} pb={2} gap={2} flexWrap="wrap">
          <Tab fontSize="xs" px={3}>
            <Icon as={FiCpu} mr={1.5} />
            LLM
          </Tab>
          <Tab fontSize="xs" px={3}>
            <Icon as={FiGlobe} mr={1.5} />
            Research
          </Tab>
          <Tab fontSize="xs" px={3}>
            <Icon as={FiFileText} mr={1.5} />
            Output
          </Tab>
        </TabList>

        <TabPanels flex="1" overflowY="auto">
          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1: LLM SETTINGS - Model selection, reasoning, synthesis
              ═══════════════════════════════════════════════════════════════════ */}
          <TabPanel px={4} py={3}>
            <VStack spacing={3} align="stretch">

              {/* PDF Attachment Info */}
              {hasPdfAttachment && pendingAttachments.length > 0 && (
                <Box p={3} bg={useSemanticToken('surface.raised')} borderRadius="md" borderLeft="3px solid" borderColor="purple.500">
                  <HStack spacing={2} mb={1}>
                    <Icon as={FiFileText} color="purple.500" />
                    <Text fontSize="sm" fontWeight="600" color={textColor}>PDF Analysis Mode</Text>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor}>
                    {pendingAttachments.filter(f => f.name.toLowerCase().endsWith('.pdf')).map(f => f.name).join(', ')}
                  </Text>
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    Document will be analyzed and saved with vector embeddings for RAG retrieval.
                  </Text>
                  {/* Workflow visualization for dual-model */}
                  {(model === 'qwen-vlm' || model === 'auto') && (
                    <Box mt={2} p={2} bg="whiteAlpha.50" borderRadius="md" borderLeft="2px solid" borderColor="purple.400">
                      <Text fontSize="2xs" fontWeight="600" color="purple.400" mb={1}>Dual-Model Workflow:</Text>
                      <VStack align="start" spacing={0.5}>
                        <Text fontSize="2xs" color={mutedColor}>1. 📄 Extract PDF pages as images</Text>
                        <Text fontSize="2xs" color={mutedColor}>2. 🖼️ VLM analyzes charts/graphs/tables</Text>
                        <Text fontSize="2xs" color={mutedColor}>3. 📝 Qwen3 analyzes extracted text</Text>
                        <Text fontSize="2xs" color={mutedColor}>4. 🔗 Combined into unified report</Text>
                      </VStack>
                    </Box>
                  )}
                </Box>
              )}

              {/* Model Selection */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
                  {hasPdfAttachment ? 'PDF Analysis Model' : 'Primary Model'}
                </FormLabel>
                <Select
                  value={model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    onModelChange?.(newModel);
                    const deepResearchModelsLocal = ['o3-deep-research'];
                    if (deepResearchModelsLocal.includes(newModel) && !dataSources.webResearch) {
                      onDataSourcesChange?.({ ...dataSources, webResearch: true });
                    }
                  }}
                  size="sm"
                  borderColor={borderColor}
                >
                  {availableModels.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" color={mutedColor} mt={1}>
                  {hasPdfAttachment ? (
                    model === 'auto' ? 'All PDFs → Gemini 2.0 Flash (1M context, native PDF & vision support)' :
                    model === 'gemini-pdf' ? '$0.01-0.10 • Best for large PDFs (>32K tokens) with native vision' :
                    model === 'qwen-vlm' ? 'Free • VLM analyzes images → Qwen3 analyzes text → Combined report' :
                    model === 'qwen3' ? 'Free (Local) • Text extraction only, no image analysis' :
                    'Select a PDF analysis model'
                  ) : (
                    model === 'perplexity' ? '$1-5/query • Real-time web search with citations' :
                    model === 'gemini-deep-research' ? '$2-12/query • Autonomous multi-step research' :
                    model === 'o3-mini' ? '$1-3/query • Fast reasoning model' :
                    'Select a model'
                  )}
                </Text>
              </FormControl>

              {/* Perplexity Sonar Model */}
              {isPerplexity && (
                <>
                  <Divider />
                  <FormControl>
                    <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
                      Sonar Model
                    </FormLabel>
                    <Select
                      value={sonarModel}
                      onChange={(e) => onSonarModelChange?.(e.target.value)}
                      size="sm"
                      borderColor={borderColor}
                    >
                      <option value="sonar-deep-research">🔬 sonar-deep-research (Comprehensive)</option>
                      <option value="sonar-pro">⚡ sonar-pro (Fast Search)</option>
                      <option value="sonar-reasoning">🧠 sonar-reasoning (Analysis)</option>
                      <option value="sonar">💬 sonar (Basic)</option>
                    </Select>
                    <Text fontSize="xs" color={mutedColor} mt={1}>
                      {sonarModel === 'sonar-deep-research' ? 'Multi-step research with exhaustive source searching' :
                        sonarModel === 'sonar-pro' ? 'Fast web search with citations' :
                        sonarModel === 'sonar-reasoning' ? 'Deep analysis with step-by-step reasoning' :
                        'Basic conversational search'}
                    </Text>
                  </FormControl>
                </>
              )}

              {/* Reasoning Effort - O1 models only */}
              {(model === 'o1-pro' || model === 'o1') && (
                <>
                  <Divider />
                  <FormControl>
                    <HStack justify="space-between" mb={1.5}>
                      <HStack>
                        <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
                          Reasoning Effort
                        </FormLabel>
                        <Badge colorScheme="gray" fontSize="2xs">TPM</Badge>
                      </HStack>
                    </HStack>
                    <Select
                      value={reasoningEffort}
                      onChange={(e) => onReasoningEffortChange?.(e.target.value as 'low' | 'medium' | 'high')}
                      size="sm"
                      borderColor={borderColor}
                    >
                      <option value="low">⚡ Low - Fast & Cheaper</option>
                      <option value="medium">⚖️ Medium - Balanced</option>
                      <option value="high">🎯 High - Maximum Quality</option>
                    </Select>
                    <Text fontSize="xs" color={mutedColor} mt={1}>
                      Controls reasoning depth and token usage
                    </Text>
                  </FormControl>
                </>
              )}

              {/* Synthesis GPT - Not needed for Perplexity or Gemini (they handle synthesis internally) */}
              {!standaloneImageMode && model !== 'gpt-image-1' && !isPerplexity && !isGeminiDeepResearch && (
                <>
                  <Divider />
                  <FormControl>
                    <HStack justify="space-between">
                      <HStack>
                        <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
                          Synthesis GPT
                        </FormLabel>
                        <Badge colorScheme="gray" fontSize="2xs">GPT-4o</Badge>
                      </HStack>
                      <Switch
                        size="sm"
                        colorScheme="gray"
                        isChecked={enableSynthesis}
                        onChange={(e) => onEnableSynthesisChange?.(e.target.checked)}
                      />
                    </HStack>
                    <Text fontSize="xs" color={mutedColor} mt={0.5}>
                      Convert research into format-specific outputs (+$0.02-0.10)
                    </Text>
                  </FormControl>
                </>
              )}

              {/* Multi-Model Consensus - Not applicable for Gemini or Perplexity (autonomous research) */}
              {!isGeminiDeepResearch && !isPerplexity && (
                <>
                  <Divider />
                  <FormControl>
                    <HStack justify="space-between">
                      <HStack>
                        <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
                          Multi-Model Consensus
                        </FormLabel>
                        <Badge colorScheme="orange" fontSize="2xs">Experimental</Badge>
                      </HStack>
                      <Switch
                        size="sm"
                        colorScheme="orange"
                        isChecked={enableConsensus}
                        onChange={(e) => onEnableConsensusChange?.(e.target.checked)}
                      />
                    </HStack>
                    <Text fontSize="xs" color={mutedColor} mt={0.5}>
                      Run query through multiple models and compare
                    </Text>
                {enableConsensus && (
                  <Box mt={2} p={2} bg={useSemanticToken('surface.base')} borderRadius="md" borderLeft="3px solid" borderColor="orange.500">
                    <VStack align="stretch" spacing={1}>
                      {[
                        { value: 'perplexity', label: '🔍 Perplexity' },
                        { value: 'o3-mini', label: '⭐ o3-mini' },
                        { value: 'o3', label: '⚖️ o3' },
                        { value: 'claude-sonnet-4-5', label: '🧠 Claude Sonnet' },
                        { value: 'gpt-4o', label: '💬 GPT-4o' },
                      ].map((m) => (
                        <HStack key={m.value} justify="space-between">
                          <Text fontSize="xs" color={textColor}>{m.label}</Text>
                          <Switch
                            size="sm"
                            colorScheme="orange"
                            isChecked={consensusModels.includes(m.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onConsensusModelsChange?.([...consensusModels, m.value]);
                              } else {
                                onConsensusModelsChange?.(consensusModels.filter(v => v !== m.value));
                              }
                            }}
                          />
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}
                  </FormControl>
                </>
              )}

              {/* Cost Estimate Card */}
              <Divider />
              <Box p={3} bg={useSemanticToken('surface.raised')} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="600" color={textColor}>Est. Cost</Text>
                  <Badge colorScheme="gray" fontSize="sm" px={2}>
                    {isPerplexity ? (
                      sonarModel === 'sonar-deep-research' ? '$2-8' :
                      sonarModel === 'sonar-pro' ? '$0.30-1' : '$0.10-1'
                    ) : isGeminiDeepResearch ? '$2-12' : '$1-3'}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color={mutedColor}>
                  Model: {isPerplexity ? sonarModel : model}
                </Text>
              </Box>

            </VStack>
          </TabPanel>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2: RESEARCH SETTINGS - Depth, audience, sources, presets
              ═══════════════════════════════════════════════════════════════════ */}
          <TabPanel px={4} py={3}>
            <VStack spacing={3} align="stretch">

              {/* Research Presets */}
        <HStack spacing={2}>
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiBookmark} />}
              rightIcon={<Icon as={FiChevronDown} />}
              flex={1}
              fontSize="sm"
              fontWeight="500"
              borderColor={borderColor}
            >
              {activePresetId
                ? presets.find((p) => p.id === activePresetId)?.name || 'Custom'
                : 'Load Preset'}
            </MenuButton>
            <MenuList maxH="320px" overflowY="auto" zIndex={20}>
              <MenuGroup title="Built-in Presets">
                {builtInPresets.map((p) => (
                  <MenuItem
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    fontSize="sm"
                    fontWeight={activePresetId === p.id ? 'bold' : 'normal'}
                  >
                    <HStack spacing={2} w="full">
                      <Text>{p.icon}</Text>
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm">{p.name}</Text>
                        <Text fontSize="2xs" color={mutedColor}>{p.description}</Text>
                      </VStack>
                    </HStack>
                  </MenuItem>
                ))}
              </MenuGroup>
              {customPresets.length > 0 && (
                <>
                  <MenuDivider />
                  <MenuGroup title="My Presets">
                    {customPresets.map((p) => (
                      <MenuItem
                        key={p.id}
                        fontSize="sm"
                        fontWeight={activePresetId === p.id ? 'bold' : 'normal'}
                      >
                        <HStack justify="space-between" w="full">
                          <HStack spacing={2} flex={1} onClick={() => applyPreset(p)}>
                            <Text>{p.icon}</Text>
                            <Text fontSize="sm">{p.name}</Text>
                          </HStack>
                          <IconButton
                            aria-label="Delete preset"
                            icon={<Icon as={FiTrash2} />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.id); }}
                          />
                        </HStack>
                      </MenuItem>
                    ))}
                  </MenuGroup>
                </>
              )}
            </MenuList>
          </Menu>
          <Tooltip label="Save current settings as a preset">
            <IconButton
              aria-label="Save preset"
              icon={<Icon as={FiSave} />}
              size="sm"
              variant="outline"
              borderColor={borderColor}
              onClick={handleSavePreset}
            />
          </Tooltip>
        </HStack>

        <Divider />

        {/* Clarifying Workflow - Only for supported models */}
        {supportsClarification && (
          <FormControl>
            <HStack justify="space-between">
              <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
                Clarifying Workflow
              </FormLabel>
              <Switch
                size="sm"
                colorScheme="gray"
                isChecked={enableClarification}
                onChange={(e) => onEnableClarificationChange?.(e.target.checked)}
              />
            </HStack>
            <Text fontSize="xs" color={mutedColor} mt={0.5}>
              Choose research approach before starting
            </Text>
          </FormControl>
        )}

        {/* Research Mode — OpenAI models only (Perplexity/Gemini handle mode internally) */}
        {!isPerplexity && !isGeminiDeepResearch && (
          <>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
                Mode
              </FormLabel>
              <Select
                value={mode}
                onChange={(e) => onModeChange?.(e.target.value as 'synchronous' | 'asynchronous')}
                size="sm"
                borderColor={borderColor}
              >
                <option value="synchronous">Synchronous (Wait for results)</option>
                <option value="asynchronous">Asynchronous (Background processing)</option>
              </Select>
              <Text fontSize="xs" color={mutedColor} mt={1}>
                {mode === 'synchronous' ? 'Wait for results (5-15 min)' : 'Background processing'}
              </Text>
            </FormControl>

            <Divider />
          </>
        )}

        {/* Perplexity-Specific Research Settings */}
        {isPerplexity && (
          <>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
                Source Recency
              </FormLabel>
              <Select
                value={sourceRecency}
                onChange={(e) => onSourceRecencyChange?.(e.target.value)}
                size="sm"
                borderColor={borderColor}
              >
                <option value="any">Any time</option>
                <option value="year">Past year</option>
                <option value="month">Past month</option>
                <option value="week">Past week</option>
                <option value="day">Past 24 hours</option>
              </Select>
              <Text fontSize="xs" color={mutedColor} mt={1}>
                Filter sources by publication date
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
                Domain Focus
              </FormLabel>
              <Input
                value={searchDomainFocus}
                onChange={(e) => onSearchDomainFocusChange?.(e.target.value)}
                placeholder="e.g. pubmed.gov, arxiv.org"
                size="sm"
                borderColor={borderColor}
              />
              <Text fontSize="xs" color={mutedColor} mt={1}>
                Prioritize results from specific domains (optional)
              </Text>
            </FormControl>

            <Divider />
          </>
        )}

        {/* Gemini Deep Research Info */}
        {isGeminiDeepResearch && (
          <>
            <Box p={3} bg={useSemanticToken('surface.raised')} borderRadius="md" borderLeft="3px solid" borderColor="blue.500">
              <HStack spacing={2} mb={1}>
                <Icon as={FiInfo} color="blue.500" />
                <Text fontSize="sm" fontWeight="600" color={textColor}>Autonomous Research</Text>
              </HStack>
              <Text fontSize="xs" color={mutedColor}>
                Gemini Deep Research autonomously manages search depth, source recency, and domain focus based on your prompt. 
                Include specific instructions in your query (e.g., "focus on 2025-2026 sources from arxiv.org").
              </Text>
            </Box>
            <Divider />
          </>
        )}

        {/* Target Audience */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
            Target Audience
          </FormLabel>
          <Select
            value={audienceLevel}
            onChange={(e) => onAudienceLevelChange?.(e.target.value)}
            size="sm"
            borderColor={borderColor}
            _hover={{ borderColor: useSemanticToken('border.strong') }}
          >
            <option value="clinical_researcher">🩺 Clinical Researcher (Physician + Research)</option>
            <option value="data_scientist">📊 Data Scientist</option>
            <option value="software_engineer">💻 Software Engineer / Developer</option>
            <option value="entrepreneur">🚀 Entrepreneur / Startup Founder</option>
            <option value="content_creator">🎙️ Content Creator / Podcaster</option>
            <option value="investor">💰 Investor</option>
            <option value="mba_executive">📈 MBA Executive</option>
            <option value="general">👥 General Audience</option>
          </Select>
          <Text fontSize="xs" color={mutedColor} mt={1}>
            Tailors questions to expertise level
          </Text>
        </FormControl>

        <Divider />

        {/* Research Depth — OpenAI models only (Perplexity/Gemini manage depth internally) */}
        {!isPerplexity && !isGeminiDeepResearch && (
          <>
            <FormControl>
              <VStack align="stretch" spacing={1.5}>
                <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
                  Research Depth
                </FormLabel>

                <Box
                  p={2}
                  bg={useSemanticToken('surface.base')}
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderColor={useSemanticToken('border.subtle')}
                >
                  <Text fontSize="sm" fontWeight="600" color={textColor}>
                    {depthLabels[researchDepth - 1]}
                  </Text>
                </Box>

                <Slider
                  value={researchDepth}
                  onChange={(val) => onResearchDepthChange?.(val)}
                  min={1}
                  max={5}
                  step={1}
                  mt={2}
                >
                  <SliderTrack bg={useSemanticToken('surface.raised')}>
                    <SliderFilledTrack bg={useSemanticToken('interactive.primary')} />
                  </SliderTrack>
                  <SliderThumb boxSize={5}>
                    <Box color={textColor} fontSize="xs" fontWeight="bold">
                      {researchDepth}
                    </Box>
                  </SliderThumb>
                </Slider>

                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color={mutedColor}>Faster / Cheaper</Text>
                  <Text fontSize="xs" color={mutedColor}>Thorough / Costly</Text>
                </HStack>
              </VStack>
            </FormControl>

            <Divider />
          </>
        )}

            </VStack>
          </TabPanel>

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3: OUTPUT SETTINGS - Formats, Data Sources
              ═══════════════════════════════════════════════════════════════════ */}
          <TabPanel px={4} py={3}>
            <VStack spacing={3} align="stretch">

        {/* Output Formats */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
            Output Formats
          </FormLabel>

          {standaloneImageMode || model === 'gpt-image-1' ? (
            <Text fontSize="xs" color={mutedColor} mt={1}>
              Using GPT Image 1 for direct image generation
            </Text>
          ) : (
            <VStack spacing={1.5} align="stretch" mt={1}>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>Academic Report</Text>
                <Switch
                  size="sm"
                  colorScheme="gray"
                  isChecked={outputFormats.academicReport}
                  onChange={(e) =>
                    onOutputFormatsChange?.({
                      ...outputFormats,
                      academicReport: e.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>Executive Summary</Text>
                <Switch
                  size="sm"
                  colorScheme="gray"
                  isChecked={outputFormats.executiveSummary}
                  onChange={(e) =>
                    onOutputFormatsChange?.({
                      ...outputFormats,
                      executiveSummary: e.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>Podcast Source Material</Text>
                <Switch
                  size="sm"
                  colorScheme="gray"
                  isChecked={outputFormats.podcastScript}
                  onChange={(e) =>
                    onOutputFormatsChange?.({
                      ...outputFormats,
                      podcastScript: e.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>Presentation Slides</Text>
                <Switch
                  size="sm"
                  colorScheme="gray"
                  isChecked={outputFormats.presentationSlides}
                  onChange={(e) =>
                    onOutputFormatsChange?.({
                      ...outputFormats,
                      presentationSlides: e.target.checked,
                    })
                  }
                />
              </HStack>
              {['o1-pro', 'o3-deep-research', 'o3-pro', 'o3'].includes(model) && (
                <HStack justify="space-between">
                  <HStack flex={1}>
                    <Text fontSize="sm" color={textColor}>Visual/Infographic</Text>
                    <Badge colorScheme="gray" fontSize="2xs">GPT Image 1</Badge>
                  </HStack>
                  <Switch
                    size="sm"
                    colorScheme="gray"
                    isChecked={outputFormats.visualInfographic || false}
                    onChange={(e) =>
                      onOutputFormatsChange?.({
                        ...outputFormats,
                        visualInfographic: e.target.checked,
                      })
                    }
                  />
                </HStack>
              )}
              <HStack justify="space-between">
                <HStack flex={1}>
                  <Text fontSize="sm" color={textColor}>News Story</Text>
                  <Badge colorScheme="blue" fontSize="2xs">Brave + Qwen3</Badge>
                </HStack>
                <Switch
                  size="sm"
                  colorScheme="blue"
                  isChecked={outputFormats.newsStory || false}
                  onChange={(e) =>
                    onOutputFormatsChange?.({
                      ...outputFormats,
                      newsStory: e.target.checked,
                    })
                  }
                />
              </HStack>
              {outputFormats.newsStory && (
                <Box
                  mt={2}
                  p={2}
                  bg={useSemanticToken('surface.base')}
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderColor="blue.500"
                >
                  <Text fontSize="xs" color={mutedColor}>
                    <strong>News Deep Research Pipeline:</strong>
                  </Text>
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    • Brave News API for article discovery
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    • Firecrawl for full content extraction
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    • Local Qwen3 32B for synthesis
                  </Text>
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    <em>Uses Goose Agent with News Deep Search recipe</em>
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </FormControl>

        <Divider />

        {/* Synthesis GPT — OpenAI models only (Perplexity returns formatted output directly) */}
        {!standaloneImageMode && model !== 'gpt-image-1' && !isPerplexity && (
          <>
            <FormControl>
              <HStack justify="space-between">
                <HStack>
                  <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={0}>
                    Synthesis GPT
                  </FormLabel>
                  <Badge colorScheme="gray" fontSize="2xs">GPT-4o</Badge>
                </HStack>
                <Switch
                  size="sm"
                  colorScheme="gray"
                  isChecked={enableSynthesis}
                  onChange={(e) => onEnableSynthesisChange?.(e.target.checked)}
                />
              </HStack>
              <Text fontSize="xs" color={mutedColor} mt={0.5}>
                Convert research into format-specific outputs
              </Text>
              {enableSynthesis && (
                <Box
                  p={3}
                  bg={useSemanticToken('surface.base')}
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderColor={useSemanticToken('border.subtle')}
                >
                  <VStack align="start" spacing={2}>
                    <Text fontSize="xs" fontWeight="600" color={textColor}>
                      Two-Stage Pipeline:
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      <strong>Stage 1:</strong> Deep research model generates comprehensive raw research
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      <strong>Stage 2:</strong> GPT-4o reformats into your selected output format(s)
                    </Text>
                    <Text fontSize="xs" color={mutedColor} fontWeight="500" mt={1}>
                      Additional cost: ~$0.02-0.10 per synthesis
                    </Text>
                  </VStack>
                </Box>
              )}
            </FormControl>

            <Divider />
          </>
        )}

        {/* Data Sources */}
        <FormControl>
          <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb={1.5}>
            Data Sources
          </FormLabel>
          <VStack spacing={1.5} align="stretch" mt={1}>
            {model === 'o1-pro' ? (
              <Text fontSize="xs" color={mutedColor}>
                Pure reasoning only (no web search)
              </Text>
            ) : (
              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>Web Research</Text>
                <Switch
                  size="sm"
                  colorScheme="gray"
                  isChecked={dataSources.webResearch}
                  onChange={(e) => {
                    onDataSourcesChange?.({
                      ...dataSources,
                      webResearch: e.target.checked,
                    });
                  }}
                  isDisabled={model === 'o1-pro' || isPerplexity}
                />
              </HStack>
            )}
            {isPerplexity && (
              <Text fontSize="xs" color="blue.400" mt={1}>
                ⚡ Perplexity Sonar models always use web search (built-in)
              </Text>
            )}
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="sm" color={textColor}>Knowledge Graph</Text>
                <Badge colorScheme="gray" fontSize="2xs">Beta</Badge>
              </HStack>
              <Switch
                size="sm"
                colorScheme="gray"
                isChecked={dataSources.knowledgeGraph}
                onChange={(e) =>
                  onDataSourcesChange?.({
                    ...dataSources,
                    knowledgeGraph: e.target.checked,
                  })
                }
              />
            </HStack>
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="sm" color={textColor}>Code Analysis</Text>
                <Badge colorScheme="gray" fontSize="2xs">Beta</Badge>
              </HStack>
              <Switch
                size="sm"
                colorScheme="gray"
                isChecked={dataSources.codeAnalysis}
                onChange={(e) =>
                  onDataSourcesChange?.({
                    ...dataSources,
                    codeAnalysis: e.target.checked,
                  })
                }
              />
            </HStack>
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="sm" color={textColor}>Custom MCP</Text>
                <Badge colorScheme="gray" fontSize="2xs">Beta</Badge>
              </HStack>
              <Switch
                size="sm"
                colorScheme="gray"
                isChecked={dataSources.customMCP}
                onChange={(e) =>
                  onDataSourcesChange?.({
                    ...dataSources,
                    customMCP: e.target.checked,
                  })
                }
                isDisabled
              />
            </HStack>
            <Divider my={2} />
            <Text fontSize="xs" fontWeight="600" color={mutedColor} textTransform="uppercase" mb={1}>
              Local Data Sources
            </Text>
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="sm" color={textColor}>Email Intelligence</Text>
                <Badge colorScheme="blue" fontSize="2xs">Hermes</Badge>
              </HStack>
              <Switch
                size="sm"
                colorScheme="blue"
                isChecked={dataSources.emailIntelligence}
                onChange={(e) =>
                  onDataSourcesChange?.({
                    ...dataSources,
                    emailIntelligence: e.target.checked,
                  })
                }
              />
            </HStack>
            <HStack justify="space-between">
              <HStack>
                <Text fontSize="sm" color={textColor}>Contact Network</Text>
                <Badge colorScheme="green" fontSize="2xs">Neo4j</Badge>
              </HStack>
              <Switch
                size="sm"
                colorScheme="green"
                isChecked={dataSources.contactNetwork}
                onChange={(e) =>
                  onDataSourcesChange?.({
                    ...dataSources,
                    contactNetwork: e.target.checked,
                  })
                }
              />
            </HStack>
            {(dataSources.emailIntelligence || dataSources.contactNetwork) && (
              <Box
                mt={2}
                p={2}
                bg={useSemanticToken('surface.base')}
                borderRadius="md"
                borderLeft="3px solid"
                borderColor="blue.500"
              >
                <Text fontSize="xs" color={mutedColor}>
                  <strong>Local Data Integration:</strong>
                </Text>
                {dataSources.emailIntelligence && (
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    • Email history, threads, and AI analysis from Hermes Core
                  </Text>
                )}
                {dataSources.contactNetwork && (
                  <Text fontSize="xs" color={mutedColor}>
                    • Contact relationships and communication patterns from Neo4j
                  </Text>
                )}
              </Box>
            )}
          </VStack>
        </FormControl>

            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
