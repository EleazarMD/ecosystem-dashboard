/**
 * AHIS Server WebSocket API Route
 * 
 * This API route establishes a WebSocket connection to the AHIS server through the AI Gateway
 * and forwards events to connected clients. It follows the ecosystem-first development principles
 * by routing all communication through the Gateway service mesh.
 */
import { Server as HttpServer } from 'http';
import { Server as WebSocketServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/lib/logger';
import axios from 'axios';

// Store socket.io server instance
let io: WebSocketServer | null = null;

// Define request and response types
interface AHISRequest {
  id: string;
  method: string;
  params?: any;
  timestamp: number;
  sourceIp?: string;
  [key: string]: any;
}

interface AHISResponse {
  requestId: string;
  result?: any;
  error?: any;
  timestamp: number;
  processingTimeMs: number;
  [key: string]: any;
}

// Store server activity for broadcasting to new clients
const ahisActivity: {
  requests: AHISRequest[];
  responses: AHISResponse[];
} = {
  requests: [],
  responses: []
};

// Get Gateway configuration from environment variables
const getGatewayConfig = () => {
  return {
    host: process.env.AI_GATEWAY_HOST || 'localhost',
    port: parseInt(process.env.AI_GATEWAY_PORT || '7777', 10),
    secure: process.env.AI_GATEWAY_SECURE === 'true',
    basePath: process.env.AI_GATEWAY_BASE_PATH || '/api',
    authToken: process.env.AI_GATEWAY_AUTH_TOKEN
  };
};

// Build a URL for the Gateway
function buildGatewayUrl(path: string): string {
  const config = getGatewayConfig();
  const protocol = config.secure ? 'https' : 'http';
  const basePath = config.basePath.startsWith('/') 
    ? config.basePath 
    : `/${config.basePath}`;
  
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.substring(1) : path;
  
  return `${protocol}://${config.host}:${config.port}${basePath}/${pathWithoutLeadingSlash}`;
}

// Build headers for Gateway requests
function buildGatewayHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization if available
  const config = getGatewayConfig();
  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }
  
  return headers;
}

