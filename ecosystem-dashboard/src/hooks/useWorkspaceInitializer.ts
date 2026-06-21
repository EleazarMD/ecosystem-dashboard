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
      const response = await fetch(`/api/pi-workspace/workspaces/${workspaceId}/pages`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        // Pi Workspace returns an array of pages directly
        const pageBlocks = data || [];
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

      // Load user's workspaces from Pi Workspace microservice via proxy
      const response = await fetch('/api/pi-workspace/workspaces', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const workspaces = await response.json();
        
        if (workspaces && workspaces.length > 0) {
          const ws = workspaces[0];
          setWorkspace(ws);
          await loadBlocks(ws.id);
        } else {
          // Create default workspace via Pi Workspace API
          const createResponse = await fetch('/api/pi-workspace/workspaces', {
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
