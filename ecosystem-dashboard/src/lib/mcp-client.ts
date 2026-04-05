/**
 * MCP Client for ecosystem dashboard
 *
 * Refactored to route all MCP traffic through the AI Gateway service mesh
 * via the MCP Gateway Adapter (`src/lib/mcp-gateway-adapter.ts`).
 *
 * Removes direct localhost:8888 (AHIS) usage while preserving the local
 * UI event system for dashboard components.
 */

// Service info used for registration-style commands
interface ServiceInfo {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string;
}

import {
  executeMCPCommand,
  connectMCP,
  disconnectMCP,
  initializeMCPSDK as initializeMCPAdapter,
} from './mcp-sdk-adapter';

// Local event handling for UI updates within the dashboard
const localEventListeners: Record<string, Array<(data: any) => void>> = {};

function dispatchLocalEvent(eventType: string, data: any): void {
  if (localEventListeners[eventType]) {
    localEventListeners[eventType].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        // Assuming 'logger' is available in this scope
        if (typeof logger !== 'undefined' && logger.error) {
            logger.error(`Error in local event handler for '${eventType}':`, error);
        } else {
            console.error(`Error in local event handler for '${eventType}':`, error);
        }
      }
    });
  }
}

// Configure logging
const logger = console;

// Service information
const serviceInfo = {
  id: 'ahis-dashboard',
  name: 'ahis-dashboard',
  type: 'application',
  version: '1.0.0',
  description: 'AHIS Dashboard - AI Homelab Ecosystem Component',
};

// Define a custom error class for JSON-RPC errors
class JsonRpcError extends Error {
  code: number;
  data?: any;
  
  constructor(message: string, code: number = -32603, data?: any) {
    super(message);
    this.name = 'JsonRpcError';
    this.code = code;
    this.data = data;
  }
}

// Simple connection state for adapter-based flow
let gatewayConnected = false;

// (helper functions removed; adapter handles URL and headers)

/**
 * Execute a command via the AI Gateway MCP adapter.
 */
async function executeCommand<T = any>(
  commandName: string, 
  params?: Record<string, any>,
  timeout?: number
): Promise<T> {
  try {
    logger.debug(`Executing MCP command via SDK: '${commandName}'`, { params, timeout });
    const result = await executeMCPCommand<T>(commandName, params || {});
    return result;
  } catch (error) {
    logger.error(`Error executing MCP command '${commandName}' via SDK:`, error);
    throw error;
  }
}

/**
 * Connect via AI Gateway MCP adapter
 */
