/**
 * WebSocket Server - Notion-style MessageStore
 * Handles real-time updates and broadcasts to connected clients
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { blockService } from '../workspace/block-service';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('[SocketServer] Already initialized');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Configure properly in production
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket: Socket) => {
    console.log('[SocketServer] ✅ Client connected:', socket.id);

    // Join workspace room
    socket.on('join:workspace', ({ workspaceId }) => {
      const room = `workspace:${workspaceId}`;
      socket.join(room);
      console.log(`[SocketServer] Client ${socket.id} joined ${room}`);
    });

    // Leave workspace room
    socket.on('leave:workspace', ({ workspaceId }) => {
      const room = `workspace:${workspaceId}`;
      socket.leave(room);
      console.log(`[SocketServer] Client ${socket.id} left ${room}`);
    });

    // Handle transactions (Notion-style saveTransaction)
    socket.on('transaction:save', async (transaction, callback) => {
      try {
        console.log('[SocketServer] Processing transaction:', transaction);

        const results = [];

        for (const operation of transaction.operations) {
          let result;

          switch (operation.type) {
            case 'create':
              const created = await blockService.createBlock({
                workspace_id: transaction.workspaceId,
                type: operation.data.type,
                properties: operation.data.properties,
                parent_id: operation.data.parent_id,
                created_by: operation.data.created_by || 'system'
              });

              result = {
                success: true,
                recordId: created.id,
                version: 1,
                timestamp: Date.now()
              };

              // Broadcast to workspace
              io?.to(`workspace:${transaction.workspaceId}`).emit('block:created', {
                block: created,
                workspaceId: transaction.workspaceId
              });

              // Send version update notification
              io?.to(`workspace:${transaction.workspaceId}`).emit('record:version_update', {
                recordId: created.id,
                version: 1,
                type: 'block',
                workspaceId: transaction.workspaceId
              });

              break;

            case 'update':
              const updated = await blockService.updateBlock(operation.recordId, {
                type: operation.data.type,
                properties: operation.data.properties,
                last_edited_by: operation.data.last_edited_by || 'system'
              });

              result = {
                success: true,
                recordId: updated.id,
                version: (operation.data.version || 0) + 1,
                timestamp: Date.now()
              };

              // Broadcast update
              io?.to(`workspace:${transaction.workspaceId}`).emit('block:updated', {
                block: updated,
                workspaceId: transaction.workspaceId
              });

              // Send version update
              io?.to(`workspace:${transaction.workspaceId}`).emit('record:version_update', {
                recordId: updated.id,
                version: result.version,
                type: 'block',
                workspaceId: transaction.workspaceId
              });

              break;

            case 'delete':
              await blockService.deleteBlock(operation.recordId);

              result = {
                success: true,
                recordId: operation.recordId,
                version: -1, // Deleted
                timestamp: Date.now()
              };

              // Broadcast deletion
              io?.to(`workspace:${transaction.workspaceId}`).emit('block:deleted', {
                blockId: operation.recordId,
                workspaceId: transaction.workspaceId
              });

              break;

            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }

          results.push(result);
        }

        callback({ success: true, results });
      } catch (error: any) {
        console.error('[SocketServer] Transaction error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Handle sync requests (Notion-style syncRecordValues)
    socket.on('sync:records', async ({ recordIds }, callback) => {
      try {
        console.log('[SocketServer] Syncing records:', recordIds);

        const records = await Promise.all(
          recordIds.map(id => blockService.getBlock(id, true))
        );

        callback({
          success: true,
          records: records.filter(r => r !== null)
        });
      } catch (error: any) {
        console.error('[SocketServer] Sync error:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[SocketServer] ❌ Client disconnected:', socket.id, reason);
    });
  });

  console.log('[SocketServer] 🚀 WebSocket server initialized');
  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast block creation to workspace
 */
export function broadcastBlockCreated(workspaceId: string, block: any): void {
  if (!io) return;

  io.to(`workspace:${workspaceId}`).emit('block:created', {
    block,
    workspaceId
  });

  io.to(`workspace:${workspaceId}`).emit('record:version_update', {
    recordId: block.id,
    version: 1,
    type: 'block',
    workspaceId
  });
}

/**
 * Broadcast block update to workspace
 */
export function broadcastBlockUpdated(workspaceId: string, block: any, version: number): void {
  if (!io) return;

  io.to(`workspace:${workspaceId}`).emit('block:updated', {
    block,
    workspaceId
  });

  io.to(`workspace:${workspaceId}`).emit('record:version_update', {
    recordId: block.id,
    version,
    type: 'block',
    workspaceId
  });
}

/**
 * Broadcast block deletion to workspace
 */
export function broadcastBlockDeleted(workspaceId: string, blockId: string): void {
  if (!io) return;

  io.to(`workspace:${workspaceId}`).emit('block:deleted', {
    blockId,
    workspaceId
  });
}
