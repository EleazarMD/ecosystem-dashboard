/**
 * Panel Resolver Hook
 * Determines which panel to display based on context, tab, and custom data
 * This is the brain of the dynamic right panel system
 */

import { useMemo } from 'react';
import { PanelContext, CustomPanelData, ResolvedPanel, PanelProps } from '../types';
import { PANEL_ROUTES } from '../config/panelRoutes';
import { getPanel } from '../config/panelRegistry';

interface PanelResolverInput {
  context: PanelContext;
  activeTab: string;
  customData?: CustomPanelData;
  systemData?: PanelProps['systemData'];
  width: number;
}

export function usePanelResolver({
  context,
  activeTab,
  customData,
  systemData,
  width,
}: PanelResolverInput): ResolvedPanel {

  return useMemo(() => {
    try {
      console.log('[PanelResolver] Input:', { context, activeTab, customDataType: customData?.type, hasCustomData: !!customData });
      
      // Sort routes by priority (highest first)
      const sortedRoutes = [...PANEL_ROUTES].sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Find the first matching route
      for (const route of sortedRoutes) {
        // Check context match
        if (!route.contexts.includes(context) && !route.contexts.includes('default')) {
          continue;
        }

        // Check customData.type match (highest priority)
        if (route.customDataType) {
          if (customData?.type !== route.customDataType) {
            console.log(`[PanelResolver] Route ${route.panelId} skipped: customData type mismatch (expected: ${route.customDataType}, got: ${customData?.type})`);
            continue;
          }
        }

        // Check tab match
        if (route.tabId) {
          if (activeTab !== route.tabId) {
            console.log(`[PanelResolver] Route ${route.panelId} skipped: tab mismatch (expected: ${route.tabId}, got: ${activeTab})`);
            continue;
          }
        }

        // Check custom condition
        if (route.condition) {
          if (!customData || !route.condition(customData)) {
            continue;
          }
        }

        // Route matched! Get the panel
        const panel = getPanel(route.panelId);

        if (!panel) {
          console.error(`[PanelResolver] Panel "${route.panelId}" not found in registry`);
          continue;
        }

        // Build props for the panel
        const props = buildPanelProps(panel.id, { customData, systemData, width, activeTab });

        console.log('[PanelResolver] ✅ Resolved panel:', panel.id, panel.displayName);
        return {
          panelId: panel.id,
          metadata: panel,
          props,
        };
      }

      // No route matched - use fallback AI Assistant

      const fallbackPanel = getPanel('ai-assistant');
      if (!fallbackPanel) {
        return {
          panelId: 'error',
          metadata: {
            id: 'error',
            displayName: 'Error',
            description: 'Panel system error',
            component: () => null,
          },
          props: {},
          error: 'Fatal: AI Assistant panel not found in registry',
        };
      }

      return {
        panelId: 'ai-assistant',
        metadata: fallbackPanel,
        props: buildPanelProps('ai-assistant', { customData, systemData, width }),
      };
    } catch (error) {
      console.error('[PanelResolver] ❌ Error resolving panel:', error);
      const fallbackPanel = getPanel('ai-assistant');
      return {
        panelId: 'ai-assistant',
        metadata: fallbackPanel || {
          id: 'error',
          displayName: 'Error',
          description: 'Panel resolution error',
          component: () => null,
        },
        props: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [context, activeTab, customData, systemData, width]);
}

/**
 * Build props for specific panel types
 * Each panel has its own prop requirements
 */
function buildPanelProps(
  panelId: string,
  data: { customData?: CustomPanelData; systemData?: any; width: number; activeTab?: string }
): Record<string, any> {
  const { customData, systemData, width, activeTab } = data;

  // Universal props for AI Assistant
  if (panelId === 'ai-assistant') {
    return {
      dashboardContext: {
        currentPage: customData?.context || 'unknown',
        systemHealth: systemData?.health || 'unknown',
        activeAlerts: systemData?.alerts || 0,
        services: systemData?.services || [],
        metrics: systemData?.metrics || {},
        recentActivity: [],
        pageContext: customData?.pageContext,
      },
      isOpen: true,
      onClose: () => { },
      width,
      onResize: () => { },
    };
  }

  // Panel-specific prop mapping
  const propMappings: Record<string, (data: any) => Record<string, any>> = {
    'key-details': (cd) => ({
      apiKey: cd.key,
      onUpdate: cd.onUpdate,
      onDelete: cd.onDelete,
      onValidate: cd.onValidate,
    }),
    'model-details': (cd) => ({
      model: cd.model,
      onClose: cd.onClose,
    }),
    'provider-details': (cd) => ({
      providerId: cd.providerId,
      onClose: cd.onClose,
    }),
    'provider-performance': (cd) => ({
      timeRange: cd.timeRange,
      timeRangeOptions: cd.timeRangeOptions,
      onTimeRangeChange: cd.onTimeRangeChange,
      onRefresh: cd.onRefresh,
      onExport: cd.onExport,
    }),
    'model-filters': (cd) => ({
      providers: cd.providers,
      costRange: cd.costRange,
      sortOptions: cd.sortOptions,
      autoRefresh: cd.autoRefresh,
      onProviderToggle: cd.onProviderToggle,
      onCostRangeChange: cd.onCostRangeChange,
      onSortChange: cd.onSortChange,
      onAutoRefreshToggle: cd.onAutoRefreshToggle,
    }),
    'activity-logs': (cd) => ({
      statusOptions: cd.statusOptions,
      providerOptions: cd.providerOptions,
      serviceOptions: cd.serviceOptions,
      onExportCSV: cd.onExportCSV,
    }),
    'savings-calculator': (cd) => ({
      potentialSavings: cd.potentialSavings,
      opportunities: cd.opportunities,
      onApplyRecommendation: cd.onApplyRecommendation,
      onApplyAll: cd.onApplyAll,
    }),
    'workspace-ai-settings': (cd) => cd.workspaceAISettings || {},
    'goose-agent': (cd) => cd.goose || {},
    'workspace-files': (cd) => ({ workspaceId: cd.workspaceId || 'default-workspace' }),
    'goose-settings': (cd) => ({
      agentId: cd.agentId || 'workspace-ai',
      agentName: cd.agentName || 'Workspace AI',
      onClose: cd.onClose || (() => { }),
    }),
    'page-preview': (cd) => ({
      pageId: cd.pageId,
      workspaceId: cd.workspaceId,
    }),
    'research-settings': (cd) => cd?.deepResearchSettings || {},
    'research-memory': () => ({}),
    'research-sources': (cd) => ({
      sources: cd?.researchSources || [],
      reportContent: cd?.reportContent || '',
      query: cd?.researchQuery || '',
    }),
    'research-costs': () => ({}),
    'source-metadata': (cd) => ({
      customData: {
        researchMaterials: cd?.researchMaterials || [],
        selectedModel: cd?.selectedModel || cd?.chatModel || 'gemini-2-5-flash',
      },
    }),
    'podcast-llm-config': (cd) => ({
      minCharsForPregeneration: cd?.minCharsForPregeneration,
      onPregenerationThresholdChange: cd?.onPregenerationThresholdChange,
      ttsVoice: cd?.ttsVoice,
      onTTSVoiceChange: cd?.onTTSVoiceChange,
      ttsSpeed: cd?.ttsSpeed,
      onTTSSpeedChange: cd?.onTTSSpeedChange,
      ttsPitch: cd?.ttsPitch,
      onTTSPitchChange: cd?.onTTSPitchChange,
    }),
    'podcast-workflow': (cd) => ({
      researchMaterials: cd?.researchMaterials || [],
      onScriptGenerated: cd?.onScriptGenerated,
      projectId: cd?.projectId,
      existingScript: cd?.existingScript || [],
      existingSpeakers: cd?.existingSpeakers || [],
      seriesContext: cd?.seriesContext,
    }),
    'voice-configuration': (cd) => ({
      scriptSpeakers: cd?.scriptSpeakers || cd?.existingSpeakers || [],
      onGenerate: cd?.onGenerate,
      isGenerating: cd?.isGenerating || false,
      selectedScriptId: cd?.selectedScriptId,
      scriptMetadata: cd?.scriptMetadata,
      generatedScript: cd?.generatedScript || cd?.existingScript || [],
      language: cd?.language,
    }),
    'multi-stage-production': (cd) => ({
      onGenerate: cd?.onGenerate,
      isGenerating: cd?.isGenerating || false,
      stageResults: cd?.stageResults || [],
      currentStage: cd?.currentStage || null,
      onStageSelect: cd?.onStageSelect,
    }),
    'podcast-controls': (cd) => ({
      episode: cd?.episode,
      playbackSpeed: cd?.playbackSpeed || 1.0,
      onPlaybackSpeedChange: cd?.onPlaybackSpeedChange || (() => { }),
      onSkip: (seconds: number) => console.log('Skip:', seconds),
      transcriptSettings: cd?.transcriptSettings || {
        fontSize: 'md',
        autoScroll: true,
        showTimestamps: true,
      },
      onTranscriptSettingsChange: cd?.onTranscriptSettingsChange || (() => { }),
    }),
    'podcast-playback': (cd) => ({
      episode: cd?.episode,
    }),
    'playback-review': (cd) => ({
      transcript: cd?.transcript || [],
      qualityTags: cd?.qualityTags || {},
      onQualityTagChange: cd?.onQualityTagChange,
      onSeekToSegment: cd?.onSeekToSegment,
      activeSegmentIndex: cd?.activeSegmentIndex ?? -1,
      isPlaying: cd?.isPlaying || false,
      ttsProvider: cd?.ttsProvider,
      ttsModel: cd?.ttsModel,
      language: cd?.language,
      speakers: cd?.speakers || [],
      episodeId: cd?.episodeId,
    }),
    // Email insights panels - pass customData and email for change detection
    'email-intelligence': (cd) => ({ 
      email: cd?.email,
      key: cd?.emailId || cd?.email?.id,  // Force re-render on email change
    }),
    'insights-actions': (cd) => ({ customData: cd }),
    'insights-settings': (cd) => ({ customData: cd }),
    'audio-settings': (cd) => ({ customData: cd }),
    // Child portal panels - pass activeTab and customData
    'child-home': () => ({ activeTab }),
    'child-chat': () => ({ activeTab }),
    'child-art': () => ({ activeTab }),
    'child-workspace': (cd) => ({ 
      activeTab,
      onPageBuilderCreate: cd?.onPageBuilderCreate,
      // Current page context for AI agent awareness
      currentPageId: cd?.currentPageId || null,
      currentPageTitle: cd?.currentPageTitle || '',
      currentPageIcon: cd?.currentPageIcon || '📄',
      currentPageBlocks: cd?.currentPageBlocks || [],
      onPageUpdate: cd?.onPageUpdate,
      wordCount: cd?.wordCount || 0,
      characterCount: cd?.characterCount || 0,
    }),
    'child-email': () => ({ activeTab }),
    'child-planner': () => ({ activeTab }),
    'child-books': () => ({ activeTab }),
    'child-dictionary': () => ({ activeTab }),
    // Voice Studio panels - pass the actual activeTab from context for correct content rendering
    'voice-profiles': (cd) => ({ activeTab, selectedProfile: cd?.selectedProfile, voiceProfiles: cd?.voiceProfiles, serviceIntegrations: cd?.serviceIntegrations }),
    'voice-library': (cd) => ({ activeTab, selectedProfile: cd?.selectedProfile, voiceProfiles: cd?.voiceProfiles, serviceIntegrations: cd?.serviceIntegrations }),
    'voice-settings': (cd) => ({ activeTab, selectedProfile: cd?.selectedProfile, voiceProfiles: cd?.voiceProfiles, serviceIntegrations: cd?.serviceIntegrations }),
    'openclaw-chat': (cd) => ({ 
      onSelectModel: cd?.onSelectModel,
      onSelectAgent: cd?.onSelectAgent,
      onSelectSession: cd?.onSelectSession,
    }),
  };

  // Get panel-specific props
  const mapper = propMappings[panelId];
  if (mapper) {
    return mapper(customData);
  }

  // For child panels, always pass activeTab even without customData
  if (panelId.startsWith('child-')) {
    return { activeTab };
  }

  // Return custom data as-is for panels without specific mapping
  return customData || {};
}