async function connect(): Promise<void> {
  try {
    logger.info('Connecting to MCP via AI Gateway...');
    await connectMCP();
    gatewayConnected = true;
    logger.info('Successfully connected to MCP via Gateway.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during Gateway MCP connection';
    logger.error('Failed to connect to MCP via Gateway:', errorMessage);
  }
}

/**
 * Initialize the MCP adapter.
 */
async function initialize(info?: Partial<ServiceInfo>): Promise<void> {
  if (info) {
    Object.assign(serviceInfo, info);
  }
  await initializeMCPAdapter();
  logger.info('MCP adapter initialized with service info:', serviceInfo);
}

/**
 * Disconnect from the MCP adapter
 */
async function disconnect(): Promise<void> {
  try {
    logger.info('Disconnecting from MCP via Gateway...');
    await disconnectMCP();
    gatewayConnected = false;
    logger.info('Disconnected from MCP via Gateway.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during Gateway MCP disconnection';
    logger.error('Error during Gateway MCP disconnect call:', errorMessage);
  }
}

/**
 * Check if the AHIS client is connected to the server.
 */
function isConnected(): boolean {
  return gatewayConnected;
}

/**
 * Track progress with AIHDS integration
 */
async function trackProgress(
  projectId: string,
  taskId: string,
  percentage: number,
  status: string,
  message: string | null = null,
  metadata: Record<string, any> | null = null
): Promise<void> {
  // Validate inputs
  if (!projectId || !taskId) {
    throw new Error('projectId and taskId are required');
  }

  // Validate percentage range
  if (percentage < 0 || percentage > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  
  // Validate status
  const validStatuses = ['not_started', 'in_progress', 'completed', 'failed', 'blocked'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  try {
    logger.info(`Tracking progress for project ${projectId}, task ${taskId}: ${percentage}% [${status}]`);
    return await executeMCPCommand('track_progress', { projectId, taskId, percentage, status, message, metadata });
  } catch (error) {
    logger.error('Failed to track progress:', error);
    
    // Emit error event for UI notification
    dispatchLocalEvent('error', {
      source: 'progress_tracker',
      message: error instanceof Error ? error.message : 'Unknown error tracking progress',
      details: {
        projectId,
        taskId,
        percentage,
        status
      }
    });
    
    throw error;
  }
}

/**
 * Send notification
 */
async function sendNotification(
  notificationType: string,
  title: string,
  message: string,
  metadata: Record<string, any> | null = null
): Promise<void> {
  try {
    // Ensure connected
    if (!isConnected()) {
      await connect();
    }
    
    // Add timestamp if not provided
    if (!metadata) {
      metadata = {};
    }
    if (!metadata.timestamp) {
      metadata.timestamp = new Date().toISOString();
    }
    
    // Add service info
    metadata.serviceInfo = serviceInfo;
    
    // Execute sendNotification command
    await executeCommand('sendNotification', {
      type: notificationType,
      title,
      message,
      metadata
    });
    
    logger.info(`Notification sent: ${notificationType} - ${title}`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }
}

/**
 * Update documentation
 */
async function updateDocumentation(
  projectId: string,
  docType: string,
  docPath: string,
  changeDescription: string,
  metadata: Record<string, any> | null = null
): Promise<void> {
  // Validate inputs
  if (!projectId || !docPath) {
    throw new Error('projectId and docPath are required');
  }

  // Validate docType
  const validDocTypes = ['technical', 'api', 'architecture', 'user', 'progress', 'strategic'];
  if (!validDocTypes.includes(docType)) {
    throw new Error(`Invalid docType: ${docType}. Must be one of: ${validDocTypes.join(', ')}`);
  }
  
  try {
    logger.info(`Updating documentation for project ${projectId}, type ${docType}: ${docPath}`);
    return await executeMCPCommand('update_document', { projectId, docType, docPath, changeDescription, metadata });
  } catch (error) {
    logger.error('Failed to update documentation:', error);
    
    // Emit error event for UI notification
    dispatchLocalEvent('error', {
      source: 'documentation_finder',
      message: error instanceof Error ? error.message : 'Unknown error updating documentation',
      details: {
        projectId,
        docType,
        docPath
      }
    });
    
    throw error;
  }
}

/**
 * Register with AIHDS
 */
async function registerWithAIHDS(): Promise<void> {
  try {
    // Execute registerWithAIHDS command via Gateway
    await executeMCPCommand('registerWithAIHDS', {
      serviceId: serviceInfo.id,
      serviceName: serviceInfo.name,
      serviceType: serviceInfo.type,
      serviceVersion: serviceInfo.version,
      timestamp: new Date().toISOString(),
    });
    
    logger.info('Registered with AIHDS');
  } catch (error) {
    logger.error('Failed to register with AIHDS:', error);
  }
}

/**
 * Register service with MCP server
 */
async function registerService(): Promise<void> {
  try {
    // Execute registerService command via Gateway
    return await executeMCPCommand('search_documents', { query: serviceInfo.name, options: {} });
    
    logger.info(`Service registered: ${serviceInfo.name} (${serviceInfo.type})`);
  } catch (error) {
    logger.error('Failed to register service:', error);
  }
}

/**
 * Subscribe to MCP events
 */
/**
 * Subscribe to AHIS events
 */
/**
 * Subscribe to AHIS events
 */
/**
 * Subscribe to events from the AHIS Server.
 */
function subscribeToEvents(eventType: string, callback: (data: any) => void): void {
  // Server-side event streaming via MCP is not yet standardized; use local bus
  subscribeToLocalEvents(eventType, callback);
  logger.info(`Subscribed to local event: ${eventType}`);
}

/**
 * Subscribe to local events for UI updates within the dashboard.
 */
function subscribeToLocalEvents(eventType: string, callback: (data: any) => void): void {
  if (!localEventListeners[eventType]) {
    localEventListeners[eventType] = [];
  }
  if (!localEventListeners[eventType].includes(callback)) {
    localEventListeners[eventType].push(callback);
    logger.info(`Subscribed to local event: ${eventType}`);
  } else {
    logger.debug(`Callback already subscribed to local event: ${eventType}`);
  }
}

/**
 * Unsubscribe from MCP events
 */
/**
 * Unsubscribe from AHIS events
 */
/**
 * Unsubscribe from AHIS events
 */
/**
 * Unsubscribe from events from the AHIS Server.
 */
function unsubscribeFromEvents(eventType: string, callback: ((data: any) => void) | null = null): void {
  unsubscribeFromLocalEvents(eventType, callback || undefined);
  if (callback) {
    logger.info(`Unsubscribed specific callback from local event: ${eventType}`);
  } else {
    logger.info(`Unsubscribed all callbacks from local event: ${eventType}`);
  }
}

/**
 * Unsubscribe from local events.
 */
function unsubscribeFromLocalEvents(eventType: string, callback: ((data: any) => void) | null = null): void {
  if (!localEventListeners[eventType]) return;

  if (callback) {
    localEventListeners[eventType] = localEventListeners[eventType].filter(cb => cb !== callback);
    logger.info(`Unsubscribed specific callback from local event: ${eventType}`);
  } else {
    delete localEventListeners[eventType];
    logger.info(`Unsubscribed all callbacks from local event: ${eventType}`);
  }
}



// Export MCP client functions
export {
  initialize,
  connect,
  disconnect,
  executeCommand,
  trackProgress,
  sendNotification,
  updateDocumentation,
  registerWithAIHDS,
  subscribeToEvents, // For AHIS server events
  unsubscribeFromEvents, // For AHIS server events
  subscribeToLocalEvents, // For local UI events
  unsubscribeFromLocalEvents, // For local UI events
  dispatchLocalEvent, // For dispatching local UI events
  isConnected
};
