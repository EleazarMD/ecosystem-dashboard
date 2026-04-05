/**
 * AI Homelab Ecosystem WebSocket Server
 * 
 * This implements the standard AI Homelab Ecosystem WebSocket server protocol
 * for real-time communication between ecosystem components.
 * 
 * @module ecosystem-ws
 * @implements AI Homelab Ecosystem Communication Standards v2.5
 */

import { Server } from 'socket.io';
import type { NextApiRequest } from 'next';
import type { Socket as NetSocket } from 'net';
import type { Server as HTTPServer } from 'http';
import { KGMCPSecurity } from '@/lib/kg-mcp-security';
import kgMCPMonitoring from '@/lib/kg-mcp-monitoring';
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

// Keep track of subscriptions by channel
interface Subscription {
  id: string;
  socketId: string;
  channel: string;
  timestamp: string;
}

const subscriptions: Subscription[] = [];

// Adapt NextApiRequest to the format expected by KGMCPSecurity.auditRequest
function adaptRequestForAudit(req: NextApiRequest) {
  return {
    requestId: uuidv4(),
    endpoint: '/api/ecosystem-ws',
    method: req.method || 'GET',
    headers: req.headers as Record<string, any>,
    params: req.query,
    body: req.body
  };
}

/**
 * Socket.IO WebSocket endpoint for AI Homelab Ecosystem real-time communication
 * This follows the standardized AI Homelab Ecosystem communication protocol
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
    logger.info('[API/Ecosystem-WS] Initializing AI Homelab Ecosystem WebSocket server');
    
    // Create new Socket.IO instance with the ecosystem namespace
    const io = new Server(res.socket.server as any, {
      path: '/api/ecosystem-ws',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'development' ? '*' : undefined,
        methods: ['GET', 'POST']
      }
    });
    
    // Attach Socket.IO instance to server
    res.socket.server.io = io;

    // Set up the ecosystem protocol handlers
    io.on('connection', (socket) => {
      const clientId = socket.id;
      const serviceId = socket.handshake.auth?.serviceId || `anonymous-${clientId.substring(0, 8)}`;
      const serviceType = socket.handshake.auth?.serviceType || 'unknown';
      
      logger.info(`[Ecosystem-WS] Client connected: ${clientId}`, { serviceId, serviceType });
      
      // Send welcome message
      socket.emit('ecosystem:welcome', {
        serverTime: new Date().toISOString(),
        serviceId: 'ecosystem-dashboard-ws',
        protocolVersion: '2.5',
        features: ['kg-monitoring', 'real-time-metrics']
      });
      
      // Set up subscription handler
      socket.on('ecosystem:subscribe', ({ channel, subscriptionId }) => {
        if (!channel) {
          socket.emit('ecosystem:error', { message: 'Channel name required for subscription' });
          return;
        }
        
        const subscription: Subscription = {
          id: subscriptionId || uuidv4(),
          socketId: clientId,
          channel,
          timestamp: new Date().toISOString()
        };
        
        subscriptions.push(subscription);
        socket.join(`channel:${channel}`);
        
        logger.info(`[Ecosystem-WS] Client ${serviceId} subscribed to channel: ${channel}`, 
          { subscriptionId: subscription.id });
        
        // Send confirmation
        socket.emit('ecosystem:subscribed', { 
          channel, 
          subscriptionId: subscription.id 
        });
        
        // If this is the KG metrics channel, send initial data
        if (channel === 'kg-metrics') {
          const metrics = kgMCPMonitoring.getMetrics();
          socket.emit('ecosystem:message:kg-metrics', {
            type: 'data',
            payload: metrics,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            source: 'ecosystem-dashboard-ws'
          });
        }
      });
      
      // Handle unsubscribe
      socket.on('ecosystem:unsubscribe', ({ subscriptionId }) => {
        const index = subscriptions.findIndex(sub => 
          sub.id === subscriptionId && sub.socketId === clientId);
        
        if (index >= 0) {
          const subscription = subscriptions[index];
          socket.leave(`channel:${subscription.channel}`);
          subscriptions.splice(index, 1);
          
          logger.info(`[Ecosystem-WS] Client ${serviceId} unsubscribed from channel: ${subscription.channel}`,
            { subscriptionId });
            
          socket.emit('ecosystem:unsubscribed', { 
            subscriptionId,
            channel: subscription.channel
          });
        }
      });
      
      // Handle publish
      socket.on('ecosystem:publish', ({ channel, message }) => {
        if (!channel || !message) {
          socket.emit('ecosystem:error', { message: 'Channel and message required for publishing' });
          return;
        }
        
        // Add server timestamp
        message.serverTimestamp = new Date().toISOString();
        
        // Broadcast to all subscribers
        io.to(`channel:${channel}`).emit(`ecosystem:message:${channel}`, message);
        
        logger.debug(`[Ecosystem-WS] Message published to channel: ${channel}`, 
          { messageId: message.id, source: message.source });
      });
      
      // Handle discovery protocol
      socket.on('ecosystem:discovery:response', (data) => {
        logger.info(`[Ecosystem-WS] Service discovery response from ${data.serviceId}`, data);
      });
      
      // Handle heartbeat protocol
      socket.on('ecosystem:heartbeat:response', (data) => {
        logger.debug(`[Ecosystem-WS] Heartbeat from ${data.serviceId}`);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        // Remove all subscriptions for this socket
        const clientSubs = subscriptions.filter(sub => sub.socketId === clientId);
        clientSubs.forEach(sub => {
          const index = subscriptions.findIndex(s => s.id === sub.id);
          if (index >= 0) {
            subscriptions.splice(index, 1);
          }
        });
        
        logger.info(`[Ecosystem-WS] Client disconnected: ${serviceId}`);
      });
    });
    
    // Set up periodic broadcasting with cleanup and memory management
    let metricsInterval: NodeJS.Timeout | null = null;
    let discoveryInterval: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    const startIntervals = () => {
      // Only start intervals if we have active connections
      if (io.engine.clientsCount > 0) {
        if (!metricsInterval) {
          metricsInterval = setInterval(() => {
            if (io.engine.clientsCount === 0) {
              clearIntervals();
              return;
            }
            
            const metrics = kgMCPMonitoring.getMetrics();
            io.emit('ecosystem:kg-metrics', {
              timestamp: new Date().toISOString(),
              metrics,
              connections: io.engine.clientsCount,
              uptime: process.uptime(),
              memory: process.memoryUsage()
            });
          }, 10000); // Reduced to every 10 seconds
        }
        
        if (!discoveryInterval) {
          discoveryInterval = setInterval(() => {
            if (io.engine.clientsCount === 0) {
              clearIntervals();
              return;
            }
            io.emit('ecosystem:discovery', {
              serverTime: new Date().toISOString()
            });
          }, 120000); // Reduced frequency to every 2 minutes
        }
        
        if (!heartbeatInterval) {
          heartbeatInterval = setInterval(() => {
            if (io.engine.clientsCount === 0) {
              clearIntervals();
              return;
            }
            io.emit('ecosystem:heartbeat');
          }, 60000); // Reduced to every 1 minute
        }
      }
    };
    
    const clearIntervals = () => {
      if (metricsInterval) {
        clearInterval(metricsInterval);
        metricsInterval = null;
      }
      if (discoveryInterval) {
        clearInterval(discoveryInterval);
        discoveryInterval = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
    
    // Start intervals when first client connects
    io.on('connection', () => {
      startIntervals();
    });
    
    // Clean up when server shuts down
    process.on('SIGTERM', clearIntervals);
    process.on('SIGINT', clearIntervals);
  }

  // Required for Socket.IO to work with Next.js API routes
  res.end();
}