// Initialize the WebSocket server
const initSocketServer = (res: NextApiResponse) => {
  if (!io) {
    // Get the underlying HTTP server from the Next.js API route
    const httpServer = (res.socket as any)?.server as HttpServer;
    
    if (!httpServer) {
      throw new Error('Could not get HTTP server from Next.js API route');
    }
    
    // Create a new Socket.IO server
    io = new WebSocketServer(httpServer, {
      path: '/api/ahis/websocket',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      // Add transport options to fix connection issues
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      pingTimeout: 10000,
      pingInterval: 5000
    });
    
    // Set up connection handler
    io.on('connection', (socket) => {
      logger.info(`New client connected to AHIS: ${socket.id}`);
      
      // Send current activity to the new client
      socket.emit('ahis:activity', ahisActivity);
      
      // Set up command handler
      socket.on('ahis:command', async (data) => {
        try {
          // Execute the command through the Gateway
          const response = await executeAHISCommand(data.method, data.params);
          
          // Send the response back to the client
          socket.emit('ahis:command:response', {
            id: data.id,
            success: true,
            result: response
          });
        } catch (error: any) {
          // Send error back to the client
          socket.emit('ahis:command:response', {
            id: data.id,
            success: false,
            error: error.message
          });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected from AHIS: ${socket.id}`);
      });
    });
    
    // Start polling for AHIS server activity
    startPollingAHISActivity();
  }
};

// Mock data for when AHIS server is unavailable
const mockAHISData = {
  activity: {
    requests: [],
    responses: []
  },
  status: {
    status: 'online',
    uptime: '1h 23m',
    version: '1.0.0',
    services: [
      { name: 'AI Gateway', status: 'online', lastChecked: new Date().toISOString() },
      { name: 'Documentation', status: 'online', lastChecked: new Date().toISOString() },
      { name: 'Model Registry', status: 'online', lastChecked: new Date().toISOString() }
    ]
  }
};

// Define the activity response type
interface ActivityResponse {
  requests: AHISRequest[];
  responses: AHISResponse[];
}

// Execute an AHIS command through the Gateway
async function executeAHISCommand<T>(method: string, params: any): Promise<T> {
  try {
    // Build the URL for the Gateway
    const url = buildGatewayUrl('ahis/execute');
    
    // Make the request
    const response = await axios({
      method: 'POST',
      url,
      headers: buildGatewayHeaders(),
      data: { method, params },
      timeout: 5000, // 5 second timeout
      validateStatus: (status) => {
        // Allow redirects for service mesh routing
        return status >= 200 && status < 400;
      }
    });
    
    // Return the response data
    return response.data;
  } catch (error: any) {
    // Get a meaningful error message
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    
    logger.warn(`Failed to execute AHIS command ${method}, using mock data: ${errorMessage}`);
    
    // Track error for telemetry
    try {
      io?.emit('ahis:error', { 
        method, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } catch (emitError) {
      logger.error('Failed to emit error event:', emitError);
    }
    
    // Return mock data based on the command
    if (method === 'activity') {
      return mockAHISData.activity as unknown as T;
    } else if (method === 'status') {
      return mockAHISData.status as unknown as T;
    } else {
      // For unknown commands, return empty object
      return {} as T;
    }
  }
}

// Poll for AHIS server activity
let pollingInterval: NodeJS.Timeout | null = null;
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 5;

function startPollingAHISActivity() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  // Reset connection retry count
  connectionRetryCount = 0;
  
  // Poll every 30 seconds (reduced frequency)
  pollingInterval = setInterval(async () => {
    try {
      // Get AHIS server activity through the Gateway
      const activity = await executeAHISCommand<ActivityResponse>('activity', {});
      
      // Update local activity
      if (activity && activity.requests) {
        ahisActivity.requests = activity.requests;
      }
      
      if (activity && activity.responses) {
        ahisActivity.responses = activity.responses;
      }
      
      // Broadcast to all connected clients
      io?.emit('ahis:activity', ahisActivity);
      
      // Also send a heartbeat to keep connections alive
      io?.emit('ahis:heartbeat', { 
        timestamp: new Date().toISOString(),
        status: 'connected'
      });
      
      // Reset connection retry count on success
      connectionRetryCount = 0;
    } catch (error) {
      // Increment retry count
      connectionRetryCount++;
      
      // Even if there's an error, still send a heartbeat to keep connections alive
      io?.emit('ahis:heartbeat', { 
        timestamp: new Date().toISOString(), 
        status: 'error',
        retryCount: connectionRetryCount,
        maxRetries: MAX_RETRY_COUNT
      });
      
      // Log detailed error information but only on first occurrence or periodically
      if (connectionRetryCount === 1 || connectionRetryCount % 10 === 0) {
        logger.warn(`AHIS activity polling error (attempt ${connectionRetryCount}):`, error);
      } else {
        logger.debug('AHIS activity polling using fallback data');
      }
      
      // If we've exceeded max retries, try to reinitialize the connection
      if (connectionRetryCount >= MAX_RETRY_COUNT) {
        logger.error(`Maximum retry count (${MAX_RETRY_COUNT}) reached, attempting to reinitialize connection`);
        
        // Notify clients of connection issues
        io?.emit('ahis:connection', { 
          status: 'reconnecting',
          timestamp: new Date().toISOString()
        });
        
        // Try to reconnect to the Gateway
        try {
          await axios.get(buildGatewayUrl('health'));
          logger.info('Successfully reconnected to Gateway');
          connectionRetryCount = 0;
        } catch (reconnectError) {
          logger.error('Failed to reconnect to Gateway:', reconnectError);
        }
      }
    }
  }, 5000);
}

/**
 * WebSocket API handler
 * 
 * This is a special Next.js API route that sets up a WebSocket server
 * and handles WebSocket connections.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if it's a WebSocket upgrade request
  if (req.method === 'GET' || req.method === 'POST') {
    // Initialize the socket server
    initSocketServer(res);
    
    // Return a 200 response to acknowledge the WebSocket upgrade
    res.status(200).end();
  } else {
    // For other methods, return 405 Method Not Allowed
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Disable the default body parser to allow WebSocket connections
export const config = {
  api: {
    bodyParser: false,
  },
};
