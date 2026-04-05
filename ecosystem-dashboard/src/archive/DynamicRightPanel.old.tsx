import React from 'react';
import {
  Box,
  HStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  IconButton,
  Text,
  useColorModeValue,
  Tooltip,
  VStack,
  Button,
  Icon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FiX,
  FiCpu,
  FiZap,
  FiFileText,
  FiShare2,
  FiMic,
  FiMusic,
  FiMessageCircle,
  FiPlay,
  FiActivity,
  FiLayers,
  FiDatabase,
  FiFolder,
  FiKey
} from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { useRightPanel } from '@/contexts/RightPanelContext';

const MotionBox = motion(Box);
import PodcastSettingsPanel from '../podcast-studio/PodcastSettingsPanel';
import PodcastAudioControlsPanel from '../podcast-studio/AudioControlsPanel';
import InsightsPanel from '../podcast-studio/InsightsPanel';
import NotesPanel from '../podcast-studio/NotesPanel';
// TEMPORARY: Direct import to see compilation errors
import ChatSettingsPanelDirect from '../podcast-studio/ChatSettingsPanel';
import ModernAIAssistantDirect from '../ai-assistant/ModernAIAssistant';
import ExportPanel from '../podcast-studio/ExportPanel';
import WorkflowPanel from '../podcast-studio/WorkflowPanel';
import AudioGenerationProgress from '../podcast-studio/AudioGenerationProgress';
import MultiStageProductionPanel from '../podcast-studio/MultiStageProductionPanel';
import AISettingsPanel from '../shared/AISettingsPanel';
import DeepResearchSettingsPanel from '../research/DeepResearchSettingsPanel';
import WorkspaceAISettingsPanel from '../workspace/WorkspaceAISettingsPanel';
import GooseAssistantSettingsPanel from '../workspace/GooseAssistantSettingsPanel';
import { WorkspaceHomeSettings } from '../workspace/WorkspaceHomeSettings';
import { ModernGooseSettingsPanel } from '../goose/settings'; // Modern unified settings panel
import { GooseSidebarPanel } from '../workspace/GooseSidebarPanel';
import EventTracePanel from '../agentic-control/EventTracePanel';
import AgentActionsPanel from '../agentic-control/AgentActionsPanel';
import ProviderSettingsPanel from '../ai-inferencing/ProviderSettingsPanel';
import { GeneralSettingsPanel } from '../ai-inferencing/GeneralSettingsPanel';
import { GenerationSettingsPanel } from '../image-studio/GenerationSettingsPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Dynamic imports for visualization components (lazy load for performance)
const AgentGraphVisualization = dynamic(
  () => import('../agentic-control/AgentGraphVisualization'),
  { ssr: false, loading: () => <Box p={4} fontSize="sm" color={useSemanticToken('text.secondary')}>Loading graph...</Box> }
);

const TraceTimelineVisualization = dynamic(
  () => import('../agentic-control/TraceTimelineVisualization'),
  { ssr: false, loading: () => <Box p={4} fontSize="sm" color={useSemanticToken('text.secondary')}>Loading timeline...</Box> }
);

// TEMPORARY: Using direct import (see top of file)
const ChatSettingsPanel = ChatSettingsPanelDirect;

// Dynamic import for ChatSettingsPanel (podcast-studio specific, requires context)
// const ChatSettingsPanel = dynamic(() => import('../podcast-studio/ChatSettingsPanel'), {
//   ssr: false,
//   loading: () => (
//     <Box p={4} fontSize="sm" color={useSemanticToken('text.secondary')}>
//       Loading chat settings...
//     </Box>
//   ),
// });

// TEMPORARY: Using direct import (see top of file)
const ModernAIAssistant = ModernAIAssistantDirect;

// Dynamic imports
// const ModernAIAssistant = dynamic(() => import('../ai-assistant/ModernAIAssistant'), {
//   ssr: false,
//   loading: () => (
//     <Box p={4} fontSize="sm" color={useSemanticToken('text.secondary')}>
//       Loading AI Assistant...
//     </Box>
//   ),
// });

const AgentNotificationCenter = dynamic(
  () => import('../agent/AgentNotificationCenter').then(mod => ({ default: mod.AgentNotificationCenter })),
  { ssr: false, loading: () => <Box p={4}>Loading notifications...</Box> }
);

// Import VoiceConfigurationPanel ONCE at module level to prevent remounts
const VoiceConfigurationPanel = dynamic(
  () => import('../podcast-studio/VoiceConfigurationPanel'),
  {
    ssr: false,
    loading: () => <Box p={4} fontSize="sm" color={useSemanticToken('text.secondary')}>Loading voice configuration...</Box>
  }
);

interface DynamicRightPanelProps {
  systemData?: {
    health: string;
    services: any[];
    metrics: any;
    alerts: number;
  };
  onClose: () => void;
}

