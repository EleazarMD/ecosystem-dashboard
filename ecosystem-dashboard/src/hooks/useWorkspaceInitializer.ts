/**
 * Custom hook for workspace initialization and data loading
 */

import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Workspace, Block } from '../types/workspace';

interface UseWorkspaceInitializerProps {
  userId: string;
  setWorkspace: (workspace: Workspace | null) => void;
  setBlocks: (blocks: Block[]) => void;
  setLoading: (loading: boolean) => void;
}

export function useWorkspaceInitializer(props: UseWorkspaceInitializerProps) {
  const { userId, setWorkspace, setBlocks, setLoading } = props;
  const toast = useToast();

  const loadBlocks = async (workspaceId: string) => {
    try {
      const response = await fetch('/api/workspace/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      if (response.ok) {
        const data = await response.json();
        const pageBlocks = data.blocks?.filter((b: Block) => 
          b.type === 'page' || b.type === 'database_full_page'
        ) || [];
        setBlocks(pageBlocks);
        console.log('[Workspace] Blocks updated:', pageBlocks.length);
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    }
  };

  const initializeWorkspace = async () => {
    try {
      setLoading(true);

      // Load user's workspaces
      const response = await fetch('/api/workspace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: userId }),
      });

      if (response.ok) {
        const data = await response.json();
        const workspaces = data.workspaces || [];
        
        if (workspaces.length > 0) {
          const ws = workspaces[0];
          setWorkspace(ws);
          await loadBlocks(ws.id);
        } else {
          // Create default workspace
          const createResponse = await fetch('/api/workspace/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'My Workspace',
              ownerId: userId,
            }),
          });

          if (createResponse.ok) {
            const createData = await createResponse.json();
            setWorkspace(createData.workspace);
            await loadBlocks(createData.workspace.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
      toast({
        title: 'Failed to load workspace',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    initializeWorkspace,
    loadBlocks,
  };
}
