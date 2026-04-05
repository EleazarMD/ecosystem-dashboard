import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Checkbox,
  Button,
  IconButton,
  Divider,
  Badge,
  Tooltip,
  Icon,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { FiPlus, FiFile, FiCheckSquare, FiSquare, FiX, FiMoreVertical, FiTrash2, FiEdit, FiEye, FiCopy, FiFileText, FiMusic, FiChevronLeft, FiRefreshCw, FiDisc, FiDownload, FiZap } from 'react-icons/fi';
import { ResearchMaterial } from '../../../pages/podcast-studio';
import RetractablePanel from '../layout/RetractablePanel';
import { useSidebar } from '../../contexts/SidebarContext';
import VinylDiskIcon from '../icons/VinylDiskIcon';
import dynamic from 'next/dynamic';

// Dynamically import ScriptVersionManager to avoid circular dependencies
const ScriptVersionManager = dynamic(() => import('./ScriptVersionManager'), {
  ssr: false,
  loading: () => <Box p={4}>Loading script versions...</Box>
});

// Dynamically import PodcastLibrary
const PodcastLibrary = dynamic(() => import('./PodcastLibrary'), {
  ssr: false,
  loading: () => <Box p={4}>Loading podcasts...</Box>
});

// Dynamically import ExportPanel
const ExportPanel = dynamic(() => import('./ExportPanel'), {
  ssr: false,
  loading: () => <Box p={4}>Loading export options...</Box>
});

// Import shared SourcesListView for consistency
import SourcesListView from './SourcesListView';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { ContextMenuEngine, useContextMenu, createToolMenuRegistry } from '@/lib/context-menu';
import { podcastSourceActions, podcastSourceActionGroups, type PodcastSourceActionContext } from '@/lib/context-menu/podcast-studio-actions';

// Create podcast-source-specific registry (mirrors research sidebar pattern)
const sourceRegistry = createToolMenuRegistry<PodcastSourceActionContext>();
podcastSourceActionGroups.forEach(g => sourceRegistry.registerGroup(g.id, undefined, g.order));
sourceRegistry.registerActions(podcastSourceActions);

interface SourcesPanelProps {
  materials: ResearchMaterial[];
  selectedIds: string[];
  onToggleSource: (id: string) => void;
  onToggleAll: () => void;
  onAddSource: () => void;
  onImportFromStoryIntel?: (materials: any[]) => void;
  onDeleteSource?: (id: string) => void;
  onBatchDeleteSources?: (ids: string[]) => void; // Batch delete multiple sources
  onRenameSource?: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onWidthChange?: (width: number) => void;
  // Context-aware mode
  mode?: 'sources' | 'scripts' | 'podcasts';
  projectId?: string;
  selectedScriptId?: string | null;
  onScriptSelect?: (script: any) => void;
  onSelectForAudio?: (script: any) => void; // Select script for audio generation
  onPodcastSelect?: (episode: any) => void; // Select podcast episode to play
  selectedPodcastEpisodeId?: string | null; // Currently selected podcast episode ID
  podcastRefreshTrigger?: number; // Trigger to refresh podcast library after delete
  scriptSavedTrigger?: number; // Trigger to refresh script versions after save
  currentScript?: any[]; // Current podcast script for export
  onNotebookSelectorOpen?: () => void; // Open notebook selector modal
  onBatchDeleteScripts?: (ids: string[]) => void; // Batch delete multiple scripts
  onBatchDeleteAudio?: (ids: string[]) => void; // Batch delete multiple audio files
  onScriptDeleted?: (scriptId: string) => void; // Notify parent when a script is deleted from sidebar
}

interface SourceSummary {
  title: string;
  keyPoints: string[];
  mainThemes: string[];
  summary: string;
}

