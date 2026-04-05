/**
 * AI Gateway Service API Client
 * 
 * This module provides API client functions for interacting with the AI Gateway service.
 * It includes comprehensive error handling, request caching, and timeout management.
 */

import { AIGatewayStatus, AIModel, AIGatewayConfig, AIMetrics } from '@/types/aiGateway';

// Configuration options
const API_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL = 60000;   // 1 minute

// Simple in-memory cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheItem<any>> = {};

/**
 * Handles API requests with timeouts, error handling and optional caching
 */
async function apiRequest<T>(
  url: string, 
  options: RequestInit = {},
  useCache = true,
  cacheTtl = CACHE_TTL
): Promise<T> {
  // Check cache first if enabled
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  if (useCache && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < cacheTtl) {
    return cache[cacheKey].data;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    // Make the request with timeout capability
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Handle unsuccessful responses
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`API Error (${response.status}): ${errorText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Cache the result if caching is enabled
    if (useCache) {
      cache[cacheKey] = { data, timestamp: Date.now() };
    }
    
    return data;
  } catch (error) {
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Handle different error types
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${API_TIMEOUT / 1000} seconds`);
    }
    
    // Rethrow the error
    throw error;
  }
}

/**
 * Clear all cached API requests
 */
export function clearCache(): void {
  Object.keys(cache).forEach(key => delete cache[key]);
}

/**
 * Get the list of available models from the AI Gateway
 */
export async function getModels(): Promise<{ models: AIModel[] }> {
  return apiRequest<{ models: AIModel[] }>('/api/gateway/models');
}

/**
 * Get the current status of the AI Gateway
 */
export async function getStatus(): Promise<AIGatewayStatus> {
  return apiRequest<AIGatewayStatus>('/api/gateway/status', {}, false); // No cache for status
}

/**
 * Get the gateway configuration
 */
export async function getConfiguration(): Promise<AIGatewayConfig> {
  return apiRequest<AIGatewayConfig>('/api/gateway/config');
}

/**
 * Update the gateway configuration
 */
export async function updateConfiguration(config: Partial<AIGatewayConfig>): Promise<AIGatewayConfig> {
  return apiRequest<AIGatewayConfig>('/api/gateway/config', {
    method: 'POST',
    body: JSON.stringify(config)
  }, false); // Don't cache POST requests
}

/**
 * Get metrics for the gateway
 */
export async function getMetrics(timeRange: string = '24h'): Promise<AIMetrics> {
  return apiRequest<AIMetrics>(`/api/gateway/metrics?timeRange=${timeRange}`);
}

/**
 * Control operations for the gateway service (start, stop, restart)
 */
export async function controlService(action: 'start' | 'stop' | 'restart'): Promise<{ success: boolean, message: string }> {
  return apiRequest<{ success: boolean, message: string }>('/api/gateway/control', {
    method: 'POST',
    body: JSON.stringify({ action })
  }, false); // Don't cache control operations
}

/**
 * Get service logs
 */
export async function getLogs(lines: number = 100): Promise<{ logs: string[] }> {
  return apiRequest<{ logs: string[] }>(`/api/gateway/logs?lines=${lines}`);
}

/**
 * Register a new model with the gateway
 */
export async function registerModel(model: Omit<AIModel, 'id'>): Promise<AIModel> {
  return apiRequest<AIModel>('/api/gateway/models', {
    method: 'POST',
    body: JSON.stringify(model)
  }, false);
}

/**
 * Update an existing model
 */
export async function updateModel(id: string, model: Partial<AIModel>): Promise<AIModel> {
  return apiRequest<AIModel>(`/api/gateway/models/${id}`, {
    method: 'PUT',
    body: JSON.stringify(model)
  }, false);
}

/**
 * Delete a model
 */
export async function deleteModel(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/gateway/models/${id}`, {
    method: 'DELETE'
  }, false);
}

// Export the service as a unified object
export const aiGatewayService = {
  getModels,
  getStatus,
  getConfiguration,
  updateConfiguration,
  getMetrics,
  controlService,
  getLogs,
  registerModel,
  updateModel,
  deleteModel,
  clearCache
};
