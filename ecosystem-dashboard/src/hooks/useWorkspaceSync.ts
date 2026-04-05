/**
 * useWorkspaceSync - Real-time collaboration hook for workspace blocks
 * Syncs block changes across clients using WebSocket
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { SocketManager } from '@/lib/socket/SocketManager';
import { Block, BlockModel } from '@/lib/editor/BlockModel';

interface SyncState {
  connected: boolean;
  syncing: boolean;
  lastSyncTime: number | null;
  activeUsers: string[];
  error: string | null;
}

interface BlockOperation {
  type: 'create' | 'update' | 'delete' | 'move';
  blockId: string;
  data?: Partial<Block>;
  position?: number;
  parentId?: string | null;
  userId: string;
  timestamp: number;
}

interface UseWorkspaceSyncOptions {
  workspaceId: string;
  pageId: string;
  blockModel: BlockModel | null;
  userId?: string;
  enabled?: boolean;
}

// Singleton socket manager instance
let socketManager: SocketManager | null = null;

function getSocketManager(): SocketManager {
  if (!socketManager) {
    socketManager = new SocketManager();
  }
  return socketManager;
}

export function useWorkspaceSync({
  workspaceId,
  pageId,
  blockModel,
  userId = 'anonymous',
  enabled = true,
}: UseWorkspaceSyncOptions) {
  const [syncState, setSyncState] = useState<SyncState>({
    connected: false,
    syncing: false,
    lastSyncTime: null,
    activeUsers: [],
    error: null,
  });

  const pendingOperationsRef = useRef<BlockOperation[]>([]);
  const isProcessingRef = useRef(false);
  const localOperationIdsRef = useRef<Set<string>>(new Set());

  // Connect to WebSocket and join workspace
  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const socket = getSocketManager();

    socket.connect(workspaceId).then(() => {
      setSyncState(prev => ({ ...prev, connected: true, error: null }));
    }).catch((error) => {
      setSyncState(prev => ({ ...prev, connected: false, error: error.message }));
    });

    // Subscribe to block events
    const unsubCreate = socket.on('block:created', (data: { block: Block; userId: string; operationId: string }) => {
      // Ignore our own operations
      if (localOperationIdsRef.current.has(data.operationId)) {
        localOperationIdsRef.current.delete(data.operationId);
        return;
      }

      if (blockModel && data.block) {
        console.log('[WorkspaceSync] Remote block created:', data.block.id);
        // Apply remote creation
        blockModel.createBlock(
          data.block.type,
          data.block.content,
          data.block.parentId || undefined,
          undefined,
          data.userId
        );
      }
    });

    const unsubUpdate = socket.on('block:updated', (data: { blockId: string; changes: Partial<Block>; userId: string; operationId: string }) => {
      if (localOperationIdsRef.current.has(data.operationId)) {
        localOperationIdsRef.current.delete(data.operationId);
        return;
      }

      if (blockModel && data.blockId) {
        console.log('[WorkspaceSync] Remote block updated:', data.blockId);
        // Apply remote update
        if (data.changes.content) {
          blockModel.updateContent(data.blockId, data.changes.content, data.userId);
        }
        if (data.changes.properties) {
          blockModel.updateProperties(data.blockId, data.changes.properties, data.userId);
        }
      }
    });

    const unsubDelete = socket.on('block:deleted', (data: { blockId: string; userId: string; operationId: string }) => {
      if (localOperationIdsRef.current.has(data.operationId)) {
        localOperationIdsRef.current.delete(data.operationId);
        return;
      }

      if (blockModel && data.blockId) {
        console.log('[WorkspaceSync] Remote block deleted:', data.blockId);
        blockModel.deleteBlock(data.blockId, data.userId);
      }
    });

    // Subscribe to presence events
    const unsubPresence = socket.on('presence:update', (data: { users: string[] }) => {
      setSyncState(prev => ({ ...prev, activeUsers: data.users }));
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubPresence();
      socket.leaveWorkspace(workspaceId);
    };
  }, [enabled, workspaceId, blockModel]);

  // Broadcast local block creation
  const broadcastBlockCreated = useCallback((block: Block) => {
    if (!enabled || !workspaceId) return;

    const operationId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localOperationIdsRef.current.add(operationId);

    const socket = getSocketManager();
    socket.saveTransaction({
      operations: [{
        type: 'create',
        recordId: block.id,
        recordType: 'block',
        data: { ...block, operationId },
      }],
      workspaceId,
    }).catch(error => {
      console.error('[WorkspaceSync] Failed to broadcast block creation:', error);
      localOperationIdsRef.current.delete(operationId);
    });
  }, [enabled, workspaceId, userId]);

  // Broadcast local block update
  const broadcastBlockUpdated = useCallback((blockId: string, changes: Partial<Block>) => {
    if (!enabled || !workspaceId) return;

    const operationId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localOperationIdsRef.current.add(operationId);

    const socket = getSocketManager();
    socket.saveTransaction({
      operations: [{
        type: 'update',
        recordId: blockId,
        recordType: 'block',
        data: { ...changes, operationId },
      }],
      workspaceId,
    }).catch(error => {
      console.error('[WorkspaceSync] Failed to broadcast block update:', error);
      localOperationIdsRef.current.delete(operationId);
    });
  }, [enabled, workspaceId, userId]);

  // Broadcast local block deletion
  const broadcastBlockDeleted = useCallback((blockId: string) => {
    if (!enabled || !workspaceId) return;

    const operationId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localOperationIdsRef.current.add(operationId);

    const socket = getSocketManager();
    socket.saveTransaction({
      operations: [{
        type: 'delete',
        recordId: blockId,
        recordType: 'block',
        data: { operationId },
      }],
      workspaceId,
    }).catch(error => {
      console.error('[WorkspaceSync] Failed to broadcast block deletion:', error);
      localOperationIdsRef.current.delete(operationId);
    });
  }, [enabled, workspaceId, userId]);

  // Force sync with server
  const forceSync = useCallback(async () => {
    if (!enabled || !workspaceId || !blockModel) return;

    setSyncState(prev => ({ ...prev, syncing: true }));

    try {
      const socket = getSocketManager();
      const blockIds = blockModel.getAllBlocks().map(b => b.id);
      await socket.syncRecordValues(blockIds);
      setSyncState(prev => ({ 
        ...prev, 
        syncing: false, 
        lastSyncTime: Date.now(),
        error: null,
      }));
    } catch (error: any) {
      setSyncState(prev => ({ 
        ...prev, 
        syncing: false, 
        error: error.message,
      }));
    }
  }, [enabled, workspaceId, blockModel]);

  return {
    ...syncState,
    broadcastBlockCreated,
    broadcastBlockUpdated,
    broadcastBlockDeleted,
    forceSync,
  };
}

// Presence indicator component helper
export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: { blockId: string; start: number; end: number };
}

// Generate consistent color for user
export function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
