/**
 * AI Homelab Ecosystem - AHIS Service for Dashboard
 * 
 * This service provides a standardized integration with the AHIS server
 * using the official AHIS Client SDK for proper service registration
 * and real-time communication.
 */

import { getBrowserAHISClient, BrowserAHISClient } from './browser-ahis-client';

// Re-export necessary types
export type { AHISRequestData, AHISResponseData } from './browser-ahis-client';

// Use console for logging in the browser environment
const logger = console;

let ahisClientInstance: BrowserAHISClient | null = null;
let clientPromise: Promise<BrowserAHISClient> | null = null;

/**
 * Get environment variables for AHIS server configuration.
 */
const getAHISConfig = () => {
  // Get configuration from environment variables
  const host = process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost';
  const port = process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || 8888;
  const secure = process.env.NEXT_PUBLIC_AHIS_SERVER_SECURE === 'true';
  const authToken = process.env.NEXT_PUBLIC_AHIS_AUTH_TOKEN;
  const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  
  return {
    host,
    port,
    secure,
    authToken,
    logLevel,
  };
};

/**
 * Retrieves a singleton instance of the AHIS Client using the official SDK.
 * Automatically handles registration and connection management.
 */
export async function getAHISClient(): Promise<BrowserAHISClient> {
  if (typeof window === 'undefined') {
    logger.error('AHIS client cannot be used in server-side rendering context.');
    throw new Error('AHIS client cannot be used in server-side rendering context');
  }

  if (ahisClientInstance) {
    return ahisClientInstance;
  }

  // If initialization is already in progress, return the existing promise
  if (clientPromise) {
    return clientPromise;
  }

  // Create a new AHIS client instance using the SDK
  clientPromise = Promise.resolve().then(() => {
    logger.info('Initializing AHIS client using official SDK...');

    // Get the singleton instance - already configured with dashboard info
    ahisClientInstance = getBrowserAHISClient();
    
    // Setup enhanced event listeners for dashboard-specific events
    ahisClientInstance.subscribeToEvents('ahis:connected', () => {
      logger.info('✅ AHIS Client Connected');
    });
    
    ahisClientInstance.subscribeToEvents('ahis:disconnect', () => {
      logger.warn('⚠️ AHIS Client Disconnected');
    });
    
    ahisClientInstance.subscribeToEvents('ahis:error', (error: Error) => {
      logger.error('❌ AHIS Client Error:', error);
    });

    ahisClientInstance.subscribeToEvents('ahis:registered', (response) => {
      logger.info('📝 Dashboard registered with AHIS:', response);
    });

    ahisClientInstance.subscribeToEvents('ahis:websocket:connected', () => {
      logger.info('🔌 AHIS WebSocket connected');
    });

    ahisClientInstance.subscribeToEvents('ahis:websocket:disconnected', () => {
      logger.warn('🔌 AHIS WebSocket disconnected');
    });

    logger.info('AHIS client initialized successfully with SDK');
    clientPromise = null; // Clear the promise once resolved
    return ahisClientInstance;
  }).catch(error => {
    logger.error('Failed to initialize AHIS Client:', error);
    clientPromise = null; // Clear promise on failure
    throw error; // Re-throw the error
  });

  return clientPromise;
}

/**
 * Initialize the AHIS client connection and register the dashboard
 * This should be called early in the application lifecycle
 */
export async function initializeAHISConnection(): Promise<boolean> {
  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Add timeout to prevent hanging on server unavailability
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('AHIS connection timeout')), 10000); // 10 second timeout
    });
    
    const connectionPromise = (async (): Promise<boolean> => {
      try {
        // Skip client creation during initialization to prevent hanging
        // Client will be created on-demand by the UI
        console.log('✅ AI Homelab: AHIS initialization completed (client creation deferred)');
        return true;
      } catch (error) {
        console.error('❌ AI Homelab: AHIS initialization failed:', error);
        return false;
      }
    })();
    
    // Race between connection and timeout
    return await Promise.race([connectionPromise, timeoutPromise]);
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timeout');
    if (isTimeout) {
      console.log('⏱️ AI Homelab: AHIS connection timed out - server may be unavailable');
    } else {
      console.error('❌ AI Homelab: Failed to connect to AHIS server:', error);
    }
    return false;
  }
}

/**
 * Track a dashboard activity with the AHIS system
 */
export async function trackDashboardActivity(activity: {
  taskId: string;
  action: string;
  details?: Record<string, any>;
}): Promise<void> {
  // Only track in browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const client = await getAHISClient();
    
    // Send activity tracking message via WebSocket
    client.sendMessage({
      type: 'activity_tracking',
      data: {
        serviceId: 'ecosystem-dashboard',
        taskId: activity.taskId,
        action: activity.action,
        details: activity.details || {},
        timestamp: new Date().toISOString()
      }
    });
    
    // Also update service status
    await client.updateStatus({
      status: 'healthy',
      metadata: {
        lastActivity: activity.action,
        lastActivityTime: new Date().toISOString()
      }
    });
    
    console.log(`✅ AI Homelab: Tracked dashboard activity: ${activity.action}`);
  } catch (error) {
    console.error('❌ AI Homelab: Failed to track dashboard activity:', error);
  }
}

/**
 * Execute an AHIS command
 */
export async function executeAHISCommand<T = any>(
  method: string,
  params: any
): Promise<T> {
  // Only execute in browser environment
  if (typeof window === 'undefined') {
    throw new Error('AHIS commands cannot be executed in server-side rendering context');
  }
  
  const client = await getAHISClient();
  
  // Execute the command
  return client.executeCommand(method, params) as Promise<T>;
}

// For backward compatibility with code that still uses MCP terminology
export const getMCPClient = getAHISClient;
export const initializeMCPConnection = initializeAHISConnection;
export const executeMCPCommand = executeAHISCommand;
export const MCPClient = BrowserAHISClient;
export type MCPClientConfig = any;
export type MCPEventType = string;
export type Notification = any;
export type NotificationSeverity = string;
export type MCPRequestData = any;
export type MCPResponseData = any;

// Export the client instance and types
export default getAHISClient;
