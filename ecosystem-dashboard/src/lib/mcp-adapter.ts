/**
 * AI Homelab Ecosystem - MCP Adapter for Dashboard
 * 
 * This adapter provides a standardized integration with the MCP server
 * following ecosystem-first design principles.
 * 
 * This adapter uses the existing mcp-client.ts implementation which is already
 * properly integrated with the AHIS client and MCP protocol.
 */

import logger from './logger';

// Import functions from the existing MCP client implementation
import {
  executeCommand,
  connect,
  disconnect,
  trackProgress as trackProgressClient,
  sendNotification as sendNotificationClient,
  updateDocumentation as updateDocumentationClient,
  isConnected
} from './mcp-client';

/**
 * Execute an MCP command to communicate with ecosystem services via MCP protocol
 */
export async function executeMCPCommand<T = any>(
  command: string,
  params: any,
  options?: {
    timeout?: number;
    retry?: boolean;
    maxRetries?: number;
  }
): Promise<T> {
  logger.info(`[mcp-adapter] Executing MCP command: ${command}`, { params });
  try {
    // Ensure we're connected
    if (!isConnected()) {
      await connect();
    }

    // Use existing client's executeCommand function
    const result = await executeCommand<T>(command, params, options?.timeout);
    logger.info(`[mcp-adapter] MCP command ${command} executed successfully`);
    return result;
  } catch (error: any) {
    logger.error(`[mcp-adapter] Error executing MCP command ${command}:`, error);
    throw error;
  }
}

/**
 * Track progress with AIHDS integration
 */
export async function trackProgress(
  projectId: string,
  taskId: string,
  percentage: number,
  status: "not_started" | "in_progress" | "completed" | "failed" | "paused",
  message?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await trackProgressClient(
      projectId,
      taskId,
      percentage,
      status,
      message || null,
      metadata || null
    );
  } catch (error) {
    logger.error('[mcp-adapter] Failed to track progress:', error);
  }
}

/**
 * Send notification
 */
export async function sendNotification(
  notificationType: "info" | "warning" | "error" | "success",
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await sendNotificationClient(
      notificationType,
      title,
      message,
      metadata || null
    );
  } catch (error) {
    logger.error('[mcp-adapter] Failed to send notification:', error);
  }
}

/**
 * Update documentation
 */
export async function updateDocumentation(
  projectId: string,
  docType: string,
  docPath: string,
  changeDescription: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await updateDocumentationClient(
      projectId,
      docType,
      docPath,
      changeDescription,
      metadata || null
    );
  } catch (error) {
    logger.error('[mcp-adapter] Failed to update documentation:', error);
  }
}

/**
 * Disconnect MCP adapter
 */
export async function disconnectMCP(): Promise<void> {
  try {
    await disconnect();
    logger.info('[mcp-adapter] MCP adapter disconnected');
  } catch (error) {
    logger.error('[mcp-adapter] Failed to disconnect MCP adapter:', error);
  }
}

/**
 * Get the MCP adapter instance (for backwards compatibility)
 * This is just a placeholder that connects to the MCP server
 */
export async function getMCPAdapter() {
  try {
    if (!isConnected()) {
      await connect();
    }
    return { executeCommand };
  } catch (error) {
    logger.error('[mcp-adapter] Failed to get MCP adapter:', error);
    throw error;
  }
}

// Export the adapter instance getter as default
export default getMCPAdapter;
