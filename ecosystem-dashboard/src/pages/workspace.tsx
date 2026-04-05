/**
 * Workspace Page - Notion-like interface
 * Main page for workspace management and editing
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Button,
  Text,
  useToast,
  Spinner,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  useDisclosure,
} from '@chakra-ui/react';
import { AddIcon, SettingsIcon } from '@chakra-ui/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { WorkspaceNav } from '@/components/workspace/WorkspaceNav';
import { NotionHome } from '@/components/workspace/NotionHome';
import { WorkspaceAI } from '@/components/workspace/WorkspaceAI';
import { WorkspaceNotes } from '@/components/workspace/WorkspaceNotes';
import { PageCover } from '@/components/workspace/PageCover';
import { CoverSelectorModal } from '@/components/workspace/CoverSelectorModal';
import { PageTitleActions } from '@/components/workspace/PageTitleActions';
import { TemplateGallery } from '@/components/workspace/TemplateGallery';
import { PageControlBar, PageView } from '@/components/workspace/PageControlBar';
import { Workspace, Block } from '@/types/workspace';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAIContext } from '@/contexts/AIContextManager';
import { useViewContext } from '@/contexts/ViewContextManager';
import { isFeatureEnabled } from '@/lib/featureFlags';
import GooseFloatingButton from '@/components/workspace/GooseFloatingButton';
import { GooseFloatingPanel } from '@/components/workspace/GooseFloatingPanel';
import { CustomNotionEditor } from '@/components/editor/CustomNotionEditor';
import { Block as EditorBlock, BlockModel } from '@/lib/editor/BlockModel';
import { DatabaseView } from '@/components/workspace/DatabaseView';
import { NotionDatabaseTable } from '@/components/workspace/NotionDatabaseTable';
import { CalendarGridView } from '@/components/workspace/CalendarGridView';
import { GalleryView } from '@/components/workspace/GalleryView';
import { BoardView } from '@/components/workspace/BoardView';
import { CalendarSettings } from '@/components/workspace/CalendarSettings';
import { extractPageTitle, extractPageIcon } from '@/lib/workspace/page-utils';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { BacklinkTracker } from '@/lib/mentions/BacklinkTracker';
import { FiStar, FiClock, FiDownload, FiUpload, FiShare2 } from 'react-icons/fi';
import { ImportModal } from '@/components/workspace/ImportModal';
import { ExportModal } from '@/components/workspace/ExportModal';
import { QuickFind } from '@/components/workspace/QuickFind';
import { VersionHistory } from '@/lib/database/VersionHistory';
import { VersionHistoryPanel } from '@/components/workspace/VersionHistoryPanel';
import { useDisclosure as useChakraDisclosure } from '@chakra-ui/react';
import { ShareModal } from '@/components/workspace/ShareModal';

export default function WorkspacePage() {
  const router = useRouter();
  const { view } = router.query;
  const userId = 'eleazar'; // Homelab user - matches iOS app UserConfig.defaultUserId

  // Call hooks at the top level - never conditionally
  const surfaceElevatedBg = useSemanticToken('surface.elevated');
  const textSecondaryColor = useSemanticToken('text.secondary');

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Block | null>(null);
  const [pageBlocks, setPageBlocks] = useState<any[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [pageVersion, setPageVersion] = useState(0); // Force re-render key
  const toast = useToast();

  // Panel controls
  const { isOpen: isRightPanelOpen, setIsOpen: setRightPanelOpen, width: rightPanelWidth, setCustomData, setActiveTab, setContext } = useRightPanel();
  const { width: sidebarWidth } = useSidebar();
  const { setContext: setAIContext, updateContext } = useAIContext();
  const { setViewContext, updateDetail } = useViewContext();
  const useViewContextManager = isFeatureEnabled('USE_VIEW_CONTEXT_MANAGER');
  const [showHome, setShowHome] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Document Goose state
  const [gooseOpen, setGooseOpen] = useState(false);
  const [gooseMode, setGooseMode] = useState<'floating' | 'sidebar'>('floating');
  const blockModelRef = useRef<BlockModel | null>(null);

  // Favorites state
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);

  // QuickFind state
  const { isOpen: isQuickFindOpen, onOpen: onQuickFindOpen, onClose: onQuickFindClose } = useChakraDisclosure();

  // Version History state
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Import/Export/Share modal state
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useChakraDisclosure();
  const { isOpen: isExportOpen, onOpen: onExportOpen, onClose: onExportClose } = useChakraDisclosure();
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useChakraDisclosure();

  // Goose mode switching handlers
  const handleSwitchToSidebar = () => {
    if (!selectedPage) {
      console.error('[Workspace] Cannot switch to sidebar: no page selected');
      return;
    }

    console.log('[Workspace] Switching to sidebar mode for page:', selectedPage.id);

    // Close floating panel
    setGooseOpen(false);

    // Context and customData are already set by the page view effect
    // Just switch to the Page Agent tab and open the panel
    setActiveTab('goose-agent');
    setRightPanelOpen(true);
    setGooseMode('sidebar');

    console.log('[Workspace] Sidebar mode activated, tab set to: goose-agent');
  };

  const handleSwitchToFloating = () => {
    setGooseMode('floating');
    setGooseOpen(true); // Open floating panel
  };

  // Check if current page is favorited
  const checkIfFavorited = async (pageId: string) => {
    if (!workspace?.id) return;
    try {
      const response = await fetch(`/api/favorites?workspaceId=${workspace.id}&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const favorite = data.favorites?.find((f: any) => f.pageId === pageId);
        setIsFavorite(!!favorite);
        setFavoriteId(favorite?.id || null);
      }
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!selectedPageId || !workspace?.id) return;

    try {
      if (isFavorite && favoriteId) {
        // Remove favorite
        const response = await fetch(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
        if (response.ok) {
          setIsFavorite(false);
          setFavoriteId(null);
          toast({
            title: 'Removed from favorites',
            status: 'success',
            duration: 2000,
          });
        }
      } else {
        // Add favorite
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, pageId: selectedPageId, workspaceId: workspace.id })
        });
        if (response.ok) {
          const data = await response.json();
          setIsFavorite(true);
          setFavoriteId(data.id);
          toast({
            title: 'Added to favorites',
            status: 'success',
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast({
        title: 'Failed to update favorite',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Keyboard shortcut for QuickFind (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onQuickFindOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onQuickFindOpen]);

  // Handle view routing based on URL query parameter
  useEffect(() => {
    const { view, page } = router.query;

    if (page && typeof page === 'string') {
      // Page view - don't change state here, let restoration logic handle it
      setShowAI(false);
      setShowHome(false);
      setShowNotes(false);
      console.log('🎯 [View] URL has page parameter:', page);
    } else if (view === 'ai') {
      // Show Workspace AI view
      setShowAI(true);
      setShowHome(false);
      setShowNotes(false);
      setSelectedPageId(null);
      setSelectedPage(null);
      console.log('🎯 [View] Switched to Workspace AI');
    } else if (view === 'notes') {
      // Show Notes view
      setShowNotes(true);
      setShowHome(false);
      setShowAI(false);
      setSelectedPageId(null);
      setSelectedPage(null);
      console.log('🎯 [View] Switched to Notes');
    } else if (!view || view === 'home') {
      // Show home view
      setShowHome(true);
      setShowAI(false);
      setShowNotes(false);
      setSelectedPageId(null);
      setSelectedPage(null);
      console.log('🎯 [View] Switched to Home');
    }
  }, [router.query]);

  // Page view state
  const [currentPageView, setCurrentPageView] = useState<PageView>('table');

  // WorkspaceAI settings state
  const [model, setModel] = useState('claude-4-sonnet');
  const [temperature, setTemperature] = useState(0.7);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
  const [knowledgeSources, setKnowledgeSources] = useState({
    currentPage: true,
    workspace: true,
    databases: false,
    knowledgeGraph: false,
  });
  const [mcpServers, setMCPServers] = useState({
    workspace: true,
    notion: false,
    github: false,
    filesystem: true,
    databases: false,
    knowledgeGraph: false,
    perplexity: false,
    custom: [] as string[],
  });
  const [enabledTools, setEnabledTools] = useState<string[]>([]); // Track full enabledTools array
  const [mcpLoading, setMcpLoading] = useState(true);
  const [searchScope, setSearchScope] = useState<'current' | 'workspace' | 'all'>('workspace');
  const [contextSize, setContextSize] = useState(8192);
  const [useGoose, setUseGoose] = useState(true);
  const [agencyMode, setAgencyMode] = useState<'autonomous' | 'manual' | 'smart' | 'chat'>('autonomous');
  const [workingDirectory, setWorkingDirectory] = useState<string>('/Users/eleazar/Projects/AIHomelab');

  // Workspace Homepage settings
  const [homeSettings, setHomeSettings] = useState({
    sectionVisibility: {
      quickActions: true,
      recentlyVisited: true,
      learn: true,
      templates: true,
    },
    userName: 'User',
    greetingStyle: 'formal' as 'formal' | 'casual' | 'none',
  });

  // Notion-style real-time sync
  const { isConnected: wsConnected } = useRealTimeSync({
    workspaceId: workspace?.id || '',
    enabled: !!workspace?.id,
    onBlockCreated: (block) => {
      console.log('[Real-Time] 🆕 Block created:', block);
      // Add to blocks list if it's a root-level block
      if (!block.parent_id) {
        setBlocks(prev => {
          // Check if already exists
          if (prev.some(b => b.id === block.id)) return prev;
          return [...prev, block];
        });
      }
    },
    onBlockUpdated: (block) => {
      console.log('[Real-Time] ✏️ Block updated:', block);
      setBlocks(prev => prev.map(b => b.id === block.id ? block : b));
    },
    onBlockDeleted: (blockId) => {
      console.log('[Real-Time] 🗑️ Block deleted:', blockId);
      setBlocks(prev => prev.filter(b => b.id !== blockId));
    }
  });

  // Debug: Log when useGoose changes
  useEffect(() => {
    console.log('🎯 Workspace useGoose state changed to:', useGoose);
    console.log('📡 WebSocket connected:', wsConnected);
  }, [useGoose, wsConnected]);

  // Load MCP Settings from Database
  const loadMCPSettings = useCallback(async (agentId: string) => {
    console.log('🔧 [MCP] Loading settings from database for:', agentId);
    setMcpLoading(true);

    try {
      const response = await fetch(`/api/goose/settings/${agentId}`);

      if (response.ok) {
        const data = await response.json();
        const loadedTools = data.enabledTools || [];

        console.log('🔧 [MCP] Loaded enabledTools from database:', loadedTools);

        // Store full enabledTools array (only if changed)
        setEnabledTools(prev => {
          if (JSON.stringify(prev) === JSON.stringify(loadedTools)) {
            return prev; // Prevent unnecessary re-render
          }
          return loadedTools;
        });

        // Convert enabledTools array to mcpServers object (for backward compatibility)
        const newMcpServers = {
          workspace: loadedTools.includes('workspace'),
          notion: loadedTools.includes('notion'),
          github: loadedTools.includes('github'),
          filesystem: loadedTools.includes('filesystem'),
          knowledgeGraph: loadedTools.includes('knowledgeGraph'),
          perplexity: loadedTools.includes('perplexity'),
          databases: false,
          custom: loadedTools.filter((t: string) =>
            !['workspace', 'notion', 'github', 'filesystem',
              'knowledgeGraph', 'perplexity', 'developer',
              'screen', 'memory'].includes(t)
          ),
        };

        // Only update if values changed
        setMCPServers(prev => {
          if (JSON.stringify(prev) === JSON.stringify(newMcpServers)) {
            return prev; // Prevent unnecessary re-render
          }
          return newMcpServers;
        });
        console.log('✅ [MCP] Settings loaded successfully:', newMcpServers);
      } else {
        console.warn('⚠️ [MCP] Failed to load settings, status:', response.status);
        // Keep current state on error
      }
    } catch (error) {
      console.error('❌ [MCP] Error loading settings:', error);
      // Keep current state on error
    } finally {
      setMcpLoading(false);
    }
  }, []);

  // Load MCP settings when context changes
  useEffect(() => {
    // Determine which agent's settings to load
    const agentId = selectedPage ? 'page-agent' : 'workspace-ai';

    console.log('🔧 [MCP] Context changed, loading settings for:', agentId);
    loadMCPSettings(agentId);
  }, [selectedPage, loadMCPSettings]);

  // MCP Servers Change Handler - Integrates with Goose ACP dynamic config
  const handleMCPServersChange = async (newMCPServers: typeof mcpServers) => {
    console.log('🔧 [MCP] Updating MCP servers:', newMCPServers);

    // Update local state immediately for UI responsiveness
    setMCPServers(newMCPServers);

    // Convert mcpServers object to enabledTools array format
    const baseTools: string[] = [];

    // Always include core tools
    baseTools.push('developer', 'screen');

    // Add workspace if enabled
    if (newMCPServers.workspace) baseTools.push('workspace');

    // Add filesystem if enabled
    if (newMCPServers.filesystem) baseTools.push('filesystem');

    // Add knowledge graph if enabled
    if (newMCPServers.knowledgeGraph) baseTools.push('knowledgeGraph');

    // Add external MCPs if enabled
    if (newMCPServers.notion) baseTools.push('notion');
    if (newMCPServers.github) baseTools.push('github');
    if (newMCPServers.perplexity) baseTools.push('perplexity');

    // Add custom MCPs
    if (newMCPServers.custom && Array.isArray(newMCPServers.custom)) {
      baseTools.push(...newMCPServers.custom);
    }

    try {
      // Update both workspace-ai and page-agent (if we're on a page)
      const agentsToUpdate = selectedPage ? ['workspace-ai', 'page-agent'] : ['workspace-ai'];
      let allSuccessful = true;

      for (const agentId of agentsToUpdate) {
        console.log(`🔧 [MCP] Updating ${agentId} configuration...`);

        // Customize tools per agent
        const enabledTools = [...baseTools];

        // workspace-ai gets memory tool
        if (agentId === 'workspace-ai') {
          enabledTools.push('memory');
        }

        console.log(`🔧 [MCP] ${agentId} enabledTools:`, enabledTools);

        const response = await fetch(`/api/goose/settings/${agentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabledTools })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ [MCP] ${agentId} updated successfully. Config version:`, data.configVersion);

          toast({
            title: 'MCP Settings Updated',
            description: `${agentId} will restart with new configuration`,
            status: 'success',
            duration: 3000,
            isClosable: true
          });
        } else {
          allSuccessful = false;
          const errorText = await response.text();
          console.error(`❌ [MCP] Failed to update ${agentId}:`, errorText);

          toast({
            title: 'MCP Update Failed',
            description: `Failed to update ${agentId}`,
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        }
      }

      // Reload settings from database to confirm sync (only if all updates succeeded)
      if (allSuccessful) {
        const currentAgentId = selectedPage ? 'page-agent' : 'workspace-ai';
        console.log('🔧 [MCP] Reloading settings to confirm sync...');
        await loadMCPSettings(currentAgentId);
      }
    } catch (error) {
      console.error('❌ [MCP] Error updating MCP configuration:', error);

      toast({
        title: 'Configuration Error',
        description: 'Failed to update MCP settings. Check console for details.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Update AI context when page changes
  useEffect(() => {
    if (selectedPage && workspace) {
      setAIContext({
        type: 'workspace-page',
        route: '/workspace',
        timestamp: Date.now(),
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
        page: {
          id: selectedPage.id,
          title: selectedPage.properties?.title?.[0]?.text?.content || 'Untitled',
          blockCount: pageBlocks.length,
        },
        visibleBlocks: pageBlocks,
      });
    }
  }, [selectedPage, pageBlocks, workspace, setAIContext]);

  // Set right panel context based on current view
  useEffect(() => {
    if (showAI) {
      // Workspace AI view
      if (useViewContextManager) {
        setViewContext({
          viewType: 'settings',
        });
      }

      setContext('workspace-ai');

      setCustomData({
        workspaceAISettings: {
          model: model,
          onModelChange: setModel,
          temperature: temperature,
          onTemperatureChange: setTemperature,
          responseStyle: responseStyle,
          onResponseStyleChange: setResponseStyle,
          knowledgeSources: knowledgeSources,
          onKnowledgeSourcesChange: setKnowledgeSources,
          mcpServers: mcpServers,
          onMCPServersChange: handleMCPServersChange,
          mcpLoading: mcpLoading,
          searchScope: searchScope,
          onSearchScopeChange: setSearchScope,
          contextSize: contextSize,
          onContextSizeChange: setContextSize,
          useGoose: useGoose,
          onUseGooseChange: setUseGoose,
          agencyMode: agencyMode,
          onAgencyModeChange: setAgencyMode,
          workingDirectory: workingDirectory,
          onWorkingDirectoryChange: setWorkingDirectory,
        },
        activeCenterTab: 0,
      });

      setActiveTab('ai-settings');
    } else if (selectedPage && !showHome) {
      // Page view (page, table, calendar, board, etc.)
      if (useViewContextManager) {
        setViewContext({
          viewType: 'detail',
          detail: {
            type: 'page', // Could be 'table', 'calendar', 'board' based on page type
            id: selectedPage.id,
            title: selectedPage.properties?.title?.[0]?.text?.content || 'Untitled',
            metadata: {
              type: selectedPage.type,
            },
          },
        });
      }

      setContext('workspace-page');

      setCustomData({
        goose: {
          pageId: selectedPage.id,
          pageTitle: extractPageTitle(selectedPage),
          blockModelRef: blockModelRef,
          onClose: () => {
            setGooseMode('floating');
            setRightPanelOpen(false);
          },
          onSwitchToFloating: () => {
            setGooseMode('floating');
            setGooseOpen(true);
            setRightPanelOpen(false);
          },
        },
        workspaceAISettings: {
          model: model,
          onModelChange: setModel,
          temperature: temperature,
          onTemperatureChange: setTemperature,
          responseStyle: responseStyle,
          onResponseStyleChange: setResponseStyle,
          knowledgeSources: knowledgeSources,
          onKnowledgeSourcesChange: setKnowledgeSources,
          mcpServers: mcpServers,
          onMCPServersChange: handleMCPServersChange,
          mcpLoading: mcpLoading,
          searchScope: searchScope,
          onSearchScopeChange: setSearchScope,
          contextSize: contextSize,
          onContextSizeChange: setContextSize,
          useGoose: useGoose,
          onUseGooseChange: setUseGoose,
          agencyMode: agencyMode,
          onAgencyModeChange: setAgencyMode,
          workingDirectory: workingDirectory,
          onWorkingDirectoryChange: setWorkingDirectory,
        },
      });

      // Default to Page Agent tab when viewing a page
      // User can still manually switch to other tabs
      setActiveTab('goose-agent');
    } else {
      // Home view or no selection
      if (useViewContextManager) {
        setViewContext({
          viewType: 'home',
        });
      }

      setContext('workspace-home');

      setCustomData({
        workspaceHomeSettings: {
          sectionVisibility: homeSettings.sectionVisibility,
          onSectionVisibilityChange: (visibility: any) => {
            setHomeSettings(prev => ({ ...prev, sectionVisibility: visibility }));
          },
          userName: homeSettings.userName,
          onUserNameChange: (name: string) => {
            setHomeSettings(prev => ({ ...prev, userName: name }));
          },
          greetingStyle: homeSettings.greetingStyle,
          onGreetingStyleChange: (style: 'formal' | 'casual' | 'none') => {
            setHomeSettings(prev => ({ ...prev, greetingStyle: style }));
          },
        },
      });

      setActiveTab('home-settings');
    }
  }, [showAI, selectedPage, showHome, model, temperature, responseStyle, knowledgeSources, mcpServers, searchScope, contextSize, useGoose, workingDirectory, useViewContextManager]);
  // Note: Removed setter functions from deps - they're stable and including them causes infinite loops

  // Cover image modal
  const { isOpen: isCoverModalOpen, onOpen: onCoverModalOpen, onClose: onCoverModalClose } = useDisclosure();

  // Template gallery modal
  const { isOpen: isTemplateOpen, onOpen: onTemplateOpen, onClose: onTemplateClose } = useDisclosure();

  // Calendar settings modal
  const { isOpen: isCalendarSettingsOpen, onOpen: onCalendarSettingsOpen, onClose: onCalendarSettingsClose } = useDisclosure();

  // Initialize workspace once on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeWorkspace();
    }
  }, []);

  // Restore selected page from localStorage (runs once after blocks load)
  const hasRestoredPage = useRef(false);
  const restoreAttempts = useRef(0);
  const MAX_RESTORE_ATTEMPTS = 1;

  useEffect(() => {
    const { page: pageParam } = router.query;

    // Only restore if:
    // 1. Haven't restored yet
    // 2. Have blocks loaded
    // 3. Have workspace
    // 4. Haven't exceeded max attempts
    // 5. No page currently selected
    if (!hasRestoredPage.current && blocks.length > 0 && workspace?.id &&
      restoreAttempts.current < MAX_RESTORE_ATTEMPTS && !selectedPageId) {

      hasRestoredPage.current = true;
      restoreAttempts.current += 1;

      // Priority 1: URL query parameter
      let pageIdToRestore: string | null = null;

      if (pageParam && typeof pageParam === 'string') {
        console.log('🔄 [URL] Restoring page from URL:', pageParam);
        pageIdToRestore = pageParam;
      } else {
        // Priority 2: localStorage
        const savedPageId = localStorage.getItem(`workspace_${workspace.id}_selectedPage`);
        if (savedPageId) {
          console.log('🔄 [localStorage] Restoring page from storage:', savedPageId);
          pageIdToRestore = savedPageId;
        }
      }

      if (pageIdToRestore) {
        const page = blocks.find(b => b.id === pageIdToRestore);
        if (page) {
          handlePageClick(pageIdToRestore, page).catch((error) => {
            console.error('❌ [Restore] Failed to restore page, clearing:', error);
            localStorage.removeItem(`workspace_${workspace.id}_selectedPage`);
            // Clear URL parameter and go to home
            router.push('/workspace', undefined, { shallow: true });
          });
        } else {
          console.warn('⚠️ [Restore] Page not found, clearing:', pageIdToRestore);
          localStorage.removeItem(`workspace_${workspace.id}_selectedPage`);
          // Clear URL parameter and go to home
          router.push('/workspace', undefined, { shallow: true });
        }
      } else {
        console.log('🔄 [Restore] No saved page to restore');
      }
    }
  }, [blocks.length, workspace?.id, selectedPageId, router.query]);

  // Save current page whenever it changes to ensure we restore to the right page
  useEffect(() => {
    if (workspace?.id && selectedPageId) {
      localStorage.setItem(`workspace_${workspace.id}_selectedPage`, selectedPageId);
      console.log('💾 [pageChange] Saved current page:', selectedPageId);
    }
  }, [workspace?.id, selectedPageId]);

  // Also save on beforeunload as backup (for browser close/navigate away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (workspace?.id && selectedPageId) {
        localStorage.setItem(`workspace_${workspace.id}_selectedPage`, selectedPageId);
        console.log('💾 [beforeUnload] Saved current page:', selectedPageId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workspace?.id, selectedPageId]);

  // AUTO-REFRESH DISABLED - causing infinite reload
  // TODO: Implement with WebSocket or manual refresh button
  // useEffect(() => {
  //   if (!workspace?.id) return;
  //   const interval = setInterval(() => {
  //     loadBlocks(workspace.id);
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, [workspace?.id]);

  const initializeWorkspace = async () => {
    console.log('🔄 [InitWorkspace] Starting workspace initialization...');
    try {
      // For MVP, create a default workspace if none exists
      const currentUserId = userId; // Use the userId from component scope
      console.log('🔄 [InitWorkspace] User ID:', currentUserId);

      // Check for workspace ID in URL query
      const { id: urlWorkspaceId } = router.query;
      console.log('🔄 [InitWorkspace] URL workspace ID:', urlWorkspaceId);

      // Try to get existing workspace (includes shared workspaces from agents)
      console.log('🔄 [InitWorkspace] Fetching workspace list (including shared)...');
      const response = await fetch('/api/workspace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, include_shared: true })
      });

      let workspaceData = null;

      if (response.ok) {
        const data = await response.json();
        const workspaces = data.workspaces || [];
        console.log('✅ [InitWorkspace] Found workspaces:', workspaces.length, '(owned:', data.owned_count, ', shared:', data.shared_count, ')');

        // Priority 1: Use workspace ID from URL if provided
        if (urlWorkspaceId && typeof urlWorkspaceId === 'string') {
          workspaceData = workspaces.find((ws: any) => ws.id === urlWorkspaceId);
          if (workspaceData) {
            console.log('✅ [InitWorkspace] Using workspace from URL:', urlWorkspaceId);
          }
        }

        // Priority 2: Use saved workspace from localStorage
        if (!workspaceData) {
          const savedWorkspaceId = localStorage.getItem('selected_workspace_id');
          if (savedWorkspaceId) {
            workspaceData = workspaces.find((ws: any) => ws.id === savedWorkspaceId);
            if (workspaceData) {
              console.log('✅ [InitWorkspace] Using saved workspace:', savedWorkspaceId);
            }
          }
        }

        // Priority 3: Use first owned workspace
        if (!workspaceData) {
          workspaceData = workspaces.find((ws: any) => !ws.is_shared);
          if (workspaceData) {
            console.log('✅ [InitWorkspace] Using first owned workspace:', workspaceData.id);
          }
        }

        // Priority 4: Use any available workspace
        if (!workspaceData && workspaces.length > 0) {
          workspaceData = workspaces[0];
          console.log('✅ [InitWorkspace] Using first available workspace:', workspaceData.id);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [InitWorkspace] Failed to fetch workspaces:', response.status, errorText);
      }

      // If no workspace exists, create one
      if (!workspaceData) {
        console.log('🆕 [InitWorkspace] No workspace found, creating new one...');
        const createResponse = await fetch('/api/workspace/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            name: 'My Workspace'
          })
        });

        if (createResponse.ok) {
          workspaceData = await createResponse.json();
          console.log('✅ [InitWorkspace] Created new workspace:', workspaceData.id);
        } else {
          const errorText = await createResponse.text();
          console.error('❌ [InitWorkspace] Failed to create workspace:', createResponse.status, errorText);
        }
      }

      if (workspaceData) {
        console.log('✅ [InitWorkspace] Setting workspace:', workspaceData.id);
        setWorkspace(workspaceData);
        console.log('🔄 [InitWorkspace] Loading blocks...');
        await loadBlocks(workspaceData.id);
        console.log('✅ [InitWorkspace] Workspace initialization complete!');
      } else {
        console.error('❌ [InitWorkspace] Failed to obtain workspace data');
        toast({
          title: 'Workspace Error',
          description: 'Could not load or create workspace. Check console for details.',
          status: 'error',
          duration: 5000
        });
      }

      setLoading(false);
    } catch (error: any) {
      console.error('❌ [InitWorkspace] Error initializing workspace:', error);
      console.error('❌ [InitWorkspace] Error stack:', error.stack);
      toast({
        title: 'Error',
        description: 'Failed to initialize workspace',
        status: 'error',
        duration: 5000
      });
      setLoading(false);
    }
  };

  const loadBlocks = async (workspaceId: string, forceUpdate = false) => {
    try {
      // Load all root-level blocks (pages AND databases)
      const response = await fetch(`/api/workspace/${workspaceId}/blocks`);

      if (response.ok) {
        const data = await response.json();
        // Filter for root-level blocks only (no parent)
        const rootBlocks = data.blocks?.filter((b: Block) => !b.parent_id) || [];

        // Helper to extract title for comparison
        const getBlockSignature = (b: Block) => {
          const title = b.properties?.title?.[0]?.text?.content || '';
          return `${b.id}:${title}:${b.type}`;
        };

        // Compare IDs AND titles to detect renames
        setBlocks(prevBlocks => {
          if (forceUpdate) {
            console.log('[Workspace] Force updating blocks:', rootBlocks.length);
            return rootBlocks;
          }

          const prevSignatures = prevBlocks.map(getBlockSignature).sort().join(',');
          const newSignatures = rootBlocks.map(getBlockSignature).sort().join(',');

          if (prevSignatures === newSignatures) {
            return prevBlocks; // No change, don't trigger re-render
          }

          console.log('[Workspace] Blocks updated:', rootBlocks.length);
          return rootBlocks;
        });

        // Also update selectedPage if it was renamed
        if (selectedPageId) {
          const updatedPage = rootBlocks.find((b: Block) => b.id === selectedPageId);
          if (updatedPage) {
            setSelectedPage(prev => {
              if (!prev) return updatedPage;
              const prevTitle = prev.properties?.title?.[0]?.text?.content || '';
              const newTitle = updatedPage.properties?.title?.[0]?.text?.content || '';
              if (prevTitle !== newTitle) {
                console.log('[Workspace] 📝 Page title updated:', prevTitle, '->', newTitle);
                return updatedPage;
              }
              return prev;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  // Handle streaming text from Goose
  const handleStreamingChunk = useCallback((chunk: string) => {
    if (!selectedPage) return;

    setPageBlocks(currentBlocks => {
      // Deep clone to avoid mutation issues
      const newBlocks = JSON.parse(JSON.stringify(currentBlocks));
      const lastBlock = newBlocks[newBlocks.length - 1];

      if (!lastBlock || lastBlock.id !== 'streaming-ghost-block') {
        // Create new ghost block if last block isn't one
        newBlocks.push({
          id: 'streaming-ghost-block',
          type: 'paragraph',
          content: [{ text: chunk, annotations: {} }],
          properties: {},
          parentId: selectedPage.id,
          children: [],
          createdTime: Date.now(),
          lastEditedTime: Date.now(),
          createdBy: userId,
          lastEditedBy: userId
        });
      } else {
        // Append to existing ghost block
        const lastContent = lastBlock.content[lastBlock.content.length - 1];
        if (lastContent) {
          lastContent.text += chunk;
        } else {
          lastBlock.content.push({ text: chunk, annotations: {} });
        }
      }
      return newBlocks;
    });
  }, [selectedPage, userId]);

  // Helper to fetch and parse page blocks
  const fetchPageBlocks = async (pageId: string): Promise<EditorBlock[]> => {
    try {
      console.log('📄 [fetchPageBlocks] Fetching blocks for page:', pageId);
      const fetchUrl = `/api/blocks/${pageId}`;
      const response = await fetch(fetchUrl);

      if (response.ok) {
        const data = await response.json();
        // Convert to EditorBlock format
        return data.children?.map((child: any) => {
          // Handle multiple formats: rich_text (standard), title (headings), content (legacy MCP)
          let contentArray: any[] = [];

          if (child.properties?.rich_text && Array.isArray(child.properties.rich_text)) {
            // Standard Notion format: rich_text array
            contentArray = child.properties.rich_text.map((rt: any) => {
              // Handle both rt.text.content and rt.text being the object itself
              const textValue = typeof rt.text === 'object' && rt.text !== null
                ? (rt.text.content || rt.text.text || '')
                : (rt.text || '');
              return {
                text: textValue,
                annotations: rt.annotations || {}
              };
            });
          } else if (child.properties?.title && Array.isArray(child.properties.title)) {
            // Toggle/heading format: title array
            contentArray = child.properties.title.map((rt: any) => {
              // Handle both rt.text.content and rt.text being the object itself
              const textValue = typeof rt.text === 'object' && rt.text !== null
                ? (rt.text.content || rt.text.text || '')
                : (rt.text || '');
              return {
                text: textValue,
                annotations: rt.annotations || {}
              };
            });
          } else if (child.properties?.content && typeof child.properties.content === 'string') {
            // Legacy MCP format: simple string content
            contentArray = [{ text: child.properties.content }];
          } else {
            contentArray = [{ text: '' }];
          }

          return {
            id: child.id,
            type: child.type,
            content: contentArray,
            properties: child.properties || {},
            parentId: null, // Content blocks are root in the editor
            children: [],
            createdTime: new Date(child.created_at || child.created_time).getTime(),
            lastEditedTime: new Date(child.updated_at || child.last_edited_time).getTime(),
            createdBy: child.created_by || 'system',
            lastEditedBy: child.last_edited_by || 'system',
          };
        }) || [];
      } else {
        console.warn('📄 [fetchPageBlocks] Fetch failed with status:', response.status);
        throw new Error(`Failed to fetch blocks: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ [fetchPageBlocks] Error:', error);
      throw error;
    }
  };

  // Silent refresh of page blocks (for AI updates)
  const refreshPageBlocks = async (pageId: string) => {
    if (!pageId) return;
    try {
      console.log('🔄 [refreshPageBlocks] Refreshing content for:', pageId);
      const blocks = await fetchPageBlocks(pageId);
      setPageBlocks(blocks);
      setPageVersion(v => v + 1);
      console.log('✅ [refreshPageBlocks] Updated', blocks.length, 'blocks');
    } catch (error) {
      console.error('❌ [refreshPageBlocks] Failed to refresh:', error);
    }
  };

  // Handler for opening side peek (used by schedule/table rows)
  const handleOpenSidePeek = async (pageId: string) => {
    console.log('📄 [handleOpenSidePeek] Opening side peek for Page ID:', pageId);

    // Open in right panel (side peek)
    setContext('workspace-page');
    setActiveTab('page-preview');
    setCustomData({
      type: 'page-preview',
      pageId,
      workspaceId: workspace?.id
    });
    setRightPanelOpen(true);
  };

  // Handler for full page navigation (used by dashboard cards)
  const handlePageClick = async (pageId: string) => {
    console.log('📄 [handlePageClick] Navigating to Page ID:', pageId);

    // If we are already on the workspace page, just update the selected page
    // Otherwise navigate to the route

    // For now, since we are in a single-page app structure for workspace:
    try {
      setLoadingContent(true);

      // Fetch page details
      const response = await fetch(`/api/workspace/pages/${pageId}`);
      if (response.ok) {
        const fetchedPage = await response.json();
        const editorBlocks = await fetchPageBlocks(pageId);

        setPageBlocks(editorBlocks);
        setSelectedPage(fetchedPage);
        setSelectedPageId(pageId);
        setShowHome(false);

        // Update URL without reload
        window.history.pushState({}, '', `/workspace?pageId=${pageId}`);

        // Track page view for recent pages
        if (workspace?.id) {
          fetch('/api/recent-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, pageId, workspaceId: workspace.id })
          }).catch(err => console.error('Failed to track page view:', err));
        }

        // Check if page is favorited
        checkIfFavorited(pageId);
      } else {
        toast({
          title: 'Error loading page',
          description: 'Could not load page content',
          status: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error navigating to page:', error);
      toast({
        title: 'Error',
        description: 'Failed to navigate to page',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoadingContent(false);
    }
  };

  const cancelEditing = () => {
    setEditingPageId(null);
    setEditingTitle('');
  };

  const createNewPage = () => {
    // Open template selector
    onTemplateOpen();
  };

  const createCalendarEvents = async (databaseId: string) => {
    if (!workspace) return;

    // Sample calendar events
    const events = [
      {
        title: 'Team Standup',
        date: '2025-10-28',
        tags: ['Meeting', 'Work'],
        status: 'Planned'
      },
      {
        title: 'Project Review',
        date: '2025-10-30',
        tags: ['Meeting', 'Work'],
        status: 'Planned'
      },
      {
        title: 'Sprint Planning',
        date: '2025-11-01',
        tags: ['Meeting', 'Work'],
        status: 'Planned'
      },
      {
        title: 'Dentist Appointment',
        date: '2025-11-03',
        tags: ['Personal'],
        status: 'Planned'
      }
    ];

    for (const event of events) {
      try {
        const response = await fetch(`/api/workspace/${workspace.id}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'page',
            parent_id: databaseId,
            properties: {
              Name: [{
                type: 'text',
                text: { content: event.title }
              }],
              Date: {
                type: 'date',
                date: { start: event.date }
              },
              Tags: {
                type: 'multi_select',
                multi_select: event.tags.map(tag => ({ name: tag }))
              },
              Status: {
                type: 'select',
                select: { name: event.status }
              }
            },
            created_by: 'eleazar'
          })
        });

        if (response.ok) {
          console.log(`✅ Created event: ${event.title}`);
        } else {
          console.error(`❌ Failed to create event: ${event.title}`, await response.text());
        }
      } catch (error) {
        console.error('Failed to create calendar event:', error);
      }
    }

    console.log('✅ All calendar events created');
  };

  const createTemplateBlocks = async (pageId: string, templateId: string) => {
    if (!workspace) return;

    // Create initial blocks for templates
    const templateBlocks: Record<string, any[]> = {
      'travel-planner': [
        { type: 'heading_1', content: 'Travel Planner' },
        { type: 'paragraph', content: 'Plan your trip with ease.' },
        { type: 'heading_2', content: 'Packing List' },
        { type: 'to_do', content: 'Clothes', checked: false },
        { type: 'to_do', content: 'Toiletries', checked: false },
        { type: 'to_do', content: 'Electronics', checked: false },
        { type: 'heading_2', content: 'Itinerary' },
        { type: 'paragraph', content: 'Day 1: Arrival' },
      ],
      'recipe-table': [
        { type: 'heading_1', content: '🍲 Recipes' },
        { type: 'paragraph', content: 'My collection of favorite recipes' },
      ],
      'personal-home': [
        { type: 'heading_1', content: '🏠 Personal Home' },
        { type: 'paragraph', content: 'Welcome to your personal workspace!' },
      ],
    };

    const blockTemplates = templateBlocks[templateId] || [];

    if (blockTemplates.length === 0) return;

    // Format blocks for API
    const children = blockTemplates.map(block => ({
      type: block.type,
      properties: {
        title: [{
          type: 'text',
          text: { content: block.content }
        }],
        ...(block.type === 'to_do' && { checked: block.checked || false })
      }
    }));

    try {
      const response = await fetch(`/api/blocks/${pageId}/children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          children,
          workspace_id: workspace.id,
          created_by: 'eleazar'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create template blocks:', error);
      } else {
        console.log('✅ Template blocks created successfully');
      }
    } catch (error) {
      console.error('Failed to create template blocks:', error);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    console.log('🆕 [handleSelectTemplate] START - Template:', templateId);
    console.log('🆕 [handleSelectTemplate] Current workspace:', workspace);
    console.log('🆕 [handleSelectTemplate] Current blocks count:', blocks.length);

    if (!workspace) {
      console.error('❌ [handleSelectTemplate] No workspace found!');
      toast({
        title: 'Workspace not ready',
        description: 'Please wait for workspace to initialize',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    try {
      console.log('📡 [handleSelectTemplate] Creating page for workspace:', workspace.id);

      const templateTitles: Record<string, string> = {
        'travel-planner': '✈️ Travel Planner',
        'recipe-table': '🍲 Recipes',
        'personal-home': '🏠 Personal Home',
        'calendar-view': '📅 Calendar',
        'blank-page': 'Untitled',
      };

      // Calendar template creates a database with Date property
      if (templateId === 'calendar-view') {
        const response = await fetch(`/api/workspace/${workspace.id}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'database_full_page',
            properties: {
              title: [{
                type: 'text',
                text: { content: '📅 Calendar' }
              }],
              database_schema: {
                Name: { type: 'title' },
                Date: { type: 'date' },
                Tags: {
                  type: 'multi_select',
                  options: [
                    { name: 'Meeting', color: 'blue' },
                    { name: 'Personal', color: 'pink' },
                    { name: 'Work', color: 'purple' },
                    { name: 'Deadline', color: 'red' }
                  ]
                },
                Status: {
                  type: 'select',
                  options: [
                    { name: 'Planned', color: 'gray' },
                    { name: 'In Progress', color: 'yellow' },
                    { name: 'Completed', color: 'green' }
                  ]
                }
              }
            },
            created_by: 'eleazar'
          })
        });

        if (response.ok) {
          const block = await response.json();
          console.log('✅ Calendar database created:', block);
          setBlocks([block, ...blocks]);

          // Add sample events to the calendar
          await createCalendarEvents(block.id);

          // Small delay for database to be ready
          await new Promise(resolve => setTimeout(resolve, 300));

          // Pass the newly created block directly
          handlePageClick(block.id, block);
          onTemplateClose();

          toast({
            title: 'Calendar created',
            description: 'Calendar database with Date property created',
            status: 'success',
            duration: 3000
          });
        }
        return;
      }

      // Regular page creation for other templates
      const requestBody = {
        type: 'page',
        properties: {
          title: [{
            type: 'text',
            text: { content: templateTitles[templateId] || 'Untitled' }
          }],
        },
        created_by: 'eleazar'
      };

      console.log('📡 [handleSelectTemplate] Request URL:', `/api/workspace/${workspace.id}/blocks`);
      console.log('📡 [handleSelectTemplate] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`/api/workspace/${workspace.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 [handleSelectTemplate] Response status:', response.status);
      console.log('📡 [handleSelectTemplate] Response ok:', response.ok);

      if (response.ok) {
        const block = await response.json();
        console.log('✅ [handleSelectTemplate] Page created successfully:', block);

        // Update blocks state
        console.log('📝 [handleSelectTemplate] Updating blocks state...');
        setBlocks(prevBlocks => {
          const newBlocks = [block, ...prevBlocks];
          console.log('📝 [handleSelectTemplate] New blocks count:', newBlocks.length);
          return newBlocks;
        });

        // For non-blank templates, create initial blocks
        if (templateId !== 'blank-page') {
          console.log('📝 [handleSelectTemplate] Creating template blocks for:', templateId);
          await createTemplateBlocks(block.id, templateId);
          // Small delay to ensure database has committed
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Open the newly created page (pass the block directly)
        console.log('📂 [handleSelectTemplate] Opening page:', block.id);
        await handlePageClick(block.id, block);

        console.log('🚪 [handleSelectTemplate] Closing modal');
        onTemplateClose();

        toast({
          title: 'Page created',
          description: `"${templateTitles[templateId] || 'Untitled'}" created successfully`,
          status: 'success',
          duration: 3000
        });

        console.log('✅ [handleSelectTemplate] COMPLETE');
      } else {
        const errorText = await response.text();
        console.error('❌ [handleSelectTemplate] Failed to create page - Status:', response.status);
        console.error('❌ [handleSelectTemplate] Error response:', errorText);
        toast({
          title: 'Failed to create page',
          description: `Error: ${response.statusText}`,
          status: 'error',
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('❌ [handleSelectTemplate] Exception caught:', error);
      console.error('❌ [handleSelectTemplate] Error stack:', error.stack);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create page',
        status: 'error',
        duration: 5000
      });
    }
  };

  const handleSelectCover = async (coverUrl: string, coverType: 'image' | 'gradient' | 'solid') => {
    if (!selectedPage) return;

    try {
      // Update page with cover
      const response = await fetch(`/api/blocks/${selectedPage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: {
            ...selectedPage.properties,
            cover: {
              type: coverType,
              url: coverUrl,
            },
          },
          last_edited_by: 'demo-user',
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update local state with server response
        setSelectedPage({
          ...selectedPage,
          properties: {
            ...selectedPage.properties,
            cover: { type: coverType, url: coverUrl },
          },
        });

        // Update blocks list to reflect the cover change
        setBlocks(blocks.map(b =>
          b.id === selectedPage.id
            ? { ...b, properties: { ...b.properties, cover: { type: coverType, url: coverUrl } } }
            : b
        ));

        onCoverModalClose();

        toast({
          title: 'Cover updated',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to update cover:', error);
      toast({
        title: 'Failed to update cover',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRemoveCover = async () => {
    if (!selectedPage) return;

    try {
      const response = await fetch(`/api/blocks/${selectedPage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: {
            ...selectedPage.properties,
            cover: null,
          },
          last_edited_by: 'demo-user',
        }),
      });

      if (response.ok) {
        setSelectedPage({
          ...selectedPage,
          properties: {
            ...selectedPage.properties,
            cover: undefined,
          },
        });

        toast({
          title: 'Cover removed',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to remove cover:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading workspace...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  // Calculate margins - simpler for collapsible sidebar
  const leftMargin = `${sidebarWidth + 48}px`; // 48px for collapsed sidebar
  const rightMargin = isRightPanelOpen ? `${rightPanelWidth + 16}px` : '48px'; // Add 16px gap when panel is open

  return (
    <DashboardLayout>
      {/* Workspace Navigation */}
      <WorkspaceNav
        currentWorkspace={workspace}
        userId={userId}
        myPages={blocks.filter(block => block).map(block => ({
          id: block.id,
          title: extractPageTitle(block),
          icon: extractPageIcon(block),
          updated_at: block.updated_at?.toString() || new Date().toISOString(),
        }))}
        onPageClick={handlePageClick}
        onDeletePage={async (pageId) => {
          try {
            const response = await fetch(`/api/blocks/${pageId}`, {
              method: 'DELETE',
            });
            if (response.ok) {
              setBlocks(blocks.filter(b => b.id !== pageId));
              if (selectedPageId === pageId) {
                setSelectedPageId(null);
                setSelectedPage(null);
                setShowHome(true);
                // Clear URL parameter
                router.push('/workspace', undefined, { shallow: true });
              }
              toast({
                title: 'Page deleted',
                status: 'success',
                duration: 2000,
              });
            }
          } catch (error) {
            console.error('Failed to delete page:', error);
            toast({
              title: 'Failed to delete page',
              status: 'error',
              duration: 3000,
            });
          }
        }}
        onCreatePage={createNewPage}
        onHomeClick={() => {
          // Navigate to home view using URL routing
          router.push('/workspace', undefined, { shallow: true });
          // Clear saved page from localStorage
          if (workspace?.id) {
            localStorage.removeItem(`workspace_${workspace.id}_selectedPage`);
          }
        }}
        onWorkspaceAIClick={() => {
          // Navigate to AI view using URL routing for persistence
          router.push('/workspace?view=ai', undefined, { shallow: true });
        }}
        onFilesClick={() => {
          setContext('workspace-ai');
          setCustomData((prev: any) => ({
            ...prev,
            workspaceId: workspace?.id || 'default-workspace'
          }));
          setActiveTab('files');
          setRightPanelOpen(true);
        }}
        onNotesClick={() => {
          // Navigate to Notes view using URL routing
          router.push('/workspace?view=notes', undefined, { shallow: true });
        }}
        onWorkspaceChange={async (workspaceId) => {
          // Switch workspace without full page reload
          console.log('[Workspace] Switching to workspace:', workspaceId);
          
          try {
            // Fetch the new workspace details
            const response = await fetch('/api/workspace/list', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
            });
            
            if (response.ok) {
              const data = await response.json();
              const newWorkspace = data.workspaces?.find((ws: any) => ws.id === workspaceId);
              
              if (newWorkspace) {
                // Update workspace state
                setWorkspace(newWorkspace);
                
                // Save selection to localStorage
                localStorage.setItem('selected_workspace_id', workspaceId);
                
                // Clear current page selection
                setSelectedPageId(null);
                setSelectedPage(null);
                setShowHome(true);
                setShowAI(false);
                
                // Load blocks for new workspace
                await loadBlocks(workspaceId, true);
                
                // Update URL without reload
                router.push(`/workspace?id=${workspaceId}`, undefined, { shallow: true });
                
                toast({
                  title: 'Workspace switched',
                  description: `Now viewing: ${newWorkspace.name}`,
                  status: 'success',
                  duration: 2000,
                });
              }
            }
          } catch (error) {
            console.error('[Workspace] Failed to switch workspace:', error);
            toast({
              title: 'Failed to switch workspace',
              status: 'error',
              duration: 3000,
            });
          }
        }}
        onSettingsClick={() => {
          toast({
            title: 'Workspace Settings',
            description: 'Settings panel coming soon',
            status: 'info',
            duration: 2000,
          });
        }}
        onInviteClick={() => {
          toast({
            title: 'Invite Members',
            description: 'Invite functionality coming soon',
            status: 'info',
            duration: 2000,
          });
        }}
        onReorderPages={(fromIndex, toIndex) => {
          const reorderedBlocks = [...blocks];
          const [movedBlock] = reorderedBlocks.splice(fromIndex, 1);
          reorderedBlocks.splice(toIndex, 0, movedBlock);
          setBlocks(reorderedBlocks);

          toast({
            title: 'Page reordered',
            status: 'success',
            duration: 1500,
          });
        }}
      />

      {/* Main Content Area */}
      <HStack spacing={0} align="stretch" width="100%" height="100%">
        <Box
          overflowY="auto"
          overflowX="hidden"
          width="100%"
          height="100%"
          bg={surfaceElevatedBg}
          flex={1}
        >
          {showHome ? (
          // Show Notion-style Home Page
          <NotionHome
            recentPages={blocks
              .filter(block => block)
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 6)
              .map(block => ({
                id: block.id,
                title: extractPageTitle(block),
                icon: extractPageIcon(block),
                cover: block.properties?.cover?.url,
                updated_at: block.updated_at?.toString() || new Date().toISOString(),
                onClick: handlePageClick,
              }))}
            onPageClick={handlePageClick}
            userName="User"
          />
        ) : showAI ? (
          // Show Workspace AI Page
          <WorkspaceAI
            workspaceName={workspace?.name || 'My Workspace'}
            userName="User"
            onToggleSettings={() => setRightPanelOpen(!isRightPanelOpen)}
            model={model}
            temperature={temperature}
            responseStyle={responseStyle}
            knowledgeSources={knowledgeSources}
            mcpServers={mcpServers}
            enabledTools={enabledTools}
            onMCPServersChange={handleMCPServersChange}
            searchScope={searchScope}
            contextSize={contextSize}
            useGoose={useGoose}
            onUseGooseChange={setUseGoose}
            workingDirectory={workingDirectory}
          />
        ) : showNotes ? (
          // Show Notes Page
          <WorkspaceNotes
            workspaceId={workspace?.id}
            userId={userId}
          />
        ) : loadingContent ? (
          // Show loading spinner while content is loading
          <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
            <VStack spacing={4}>
              <Spinner size="xl" />
              <Text color={textSecondaryColor}>Loading page content...</Text>
            </VStack>
          </Box>
        ) : selectedPage ? (
          // Show Custom Notion Editor with cover
          <Box width="100%" maxW="100%" overflow="hidden">
            {/* Render database view for database blocks */}
            {selectedPage.type === 'database_full_page' ? (
              <Box maxW="100%" overflow="hidden">
                {/* Database Title with Favorite Button */}
                <Box px={8} pt={selectedPage.properties?.cover?.url ? 4 : 8} mb={2}>
                  <HStack spacing={3} align="center">
                    <Heading size="2xl" fontWeight="bold" flex={1}>
                      {extractPageTitle(selectedPage) || 'Untitled Database'}
                    </Heading>
                    <IconButton
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      icon={<FiStar />}
                      variant="ghost"
                      size="md"
                      color={isFavorite ? 'yellow.500' : 'gray.400'}
                      _hover={{ color: isFavorite ? 'yellow.600' : 'yellow.500' }}
                      onClick={toggleFavorite}
                    />
                    <IconButton
                      aria-label="Version history"
                      icon={<FiClock />}
                      variant="ghost"
                      size="md"
                      color={showVersionHistory ? 'blue.500' : 'gray.400'}
                      _hover={{ color: 'blue.500' }}
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                    />
                    <IconButton
                      aria-label="Export page"
                      icon={<FiDownload />}
                      variant="ghost"
                      size="sm"
                      color="gray.400"
                      _hover={{ color: 'green.500' }}
                      onClick={onExportOpen}
                    />
                    <IconButton
                      aria-label="Share page"
                      icon={<FiShare2 />}
                      variant="ghost"
                      size="sm"
                      color="gray.400"
                      _hover={{ color: 'purple.500' }}
                      onClick={onShareOpen}
                    />
                  </HStack>
                </Box>

                {/* Page Control Bar */}
                <PageControlBar
                  pageType="database"
                  currentView={currentPageView}
                  onViewChange={setCurrentPageView}
                  activeFilters={0}
                  activeSorts={0}
                  onFilterClick={() => {
                    toast({
                      title: 'Filter',
                      description: 'Filter functionality coming soon',
                      status: 'info',
                      duration: 2000
                    });
                  }}
                  onSortClick={() => {
                    toast({
                      title: 'Sort',
                      description: 'Sort functionality coming soon',
                      status: 'info',
                      duration: 2000
                    });
                  }}
                  onSearchClick={() => {
                    toast({
                      title: 'Search',
                      description: 'Search functionality coming soon',
                      status: 'info',
                      duration: 2000
                    });
                  }}
                  onSettingsClick={onCalendarSettingsOpen}
                  onNewClick={() => {
                    toast({
                      title: 'New Entry',
                      description: 'Create new database entry',
                      status: 'info',
                      duration: 2000
                    });
                  }}
                />

                {/* Database Views - Switch based on currentPageView */}
                <Box pt={4}>
                  {currentPageView === 'table' && (
                    <NotionDatabaseTable
                      databaseId={selectedPage.id}
                      workspaceId={workspace.id}
                      onPageClick={handleOpenSidePeek}
                    />
                  )}

                  {currentPageView === 'calendar' && (
                    <CalendarGridView
                      databaseId={selectedPage.id}
                      onEventClick={handlePageClick}
                      viewMode="month"
                    />
                  )}

                  {currentPageView === 'gallery' && (
                    <GalleryView
                      databaseId={selectedPage.id}
                      onEntryClick={handlePageClick}
                      cardSize="medium"
                    />
                  )}

                  {currentPageView === 'board' && (
                    <BoardView
                      databaseId={selectedPage.id}
                      onCardClick={handlePageClick}
                      groupBy="Status"
                      onCardMove={async (cardId, newStatus) => {
                        try {
                          const workspaceId = 'ws-001';
                          const response = await fetch(`/api/workspace/${workspaceId}/blocks/${cardId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              properties: {
                                Status: {
                                  type: 'select',
                                  select: { name: newStatus }
                                }
                              }
                            })
                          });

                          if (response.ok) {
                            toast({
                              title: 'Card moved',
                              description: `Status updated to ${newStatus}`,
                              status: 'success',
                              duration: 2000,
                            });
                          }
                        } catch (error) {
                          console.error('Failed to update card status:', error);
                          toast({
                            title: 'Failed to move card',
                            status: 'error',
                            duration: 2000,
                          });
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>
            ) : (
              /* All pages use CustomNotionEditor with drag-and-drop, covers, etc. */
              <Box w="full" maxW="100%" overflow="hidden">
                <CustomNotionEditor
                  key={`${selectedPage.id}-${pageVersion}`}
                  pageId={selectedPage.id}
                  title={extractPageTitle(selectedPage)}
                  initialBlocks={pageBlocks as EditorBlock[]}
                  blockModelRef={blockModelRef}
                  initialCoverUrl={selectedPage.properties?.cover?.url}
                  initialCoverType={selectedPage.properties?.cover?.type || 'image'}
                  onTitleChange={async (newTitle) => {
                    // Update local state immediately for responsive UI
                    setEditingTitle(newTitle);

                    // Update local blocks list
                    setBlocks(blocks.map(b =>
                      b.id === selectedPage.id
                        ? { ...b, properties: { ...b.properties, title: [{ type: 'text', text: { content: newTitle } }] } }
                        : b
                    ));

                    // Update selected page
                    setSelectedPage({
                      ...selectedPage,
                      properties: { ...selectedPage.properties, title: [{ type: 'text', text: { content: newTitle } }] }
                    });

                    // Auto-save title to database
                    if (selectedPage?.id) {
                      try {
                        await fetch(`/api/workspace/pages/${selectedPage.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: newTitle,
                            user_id: userId
                          })
                        });
                        console.log('✅ [Workspace] Auto-saved title:', newTitle);
                      } catch (err) {
                        console.error('❌ [Workspace] Title save failed:', err);
                      }
                    }
                  }}
                  onBlocksChange={async (newBlocks) => {
                    // Only update if actually changed
                    if (JSON.stringify(newBlocks) !== JSON.stringify(pageBlocks)) {
                      setPageBlocks(newBlocks);
                      // Auto-save to backend
                      if (selectedPage?.id && workspace?.id) {
                        try {
                          await fetch(`/api/workspace/pages/${selectedPage.id}/blocks`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              blocks: newBlocks,
                              user_id: userId
                            })
                          });
                          console.log('✅ [Workspace] Auto-saved blocks');

                          // Track mentions for backlinks
                          await BacklinkTracker.trackMentions(
                            selectedPage.id,
                            workspace.id,
                            newBlocks as any[]
                          );

                          // Auto-snapshot for version history (debounced - only every 30 saves)
                          const saveCount = parseInt(sessionStorage.getItem(`saveCount_${selectedPage.id}`) || '0') + 1;
                          sessionStorage.setItem(`saveCount_${selectedPage.id}`, String(saveCount));
                          if (saveCount % 30 === 0) {
                            VersionHistory.createSnapshot(
                              selectedPage.id,
                              extractPageTitle(selectedPage),
                              newBlocks,
                              selectedPage.properties,
                              userId,
                              `Auto-snapshot (save #${saveCount})`
                            ).catch(err => console.error('Version snapshot failed:', err));
                          }
                        } catch (err) {
                          console.error('❌ [Workspace] Auto-save failed:', err);
                        }
                      }
                    }
                  }}
                  onSave={async () => {
                    if (selectedPage?.id) {
                      await fetch(`/api/workspace/pages/${selectedPage.id}/blocks`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          blocks: pageBlocks,
                          user_id: userId
                        })
                      });
                      console.log('✅ [Workspace] Saved blocks');
                    }
                  }}
                  workspaceId={workspace.id}
                  onPageClick={handleOpenSidePeek}
                />
              </Box>
            )}
          </Box>
        ) : null}
      </Box>

      {/* Cover Selector Modal */}
      <CoverSelectorModal
        isOpen={isCoverModalOpen}
        onClose={onCoverModalClose}
        onSelectCover={handleSelectCover}
      />

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={isTemplateOpen}
        onClose={onTemplateClose}
        onSelectTemplate={handleSelectTemplate}
        workspaceId={workspace?.id}
      />

      {/* Version History Side Panel */}
      {showVersionHistory && selectedPage && (
        <Box
          position="fixed"
          right={0}
          top={0}
          bottom={0}
          w="320px"
          bg={surfaceElevatedBg}
          borderLeft="1px"
          borderColor="gray.200"
          zIndex={50}
          overflowY="auto"
          boxShadow="-2px 0 8px rgba(0,0,0,0.1)"
        >
          <VersionHistoryPanel
            pageId={selectedPage.id}
            userId={userId}
            onRestore={() => {
              // Reload page content after restore
              if (selectedPage) {
                handlePageClick(selectedPage.id);
              }
              setShowVersionHistory(false);
            }}
          />
        </Box>
      )}

      {/* Calendar Settings Modal */}
      {selectedPage && selectedPage.type === 'database_full_page' && (
        <CalendarSettings
          isOpen={isCalendarSettingsOpen}
          onClose={onCalendarSettingsClose}
          databaseId={selectedPage.id}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={onImportClose}
        workspaceId={workspace?.id || ''}
        userId={userId}
        onImportComplete={async (result) => {
          if (result.type === 'page' && workspace?.id) {
            try {
              const res = await fetch('/api/workspace/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workspace_id: workspace.id,
                  title: result.title,
                  type: 'page',
                  user_id: userId,
                }),
              });
              if (res.ok) {
                const page = await res.json();
                // Save imported blocks
                await fetch(`/api/workspace/pages/${page.id}/blocks`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ blocks: result.blocks, user_id: userId }),
                });
                loadBlocks(workspace.id, true);
                handlePageClick(page.id);
              }
            } catch (err) {
              console.error('Import page creation failed:', err);
            }
          }
        }}
      />

      {/* Export Modal */}
      {selectedPage && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={onExportClose}
          pageTitle={extractPageTitle(selectedPage)}
          blocks={pageBlocks as any[]}
        />
      )}

      {/* Share Modal */}
      {selectedPage && (
        <ShareModal
          blockId={selectedPage.id}
          isOpen={isShareOpen}
          onClose={onShareClose}
          currentUserId={userId}
        />
      )}

      {/* Document Goose Floating Button - only show when viewing a page and not in sidebar mode */}
      {selectedPage && !showHome && !showAI && !gooseOpen && gooseMode === 'floating' && (
        <GooseFloatingButton
          onClick={() => setGooseOpen(true)}
          isOpen={gooseOpen}
          pageTitle={extractPageTitle(selectedPage)}
        />
      )}

      {/* Document Goose Floating Panel (Notion-style) */}
      {gooseOpen && selectedPage && gooseMode === 'floating' && (
        <GooseFloatingPanel
          pageId={selectedPage.id}
          pageTitle={extractPageTitle(selectedPage)}
          blockModelRef={blockModelRef}
          onPageUpdate={() => {
            // Refresh sidebar with force update to catch title changes
            if (workspace) loadBlocks(workspace.id, true);
            // Refresh page content silently to show AI edits
            if (selectedPage) refreshPageBlocks(selectedPage.id);
          }}
          onStreamingChunk={handleStreamingChunk}
          onClose={() => setGooseOpen(false)}
          onSwitchToSidebar={handleSwitchToSidebar}
        />
      )}

      {/* QuickFind Modal (Cmd+K) */}
      <QuickFind
        isOpen={isQuickFindOpen}
        onClose={onQuickFindClose}
        workspaceId={workspace?.id || ''}
        userId={userId}
        onPageSelect={handlePageClick}
      />
      </HStack>
    </DashboardLayout>
  );
}

// Server-side account tenancy check - redirect child accounts to child workspace
export { getServerSideProps } from '@/lib/adult-page-guard';
