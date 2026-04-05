/**
 * UnifiedResearchSettingsPanel
 * 
 * A single scrollable panel with collapsible sections for all research settings.
 * Consolidates: Model Selection, Vision Analysis, Email Context, Deep Research, and Costs.
 * 
 * Design: Option B - Unified Settings Panel with collapsible sections
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Switch,
  Select,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  Icon,
  Collapse,
  IconButton,
  Tooltip,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiCpu,
  FiCloud,
  FiHome,
  FiEye,
  FiMail,
  FiSearch,
  FiDollarSign,
  FiTarget,
  FiZap,
  FiImage,
  FiFile,
  FiDatabase,
  FiLock,
  FiUnlock,
  FiRefreshCw,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

// ============================================================
// Types
// ============================================================

export type PrivacyTier = 'local' | 'standard' | 'hybrid';
export type VisionModel = 'qwen-vision' | 'gemini-2-5-flash';
export type AnalysisModel = 'minimax-m2.5' | 'gemini-2-5-flash' | 'gpt-4o';
export type DeepResearchModel = 'perplexity' | 'gemini-deep-research' | 'o3-mini';

export interface UnifiedResearchSettings {
  // Privacy & Model Routing
  privacyTier: PrivacyTier;
  
  // Vision Analysis
  visionModel: VisionModel;
  analysisModel: AnalysisModel;
  autoAnalyzeAttachments: boolean;
  
  // Email Context
  includeEmailBody: boolean;
  includeSenderInfo: boolean;
  includeThreadHistory: boolean;
  selectedAttachments: string[];
  
  // Deep Research
  deepResearchModel: DeepResearchModel;
  researchDepth: number;
  enableClarification: boolean;
  
  // Output Formats
  outputFormats: {
    academicReport: boolean;
    executiveSummary: boolean;
    podcastScript: boolean;
  };
}

interface UnifiedResearchSettingsPanelProps {
  settings?: Partial<UnifiedResearchSettings>;
  onSettingsChange?: (settings: UnifiedResearchSettings) => void;
  
  // Email context
  hasEmailContext?: boolean;
  emailAttachments?: Array<{ filename: string; contentType: string; size: number }>;
  
  // Analysis stats
  analysisStats?: {
    topics?: number;
    gaps?: number;
    deepTopics?: number;
  };
  
  // Cost tracking
  costStats?: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
  };
}

// ============================================================
// Collapsible Section Component
// ============================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  badge,
  badgeColor = 'purple',
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  return (
    <Box borderBottom="1px solid" borderColor={borderColor}>
      <HStack
        px={4}
        py={3}
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        _hover={{ bg: hoverBg }}
        transition="background 0.15s"
      >
        <Icon
          as={isExpanded ? FiChevronDown : FiChevronRight}
          boxSize={4}
          color={mutedColor}
        />
        <Icon as={icon} boxSize={4} color="purple.400" />
        <Text fontSize="sm" fontWeight="600" color={textColor} flex={1}>
          {title}
        </Text>
        {badge !== undefined && (
          <Badge colorScheme={badgeColor} fontSize="2xs" borderRadius="full">
            {badge}
          </Badge>
        )}
      </HStack>
      <Collapse in={isExpanded} animateOpacity>
        <Box px={4} pb={4}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

// ============================================================
// Main Component
// ============================================================

const DEFAULT_SETTINGS: UnifiedResearchSettings = {
  privacyTier: 'hybrid',
  visionModel: 'qwen-vision',
  analysisModel: 'minimax-m2.5',
  autoAnalyzeAttachments: false,
  includeEmailBody: true,
  includeSenderInfo: true,
  includeThreadHistory: false,
  selectedAttachments: [],
  deepResearchModel: 'perplexity',
  researchDepth: 3,
  enableClarification: true,
  outputFormats: {
    academicReport: true,
    executiveSummary: false,
    podcastScript: false,
  },
};

export default function UnifiedResearchSettingsPanel({
  settings: propSettings,
  onSettingsChange,
  hasEmailContext = false,
  emailAttachments = [],
  analysisStats,
  costStats,
}: UnifiedResearchSettingsPanelProps) {
  const { customData, setCustomData } = useRightPanel();
  
  // Merge settings from props, customData, and defaults
  const settings: UnifiedResearchSettings = {
    ...DEFAULT_SETTINGS,
    ...customData?.unifiedSettings,
    ...propSettings,
  };

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const updateSettings = useCallback((partial: Partial<UnifiedResearchSettings>) => {
    const newSettings = { ...settings, ...partial };
    setCustomData({
      ...customData,
      unifiedSettings: newSettings,
    });
    onSettingsChange?.(newSettings);
  }, [settings, customData, setCustomData, onSettingsChange]);

  // Privacy tier descriptions
  const privacyTierInfo: Record<PrivacyTier, { label: string; icon: React.ElementType; description: string; color: string }> = {
    local: {
      label: 'Local Only',
      icon: FiHome,
      description: 'All processing on local hardware (Qwen Vision + Minimax)',
      color: 'green',
    },
    standard: {
      label: 'Cloud',
      icon: FiCloud,
      description: 'Use cloud models for best quality (Gemini + GPT-4)',
      color: 'blue',
    },
    hybrid: {
      label: 'Hybrid',
      icon: FiZap,
      description: 'Local vision extraction → Cloud analysis',
      color: 'purple',
    },
  };

  // Auto-select models based on privacy tier
  const handlePrivacyTierChange = (tier: PrivacyTier) => {
    const modelMap: Record<PrivacyTier, { vision: VisionModel; analysis: AnalysisModel }> = {
      local: { vision: 'qwen-vision', analysis: 'minimax-m2.5' },
      standard: { vision: 'gemini-2-5-flash', analysis: 'gemini-2-5-flash' },
      hybrid: { vision: 'qwen-vision', analysis: 'gemini-2-5-flash' },
    };
    updateSettings({
      privacyTier: tier,
      visionModel: modelMap[tier].vision,
      analysisModel: modelMap[tier].analysis,
    });
  };

  return (
    <Box h="full" overflowY="auto" css={{
      '&::-webkit-scrollbar': { width: '6px' },
      '&::-webkit-scrollbar-track': { background: 'transparent' },
      '&::-webkit-scrollbar-thumb': { background: 'rgba(128, 128, 128, 0.3)', borderRadius: '3px' },
    }}>
      <VStack spacing={0} align="stretch">
        {/* ── Section 1: Model Selection / Privacy Tier ── */}
        <CollapsibleSection
          title="Model Selection"
          icon={FiCpu}
          badge={privacyTierInfo[settings.privacyTier].label}
          badgeColor={privacyTierInfo[settings.privacyTier].color}
        >
          <VStack spacing={4} align="stretch">
            <Text fontSize="xs" color={mutedColor}>
              Choose how your data is processed. Local models keep data on your hardware.
            </Text>
            
            <RadioGroup
              value={settings.privacyTier}
              onChange={(val) => handlePrivacyTierChange(val as PrivacyTier)}
            >
              <Stack spacing={3}>
                {(Object.keys(privacyTierInfo) as PrivacyTier[]).map((tier) => {
                  const info = privacyTierInfo[tier];
                  const isSelected = settings.privacyTier === tier;
                  return (
                    <Box
                      key={tier}
                      p={3}
                      borderRadius="md"
                      border="2px solid"
                      borderColor={isSelected ? `${info.color}.400` : borderColor}
                      bg={isSelected ? `${info.color}.900` : 'transparent'}
                      cursor="pointer"
                      onClick={() => handlePrivacyTierChange(tier)}
                      transition="all 0.15s"
                      _hover={{ borderColor: `${info.color}.400` }}
                    >
                      <HStack spacing={3}>
                        <Radio value={tier} colorScheme={info.color} />
                        <Icon as={info.icon} boxSize={4} color={`${info.color}.400`} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm" fontWeight="600" color={textColor}>
                            {info.label}
                          </Text>
                          <Text fontSize="2xs" color={mutedColor}>
                            {info.description}
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  );
                })}
              </Stack>
            </RadioGroup>
          </VStack>
        </CollapsibleSection>

        {/* ── Section 2: Vision Analysis ── */}
        <CollapsibleSection
          title="Vision Analysis"
          icon={FiEye}
          badge={settings.visionModel === 'qwen-vision' ? 'Local' : 'Cloud'}
          badgeColor={settings.visionModel === 'qwen-vision' ? 'green' : 'blue'}
        >
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
                Vision Model
              </Text>
              <Select
                size="sm"
                value={settings.visionModel}
                onChange={(e) => updateSettings({ visionModel: e.target.value as VisionModel })}
              >
                <option value="qwen-vision">🏠 Qwen Vision (Local)</option>
                <option value="gemini-2-5-flash">☁️ Gemini 2.5 Flash (Cloud)</option>
              </Select>
            </Box>

            <Box>
              <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
                Analysis Model
              </Text>
              <Select
                size="sm"
                value={settings.analysisModel}
                onChange={(e) => updateSettings({ analysisModel: e.target.value as AnalysisModel })}
              >
                <option value="minimax-m2.5">🏠 Minimax M2.5 (Local)</option>
                <option value="gemini-2-5-flash">☁️ Gemini 2.5 Flash</option>
                <option value="gpt-4o">☁️ GPT-4o</option>
              </Select>
            </Box>

            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="600" color={textColor}>
                  Auto-analyze attachments
                </Text>
                <Text fontSize="2xs" color={mutedColor}>
                  Automatically extract data from images
                </Text>
              </VStack>
              <Switch
                size="sm"
                colorScheme="purple"
                isChecked={settings.autoAnalyzeAttachments}
                onChange={(e) => updateSettings({ autoAnalyzeAttachments: e.target.checked })}
              />
            </HStack>
          </VStack>
        </CollapsibleSection>

        {/* ── Section 3: Email Context (only shown when email context exists) ── */}
        {hasEmailContext && (
          <CollapsibleSection
            title="Email Context"
            icon={FiMail}
            badge={emailAttachments.length > 0 ? `${emailAttachments.length} files` : undefined}
          >
            <VStack spacing={4} align="stretch">
              <Text fontSize="xs" color={mutedColor}>
                Configure what email context to include in research queries.
              </Text>

              <VStack align="stretch" spacing={2}>
                <Checkbox
                  size="sm"
                  isChecked={settings.includeEmailBody}
                  onChange={(e) => updateSettings({ includeEmailBody: e.target.checked })}
                >
                  <Text fontSize="xs">Include email body</Text>
                </Checkbox>
                <Checkbox
                  size="sm"
                  isChecked={settings.includeSenderInfo}
                  onChange={(e) => updateSettings({ includeSenderInfo: e.target.checked })}
                >
                  <Text fontSize="xs">Include sender information</Text>
                </Checkbox>
                <Checkbox
                  size="sm"
                  isChecked={settings.includeThreadHistory}
                  onChange={(e) => updateSettings({ includeThreadHistory: e.target.checked })}
                >
                  <Text fontSize="xs">Include thread history</Text>
                </Checkbox>
              </VStack>

              {emailAttachments.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
                    Attachments
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    {emailAttachments.map((att, idx) => {
                      const isSelected = settings.selectedAttachments.includes(att.filename);
                      return (
                        <HStack
                          key={idx}
                          p={2}
                          borderRadius="md"
                          bg={isSelected ? 'purple.900' : cardBg}
                          border="1px solid"
                          borderColor={isSelected ? 'purple.400' : borderColor}
                          cursor="pointer"
                          onClick={() => {
                            const newSelected = isSelected
                              ? settings.selectedAttachments.filter(f => f !== att.filename)
                              : [...settings.selectedAttachments, att.filename];
                            updateSettings({ selectedAttachments: newSelected });
                          }}
                        >
                          <Checkbox
                            size="sm"
                            isChecked={isSelected}
                            colorScheme="purple"
                            onChange={() => {}}
                          />
                          <Icon
                            as={att.contentType.startsWith('image/') ? FiImage : FiFile}
                            boxSize={3}
                            color={mutedColor}
                          />
                          <Text fontSize="2xs" color={textColor} flex={1} noOfLines={1}>
                            {att.filename}
                          </Text>
                          <Text fontSize="2xs" color={mutedColor}>
                            {(att.size / 1024).toFixed(0)}KB
                          </Text>
                        </HStack>
                      );
                    })}
                  </VStack>
                </Box>
              )}
            </VStack>
          </CollapsibleSection>
        )}

        {/* ── Section 4: Deep Research ── */}
        <CollapsibleSection
          title="Deep Research"
          icon={FiSearch}
          badge={settings.deepResearchModel}
        >
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
                Research Model
              </Text>
              <Select
                size="sm"
                value={settings.deepResearchModel}
                onChange={(e) => updateSettings({ deepResearchModel: e.target.value as DeepResearchModel })}
              >
                <option value="perplexity">🔍 Perplexity Deep Research</option>
                <option value="gemini-deep-research">🔬 Gemini Deep Research</option>
                <option value="o3-mini">⚡ OpenAI o3-mini</option>
              </Select>
            </Box>

            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="600" color={textColor}>
                  Research Depth
                </Text>
                <Badge colorScheme="purple" fontSize="2xs">
                  Level {settings.researchDepth}
                </Badge>
              </HStack>
              <Slider
                value={settings.researchDepth}
                min={1}
                max={5}
                step={1}
                onChange={(val) => updateSettings({ researchDepth: val })}
              >
                <SliderTrack>
                  <SliderFilledTrack bg="purple.400" />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="2xs" color={mutedColor}>Quick</Text>
                <Text fontSize="2xs" color={mutedColor}>Deep</Text>
              </HStack>
            </Box>

            <HStack justify="space-between">
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" fontWeight="600" color={textColor}>
                  Clarifying Questions
                </Text>
                <Text fontSize="2xs" color={mutedColor}>
                  Ask questions before researching
                </Text>
              </VStack>
              <Switch
                size="sm"
                colorScheme="purple"
                isChecked={settings.enableClarification}
                onChange={(e) => updateSettings({ enableClarification: e.target.checked })}
              />
            </HStack>

            <Box>
              <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>
                Output Formats
              </Text>
              <VStack align="stretch" spacing={2}>
                <Checkbox
                  size="sm"
                  isChecked={settings.outputFormats.academicReport}
                  onChange={(e) => updateSettings({
                    outputFormats: { ...settings.outputFormats, academicReport: e.target.checked }
                  })}
                >
                  <Text fontSize="xs">📄 Academic Report</Text>
                </Checkbox>
                <Checkbox
                  size="sm"
                  isChecked={settings.outputFormats.executiveSummary}
                  onChange={(e) => updateSettings({
                    outputFormats: { ...settings.outputFormats, executiveSummary: e.target.checked }
                  })}
                >
                  <Text fontSize="xs">📊 Executive Summary</Text>
                </Checkbox>
                <Checkbox
                  size="sm"
                  isChecked={settings.outputFormats.podcastScript}
                  onChange={(e) => updateSettings({
                    outputFormats: { ...settings.outputFormats, podcastScript: e.target.checked }
                  })}
                >
                  <Text fontSize="xs">🎙️ Podcast Script</Text>
                </Checkbox>
              </VStack>
            </Box>
          </VStack>
        </CollapsibleSection>

        {/* ── Section 5: Analysis Stats (if available) ── */}
        {analysisStats && (analysisStats.topics || analysisStats.gaps) && (
          <CollapsibleSection
            title="Analysis"
            icon={FiTarget}
            defaultExpanded={false}
          >
            <SimpleGrid columns={3} spacing={3}>
              <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                <Stat size="sm">
                  <StatLabel fontSize="2xs">Topics</StatLabel>
                  <StatNumber fontSize="lg">{analysisStats.topics || 0}</StatNumber>
                </Stat>
              </Box>
              <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                <Stat size="sm">
                  <StatLabel fontSize="2xs">Gaps</StatLabel>
                  <StatNumber fontSize="lg" color="orange.400">{analysisStats.gaps || 0}</StatNumber>
                </Stat>
              </Box>
              <Box p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                <Stat size="sm">
                  <StatLabel fontSize="2xs">Deep</StatLabel>
                  <StatNumber fontSize="lg" color="green.400">{analysisStats.deepTopics || 0}</StatNumber>
                </Stat>
              </Box>
            </SimpleGrid>
          </CollapsibleSection>
        )}

        {/* ── Section 6: Costs ── */}
        <CollapsibleSection
          title="Costs & Usage"
          icon={FiDollarSign}
          badge={costStats?.estimatedCost ? `$${costStats.estimatedCost.toFixed(3)}` : undefined}
          badgeColor="green"
          defaultExpanded={false}
        >
          <VStack spacing={3} align="stretch">
            {costStats ? (
              <>
                <HStack justify="space-between">
                  <Text fontSize="xs" color={mutedColor}>Input Tokens</Text>
                  <Text fontSize="xs" fontWeight="600" color={textColor}>
                    {costStats.inputTokens?.toLocaleString() || 0}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="xs" color={mutedColor}>Output Tokens</Text>
                  <Text fontSize="xs" fontWeight="600" color={textColor}>
                    {costStats.outputTokens?.toLocaleString() || 0}
                  </Text>
                </HStack>
                <Divider />
                <HStack justify="space-between">
                  <Text fontSize="xs" fontWeight="600" color={textColor}>Estimated Cost</Text>
                  <Text fontSize="sm" fontWeight="700" color="green.400">
                    ${costStats.estimatedCost?.toFixed(4) || '0.0000'}
                  </Text>
                </HStack>
              </>
            ) : (
              <Text fontSize="xs" color={mutedColor} textAlign="center" py={2}>
                No usage data yet. Start a research query to track costs.
              </Text>
            )}
          </VStack>
        </CollapsibleSection>
      </VStack>
    </Box>
  );
}
