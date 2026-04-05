/**
 * useRealTimeSync - React hook for Notion-style real-time synchronization
 * Integrates WebSocket updates with RecordCache
 */

import { useEffect, useCallback, useRef } from 'react';
import { socketManager } from '../lib/socket/SocketManager';
import { blockCache, blockCacheManager } from '../lib/workspace/RecordCache';

export interface UseRealTimeSyncOptions {
  workspaceId: string;
  enabled?: boolean;
  onBlockCreated?: (block: any) => void;
  onBlockUpdated?: (block: any) => void;
  onBlockDeleted?: (blockId: string) => void;
}

export function useRealTimeSync(options: UseRealTimeSyncOptions) {
  const {
    workspaceId,
    enabled = true,
    onBlockCreated,
    onBlockUpdated,
    onBlockDeleted
  } = options;

  const isConnected = useRef(false);

  /**
   * Connect to WebSocket and join workspace
   */
  useEffect(() => {
    if (!enabled || !workspaceId) return;

    let isMounted = true;

    const connect = async () => {
      try {
        console.log('[useRealTimeSync] Connecting...');
        await socketManager.connect(workspaceId);
        
        if (isMounted) {
          isConnected.current = true;
          console.log('[useRealTimeSync] ✅ Connected to workspace:', workspaceId);
        }
      } catch (error) {
        // Connection errors are handled gracefully by SocketManager
        // App continues to work without real-time sync
        if (isMounted) {
          isConnected.current = false;
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (isConnected.current) {
        socketManager.leaveWorkspace(workspaceId);
      }
    };
  }, [enabled, workspaceId]);

  /**
   * Listen for version updates and sync if needed
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribeVersionUpdate = socketManager.on(
      'record:version_update',
      async (data) => {
        console.log('[useRealTimeSync] Version update:', data);

        // Check if cached version is stale
        if (blockCache.isStale(data.recordId, data.version)) {
          try {
            // Fetch updated record
            const records = await socketManager.syncRecordValues([data.recordId]);
            
            if (records.length > 0) {
              const record = records[0];
              // Update cache
              blockCache.set(data.recordId, record, data.version);
              console.log('[useRealTimeSync] Synced record:', data.recordId);

              // Trigger update callback
              if (onBlockUpdated) {
                onBlockUpdated(record);
              }
            }
          } catch (error) {
            console.error('[useRealTimeSync] Sync failed:', error);
          }
        }
      }
    );

    return () => {
      unsubscribeVersionUpdate();
    };
  }, [enabled, onBlockUpdated]);

  /**
   * Listen for block creation
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = socketManager.on('block:created', (data) => {
      console.log('[useRealTimeSync] Block created:', data);

      // Add to cache
      blockCache.set(data.block.id, data.block, 1);

      // Trigger callback
      if (onBlockCreated) {
        onBlockCreated(data.block);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, onBlockCreated]);

  /**
   * Listen for block updates
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = socketManager.on('block:updated', (data) => {
      console.log('[useRealTimeSync] Block updated:', data);

      // Update cache
      const currentVersion = blockCache.getVersion(data.block.id) || 0;
      blockCache.set(data.block.id, data.block, currentVersion + 1);

      // Trigger callback
      if (onBlockUpdated) {
        onBlockUpdated(data.block);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, onBlockUpdated]);

  /**
   * Listen for block deletion
   */
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = socketManager.on('block:deleted', (data) => {
      console.log('[useRealTimeSync] Block deleted:', data);

      // Invalidate cache
      blockCache.invalidate(data.blockId);

      // Trigger callback
      if (onBlockDeleted) {
        onBlockDeleted(data.blockId);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, onBlockDeleted]);

  /**
   * Create block with optimistic update (Notion-style)
   */
  const createBlockOptimistic = useCallback(
    async (blockData: {
      type: string;
      properties: any;
      parent_id?: string;
      created_by?: string;
    }): Promise<string> => {
      // Generate temporary ID
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // Add to cache immediately (optimistic)
      blockCache.set(tempId, {
        id: tempId,
        ...blockData,
        _pending: true
      }, 0);

      // Trigger callback immediately
      if (onBlockCreated) {
        onBlockCreated({
          id: tempId,
          ...blockData,
          _pending: true
        });
      }

      try {
        // Send transaction to server
        const results = await socketManager.saveTransaction({
          operations: [{
            type: 'create',
            recordId: tempId,
            recordType: 'block',
            data: {
              ...blockData,
              workspace_id: workspaceId
            }
          }],
          workspaceId
        });

        const result = results[0];

        // Replace temp ID with real ID in cache
        blockCache.invalidate(tempId);
        
        // Real block will come via WebSocket, but return ID now
        return result.recordId;

      } catch (error) {
        // Rollback on error
        blockCache.invalidate(tempId);
        
        // Trigger deletion callback to remove from UI
        if (onBlockDeleted) {
          onBlockDeleted(tempId);
        }

        throw error;
      }
    },
    [workspaceId, onBlockCreated, onBlockDeleted]
  );

  /**
   * Update block with optimistic update
   */
  const updateBlockOptimistic = useCallback(
    async (blockId: string, updates: any): Promise<void> => {
      // Get current cached version
      const cached = blockCache.getWithVersion(blockId);
      
      if (cached) {
        // Apply updates optimistically
        const optimisticBlock = { ...cached.data, ...updates };
        blockCache.set(blockId, optimisticBlock, cached.version);

        // Trigger callback immediately
        if (onBlockUpdated) {
          onBlockUpdated(optimisticBlock);
        }
      }

      try {
        // Send transaction to server
        await socketManager.saveTransaction({
          operations: [{
            type: 'update',
            recordId: blockId,
            recordType: 'block',
            data: {
              ...updates,
              version: cached?.version || 0
            }
          }],
          workspaceId
        });

        // Real update will come via WebSocket

      } catch (error) {
        // Rollback on error
        if (cached) {
          blockCache.set(blockId, cached.data, cached.version);
          if (onBlockUpdated) {
            onBlockUpdated(cached.data);
          }
        }

        throw error;
      }
    },
    [workspaceId, onBlockUpdated]
  );

  /**
   * Delete block with optimistic update
   */
  const deleteBlockOptimistic = useCallback(
    async (blockId: string): Promise<void> => {
      // Get current cached version (for rollback)
      const cached = blockCache.getWithVersion(blockId);

      // Remove from cache immediately (optimistic)
      blockCache.invalidate(blockId);

      // Trigger callback immediately
      if (onBlockDeleted) {
        onBlockDeleted(blockId);
      }

      try {
        // Send transaction to server
        await socketManager.saveTransaction({
          operations: [{
            type: 'delete',
            recordId: blockId,
            recordType: 'block'
          }],
          workspaceId
        });

        // Real deletion will come via WebSocket

      } catch (error) {
        // Rollback on error
        if (cached) {
          blockCache.set(blockId, cached.data, cached.version);
          if (onBlockCreated) {
            onBlockCreated(cached.data);
          }
        }

        throw error;
      }
    },
    [workspaceId, onBlockDeleted, onBlockCreated]
  );

  return {
    isConnected: socketManager.isConnected(),
    createBlockOptimistic,
    updateBlockOptimistic,
    deleteBlockOptimistic,
    cache: blockCache,
    stats: socketManager.getStats()
  };
}
