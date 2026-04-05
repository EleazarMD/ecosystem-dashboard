/**
 * Knowledge Graph Gateway Initializer
 * 
 * This module initializes the Knowledge Graph Gateway when the application loads.
 * It detects AI Gateway availability for direct communication with the Knowledge Graph
 * MCP Server following the AI Homelab Ecosystem architecture standards.
 * 
 * Architecture Flow: Dashboard → AI Gateway → Knowledge Graph MCP Server
 */

import kgGateway from './kg-gateway';
import logger from './logger';
import axios from 'axios';

let initialized = false;

/**
 * Initialize the Knowledge Graph Gateway
 * 
 * This function should be called when the application loads to set up
 * the KG Gateway and detect AI Gateway availability. It's safe to call multiple times
 * as it will only initialize once.
 * 
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeKGGateway(): Promise<void> {
  if (initialized) return;
  
  logger.info('[KG-Gateway] Initializing Knowledge Graph Gateway');
  
  try {
    // Attempt to check AI Gateway availability
    const aiGatewayAvailable = await checkAIGatewayAvailability();
    
    if (aiGatewayAvailable && typeof window !== 'undefined') {
      // Set AI Gateway availability flag in the window object for client-side detection
      window.__AI_GATEWAY_AVAILABLE__ = true;
      logger.info('[KG-Gateway] AI Gateway available for MCP communication');
    } else {
      if (typeof window !== 'undefined') {
        window.__AI_GATEWAY_AVAILABLE__ = false;
      }
      logger.info('[KG-Gateway] AI Gateway not available, will use mock responses');
    }
    
    initialized = true;
  } catch (error) {
    logger.error(`[KG-Gateway] Error initializing Knowledge Graph Gateway: ${error}`);
    // Set availability to false on error
    if (typeof window !== 'undefined') {
      window.__AI_GATEWAY_AVAILABLE__ = false;
    }
  }
}

/**
 * Check AI Gateway availability by sending a simple health check request
 */
async function checkAIGatewayAvailability(): Promise<boolean> {
  // First check if AI Gateway is explicitly disabled in the environment
  const aiGatewayEnabled = process.env.NEXT_PUBLIC_AI_GATEWAY_ENABLED === 'true';
  if (!aiGatewayEnabled) {
    logger.info('[KG-Gateway] AI Gateway integration is disabled by configuration');
    return false;
  }
  
  try {
    // Configure AI Gateway URL
    const aiGatewayHost = process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || 'localhost';
    const aiGatewayPort = process.env.NEXT_PUBLIC_AI_GATEWAY_PORT || '7777'; // Use correct port from registry
    const aiGatewaySecure = process.env.NEXT_PUBLIC_AI_GATEWAY_SECURE === 'true';
    const protocol = aiGatewaySecure ? 'https' : 'http';
    const aiGatewayUrl = `${protocol}://${aiGatewayHost}:${aiGatewayPort}/health`;
    
    logger.info(`[KG-Gateway] Checking AI Gateway availability at ${aiGatewayUrl}`);
    
    // Attempt to connect with a short timeout
    const response = await axios.get(aiGatewayUrl, { timeout: 3000 });
    
    // Consider 200-299 status codes as successful
    const available = response.status >= 200 && response.status < 300;
    logger.info(`[KG-Gateway] AI Gateway availability check: ${available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    
    return available;
  } catch (error) {
    logger.warn('[KG-Gateway] AI Gateway is not available:', error);
    return false;
  }
}

/**
 * Check if the Knowledge Graph Gateway is ready to use AI Gateway
 */
export function isKGGatewayReadyWithAIGateway(): boolean {
  if (typeof window !== 'undefined') {
    return initialized && !!window.__AI_GATEWAY_AVAILABLE__;
  }
  return initialized && process.env.NEXT_PUBLIC_AI_GATEWAY_ENABLED === 'true';
}

/**
 * Check if the Knowledge Graph Gateway is initialized
 */
export function isKGGatewayInitialized(): boolean {
  return initialized;
}

export default {
  initializeKGGateway,
  isKGGatewayReadyWithAIGateway,
  isKGGatewayInitialized
};
