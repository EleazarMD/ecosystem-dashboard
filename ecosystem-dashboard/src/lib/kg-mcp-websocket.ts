/**
 * Knowledge Graph MCP WebSocket Module
 * 
 * This module provides real-time monitoring updates for the Knowledge Graph MCP client.
 * It sets up WebSocket communication between the server and clients for live metrics streaming.
 * 
 * @module kg-mcp-websocket
 * @implements AI Homelab Ecosystem WebSocket Standards v2.0
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { NextApiResponse } from 'next';
import logger from './logger';
import kgMCPMonitoring from './kg-mcp-monitoring';

// Singleton instance for the SocketIO server
let io: SocketIOServer | null = null;

/**
 * Initialize the WebSocket server
 * @param server HTTP server to attach the WebSocket server to
 */
export function initializeWebSocketServer(server: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server);

  io.on('connection', (socket) => {
    const clientId = socket.id;
    logger.info(`[KG-MCP-WS] Client connected: ${clientId}`);

    // Set up subscription to Knowledge Graph monitoring updates
    socket.on('subscribe:kg-metrics', () => {
      logger.info(`[KG-MCP-WS] Client ${clientId} subscribed to KG metrics`);
      socket.join('kg-metrics-subscribers');
      
      // Send initial metrics immediately upon subscription
      const initialMetrics = kgMCPMonitoring.getMetrics();
      socket.emit('kg-metrics-update', initialMetrics);
    });

    socket.on('unsubscribe:kg-metrics', () => {
      logger.info(`[KG-MCP-WS] Client ${clientId} unsubscribed from KG metrics`);
      socket.leave('kg-metrics-subscribers');
    });

    socket.on('disconnect', () => {
      logger.info(`[KG-MCP-WS] Client disconnected: ${clientId}`);
    });
  });

  // Set up periodic broadcast of Knowledge Graph metrics
  setInterval(() => {
    if (io && io.sockets.adapter.rooms.has('kg-metrics-subscribers')) {
      const metrics = kgMCPMonitoring.getMetrics();
      io.to('kg-metrics-subscribers').emit('kg-metrics-update', metrics);
    }
  }, 5000); // Send updates every 5 seconds

  logger.info('[KG-MCP-WS] WebSocket server initialized');
  return io;
}

/**
 * Get the WebSocket server instance
 * @returns The Socket.IO server instance
 */
export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast Knowledge Graph metrics to all subscribed clients
 * @param metrics The metrics to broadcast
 */
export function broadcastKGMetrics(metrics: any): void {
  if (io) {
    io.to('kg-metrics-subscribers').emit('kg-metrics-update', metrics);
    logger.debug('[KG-MCP-WS] Broadcasted KG metrics update');
  }
}

/**
 * Send a system alert to all clients
 * @param alert The alert to send
 */
export function broadcastSystemAlert(alert: {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
}): void {
  if (io) {
    io.emit('system-alert', alert);
    logger.info('[KG-MCP-WS] Broadcasted system alert', alert);
  }
}

export default {
  initializeWebSocketServer,
  getWebSocketServer,
  broadcastKGMetrics,
  broadcastSystemAlert
};
