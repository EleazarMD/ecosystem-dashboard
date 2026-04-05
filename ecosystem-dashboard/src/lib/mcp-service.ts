/**
 * AI Homelab Ecosystem - MCP Service for Dashboard
 * 
 * This service provides a standardized integration with the MCP server
 * following ecosystem-first design principles.
 */

// Import functions from the refactored mcp-client which now uses AHISClient
import {
  initialize as initializeAHIS, // aliasing to avoid potential name conflicts locally if any
  connect as connectToAHIS,
  disconnect as disconnectFromAHIS,
  executeCommand as executeAHISCommand,
  trackProgress as trackAHISProgress,
  sendNotification as sendAHISNotification,
  updateDocumentation as updateAHISDocumentation,
  registerWithAIHDS as registerWithAIHDSViaAHIS,
  subscribeToEvents as subscribeToAHISEvents, // Server events
  unsubscribeFromEvents as unsubscribeFromAHISEvents,
  subscribeToLocalEvents as subscribeToAHISLocalEvents, // Local UI events
  unsubscribeFromLocalEvents as unsubscribeFromAHISLocalEvents,
  dispatchLocalEvent as dispatchAHISLocalEvent,
  isConnected as isAHISConnected
} from './mcp-client';

// Types from AHISClient or mcp-client might be needed for function signatures later
// For now, we'll rely on type inference or add them as we refactor function bodies.

// Use console for logging in the browser environment
const logger = console;



/**
 * Retrieves a singleton instance of the MCPClient.
 * Throws an error if called in a non-browser environment.
 */
/**
 * Ensures the AHIS client (via mcp-client) is initialized.
 * This function might be simplified or removed if mcp-client handles all initialization internally on first use.
 */
async function ensureAHISClientInitialized(): Promise<void> {
  if (typeof window === 'undefined') {
    logger.warn('AHIS client functions are typically used in a browser context.');
    // Depending on function, some might still work (e.g. if they don't access AHISClient instance directly)
    // but connection-dependent ones will fail if not initialized.
    return; // Or throw error if strict browser-only context is required for all service functions
  }
  // The initializeAHIS function from mcp-client should be idempotent and handle its own state.
  await initializeAHIS(); 
  // No client instance is returned or managed here anymore; mcp-client manages it.
}

// The getMCPClient function is no longer needed in its old form.
// Callsites will use imported functions from ./mcp-client directly,
// or use wrapper functions in this service file that call them.
// The default export of this module might change or be removed.

/**
 * Initialize the MCP client connection
 * This should be called early in the application lifecycle
 */
/**
 * Initialize the AHIS client connection via mcp-client.
 * This should be called early in the application lifecycle if explicit connection is desired.
 * Otherwise, mcp-client functions might auto-initialize/connect on first use.
 */
export async function initializeAHISConnection(): Promise<boolean> {
  if (typeof window === 'undefined') {
    logger.info('Skipping AHIS connection initialization in non-browser environment.');
    return false;
  }
  
  try {
    await initializeAHIS(); // Ensures client is configured
    if (!isAHISConnected()) {
      await connectToAHIS();
      logger.info('AI Homelab: AHIS client connected successfully via mcp-client.');
    } else {
      logger.info('AI Homelab: AHIS client already connected via mcp-client.');
    }
    return true;
  } catch (error) {
    logger.error('AI Homelab: Failed to connect to AHIS server via mcp-client:', error);
    return false;
  }
}

/**
 * Track a dashboard activity with the AIHDS system
 */
/**
 * Track a dashboard activity with the AIHDS system via AHIS.
 */
export async function trackDashboardActivity(activity: {
  taskId: string;
  action: string;
  details?: Record<string, any>;
}): Promise<void> {
  if (typeof window === 'undefined') {
    logger.info('Skipping dashboard activity tracking in non-browser environment.');
    return;
  }
  
  try {
    await initializeAHIS(); // Ensure client is configured
    // Assuming trackAHISProgress handles connection state or queues if necessary,
    // or that a connection is established by initializeAHISConnection called elsewhere.
    await trackAHISProgress(
      'ecosystem-dashboard', // projectId
      activity.taskId,
      100, // percentage - Assuming 100% for a singular activity, adjust if needed
      'completed', // status - Assuming completed, adjust if needed
      activity.action, // message
      activity.details || {} // metadata
    );
    
    logger.info(`AI Homelab: Tracked dashboard activity via AHIS: ${activity.action}`);
  } catch (error) {
    logger.error('AI Homelab: Failed to track dashboard activity via AHIS:', error);
  }
}

/**
 * Execute an MCP command
 */
/**
 * Execute an AHIS command via mcp-client.
 */
export async function executeAHISServiceCommand<T = any>(
  command: string,
  params?: Record<string, any>, // params should ideally be Record<string, any>
  options?: { timeout?: number } // Simplified options
): Promise<T> {
  if (typeof window === 'undefined') {
    logger.error('AHIS commands cannot be executed in server-side rendering context.');
    throw new Error('AHIS commands cannot be executed in server-side rendering context');
  }
  
  // Ensure client is initialized and connected
  await initializeAHIS(); // Ensures basic client setup
  if (!isAHISConnected()) {
    const connected = await initializeAHISConnection(); // Attempts to connect
    if (!connected) {
      throw new Error('Failed to connect to AHIS server before executing command.');
    }
  }
  
  // TODO: Revisit executeCommand in mcp-client.ts to ensure it can accept and pass a timeout to AHISClient.
  // For now, calling with two arguments as suggested by lint errors.
  // The executeAHISCommand from mcp-client likely takes (command, params)
  // It returns Promise<unknown>, so we cast to Promise<T>
  return executeAHISCommand(command, params) as Promise<T>;
}

// No default export is provided; consumers should import specific service functions.
