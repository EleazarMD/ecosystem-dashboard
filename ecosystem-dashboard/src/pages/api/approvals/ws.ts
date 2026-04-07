/**
 * Approvals WebSocket Server
 * 
 * Real-time approval updates for iOS Hyperspace client and dashboard.
 * Uses Socket.IO for reliable WebSocket communication.
 * 
 * @module approvals/ws
 * @implements AI Homelab Ecosystem Communication Standards v2.5
 */

import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { Socket as NetSocket } from 'net';
import type { Server as HTTPServer } from 'http';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

import type { NextApiResponse } from 'next';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

// Track connected clients by user
interface ClientConnection {
  socketId: string;
  userId: string;
  connectedAt: string;
  deviceType: 'ios' | 'dashboard' | 'web';
}

const connections: ClientConnection[] = [];

/**
 * Approvals WebSocket endpoint for real-time approval notifications
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Authenticate via session or API key
  const session = await getServerSession(req, res, authOptions);
  const userId = getMobileOrSessionUserId(session?.user?.id, req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!res.socket.server.io) {
    console.log('[Approvals-WS] Initializing Approvals WebSocket server');
    
    // Create Socket.IO instance with approvals namespace
    const io = new Server(res.socket.server as any, {
      path: '/api/approvals/ws',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'development' ? '*' : undefined,
        methods: ['GET', 'POST']
      }
    });
    
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      const clientId = socket.id;
      const authUserId = socket.handshake.auth?.userId || socket.handshake.query?.user_id || userId;
      const deviceType = socket.handshake.auth?.deviceType || 
                         (socket.handshake.headers['x-client']?.includes('iOS') ? 'ios' : 'web');
      
      console.log(`[Approvals-WS] Client connected: ${clientId} (user: ${authUserId}, device: ${deviceType})`);
      
      // Register connection
      connections.push({
        socketId: clientId,
        userId: authUserId,
        connectedAt: new Date().toISOString(),
        deviceType: deviceType as 'ios' | 'dashboard' | 'web'
      });
      
      // Join user's approval room
      socket.join(`user:${authUserId}`);
      
      // Send welcome with pending approval count
      sendWelcomeData(socket, authUserId);
      
      // Handle approval actions
      socket.on('approval:approve', async ({ approvalId }) => {
        try {
          const result = await approveApproval(approvalId, authUserId, deviceType);
          socket.emit('approval:approved', result);
          
          // Broadcast to all user's devices
          io.to(`user:${authUserId}`).emit('approval:updated', {
            approvalId,
            status: 'approved',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          socket.emit('approval:error', { 
            approvalId, 
            error: (error as Error).message 
          });
        }
      });
      
      socket.on('approval:reject', async ({ approvalId, reason }) => {
        try {
          const result = await rejectApproval(approvalId, authUserId, reason, deviceType);
          socket.emit('approval:rejected', result);
          
          // Broadcast to all user's devices
          io.to(`user:${authUserId}`).emit('approval:updated', {
            approvalId,
            status: 'rejected',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          socket.emit('approval:error', { 
            approvalId, 
            error: (error as Error).message 
          });
        }
      });
      
      // Handle refresh request
      socket.on('approval:refresh', async () => {
        await sendWelcomeData(socket, authUserId);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        const index = connections.findIndex(c => c.socketId === clientId);
        if (index >= 0) {
          connections.splice(index, 1);
        }
        console.log(`[Approvals-WS] Client disconnected: ${clientId}`);
      });
    });
  }

  res.end();
}

/**
 * Send welcome data with pending approvals
 */
async function sendWelcomeData(socket: any, userId: string) {
  try {
    const result = await pool.query(`
      SELECT id, action_type, status, priority, title, summary, 
             agent_name, risk_level, created_at, expires_at
      FROM approval_requests
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END,
        created_at DESC
      LIMIT 50
    `, [userId]);
    
    socket.emit('approval:welcome', {
      pendingCount: result.rows.length,
      approvals: result.rows,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Approvals-WS] Error fetching approvals:', error);
    socket.emit('approval:error', { error: 'Failed to fetch approvals' });
  }
}

/**
 * Approve an approval (imported from ApprovalService pattern)
 */
async function approveApproval(approvalId: string, reviewerId: string, device?: string) {
  const reviewedAt = new Date().toISOString();
  
  const result = await pool.query(`
    UPDATE approval_requests 
    SET status = 'approved', reviewed_at = $1, reviewed_by = $2, review_device = $3
    WHERE id = $4 AND status = 'pending'
    RETURNING *
  `, [reviewedAt, reviewerId, device, approvalId]);
  
  if (result.rows.length === 0) {
    throw new Error('Approval not found or already processed');
  }
  
  return result.rows[0];
}

/**
 * Reject an approval
 */
async function rejectApproval(approvalId: string, reviewerId: string, reason?: string, device?: string) {
  const reviewedAt = new Date().toISOString();
  
  const result = await pool.query(`
    UPDATE approval_requests 
    SET status = 'rejected', reviewed_at = $1, reviewed_by = $2, review_device = $3, rejection_reason = $4
    WHERE id = $5 AND status = 'pending'
    RETURNING *
  `, [reviewedAt, reviewerId, device, reason, approvalId]);
  
  if (result.rows.length === 0) {
    throw new Error('Approval not found or already processed');
  }
  
  return result.rows[0];
}

/**
 * Broadcast approval event to user's connected devices
 * Called by ApprovalService when new approval is created
 */
export function broadcastNewApproval(userId: string, approval: any) {
  // This would be called from ApprovalService emitEvent handler
  // Requires io instance to be accessible
  console.log(`[Approvals-WS] Broadcasting new approval to user ${userId}`);
}

/**
 * Broadcast approval status update
 */
export function broadcastApprovalUpdate(userId: string, approvalId: string, status: string) {
  console.log(`[Approvals-WS] Broadcasting approval update: ${approvalId} -> ${status}`);
}
