/**
 * WorkspacePageView - Complete page view with Goose integration
 * Properly implements onPageUpdate callback for real-time updates
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { CustomNotionEditor } from '../editor/CustomNotionEditor';
import { GooseFloatingPanel } from './GooseFloatingPanel';
import { GooseFloatingButton } from './GooseFloatingButton';
import { BlockModel, Block } from '@/lib/editor/BlockModel';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface WorkspacePageViewProps {
  pageId: string;
  pageTitle: string;
  initialBlocks: Block[];
  onTitleChange: (title: string) => void;
  onBlocksChange: (blocks: Block[]) => void;
  onSave?: () => void;
  onPageClick?: (pageId: string) => void;
  workspaceId: string;
}

export function WorkspacePageView({
  pageId,
  pageTitle,
  initialBlocks,
  onTitleChange,
  onBlocksChange,
  onSave,
  onPageClick,
  workspaceId,
}: WorkspacePageViewProps) {
  const blockModelRef = useRef<BlockModel | null>(null);
  const [showGooseFloating, setShowGooseFloating] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const { setIsOpen, setContext, setActiveTab, setCustomData, isOpen: isRightPanelOpen } = useRightPanel();

  // Modern clean background
  const bgColor = useSemanticToken('surface.base');

  // Sync blocks when initialBlocks change
  useEffect(() => {
    setBlocks(initialBlocks);
  }, [initialBlocks]);

  // Handle page update after Goose makes changes
  const handlePageUpdate = useCallback(async () => {
    console.log('[WorkspacePageView] 🔄 Page update triggered by Goose');

    try {
      // 1. Fetch updated blocks
      const blocksResponse = await fetch(`/api/pages/${pageId}/blocks`);
      if (!blocksResponse.ok) throw new Error(`Failed to fetch blocks: ${blocksResponse.status}`);
      const updatedBlocks = await blocksResponse.json();

      // 2. Fetch updated page details (for title)
      const pageResponse = await fetch(`/api/workspace/pages/${pageId}`);
      if (!pageResponse.ok) throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      const pageDetails = await pageResponse.json();
      const updatedTitle = pageDetails.properties?.title || 'Untitled';

      console.log('[WorkspacePageView] ✅ Fetched updates:', {
        blocks: updatedBlocks.length,
        title: updatedTitle
      });

      // Update local state
      setBlocks(updatedBlocks);

      // Update title if changed
      if (updatedTitle !== pageTitle) {
        onTitleChange(updatedTitle);
      }

      // Update BlockModel
      if (blockModelRef.current) {
        const newBlockModel = BlockModel.fromJSON(updatedBlocks);
        blockModelRef.current = newBlockModel;
        console.log('[WorkspacePageView] ✅ BlockModel recreated');
      }

      // Notify parent
      onBlocksChange(updatedBlocks);

    } catch (error) {
      console.error('[WorkspacePageView] ❌ Failed to refresh page:', error);
    }
  }, [pageId, pageTitle, onTitleChange, onBlocksChange]);

  // Open Goose in floating mode
  const handleOpenGooseFloating = useCallback(() => {
    console.log('[WorkspacePageView] 🎯 Opening Goose floating panel');
    setShowGooseFloating(true);
  }, []);

  // Open Goose in sidebar mode
  const handleOpenGooseSidebar = useCallback(() => {
    console.log('[WorkspacePageView] 🎯 Opening Goose sidebar panel');

    // Set right panel context
    setContext('workspace-page');
    setActiveTab('goose-agent');

    // Pass all necessary data including onPageUpdate
    setCustomData({
      goose: {
        pageId,
        pageTitle,
        blockModelRef,
        mcpServers: {
          workspace: true,
          knowledgeGraph: true,
          filesystem: true,
        },
        onPageUpdate: handlePageUpdate, // ← THIS IS THE CRITICAL CALLBACK
        onClose: () => {
          setIsOpen(false);
        },
        onSwitchToFloating: () => {
          setIsOpen(false);
          setShowGooseFloating(true);
        },
      },
    });

    // Open the panel
    setIsOpen(true);
  }, [pageId, pageTitle, blockModelRef, handlePageUpdate, setContext, setActiveTab, setCustomData, setIsOpen]);

  // Close Goose floating panel
  const handleCloseGooseFloating = useCallback(() => {
    setShowGooseFloating(false);
  }, []);

  // Switch from floating to sidebar
  const handleSwitchToSidebar = useCallback(() => {
    setShowGooseFloating(false);
    handleOpenGooseSidebar();
  }, [handleOpenGooseSidebar]);

  // Keyboard shortcut: ⌘J to open Goose
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
        event.preventDefault();

        // If right panel is open, close it and open floating
        if (isRightPanelOpen) {
          setIsOpen(false);
          setTimeout(() => setShowGooseFloating(true), 100);
        } else {
          // Otherwise open floating directly
          setShowGooseFloating(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRightPanelOpen, setIsOpen]);

  return (
    <Box position="relative" h="100%" bg={bgColor} overflowY="auto">
      {/* Main Editor Container */}
      <Box
        w="full"
        minH="100%"
      >
        <CustomNotionEditor
          pageId={pageId}
          title={pageTitle}
          initialBlocks={blocks}
          onTitleChange={onTitleChange}
          onBlocksChange={(updatedBlocks) => {
            setBlocks(updatedBlocks);
            onBlocksChange(updatedBlocks);
          }}
          onSave={onSave}
          onPageClick={onPageClick}
          workspaceId={workspaceId}
          blockModelRef={blockModelRef}
        />
      </Box>

      {/* Goose Floating Button */}
      {!showGooseFloating && !isRightPanelOpen && (
        <GooseFloatingButton
          onClick={handleOpenGooseFloating}
          isOpen={showGooseFloating}
          pageTitle={pageTitle}
        />
      )}

      {/* Goose Floating Panel */}
      {showGooseFloating && (
        <GooseFloatingPanel
          pageId={pageId}
          pageTitle={pageTitle}
          blockModelRef={blockModelRef}
          onClose={handleCloseGooseFloating}
          onSwitchToSidebar={handleSwitchToSidebar}
          onPageUpdate={handlePageUpdate} // ← Pass the callback
          mcpServers={{
            workspace: true,
            knowledgeGraph: true,
            filesystem: true,
            notion: false,
            github: false,
            perplexity: false,
            custom: [],
          }}
        />
      )}
    </Box>
  );
}
