import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import type { Socket as NetSocket } from 'net';
import type { Server as HTTPServer } from 'http';
import { KGMCPSecurity } from '@/lib/kg-mcp-security';
import logger from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

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

// Adapt NextApiRequest to the format expected by KGMCPSecurity.auditRequest
function adaptRequestForAudit(req: NextApiRequest) {
  return {
    requestId: uuidv4(),
    endpoint: '/api/socket',
    method: req.method || 'GET',
    headers: req.headers as Record<string, any>,
    params: req.query,
    body: req.body
  };
}

/**
 * Socket.IO WebSocket endpoint for real-time monitoring
 * This follows AI Homelab Ecosystem websocket architecture standards
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Audit request using security module
  const adaptedReq = adaptRequestForAudit(req);
  const audit = await KGMCPSecurity.auditRequest(adaptedReq);
  if (!audit.allowed) {
    return res.status(403).json({ error: audit.reason || 'Access denied' });
  }

  if (!res.socket.server.io) {
    logger.info('[API] Setting up Socket.IO server');
    
    // Create new Socket.IO instance
    const io = new Server(res.socket.server as any, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
    
    // Attach Socket.IO instance to server
    res.socket.server.io = io;

    // Basic connection logging
    io.on('connection', (socket) => {
      const clientId = socket.id;
      logger.info(`[API/Socket] Client connected: ${clientId}`);
      
      socket.on('disconnect', () => {
        logger.info(`[API/Socket] Client disconnected: ${clientId}`);
      });
    });
  } else {
    logger.debug('[API] Socket.IO server already running');
  }

  // Required for Socket.IO to work with Next.js API routes
  res.end();
}
