/**
 * Custom hook for workspace page handlers
 */

import { useRouter } from 'next/router';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Workspace, Block } from '../types/workspace';

interface UseWorkspaceHandlersProps {
  workspace: Workspace | null;
  blocks: Block[];
  selectedPageId: string | null;
  setBlocks: (blocks: Block[]) => void;
  setSelectedPageId: (id: string | null) => void;
  setSelectedPage: (page: Block | null) => void;
  setShowHome: (show: boolean) => void;
  setShowAI: (show: boolean) => void;
  setLoadingContent: (loading: boolean) => void;
  setPageBlocks: (blocks: any[]) => void;
  hasRestoredPage: React.MutableRefObject<boolean>;
}

export function useWorkspaceHandlers(props: UseWorkspaceHandlersProps) {
  const router = useRouter();
  const toast = useToast();
  
  const {
    workspace,
    blocks,
    selectedPageId,
    setBlocks,
    setSelectedPageId,
    setSelectedPage,
    setShowHome,
    setShowAI,
    setLoadingContent,
    setPageBlocks,
    hasRestoredPage,
  } = props;

  const handlePageClick = async (pageId: string, newPage?: Block) => {
    console.log('📄 [handlePageClick] START - Page ID:', pageId);
    setShowHome(false);
    setShowAI(false);
    setSelectedPageId(pageId);
    setLoadingContent(true);
    
    // Save selected page to localStorage for persistence across reloads
    if (workspace?.id) {
      localStorage.setItem(`workspace_${workspace.id}_selectedPage`, pageId);
      console.log('💾 [localStorage] Saved page:', pageId);
    }
    
    // Clear previous blocks and page immediately
    setPageBlocks([]);
    setSelectedPage(null);
    
    // Find the page in blocks
    const page = newPage || blocks.find(b => b.id === pageId);
    if (page) {
      try {
        console.log('📄 [handlePageClick] Fetching blocks for page:', pageId);
        const response = await fetch(`/api/blocks/${pageId}`);
        
        if (response.ok) {
          const data = await response.json();
          const contentBlocks = data.blocks || [];
          console.log('[Workspace] 📦 Loaded content blocks:', contentBlocks.length);
          setPageBlocks(contentBlocks);
          setSelectedPage(page);
        } else {
          console.warn('📄 [handlePageClick] Fetch failed with status:', response.status);
          setSelectedPage(page);
        }
      } catch (error) {
        console.error('❌ [handlePageClick] Failed to load page blocks:', error);
        setSelectedPage(page);
      }
    }
    
    setLoadingContent(false);
  };

  const handleHomeClick = () => {
    // Clear saved page when going to home
    if (workspace?.id) {
      localStorage.removeItem(`workspace_${workspace.id}_selectedPage`);
      hasRestoredPage.current = false;
    }
    router.push('/workspace', undefined, { shallow: true });
    setShowHome(true);
    setShowAI(false);
    setSelectedPageId(null);
    setSelectedPage(null);
    setPageBlocks([]);
  };

  const handleWorkspaceAIClick = () => {
    // Clear saved page when going to AI view
    if (workspace?.id) {
      localStorage.removeItem(`workspace_${workspace.id}_selectedPage`);
      hasRestoredPage.current = false;
    }
    router.push('/workspace?view=ai', undefined, { shallow: true });
    setShowHome(false);
    setShowAI(true);
    setSelectedPageId(null);
    setSelectedPage(null);
    setPageBlocks([]);
  };

  const handleDeletePage = async (pageId: string) => {
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
  };

  return {
    handlePageClick,
    handleHomeClick,
    handleWorkspaceAIClick,
    handleDeletePage,
  };
}
