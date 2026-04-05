/**
 * Custom hook for restoring selected page from localStorage
 */

import { useEffect } from 'react';
import { Workspace, Block } from '../types/workspace';

interface UsePageRestorationProps {
  workspace: Workspace | null;
  blocks: Block[];
  selectedPageId: string | null;
  hasRestoredPage: React.MutableRefObject<boolean>;
  handlePageClick: (pageId: string, page?: Block) => Promise<void>;
}

export function usePageRestoration(props: UsePageRestorationProps) {
  const { workspace, blocks, selectedPageId, hasRestoredPage, handlePageClick } = props;

  useEffect(() => {
    // Only restore if:
    // 1. Haven't restored yet
    // 2. Have blocks loaded
    // 3. Have workspace
    // 4. No page is currently selected (user hasn't clicked anything)
    if (!hasRestoredPage.current && blocks.length > 0 && workspace?.id && !selectedPageId) {
      const savedPageId = localStorage.getItem(`workspace_${workspace.id}_selectedPage`);
      
      // Only restore if there's a saved page
      if (savedPageId) {
        const page = blocks.find(b => b.id === savedPageId);
        if (page) {
          console.log('🔄 [localStorage] Restoring page (attempt 1):', savedPageId);
          handlePageClick(savedPageId, page);
        } else {
          // Page no longer exists, clear from storage
          console.log('🔄 [localStorage] Saved page not found, clearing:', savedPageId);
          localStorage.removeItem(`workspace_${workspace.id}_selectedPage`);
        }
      }
      
      // Mark as restored regardless of whether we found a saved page
      // This prevents running again on subsequent renders
      hasRestoredPage.current = true;
    }
  }, [blocks.length, workspace?.id, selectedPageId]);
}
