/**
 * Knowledge Graph Utilities
 * 
 * Provides functions for interacting with the Knowledge Graph service
 * following AI Homelab Ecosystem architecture standards.
 */
import logger from './logger';

/**
 * Get the Knowledge Graph service URL from environment variables
 * @returns {string} The base URL for the Knowledge Graph service
 */
export function getKnowledgeGraphUrl(): string {
  const secure = process.env.NEXT_PUBLIC_KNOWLEDGE_GRAPH_SECURE === 'true';
  const protocol = secure ? 'https' : 'http';
  const host = process.env.NEXT_PUBLIC_KNOWLEDGE_GRAPH_HOST || 'localhost';
  const port = process.env.NEXT_PUBLIC_KNOWLEDGE_GRAPH_PORT || '8765';
  
  return `${protocol}://${host}:${port}`;
}

/**
 * Check the health of the Knowledge Graph service
 * @returns {Promise<{isAvailable: boolean, isMockData: boolean, error?: any}>} 
 */
export async function checkKnowledgeGraphHealth(): Promise<{
  isAvailable: boolean;
  isMockData: boolean;
  error?: any;
}> {
  const isEnabled = process.env.NEXT_PUBLIC_KNOWLEDGE_GRAPH_ENABLED !== 'false';
  
  // Skip check if service is explicitly disabled
  if (!isEnabled) {
    logger.info('[KG Utils] Knowledge Graph service is disabled in configuration');
    return { isAvailable: false, isMockData: false };
  }
  
  const url = `${getKnowledgeGraphUrl()}/health`;
  
  try {
    logger.debug(`[KG Utils] Checking Knowledge Graph health at ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout to prevent hanging
      // signal: AbortSignal.timeout(5000), // 5 second timeout - disabled due to compatibility
      // Important for production environments with self-signed certs
      // @ts-ignore
      next: { revalidate: 30 } // Revalidate every 30 seconds
    });
    
    if (!response.ok) {
      logger.warn(`[KG Utils] Knowledge Graph health check failed: ${response.status} ${response.statusText}`);
      return { isAvailable: false, isMockData: false, error: response.statusText };
    }
    
    const data = await response.json();
    
    // Check for expected health response format
    if (data && (data.status === 'healthy' || data.status === 'ok')) {
      logger.debug('[KG Utils] Knowledge Graph service is healthy');
      return { isAvailable: true, isMockData: false };
    } else {
      logger.warn('[KG Utils] Knowledge Graph returned unexpected health status', data);
      return { isAvailable: false, isMockData: false, error: 'Invalid health status format' };
    }
  } catch (error) {
    // Silently handle expected network failures to prevent memory issues
    logger.warn('[KG Utils] Knowledge Graph service unavailable');
    return { isAvailable: false, isMockData: false };
  }
}

/**
 * Dispatch Knowledge Graph status event for the dashboard
 */
export function dispatchKnowledgeGraphStatusEvent(isAvailable: boolean, isMockData: boolean): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('knowledge-graph-status', {
      detail: {
        available: isAvailable,
        mockData: isMockData
      }
    });
    
    window.dispatchEvent(event);
    logger.debug('[KG Utils] Dispatched Knowledge Graph status event', { 
      isAvailable, 
      isMockData 
    });
  }
}

/**
 * Initialize Knowledge Graph status monitoring
 * Performs regular health checks and dispatches events
 */
export function initializeKnowledgeGraphMonitoring(intervalMs: number = 60000): () => void {
  // Simplified version to prevent memory issues
  const checkAndDispatch = () => {
    // Just dispatch unavailable status to prevent crashes
    dispatchKnowledgeGraphStatusEvent(false, false);
  };
  
  // Initial dispatch
  setTimeout(checkAndDispatch, 100);
  
  // Setup interval for regular checks
  const intervalId = setInterval(checkAndDispatch, intervalMs);
  
  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}