export default function DynamicRightPanel({ systemData, onClose }: DynamicRightPanelProps) {
  console.log('[DynamicRightPanel.old] Component rendering!');
  const { activeTab, setActiveTab, config, context, width, setWidth, customData } = useRightPanel();
  console.log('[DynamicRightPanel.old] Context:', context, 'ActiveTab:', activeTab);
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const resizeHandleColor = useColorModeValue('gray.300', 'gray.600');
  const resizeHandleHoverColor = useColorModeValue('blue.400', 'blue.500');
  const glassBackground = useSemanticToken('glass.background');
  const glassBorder = useSemanticToken('glass.border');
  const borderSubtle = useSemanticToken('border.subtle');

  // Resize state
  const [isResizing, setIsResizing] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [startWidth, setStartWidth] = React.useState(width);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    e.preventDefault();
  };

  // Handle resize move
  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX; // Inverted because panel grows to the left
      const newWidth = Math.max(300, Math.min(800, startWidth + deltaX)); // Min 300px, max 800px
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startX, startWidth, setWidth]);

  // Auto-switch right panel tab based on customData hint
  React.useEffect(() => {
    if (customData?.activeTab) {
      console.log('🔄 Checking auto-switch. Want:', customData.activeTab, 'Currently:', activeTab);
      if (customData.activeTab !== activeTab) {
        console.log('✅ Auto-switching right panel tab to:', customData.activeTab);
        setActiveTab(customData.activeTab);
      }
    }
  }, [customData?.activeTab]);

  // Icon mapping - Using Feather icons for clean outline style
  const iconMap: Record<string, any> = {
    FiCpu,
    FiZap,
    FiFileText,
    FiShare2,
    FiPlay,
    FiMic,
    FiMusic,
    FiMessageCircle,
    FiActivity,
    FiLayers,
    FiFolder,
  };

  // Color schemes for each tab - Standardized across all contexts
  const colorSchemes: Record<string, string> = {
    // Podcast Studio tabs
    'llm-config': 'blue',
    'insights': 'orange',
    'notes': 'purple',
    'export': 'teal',
    'workflow': 'green',
    'audio': 'pink',
    'podcast': 'pink',
    // Agentic Control tabs
    'timeline': 'blue',
    'graph': 'purple',
    'events': 'green',
    'actions': 'cyan',
    // Universal tabs (used across all contexts)
    'ai-settings': 'blue',
    'files': 'purple',
    'goose-settings': 'purple',
    'goose-agent': 'purple',
    'ai-assistant': 'cyan',
    'notifications': 'orange',
    'tools': 'purple',
    'explorer': 'teal',
    'config': 'blue',
    'monitoring': 'green',
  };

  // Get active center tab to filter available right panel tabs
  const activeCenterTab = customData?.activeCenterTab || 0;

  // Filter tabs based on center tab
  const getVisibleTabs = () => {
    if (context !== 'podcast-studio') return config.tabs;

    // Tab 0 (Chat): Show research tools
    if (activeCenterTab === 0) {
      return config.tabs.filter(tab =>
        ['llm-config', 'insights', 'notes', 'export', 'ai-assistant'].includes(tab.id)
      );
    }
    // Tab 1 (Script): Show workflow and podcast settings
    if (activeCenterTab === 1) {
      return config.tabs.filter(tab =>
        ['workflow', 'podcast', 'ai-assistant'].includes(tab.id)
      );
    }
    // Tab 2/3 (Audio): Show audio controls
    return config.tabs.filter(tab =>
      ['audio', 'ai-assistant'].includes(tab.id)
    );
  };

  const visibleTabs = getVisibleTabs();
  const activeTabIndex = visibleTabs.findIndex((tab) => tab.id === activeTab);

  // Auto-switch to first visible tab if current tab is hidden
  React.useEffect(() => {
    if (context === 'podcast-studio' && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'llm-config');
    }
  }, [activeCenterTab, context, activeTab, visibleTabs, setActiveTab]);

  // Log when key data is missing but don't auto-close
  React.useEffect(() => {
    if (customData?.type === 'key-details' && !customData.key) {
      console.warn('⚠️ [DynamicRightPanel] customData.key is undefined - panel will show empty state');
    }
  }, [customData]);

  const renderTabContent = (tabId: string) => {
    // Check if customData has specific type handlers
    if (customData?.type === 'key-details') {
      if (!customData.key) {
        console.error('❌ KeyDetailsPanel: customData.key is undefined');
        return (
          <Box h="full" p={4} display="flex" alignItems="center" justifyContent="center">
            <VStack spacing={4}>
              <Icon as={FiKey} boxSize={12} color={useSemanticToken('text.tertiary')} />
              <Text color={useSemanticToken('text.secondary')} textAlign="center" fontWeight="bold">
                No API key data available
              </Text>
              <Text fontSize="sm" color={useSemanticToken('text.tertiary')} textAlign="center">
                Click on an API key card to view its details
              </Text>
            </VStack>
          </Box>
        );
      }
      console.log('✅ Rendering KeyDetailsPanel for selected API key:', customData.key.key_id || customData.key.id);
      // Import KeyDetailsPanel dynamically
      const KeyDetailsPanel = require('../ai-inferencing/KeyDetailsPanel').default;
      return (
        <Box
          h="full"
          overflow="auto"
          position="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <KeyDetailsPanel
            apiKey={customData.key}
            onUpdate={customData.onUpdate}
            onDelete={customData.onDelete}
            onValidate={customData.onValidate}
          />
        </Box>
      );
    }

    if (customData?.type === 'model-details') {
      console.log('✅ Rendering ModelDetailsPanel for selected model');
      // Import ModelDetailsPanel dynamically
      const { ModelDetailsPanel } = require('../ai-inferencing/ModelDetailsPanel');
      return (
        <Box h="full" overflow="auto" position="relative">
          <ModelDetailsPanel
            model={customData.model}
            onClose={customData.onClose}
          />
        </Box>
      );
    }

    if (customData?.type === 'provider-details') {
      console.log('✅ Rendering ProviderDetailsPanel for selected provider');
      // Import ProviderDetailsPanel dynamically
      const { ProviderDetailsPanel } = require('../ai-inferencing/ProviderDetailsPanel');
      return (
        <Box h="full" overflow="auto" position="relative">
          <ProviderDetailsPanel
            providerId={customData.providerId}
            onClose={customData.onClose}
          />
        </Box>
      );
    }

    // Check if customData has a render function - use that for other types
    if (customData?.render && typeof customData.render === 'function') {
      return (
        <Box h="full" overflow="auto" position="relative">
          {customData.render()}
        </Box>
      );
    }

    // AI Assistant is available in all contexts
    if (tabId === 'ai-assistant') {
      return (
        <Box h="full" overflow="auto" position="relative">
          <ModernAIAssistant
            dashboardContext={{
              currentPage: context,
              systemHealth: systemData?.health || 'unknown',
              activeAlerts: systemData?.alerts || 0,
              services: systemData?.services || [],
              metrics: systemData?.metrics || {},
              recentActivity: [],
            }}
            isOpen={true}
            onClose={() => { }} // Don't close panel, just switch tabs
            width={width}
            onResize={() => { }}
          />
        </Box>
      );
    }

    // Context-specific content
    switch (context) {
      case 'podcast-studio':
        console.log('🎯 Podcast Studio tab-based content:', { tabId });

        // Otherwise, show tab-based content
        const activeCenterTab = customData?.activeCenterTab || 0;

        // Tab routing based on both center tab and right panel tab
        if (tabId === 'llm-config') {
          return <ChatSettingsPanel
            minCharsForPregeneration={customData?.minCharsForPregeneration}
            onPregenerationThresholdChange={customData?.onPregenerationThresholdChange}
            ttsVoice={customData?.ttsVoice}
            onTTSVoiceChange={customData?.onTTSVoiceChange}
            ttsSpeed={customData?.ttsSpeed}
            onTTSSpeedChange={customData?.onTTSSpeedChange}
            ttsPitch={customData?.ttsPitch}
            onTTSPitchChange={customData?.onTTSPitchChange}
          />;
        }
        if (tabId === 'insights') {
          return <InsightsPanel />;
        }
        if (tabId === 'notes') {
          return <NotesPanel />;
        }
        if (tabId === 'export') {
          return <ExportPanel />;
        }
        if (tabId === 'workflow') {
          // Check if Audio Generation tab is active - show Voice Configuration
          console.log('🔍 Workflow tab rendering, customData:', customData);

          // Multi-Stage Production Controls
          if (customData?.type === 'multi-stage-production') {
            console.log('🎬 Multi-stage production type detected');
            return (
              <Box p={4}>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Icon as={FiLayers} color="purple.500" />
                    <Text fontSize="md" fontWeight="600">Production Pipeline</Text>
                  </HStack>
                  <MultiStageProductionPanel
                    onGenerate={customData.onGenerate}
                    isGenerating={customData.isGenerating || false}
                    stageResults={customData.stageResults || []}
                    currentStage={customData.currentStage || null}
                    onStageSelect={customData.onStageSelect}
                  />
                </VStack>
              </Box>
            );
          }

          if (customData?.type === 'voice-configuration') {
            console.log('✅ Voice config type detected. speakers:', customData?.scriptSpeakers?.length);

            // ALWAYS show voice configuration on Audio Generation tab
            const VoiceConfigurationPanel = dynamic(() => import('../podcast-studio/VoiceConfigurationPanel'));
            return (
              <Box p={4}>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Icon as={FiPlay} color="green.500" />
                    <Text fontSize="md" fontWeight="600">Voice Configuration</Text>
                  </HStack>
                  <VoiceConfigurationPanel
                    scriptSpeakers={customData.scriptSpeakers || []}
                    onGenerate={customData.onGenerate}
                    isGenerating={customData.isGenerating || false}
                    selectedScriptId={customData.selectedScriptId}
                    scriptMetadata={customData.scriptMetadata}
                  />
                </VStack>
              </Box>
            );
          }

          // Otherwise show normal Workflow Panel
          console.log('📋 Showing normal Workflow Panel');
          return <WorkflowPanel
            researchMaterials={customData?.researchMaterials || []}
            onScriptGenerated={customData?.onScriptGenerated}
            projectId={customData?.projectId}
            existingScript={customData?.existingScript || []}
            existingSpeakers={customData?.existingSpeakers || []}
            seriesContext={customData?.seriesContext}
          />;
        }
        if (tabId === 'audio') {
          console.log('🎵 Audio tab rendering. CustomData:', {
            exists: !!customData,
            type: customData?.type,
            hasScriptSpeakers: !!customData?.scriptSpeakers,
            scriptSpeakersLength: customData?.scriptSpeakers?.length,
            fullCustomData: customData
          });

          // Context-aware: Show Podcast Controls when playback is active
          if (customData?.type === 'podcast-controls') {
            console.log('✅ Audio tab showing Podcast Controls');
            const PodcastControlPanel = dynamic(() => import('../podcast-studio/PodcastControlPanel'));
            return (
              <Box h="full" overflowY="auto">
                <PodcastControlPanel
                  episode={customData.episode}
                  playbackSpeed={customData.playbackSpeed || 1.0}
                  onPlaybackSpeedChange={customData.onPlaybackSpeedChange || (() => { })}
                  onSkip={(seconds) => console.log('Skip:', seconds)}
                  transcriptSettings={customData.transcriptSettings || {
                    fontSize: 'md',
                    autoScroll: true,
                    showTimestamps: true,
                  }}
                  onTranscriptSettingsChange={customData.onTranscriptSettingsChange || (() => { })}
                />
              </Box>
            );
          }

          // Context-aware: Show Playback Controls when podcast is selected
          if (customData?.type === 'audio-player' && customData?.episode) {
            console.log('✅ Audio tab showing Playback Controls for episode:', {
              id: customData.episode.id,
              title: customData.episode.projectTitle,
              duration: customData.episode.duration,
              filePath: customData.episode.filePath,
            });
            const PodcastPlaybackControls = dynamic(() => import('../podcast-studio/PodcastPlaybackControls'));
            return (
              <Box p={4} h="full" overflowY="auto">
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Icon as={FiMusic} color="green.500" />
                    <Text fontSize="md" fontWeight="600">Playback Controls</Text>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor}>
                    {customData.episode.projectTitle || 'Untitled Podcast'}
                  </Text>
                  <PodcastPlaybackControls
                    episode={customData.episode}
                  />
                </VStack>
              </Box>
            );
          }

          // Context-aware: Show Voice Configuration when Audio Generation is active
          if (customData?.type === 'voice-configuration') {
            console.log('✅ Audio tab showing Voice Configuration');
            return (
              <Box p={4} h="full" overflowY="auto">
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Icon as={FiMusic} color="purple.500" />
                    <Text fontSize="md" fontWeight="600">Voice Configuration</Text>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor}>
                    Configure voices for your podcast speakers
                  </Text>
                  <VoiceConfigurationPanel
                    scriptSpeakers={customData.scriptSpeakers || []}
                    onGenerate={customData.onGenerate}
                    isGenerating={customData.isGenerating || false}
                    selectedScriptId={customData.selectedScriptId}
                    scriptMetadata={customData.scriptMetadata}
                  />

                  {/* Audio Generation Progress */}
                  {customData.audioJobId && (
                    <>
                      <Divider my={4} />
                      {(() => {
                        console.log('🎬 Rendering AudioGenerationProgress with jobId:', customData.audioJobId);
                        return (
                          <AudioGenerationProgress
                            jobId={customData.audioJobId}
                            totalTurns={customData.totalTurns || 0}
                            onComplete={(result) => {
                              console.log('✅ Audio generation completed:', result);
                              customData.onAudioComplete?.(result);
                            }}
                            onError={(error) => {
                              console.error('❌ Audio generation failed:', error);
                              customData.onAudioError?.(error);
                            }}
                          />
                        );
                      })()}
                    </>
                  )}
                </VStack>
              </Box>
            );
          }

          console.log('❌ Showing PodcastAudioControlsPanel because customData.type is not recognized');
          // Otherwise show audio controls (mixer, effects)
          return <PodcastAudioControlsPanel />;
        }
        break;

      case 'dashboard':
        if (tabId === 'notifications') {
          return <AgentNotificationCenter isOpen={true} onClose={onClose} />;
        }
        if (tabId === 'ai-assistant') {
          return <ModernAIAssistant isOpen={true} onClose={onClose} width={width} onResize={() => { }} />;
        }
        break;

      case 'ai-research':
        if (tabId === 'ai-settings') {
          // Pass deep research settings from customData
          const deepResearchSettings = customData?.deepResearchSettings || {};
          return (
            <DeepResearchSettingsPanel
              model={deepResearchSettings.model || 'o4-mini-deep-research'}
              onModelChange={deepResearchSettings.onModelChange || (() => { })}
              mode={deepResearchSettings.mode || 'synchronous'}
              onModeChange={deepResearchSettings.onModeChange || (() => { })}
              researchDepth={deepResearchSettings.researchDepth || 3}
              onResearchDepthChange={deepResearchSettings.onResearchDepthChange || (() => { })}
              audienceLevel={deepResearchSettings.audienceLevel || 'general'}
              onAudienceLevelChange={deepResearchSettings.onAudienceLevelChange || (() => { })}
              outputFormats={deepResearchSettings.outputFormats}
              onOutputFormatsChange={deepResearchSettings.onOutputFormatsChange || (() => { })}
              dataSources={deepResearchSettings.dataSources}
              onDataSourcesChange={deepResearchSettings.onDataSourcesChange || (() => { })}
            />
          );
        }
        if (tabId === 'audio') {
          // Reuse ChatSettingsPanel from Podcast Studio (Read Aloud section only)
          const ttsSettings = customData?.ttsSettings || {};
          return (
            <ChatSettingsPanel
              ttsVoice={ttsSettings.voice || 'Puck'}
              onTTSVoiceChange={ttsSettings.onVoiceChange || (() => { })}
              ttsSpeed={ttsSettings.speed || 1.0}
              onTTSSpeedChange={ttsSettings.onSpeedChange || (() => { })}
              ttsPitch={ttsSettings.pitch || 0}
              onTTSPitchChange={ttsSettings.onPitchChange || (() => { })}
              minCharsForPregeneration={ttsSettings.minCharsForPregeneration || 200}
              onPregenerationThresholdChange={ttsSettings.onPregenerationThresholdChange || (() => { })}
            />
          );
        }
        if (tabId === 'tools') {
          return (
            <Box p={4}>
              <Text>Research Tools Panel</Text>
            </Box>
          );
        }
        if (tabId === 'ai-assistant') {
          return <ModernAIAssistant isOpen={true} onClose={onClose} width={width} onResize={() => { }} />;
        }
        break;

      case 'workspace-ai':
        if (tabId === 'ai-settings') {
          // Full WorkspaceAI Settings Panel with all features
          return (
            <WorkspaceAISettingsPanel
              model={customData?.model}
              onModelChange={customData?.onModelChange}
              temperature={customData?.temperature}
              onTemperatureChange={customData?.onTemperatureChange}
              useGoose={customData?.useGoose}
              onUseGooseChange={customData?.onUseGooseChange}
              agencyMode={customData?.agencyMode}
              onAgencyModeChange={customData?.onAgencyModeChange}
              mcpServers={customData?.mcpServers}
              onMCPServersChange={customData?.onMCPServersChange}
              mcpLoading={customData?.mcpLoading}
              knowledgeSources={customData?.knowledgeSources}
              onKnowledgeSourcesChange={customData?.onKnowledgeSourcesChange}
            />
          );
        }
        if (tabId === 'files') {
          const { FilesTabContent } = require('../workspace/FilesTabContent');
          const workspaceId = customData?.workspaceId || 'default-workspace';
          return <FilesTabContent workspaceId={workspaceId} />;
        }
        if (tabId === 'goose-settings') {
          // Modern Unified Goose Settings Panel for Workspace AI
          return (
            <ModernGooseSettingsPanel
              agentId="workspace-ai"
              agentName="Workspace AI"
              onClose={() => setActiveTab(visibleTabs[0]?.id || 'ai-settings')}
            />
          );
        }
        break;

      case 'workspace-page':
        if (tabId === 'ai-settings') {
          // Full WorkspaceAI Settings Panel for page context
          return (
            <WorkspaceAISettingsPanel
              model={customData?.model}
              onModelChange={customData?.onModelChange}
              temperature={customData?.temperature}
              onTemperatureChange={customData?.onTemperatureChange}
              useGoose={customData?.useGoose}
              onUseGooseChange={customData?.onUseGooseChange}
              agencyMode={customData?.agencyMode}
              onAgencyModeChange={customData?.onAgencyModeChange}
              mcpServers={customData?.mcpServers}
              onMCPServersChange={customData?.onMCPServersChange}
              mcpLoading={customData?.mcpLoading}
              knowledgeSources={customData?.knowledgeSources}
              onKnowledgeSourcesChange={customData?.onKnowledgeSourcesChange}
            />
          );
        }
        if (tabId === 'goose-agent') {
          // Goose Page Agent Panel (Interactive chat for specific page)
          const gooseData = customData?.goose || {};

          // Validate that we have required data
          if (!gooseData.pageId) {
            return (
              <Box p={4}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  No page selected. Open Goose from a page to use the Page Agent.
                </Text>
              </Box>
            );
          }

          // Provide default onPageUpdate if not provided
          const handlePageUpdate = gooseData.onPageUpdate || (() => {
            console.log('[DynamicRightPanel] ⚠️ onPageUpdate called but no handler provided');
            console.log('[DynamicRightPanel] 🔄 Page will reload to show updates');
            // Messages are now persisted in sessionStorage, so reload is safe
            setTimeout(() => {
              window.location.reload();
            }, 500); // Small delay to let any pending operations complete
          });

          return (
            <GooseSidebarPanel
              pageId={gooseData.pageId}
              pageTitle={gooseData.pageTitle || 'Untitled'}
              blockModelRef={gooseData.blockModelRef}
              mcpServers={gooseData.mcpServers}
              onPageUpdate={handlePageUpdate}
              onClose={() => {
                gooseData.onClose?.();
              }}
              onSwitchToFloating={() => {
                gooseData.onSwitchToFloating?.();
              }}
            />
          );
        }
        if (tabId === 'files') {
          const { FilesTabContent } = require('../workspace/FilesTabContent');
          const workspaceId = customData?.workspaceId || 'default-workspace';
          return <FilesTabContent workspaceId={workspaceId} />;
        }
        if (tabId === 'goose-settings') {
          // Modern Unified Goose Settings Panel for Page Agent
          return (
            <ModernGooseSettingsPanel
              agentId="page-agent"
              agentName="Page AI"
              onClose={() => setActiveTab(visibleTabs[0]?.id || 'ai-settings')}
            />
          );
        }
        break;

      case 'workspace-home':
        // Homepage Settings - shown by default or when ai-settings/home-settings tab is active
        if (tabId === 'home-settings' || tabId === 'ai-settings' || !tabId) {
          const homeSettings = customData?.workspaceHomeSettings || {};
          return (
            <WorkspaceHomeSettings
              sectionVisibility={homeSettings.sectionVisibility || { quickActions: true, recentlyVisited: true, learn: true, templates: true }}
              onSectionVisibilityChange={homeSettings.onSectionVisibilityChange || (() => { })}
              userName={homeSettings.userName || 'User'}
              onUserNameChange={homeSettings.onUserNameChange || (() => { })}
              greetingStyle={homeSettings.greetingStyle || 'formal'}
              onGreetingStyleChange={homeSettings.onGreetingStyleChange || (() => { })}
            />
          );
        }
        if (tabId === 'ai-assistant') {
          return <ModernAIAssistant isOpen={true} onClose={onClose} width={width} onResize={() => { }} />;
        }
        break;

      case 'image-studio':
        if (tabId === 'generation-settings') {
          return (
            <Box h="full" overflowY="auto">
              <GenerationSettingsPanel />
            </Box>
          );
        }
        if (tabId === 'ai-assistant') {
          return <ModernAIAssistant isOpen={true} onClose={onClose} width={width} onResize={() => { }} />;
        }
        break;

      case 'knowledge-graph':
        if (tabId === 'ai-assistant') {
          return (
            <Box h="full" overflow="auto" position="relative">
              <ModernAIAssistant
                dashboardContext={{
                  currentPage: 'knowledge-graph',
                  systemHealth: systemData?.health || 'unknown',
                  activeAlerts: systemData?.alerts || 0,
                  services: systemData?.services || [],
                  metrics: systemData?.metrics || {},
                  recentActivity: [],
                }}
                isOpen={true}
                onClose={() => { }}
                width={width}
                onResize={() => { }}
              />
            </Box>
          );
        }
        if (tabId === 'rag-settings') {
          return (
            <Box p={4} h="full" overflowY="auto">
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiCpu} color="blue.500" />
                  <Text fontSize="md" fontWeight="600">RAG Settings</Text>
                </HStack>
                <Text fontSize="xs" color={mutedColor}>
                  Configure embedding model, search parameters, and retrieval settings
                </Text>
                {/* Placeholder for RAG configuration panel */}
                <VStack align="stretch" spacing={3} pt={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Embedding Model</Text>
                    <Badge colorScheme="green">text-embedding-004 (Google)</Badge>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Vector Store</Text>
                    <Badge colorScheme="blue">pgvector (PostgreSQL)</Badge>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Search Limit</Text>
                    <Text fontSize="sm" color={mutedColor}>5 results</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2}>Min Relevance Score</Text>
                    <Text fontSize="sm" color={mutedColor}>0.6</Text>
                  </Box>
                </VStack>
              </VStack>
            </Box>
          );
        }
        if (tabId === 'graph-explorer') {
          return (
            <Box p={4} h="full" overflowY="auto">
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiShare2} color="purple.500" />
                  <Text fontSize="md" fontWeight="600">Graph Explorer</Text>
                </HStack>
                <Text fontSize="xs" color={mutedColor}>
                  Explore relationships and connections in the knowledge graph
                </Text>
                <Button size="sm" colorScheme="purple" variant="outline">
                  Open Neo4j Browser
                </Button>
                <Text fontSize="xs" color={mutedColor}>
                  Coming soon: Interactive graph visualization
                </Text>
              </VStack>
            </Box>
          );
        }
        if (tabId === 'system-tools') {
          return (
            <Box p={4} h="full" overflowY="auto">
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Icon as={FiActivity} color="green.500" />
                  <Text fontSize="md" fontWeight="600">System Tools</Text>
                </HStack>
                <VStack align="stretch" spacing={2}>
                  <Button size="sm" colorScheme="blue" variant="outline" width="full">
                    Reindex Documents
                  </Button>
                  <Button size="sm" colorScheme="green" variant="outline" width="full">
                    Clear Vector Cache
                  </Button>
                  <Button size="sm" colorScheme="orange" variant="outline" width="full">
                    View Metrics
                  </Button>
                  <Button size="sm" colorScheme="purple" variant="outline" width="full">
                    Export Results
                  </Button>
                </VStack>
              </VStack>
            </Box>
          );
        }
        break;

      case 'agentic-control':
        if (tabId === 'timeline') {
          return <TraceTimelineVisualization
            events={customData?.events || []}
          />;
        }
        if (tabId === 'graph') {
          return <AgentGraphVisualization
            selectedAgent={customData?.selectedAgent || null}
            events={customData?.events || []}
          />;
        }
        if (tabId === 'events') {
          return <EventTracePanel
            events={customData?.events || []}
            onClearEvents={customData?.onClearEvents}
          />;
        }
        if (tabId === 'actions') {
          return <AgentActionsPanel
            selectedAgent={customData?.selectedAgent || null}
            onShowSettings={customData?.onShowSettings}
          />;
        }
        if (tabId === 'ai-settings') {
          return <AISettingsPanel />;
        }
        break;

      case 'ai-inferencing':
        // Handle contextual settings tab
        if (tabId === 'contextual-settings') {
          // Route based on customData.type
          if (customData?.type === 'provider-performance-controls') {
            const ProviderPerformanceControlsPanel = require('../ai-inferencing/ProviderPerformanceControlsPanel').ProviderPerformanceControlsPanel;
            return (
              <Box h="full" overflow="auto" position="relative">
                <ProviderPerformanceControlsPanel
                  timeRange={customData.timeRange}
                  timeRangeOptions={customData.timeRangeOptions}
                  onTimeRangeChange={customData.onTimeRangeChange}
                  onRefresh={customData.onRefresh}
                  onExport={customData.onExport}
                />
              </Box>
            );
          }

          if (customData?.type === 'model-filters') {
            const ModelFiltersPanel = require('../ai-inferencing/ModelFiltersPanel').ModelFiltersPanel;
            return (
              <Box h="full" overflow="auto" position="relative">
                <ModelFiltersPanel
                  providers={customData.providers}
                  costRange={customData.costRange}
                  sortOptions={customData.sortOptions}
                  autoRefresh={customData.autoRefresh}
                  onProviderToggle={customData.onProviderToggle}
                  onCostRangeChange={customData.onCostRangeChange}
                  onSortChange={customData.onSortChange}
                  onAutoRefreshToggle={customData.onAutoRefreshToggle}
                />
              </Box>
            );
          }

          if (customData?.type === 'activity-logs-filters') {
            const ActivityLogsFiltersPanel = require('../ai-inferencing/ActivityLogsFiltersPanel').ActivityLogsFiltersPanel;
            return (
              <Box h="full" overflow="auto" position="relative">
                <ActivityLogsFiltersPanel
                  statusOptions={customData.statusOptions}
                  providerOptions={customData.providerOptions}
                  serviceOptions={customData.serviceOptions}
                  onExportCSV={customData.onExportCSV}
                />
              </Box>
            );
          }

          if (customData?.type === 'savings-calculator') {
            const SavingsCalculatorPanel = require('../ai-inferencing/SavingsCalculatorPanel').SavingsCalculatorPanel;
            return (
              <Box h="full" overflow="auto" position="relative">
                <SavingsCalculatorPanel
                  potentialSavings={customData.potentialSavings}
                  opportunities={customData.opportunities}
                  onApplyRecommendation={customData.onApplyRecommendation}
                  onApplyAll={customData.onApplyAll}
                />
              </Box>
            );
          }

          // Default: Show AI Assistant with AI Inferencing context
          return (
            <Box h="full" overflow="auto" position="relative">
              <ModernAIAssistant
                dashboardContext={{
                  currentPage: 'ai-inferencing',
                  systemHealth: systemData?.health || 'unknown',
                  activeAlerts: systemData?.alerts || 0,
                  services: systemData?.services || [],
                  metrics: systemData?.metrics || {},
                  recentActivity: [],
                  pageContext: {
                    section: 'overview',
                    message: 'Viewing AI Inferencing dashboard. I can help you with provider settings, API key management, model selection, and cost optimization.',
                  },
                }}
                isOpen={true}
                onClose={() => { }}
                width={width}
                onResize={() => { }}
              />
            </Box>
          );
        }
        // AI Assistant tab is handled by the earlier check
        break;
    }

    // Universal fallback: Show AI Assistant with generic context
    return (
      <Box h="full" overflow="auto" position="relative">
        <ModernAIAssistant
          dashboardContext={{
            currentPage: context,
            systemHealth: systemData?.health || 'unknown',
            activeAlerts: systemData?.alerts || 0,
            services: systemData?.services || [],
            metrics: systemData?.metrics || {},
            recentActivity: [],
            pageContext: {
              section: 'general',
              message: `Viewing ${context} page. I'm here to help you navigate and understand the dashboard.`,
            },
          }}
          isOpen={true}
          onClose={() => { }}
          width={width}
          onResize={() => { }}
        />
      </Box>
    );
  };

  // Pre-compute all color mode values at top level to avoid Hooks order violation
  const tabStylesLight = {
    blue: { selected: 'blue.500', color: 'blue.500', hover: 'blue.50', hoverColor: 'blue.600' },
    green: { selected: 'green.500', color: 'green.500', hover: 'green.50', hoverColor: 'green.600' },
    purple: { selected: 'purple.500', color: 'purple.500', hover: 'purple.50', hoverColor: 'purple.600' },
    orange: { selected: 'orange.500', color: 'orange.500', hover: 'orange.50', hoverColor: 'orange.600' },
    pink: { selected: 'pink.500', color: 'pink.500', hover: 'pink.50', hoverColor: 'pink.600' },
    teal: { selected: 'teal.500', color: 'teal.500', hover: 'teal.50', hoverColor: 'teal.600' },
    cyan: { selected: 'cyan.500', color: 'cyan.500', hover: 'cyan.50', hoverColor: 'cyan.600' },
  };
  const tabStylesDark = {
    blue: { selected: 'blue.600', color: 'blue.400', hover: 'blue.900', hoverColor: 'blue.300' },
    green: { selected: 'green.600', color: 'green.400', hover: 'green.900', hoverColor: 'green.300' },
    purple: { selected: 'purple.600', color: 'purple.400', hover: 'purple.900', hoverColor: 'purple.300' },
    orange: { selected: 'orange.600', color: 'orange.400', hover: 'orange.900', hoverColor: 'orange.300' },
    pink: { selected: 'pink.600', color: 'pink.400', hover: 'pink.900', hoverColor: 'pink.300' },
    teal: { selected: 'teal.600', color: 'teal.400', hover: 'teal.900', hoverColor: 'teal.300' },
    cyan: { selected: 'cyan.600', color: 'cyan.400', hover: 'cyan.900', hoverColor: 'cyan.300' },
  };
  const tabStyles = useColorModeValue(tabStylesLight, tabStylesDark);

  return (
    <MotionBox
      position="fixed"
      right="0"
      top="70px"
      h="calc(100vh - 70px)"
      bg={glassBackground}
      backdropFilter="blur(8px) saturate(120%)"
      borderLeft="1px solid"
      borderColor={glassBorder}
      borderTopLeftRadius="24px"
      borderBottomLeftRadius="24px"
      boxShadow="md"
      zIndex={1000}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      animate={{
        width: `${width}px`,
      }}
      transition={isResizing ? { duration: 0 } : {
        type: 'spring',
        stiffness: 220,
        damping: 32,
        mass: 1.0,
      }}
      sx={{
        WebkitBackdropFilter: 'blur(8px) saturate(120%)',
      }}
      onClick={(e: React.MouseEvent) => {
        // Prevent clicks inside the panel from bubbling to parent elements
        e.stopPropagation();
      }}
      onMouseEnter={(e: React.MouseEvent) => {
        // Prevent hover events from causing panel to close
        e.stopPropagation();
      }}
      onMouseLeave={(e: React.MouseEvent) => {
        // Prevent hover events from causing panel to close
        e.stopPropagation();
      }}
      onMouseMove={(e: React.MouseEvent) => {
        // Prevent mouse movement from triggering unwanted actions
        e.stopPropagation();
      }}
    >
      {/* Resize Handle */}
      <Box
        position="absolute"
        left="0"
        top="0"
        bottom="0"
        w="4px"
        cursor="ew-resize"
        bg={resizeHandleColor}
        opacity={isResizing ? 1 : 0}
        _hover={{ opacity: 1, bg: resizeHandleHoverColor }}
        transition="opacity 0.2s, background-color 0.2s"
        onMouseDown={handleResizeStart}
        zIndex={10}
      />
      {/* Header with Active Tab Title and Close Button */}
      <HStack
        px={4}
        py={3}
        justify="space-between"
        bg="transparent"
        borderBottom="1px solid"
        borderColor={borderSubtle}
      >
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          {visibleTabs[activeTabIndex >= 0 ? activeTabIndex : 0]?.label || 'Panel'}
        </Text>
        <Tooltip label="Close panel">
          <IconButton
            aria-label="Close panel"
            icon={<FiX />}
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        </Tooltip>
      </HStack>

      {/* Tabs */}
      <Tabs index={activeTabIndex >= 0 ? activeTabIndex : 0} onChange={(index) => setActiveTab(visibleTabs[index].id)} h="full" display="flex" flexDirection="column">
        {/* Tab List - Horizontal Tabs */}
        {visibleTabs.length > 1 && (
          <TabList
            px={4}
            pt={3}
            gap={3}
            flexShrink={0}
            borderBottom="none"
            position="relative"
            zIndex={10}
            bg={bgColor}
          >
            {visibleTabs.map((tab) => {
              const tabColor = colorSchemes[tab.id] || 'blue';
              const styles = tabStyles[tabColor as keyof typeof tabStyles] || tabStyles.blue;
              return (
                <Tooltip key={tab.id} label={tab.label} placement="bottom">
                  <Tab
                    fontSize="xs"
                    px={3}
                    py={2}
                    minW="auto"
                    borderRadius="md"
                    _selected={{
                      bg: styles.selected,
                      color: 'white',
                    }}
                    color={styles.color}
                    _hover={{
                      bg: styles.hover,
                      color: styles.hoverColor,
                    }}
                    transition="all 0.2s"
                  >
                    {tab.icon && iconMap[tab.icon] && (
                      <Icon
                        as={iconMap[tab.icon]}
                        boxSize="18px"
                        strokeWidth={2.5}
                      />
                    )}
                  </Tab>
                </Tooltip>
              );
            })}
          </TabList>
        )}

        {/* Tab Panels - Scrollable Content */}
        <TabPanels flex={1} overflow="hidden">
          {visibleTabs.map((tab) => (
            <TabPanel key={tab.id} p={0} h="full" overflow="auto">
              {renderTabContent(tab.id)}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </MotionBox>
  );
}