export default function SourcesPanel({
  materials,
  selectedIds,
  onToggleSource,
  onToggleAll,
  onAddSource,
  onImportFromStoryIntel,
  onDeleteSource,
  onBatchDeleteSources,
  onRenameSource,
  isCollapsed = false,
  onToggleCollapse,
  onWidthChange,
  mode = 'sources',
  projectId,
  selectedScriptId,
  onScriptSelect,
  onSelectForAudio,
  onPodcastSelect,
  selectedPodcastEpisodeId,
  podcastRefreshTrigger,
  scriptSavedTrigger,
  currentScript,
  onNotebookSelectorOpen,
  onBatchDeleteScripts,
  onBatchDeleteAudio,
  onScriptDeleted,
}: SourcesPanelProps) {
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [sourceSummaries, setSourceSummaries] = useState<Record<string, SourceSummary>>({});
  const [isImportingStories, setIsImportingStories] = useState(false);

  // Import stories from Story Intelligence Pipeline
  const handleImportFromStoryIntel = async (category?: string) => {
    setIsImportingStories(true);
    try {
      console.log("Importing from Story Intelligence...", { category, origin: window.location.origin });
      const response = await fetch(`/api/story-intelligence/import-to-podcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit: 5, include_analysis: false })
      });
      
      if (!response.ok) {
        let errorMessage = `Import failed: ${response.status}`;
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          console.error("Import API error:", response.status, errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData.details || '';
        } catch (parseError) {
          // If JSON parsing fails, try text
          const errorText = await response.text();
          console.error("Import API error:", response.status, errorText);
          errorDetails = errorText;
        }
        
        // Show more specific error messages based on status code
        if (response.status === 503) {
          toast({ 
            title: "Service Unavailable", 
            description: "Story Intelligence service is not running. Please start the GooseMind service.", 
            status: "warning", 
            duration: 7000,
            isClosable: true
          });
        } else if (response.status === 504) {
          toast({ 
            title: "Request Timeout", 
            description: "Story Intelligence service is taking too long to respond. Please try again.", 
            status: "warning", 
            duration: 5000 
          });
        } else {
          toast({ 
            title: "Import Failed", 
            description: errorMessage + (errorDetails ? ` - ${errorDetails}` : ''), 
            status: "error", 
            duration: 7000,
            isClosable: true
          });
        }
        return;
      }
      
      const data = await response.json();
      console.log("Import response:", data);
      
      if (data.materials && data.materials.length > 0) {
        onImportFromStoryIntel?.(data.materials);
        toast({ title: "Stories Imported", description: `Imported ${data.materials.length} stories from Story Intelligence`, status: "success", duration: 3000 });
      } else {
        toast({ title: "No Stories Available", description: "No new stories found. Try refreshing stories first.", status: "info", duration: 3000 });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({ 
        title: "Import Failed", 
        description: error?.message || "Could not import stories. Check console for details.", 
        status: "error", 
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsImportingStories(false);
    }
  };
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSourceGuideCollapsed, setIsSourceGuideCollapsed] = useState(false);
  const [scriptModeTabIndex, setScriptModeTabIndex] = useState(0);
  const [panelWidth, setPanelWidth] = useState(450);
  const toast = useToast();
  const { width: sidebarWidth } = useSidebar();

  // Context menu (mirrors research sidebar pattern)
  const { state: menuState, close: closeMenu, handleContextMenu: openContextMenu } = useContextMenu();

  const handleSourceContextMenu = useCallback((e: React.MouseEvent, material: ResearchMaterial) => {
    const context: PodcastSourceActionContext = {
      material: {
        id: material.id,
        title: material.title,
        type: material.type,
        url: material.url,
        wordCount: material.wordCount,
        word_count: material.word_count,
        pageCount: material.pageCount,
      },
      selectedIds,
      totalCount: materials.length,
      toast: (options: any) => toast({ position: 'bottom-right', ...options }),
      onViewDetails: (id: string) => setExpandedSourceId(id),
      onRename: (id: string) => onRenameSource?.(id),
      onDelete: (id: string) => onDeleteSource?.(id),
      onBatchDelete: (ids: string[]) => onBatchDeleteSources?.(ids),
    };

    const config = sourceRegistry.buildConfig('podcast-studio', context, {
      title: material.title.substring(0, 50) + (material.title.length > 50 ? '…' : ''),
      subtitle: `${material.wordCount?.toLocaleString() || material.word_count?.toLocaleString() || 0} words • ${material.type || 'document'}`,
    });

    openContextMenu(e, config);
  }, [selectedIds, materials.length, toast, onDeleteSource, onBatchDeleteSources, onRenameSource, openContextMenu]);

  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');
  const cardBg = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const expandedBgColor = useSemanticToken('surface.base');
  const menuHoverBg = useSemanticToken('border.default');
  const surfaceCard = useSemanticToken('surface.card');
  const surfaceHighlight = useSemanticToken('surface.highlight');

  const allSelected = materials.length > 0 && selectedIds.length === materials.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < materials.length;

  const expandedSource = expandedSourceId ? materials.find(m => m.id === expandedSourceId) : null;
  const isExpanded = expandedSourceId !== null;
  const displayWidth = isExpanded ? 600 : panelWidth;

  // Notify parent of width changes
  useEffect(() => {
    onWidthChange?.(displayWidth);
  }, [displayWidth, onWidthChange]);

  const handleWidthChange = (newWidth: number) => {
    setPanelWidth(newWidth);
  };

  const generateSummary = async (material: ResearchMaterial, forceRegenerate: boolean = false) => {
    setIsGeneratingSummary(true);

    // Use cached metadata summary unless forcing regeneration
    if (material.metadata?.summary && !forceRegenerate) {
      const summary: SourceSummary = {
        title: material.title,
        keyPoints: material.metadata.summary.split('.').filter(s => s.trim().length > 20).slice(0, 5),
        mainThemes: material.metadata.keyTopics || ['Analysis', 'Research', 'Findings'],
        summary: material.metadata.summary,
      };

      setSourceSummaries(prev => ({ ...prev, [material.id]: summary }));
      setIsGeneratingSummary(false);
      return;
    }

    // Call backend API to generate AI summary
    try {
      const response = await fetch('/api/podcast-studio/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId: material.id,
          title: material.title,
          content: material.content || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Summary API error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();

      const summary: SourceSummary = {
        title: material.title,
        keyPoints: data.keyPoints || [],
        mainThemes: data.mainThemes || [],
        summary: data.summary || '',
      };

      setSourceSummaries(prev => ({ ...prev, [material.id]: summary }));
      console.log('✅ Generated summary for:', material.title);

      toast({
        title: '✅ Summary generated',
        description: 'AI summary created successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('❌ Failed to generate summary:', error);

      toast({
        title: '❌ Summary generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });

      // Fallback to basic info if API fails
      const wordCount = material.wordCount || 0;
      const pageCount = material.pageCount || 1;

      const summary: SourceSummary = {
        title: material.title,
        keyPoints: [
          `📊 ${wordCount.toLocaleString()} words across ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`,
          'AI summary generation failed - using document metadata',
          'Full content available in document view below',
        ],
        mainThemes: material.metadata?.keyTopics || ['Research Material'],
        summary: `${material.title} - A research document with ${wordCount} words. AI summary generation temporarily unavailable.`,
      };

      setSourceSummaries(prev => ({ ...prev, [material.id]: summary }));
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleToggleSource = (id: string) => {
    // If clicking the same source, close it
    if (expandedSourceId === id) {
      setExpandedSourceId(null);
      onToggleSource(id);
    } else {
      // Expand new source
      setExpandedSourceId(id);
      onToggleSource(id);

      // Generate summary if not already generated
      const material = materials.find(m => m.id === id);
      if (material && !sourceSummaries[id]) {
        generateSummary(material);
      }
    }
  };

  const handleCloseExpanded = () => {
    setExpandedSourceId(null);
  };

  // Expanded View - showing full document with AI summary (overlay on top of panel)
  if (isExpanded && expandedSource) {
    const summary = sourceSummaries[expandedSource.id];

    return (
      <Box
        position="fixed"
        left={`${sidebarWidth}px`}
        top="70px"
        h="calc(100vh - 70px)"
        w={`${panelWidth}px`}
        bg={expandedBgColor}
        borderRight="1px solid"
        borderColor={borderColor}
        boxShadow="lg"
        zIndex={999}
        overflowY="auto"
        transition="all 0.3s ease-out"
      >
        <VStack spacing={0} align="stretch" h="full">
          {/* Header */}
          <HStack
            px={4}
            py={3}
            justify="space-between"
          >
            <Text
              fontSize="14px"
              fontWeight="500"
              color={textColor}
              noOfLines={1}
              flex={1}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
            >
              {expandedSource.title}
            </Text>
            <HStack spacing={1}>
              <Tooltip label="Close">
                <IconButton
                  aria-label="Close"
                  icon={<FiX />}
                  size="sm"
                  variant="ghost"
                  onClick={handleCloseExpanded}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* AI-Generated Summary - NotebookLM Style - Collapsible */}
          <Box
            px={4}
            py={4}
          >
            <Box
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="16px"
              p={5}
              boxShadow="sm"
              transition="all 0.2s"
              _hover={{ boxShadow: 'md' }}
            >
              <HStack justify="space-between" mb={isSourceGuideCollapsed ? 0 : 4}>
                <HStack spacing={2}>
                  <Box w="24px" h="24px" bg="purple.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                    <Text fontSize="12px">🧠</Text>
                  </Box>
                  <Text
                    fontSize="14px"
                    fontWeight="600"
                    color={textColor}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    Source guide
                  </Text>
                </HStack>
                <Tooltip label={isSourceGuideCollapsed ? 'Expand' : 'Collapse'}>
                  <IconButton
                    aria-label="Toggle source guide"
                    icon={<Icon as={FiChevronLeft} transform={isSourceGuideCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)'} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsSourceGuideCollapsed(!isSourceGuideCollapsed)}
                  />
                </Tooltip>
              </HStack>

              {!isSourceGuideCollapsed && (
                isGeneratingSummary ? (
                  <Box py={6} textAlign="center">
                    <Text
                      fontSize="13px"
                      color={mutedColor}
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                    >
                      Generating summary...
                    </Text>
                  </Box>
                ) : summary ? (
                  <VStack align="stretch" spacing={3}>
                    <Text
                      fontSize="13px"
                      color={textColor}
                      lineHeight="1.6"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                    >
                      {summary.summary}
                    </Text>

                    <Box>
                      <Text
                        fontSize="11px"
                        fontWeight="600"
                        color={mutedColor}
                        mb={2}
                        textTransform="uppercase"
                        letterSpacing="0.5px"
                        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                      >
                        Key Points
                      </Text>
                      <VStack align="stretch" spacing={2}>
                        {summary.keyPoints.map((point, idx) => (
                          <HStack key={idx} spacing={2} align="start">
                            <Text fontSize="13px" color="blue.500">•</Text>
                            <Text
                              fontSize="13px"
                              color={textColor}
                              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                            >
                              {point}
                            </Text>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>

                    <Box>
                      <Text
                        fontSize="11px"
                        fontWeight="600"
                        color={mutedColor}
                        mb={2}
                        textTransform="uppercase"
                        letterSpacing="0.5px"
                        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                      >
                        Topics
                      </Text>
                      <HStack spacing={1.5} flexWrap="wrap">
                        {summary.mainThemes.map((theme, idx) => (
                          <Badge key={idx} colorScheme="purple" fontSize="9px" px={1.5} py={0.5} borderRadius="full">
                            {theme}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>

                    {/* Regenerate Button */}
                    <Box pt={2} borderTop="1px solid" borderColor={useSemanticToken('border.default')}>
                      <Button
                        leftIcon={<FiRefreshCw />}
                        size="sm"
                        variant="ghost"
                        colorScheme="purple"
                        w="full"
                        onClick={() => generateSummary(expandedSource, true)}
                        isDisabled={isGeneratingSummary}
                        fontSize="12px"
                        fontWeight="500"
                      >
                        Regenerate Summary
                      </Button>
                    </Box>
                  </VStack>
                ) : null
              )}
            </Box>
          </Box>

          {/* Document Content - Containerized */}
          <Box flex={1} px={4} py={2} overflowY="auto">
            <Box
              bg={surfaceCard}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="16px"
              p={5}
              boxShadow="sm"
              transition="all 0.2s"
              _hover={{ boxShadow: 'md' }}
            >
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text
                    fontSize="11px"
                    fontWeight="600"
                    color={mutedColor}
                    mb={3}
                    textTransform="uppercase"
                    letterSpacing="0.5px"
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    Full Document Text
                  </Text>
                  <Text
                    fontSize="13px"
                    fontWeight="500"
                    color={textColor}
                    mb={3}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    {expandedSource.title}
                  </Text>
                </Box>
                <Text
                  fontSize="13px"
                  color={textColor}
                  whiteSpace="pre-wrap"
                  lineHeight="1.8"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  {expandedSource.content}
                </Text>
              </VStack>
            </Box>
          </Box>
        </VStack>
      </Box>
    );
  }

  // List View - normal sources panel
  const panelTitle = mode === 'podcasts' ? 'Podcast Library' : mode === 'scripts' ? 'Script Versions' : 'Open Notebooks';
  const panelIcon = mode === 'podcasts' ? FiMusic : mode === 'scripts' ? FiFileText : FiDisc;
  const panelIconColor = mode === 'podcasts' ? 'green.500' : mode === 'scripts' ? 'purple.500' : 'gray.700';

  // Custom header for Open Notebooks mode with clickable vinyl disk icon
  const customHeader = mode === 'sources' && onNotebookSelectorOpen ? (
    <HStack
      px={4}
      py={3}
      borderBottom="1px solid"
      borderColor={borderColor}
      justify="space-between"
      flexShrink={0}
    >
      <HStack spacing={2}>
        <Tooltip label="Open Notebook Selector">
          <Box
            cursor="pointer"
            onClick={onNotebookSelectorOpen}
            transition="transform 0.2s"
            _hover={{ transform: 'scale(1.1)' }}
          >
            <VinylDiskIcon size={28} color={textColor} />
          </Box>
        </Tooltip>
        <Text fontSize="md" fontWeight="700" color={textColor}>
          {panelTitle}
        </Text>
      </HStack>

      <HStack spacing={1}>
        <Tooltip label="Collapse">
          <IconButton
            aria-label="Collapse"
            icon={<FiChevronLeft />}
            onClick={onToggleCollapse}
            variant="ghost"
            size="sm"
          />
        </Tooltip>
      </HStack>
    </HStack>
  ) : undefined;

  return (
    <RetractablePanel
      title={panelTitle}
      icon={panelIcon}
      iconColor={panelIconColor}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      width={displayWidth}
      onWidthChange={handleWidthChange}
      side="left"
      topOffset="70px"
      customHeader={customHeader}
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Conditional Rendering based on Mode */}
        {mode === 'scripts' ? (
          /* Script Versions Mode with Sources Sub-View */
          projectId ? (
            <VStack spacing={0} align="stretch" flex="1">
              {/* Sub-tabs for Versions and Sources */}
              <Tabs
                size="sm"
                variant="enclosed"
                colorScheme="purple"
                index={scriptModeTabIndex}
                onChange={setScriptModeTabIndex}
              >
                <TabList px={4} pt={2}>
                  <Tab fontSize="xs" fontWeight="500">📝 Versions</Tab>
                  <Tab fontSize="xs" fontWeight="500">📄 Sources</Tab>
                  <Tab fontSize="xs" fontWeight="500">📥 Export</Tab>
                </TabList>

                <TabPanels>
                  {/* Versions Tab */}
                  <TabPanel p={0} h="full">
                    <Box overflowY="auto" h="full">
                      <ScriptVersionManager
                        projectId={projectId}
                        selectedScriptId={selectedScriptId}
                        onScriptSelect={(script) => {
                          console.log('🔗 SourcesPanel forwarding script select:', script?.id);
                          onScriptSelect?.(script);
                        }}
                        onSelectForAudio={onSelectForAudio}
                        showAudioControls={true}
                        refreshTrigger={scriptSavedTrigger}
                        onBatchDelete={onBatchDeleteScripts}
                        onScriptDeleted={onScriptDeleted}
                      />
                    </Box>
                  </TabPanel>

                  {/* Sources Tab - EXACT COPY of Research Sources UI */}
                  <TabPanel p={0} h="full">
                    {/* Show expanded view if a source is selected */}
                    {isExpanded && expandedSource ? (
                      /* Expanded Source View - REUSE from main panel */
                      <VStack spacing={0} align="stretch" h="full">
                        {/* Header */}
                        <HStack px={4} py={3} justify="space-between">
                          <Text
                            fontSize="14px"
                            fontWeight="500"
                            color={textColor}
                            noOfLines={1}
                            flex={1}
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                          >
                            {expandedSource.title}
                          </Text>
                          <HStack spacing={1}>
                            <Tooltip label="Close">
                              <IconButton
                                aria-label="Close"
                                icon={<FiX />}
                                size="sm"
                                variant="ghost"
                                onClick={handleCloseExpanded}
                              />
                            </Tooltip>
                          </HStack>
                        </HStack>

                        {/* AI-Generated Summary */}
                        <Box px={4} py={4}>
                          <Box
                            bg={useSemanticToken('surface.card')}
                            border="1px solid"
                            borderColor={useSemanticToken('border.default')}
                            borderRadius="16px"
                            p={5}
                            boxShadow="sm"
                            transition="all 0.2s"
                            _hover={{ boxShadow: 'md' }}
                          >
                            <HStack justify="space-between" mb={isSourceGuideCollapsed ? 0 : 4}>
                              <HStack spacing={2}>
                                <Box w="24px" h="24px" bg="purple.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                                  <Text fontSize="12px">🧠</Text>
                                </Box>
                                <Text
                                  fontSize="14px"
                                  fontWeight="600"
                                  color={textColor}
                                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                                >
                                  Source guide
                                </Text>
                              </HStack>
                              <Tooltip label={isSourceGuideCollapsed ? 'Expand' : 'Collapse'}>
                                <IconButton
                                  aria-label="Toggle source guide"
                                  icon={<Icon as={FiChevronLeft} transform={isSourceGuideCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)'} />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setIsSourceGuideCollapsed(!isSourceGuideCollapsed)}
                                />
                              </Tooltip>
                            </HStack>

                            {!isSourceGuideCollapsed && (
                              isGeneratingSummary ? (
                                <Box py={6} textAlign="center">
                                  <Text fontSize="13px" color={mutedColor}>
                                    Generating summary...
                                  </Text>
                                </Box>
                              ) : sourceSummaries[expandedSource.id] ? (
                                <VStack align="stretch" spacing={3}>
                                  <Text fontSize="13px" color={textColor} lineHeight="1.6">
                                    {sourceSummaries[expandedSource.id].summary}
                                  </Text>
                                  {sourceSummaries[expandedSource.id].keyPoints.length > 0 && (
                                    <VStack align="stretch" spacing={2}>
                                      {sourceSummaries[expandedSource.id].keyPoints.map((point, idx) => (
                                        <HStack key={idx} align="start" spacing={2}>
                                          <Text fontSize="13px" color={mutedColor}>•</Text>
                                          <Text fontSize="13px" color={textColor} flex={1}>{point}</Text>
                                        </HStack>
                                      ))}
                                    </VStack>
                                  )}
                                </VStack>
                              ) : null
                            )}
                          </Box>
                        </Box>

                        {/* Full Content */}
                        <Box flex={1} overflowY="auto" px={4} pb={4}>
                          <Box
                            bg={useSemanticToken('surface.card')}
                            border="1px solid"
                            borderColor={useSemanticToken('border.default')}
                            borderRadius="16px"
                            p={5}
                            boxShadow="sm"
                          >
                            <VStack align="stretch" spacing={4}>
                              <HStack justify="space-between">
                                <HStack spacing={2}>
                                  <Box w="24px" h="24px" bg="blue.100" borderRadius="full" display="flex" alignItems="center" justifyContent="center">
                                    <Text fontSize="12px">📄</Text>
                                  </Box>
                                  <Text fontSize="14px" fontWeight="600" color={textColor}>
                                    Full Document Text
                                  </Text>
                                </HStack>
                                <Text fontSize="11px" color={mutedColor}>
                                  {expandedSource.wordCount?.toLocaleString() || 0} words
                                </Text>
                              </HStack>
                              {expandedSource.content ? (
                                <Text fontSize="13px" color={textColor} whiteSpace="pre-wrap" lineHeight="1.8">
                                  {expandedSource.content}
                                </Text>
                              ) : (
                                <Box py={4} textAlign="center" bg="orange.50" borderRadius="md">
                                  <Text fontSize="13px" color="orange.600" fontWeight="500">
                                    ⚠️ Document content not available
                                  </Text>
                                  <Text fontSize="12px" color="orange.500" mt={1}>
                                    Try re-uploading the document to extract the full text
                                  </Text>
                                </Box>
                              )}
                            </VStack>
                          </Box>
                        </Box>
                      </VStack>
                    ) : (
                      /* List View */
                      <VStack spacing={0} align="stretch" h="full">
                        {/* Info Banner */}
                        <Box p={4} bg={surfaceHighlight} borderBottom="1px solid" borderColor={borderColor}>
                          <Text fontSize="xs" color={textColor}>
                            💡 <strong>Regenerate with different sources:</strong> Select materials below and regenerate to create a new version
                          </Text>
                        </Box>

                        {/* Add Source Button - EXACT COPY */}
                        <Box px={4} py={3}>
                          <Button
                            leftIcon={<FiPlus />}
                            variant="solid"
                            size="sm"
                            w="full"
                            onClick={onAddSource}
                            bg={cardBg}
                            border="1px solid"
                            borderColor={borderColor}
                            color={textColor}
                            _hover={{ bg: hoverBg, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                            fontWeight="500"
                            fontSize="13px"
                            borderRadius="12px"
                            transition="all 0.2s"
                            boxShadow="xs"
                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                          >
                            Add Source
                          </Button>
                        </Box>

                        {/* Select All + Delete Selected */}
                        {materials.length > 0 && (
                          <Box px={4} pb={2}>
                            <HStack spacing={2}>
                              <HStack
                                px={3}
                                py={2}
                                cursor="pointer"
                                bg={cardBg}
                                border="1px solid"
                                borderColor={borderColor}
                                borderRadius="12px"
                                _hover={{ bg: hoverBg, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                                onClick={onToggleAll}
                                transition="all 0.2s ease"
                                boxShadow="xs"
                                flex={1}
                              >
                                <Text
                                  fontSize="12px"
                                  fontWeight="500"
                                  color={textColor}
                                  flex={1}
                                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                                >
                                  Select all
                                </Text>
                                <Checkbox
                                  isChecked={allSelected}
                                  isIndeterminate={someSelected}
                                  colorScheme="blue"
                                  pointerEvents="none"
                                  size="sm"
                                />
                              </HStack>
                              {selectedIds.length > 0 && onBatchDeleteSources && (
                                <Tooltip label={`Delete ${selectedIds.length} selected`}>
                                  <IconButton
                                    aria-label="Delete selected"
                                    icon={<FiTrash2 />}
                                    size="sm"
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={() => onBatchDeleteSources(selectedIds)}
                                    borderRadius="12px"
                                  />
                                </Tooltip>
                              )}
                            </HStack>
                          </Box>
                        )}

                        {/* Divider */}
                        {materials.length > 0 && (
                          <Box px={4}>
                            <Divider opacity={0.3} />
                          </Box>
                        )}

                        {/* Sources List - EXACT COPY */}
                        <VStack spacing={2} align="stretch" flex={1} overflowY="auto" px={4} py={2}>
                          {materials.length === 0 ? (
                            <Box p={6} textAlign="center">
                              <Icon as={FiFile} boxSize={12} color={mutedColor} mb={3} />
                              <Text fontSize="sm" color={mutedColor}>
                                No documents uploaded
                              </Text>
                              <Text fontSize="xs" color={mutedColor} mt={1}>
                                Add sources to regenerate script
                              </Text>
                            </Box>
                          ) : (
                            materials.map((material) => {
                              const isSelected = selectedIds.includes(material.id);
                              return (
                                <HStack
                                  key={material.id}
                                  px={3}
                                  py={2.5}
                                  spacing={2}
                                  bg={isSelected ? selectedBg : cardBg}
                                  border="1px solid"
                                  borderColor={isSelected ? 'blue.300' : borderColor}
                                  borderRadius="12px"
                                  _hover={{ bg: isSelected ? selectedBg : hoverBg, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                                  transition="all 0.2s ease"
                                  boxShadow="xs"
                                  position="relative"
                                  onContextMenu={(e) => handleSourceContextMenu(e, material)}
                                >
                                  <Icon
                                    as={FiFile}
                                    color="#d93025"
                                    boxSize={4}
                                    flexShrink={0}
                                    onClick={() => handleToggleSource(material.id)}
                                    cursor="pointer"
                                  />
                                  <Text
                                    fontSize="13px"
                                    fontWeight="normal"
                                    color={textColor}
                                    noOfLines={1}
                                    flex={1}
                                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                                    onClick={() => handleToggleSource(material.id)}
                                    cursor="pointer"
                                  >
                                    {material.title}
                                  </Text>

                                  {/* Three-dot menu — opens same context menu as right-click */}
                                  <IconButton
                                    aria-label="Source actions"
                                    icon={<FiMoreVertical />}
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSourceContextMenu(e, material);
                                    }}
                                    _hover={{ bg: menuHoverBg }}
                                  />

                                  <Checkbox
                                    isChecked={isSelected}
                                    colorScheme="blue"
                                    size="sm"
                                    onChange={() => onToggleSource(material.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </HStack>
                              );
                            })
                          )}
                        </VStack>
                      </VStack>
                    )}
                  </TabPanel>

                  {/* Export Tab */}
                  <TabPanel p={0} h="full">
                    <ExportPanel script={currentScript} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </VStack>
          ) : (
            <Box p={4} textAlign="center">
              <Text fontSize="sm" color={mutedColor}>
                No project selected
              </Text>
            </Box>
          )
        ) : mode === 'podcasts' ? (
          /* Podcast Library Mode */
          <PodcastLibrary
            projectId={projectId}
            onEpisodeSelect={(episode) => {
              console.log('🎵 Podcast episode selected:', episode);
              onPodcastSelect?.(episode);
            }}
            selectedEpisodeId={selectedPodcastEpisodeId}
            refreshTrigger={podcastRefreshTrigger}
            onBatchDelete={onBatchDeleteAudio}
          />
        ) : (
          /* Research Sources Mode */
          <>
            {/* Add Source Button */}
            <Box px={4} py={2}>
              <HStack spacing={2}>
                <Button
                  leftIcon={<FiPlus />}
                  variant="solid"
                  size="sm"
                  flex={1}
                  onClick={onAddSource}
                  bg={cardBg}
                  border="1px solid"
                  borderColor={borderColor}
                  color={textColor}
                  _hover={{ bg: hoverBg, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                  fontWeight="500"
                  fontSize="13px"
                  borderRadius="12px"
                  transition="all 0.2s"
                  boxShadow="xs"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                >
                  Add Source
                </Button>
              </HStack>
            </Box>

            {/* Select All */}
            {materials.length > 0 && (
              <Box px={4} py={2}>
                <HStack
                  px={3}
                  py={2}
                  cursor="pointer"
                  bg={cardBg}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="12px"
                  _hover={{ bg: hoverBg, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                  onClick={onToggleAll}
                  transition="all 0.2s ease"
                  boxShadow="xs"
                >
                  <Text
                    fontSize="12px"
                    fontWeight="500"
                    color={textColor}
                    flex={1}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                  >
                    Select all sources
                  </Text>
                  <Checkbox
                    isChecked={allSelected}
                    isIndeterminate={someSelected}
                    colorScheme="blue"
                    pointerEvents="none"
                    size="sm"
                  />
                </HStack>
              </Box>
            )}

            {/* Subtle Divider */}
            {materials.length > 0 && (
              <Box px={4}>
                <Divider opacity={0.3} />
              </Box>
            )}

            {/* Sources List */}
            <VStack spacing={2} align="stretch" flex={1} overflowY="auto" px={4} py={2}>
              {materials.length === 0 ? (
                <Box p={6} textAlign="center">
                  <Icon as={FiFile} boxSize={12} color={mutedColor} mb={3} />
                  <Text fontSize="sm" color={mutedColor}>
                    No documents uploaded
                  </Text>
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    Add sources to start creating your podcast
                  </Text>
                </Box>
              ) : (
                materials.map((material) => {
                  const isSelected = selectedIds.includes(material.id);

                  return (
                    <HStack
                      key={material.id}
                      px={3}
                      py={2.5}
                      spacing={2}
                      bg={isSelected ? selectedBg : cardBg}
                      border="1px solid"
                      borderColor={isSelected ? 'blue.300' : borderColor}
                      borderRadius="12px"
                      _hover={{ bg: isSelected ? selectedBg : hoverBg, transform: 'translateY(-1px)', boxShadow: 'sm' }}
                      transition="all 0.2s ease"
                      boxShadow="xs"
                      position="relative"
                      onContextMenu={(e) => handleSourceContextMenu(e, material)}
                    >
                      <Icon
                        as={FiFile}
                        color="#d93025"
                        boxSize={4}
                        flexShrink={0}
                        onClick={() => handleToggleSource(material.id)}
                        cursor="pointer"
                      />
                      <Text
                        fontSize="13px"
                        fontWeight="normal"
                        color={textColor}
                        noOfLines={1}
                        flex={1}
                        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
                        onClick={() => handleToggleSource(material.id)}
                        cursor="pointer"
                      >
                        {material.title}
                      </Text>

                      {/* Three-dot menu — opens same context menu as right-click */}
                      <IconButton
                        aria-label="Source actions"
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSourceContextMenu(e, material);
                        }}
                        _hover={{ bg: menuHoverBg }}
                      />

                      <Checkbox
                        isChecked={isSelected}
                        colorScheme="blue"
                        onChange={() => handleToggleSource(material.id)}
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </HStack>
                  );
                })
              )}
            </VStack>
          </>
        )}
      </VStack>
      {/* Context Menu (shared engine — mirrors research sidebar) */}
      <ContextMenuEngine
        isOpen={menuState.isOpen}
        onClose={closeMenu}
        position={menuState.position}
        config={menuState.config}
      />
    </RetractablePanel>
  );
}
