/**
 * AHIS Detector Module
 * 
 * This module handles detection of AHIS server availability and WebSocket
 * connectivity for the Knowledge Graph services following AI Homelab
 * Ecosystem architecture standards.
 * 
 * It initializes a WebSocket connection with the AHIS server on the client side
 * and provides a standardized interface for checking AHIS availability.
 */

import { io, Socket } from 'socket.io-client';
import logger from './logger';

declare global {
  interface Window {
    __AHIS_AVAILABLE__?: boolean;
    __AHIS_SOCKET__?: Socket;
  }
}

/**
 * Configuration options for AHIS connection
 */
export interface AHISConfig {
  host?: string;
  port?: string | number;
  secure?: boolean;
  connectTimeout?: number;
  reconnectionAttempts?: number;
}

/**
 * Default configuration values
 */
const defaultConfig: AHISConfig = {
  host: 'localhost',
  port: 8888,
  secure: false,
  connectTimeout: 5000,
  reconnectionAttempts: 3
};

/**
 * Get AHIS server connection configuration from environment variables or defaults
 */
export function getAHISConfig(): AHISConfig {
  return {
    host: process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || defaultConfig.host,
    port: process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || defaultConfig.port,
    secure: process.env.NEXT_PUBLIC_AHIS_SERVER_SECURE === 'true' || defaultConfig.secure,
    connectTimeout: parseInt(process.env.NEXT_PUBLIC_AHIS_CONNECT_TIMEOUT || '5000'),
    reconnectionAttempts: parseInt(process.env.NEXT_PUBLIC_AHIS_RECONNECT_ATTEMPTS || '3')
  };
}

/**
 * Get AHIS server URL
 */
export function getAHISServerUrl(): string {
  const config = getAHISConfig();
  const protocol = config.secure ? 'https' : 'http';
  return `${protocol}://${config.host}:${config.port}`;
}

/**
 * Check if AHIS should be used based on environment variables
 */
export function shouldUseAHIS(): boolean {
  return process.env.NEXT_PUBLIC_USE_REAL_AHIS === 'true';
}

/**
 * Initialize AHIS WebSocket connection
 * 
 * @returns Promise that resolves to true if AHIS is available, false otherwise
 */
export async function initializeAHISConnection(): Promise<boolean> {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // If we've already checked, use cached result
  if (typeof window.__AHIS_AVAILABLE__ === 'boolean') {
    return window.__AHIS_AVAILABLE__;
  }
  
  // Default to unavailable
  window.__AHIS_AVAILABLE__ = false;
  
  // Check if we should even try to connect
  if (!shouldUseAHIS()) {
    logger.info('[AHIS-Detector] AHIS usage disabled by environment configuration');
    return false;
  }

  // Get AHIS server URL
  const serverUrl = getAHISServerUrl();
  const config = getAHISConfig();
  
  logger.info(`[AHIS-Detector] Initializing AHIS WebSocket connection to ${serverUrl}`);
  
  // Create socket instance with timeout
  try {
    const socket = io(serverUrl, {
      reconnectionDelayMax: 10000,
      reconnection: true,
      reconnectionAttempts: config.reconnectionAttempts,
      timeout: config.connectTimeout,
      transports: ['websocket', 'polling'],
      path: '/api/ahis/ws',
      query: {
        client_type: 'dashboard',
        client_id: `dashboard-${Date.now()}`,
        authType: 'internal'
      }
    });

    // Return a Promise that resolves when socket connects or timeout occurs
    return new Promise<boolean>((resolve) => {
      // Set a timeout
      const timeoutId = setTimeout(() => {
        logger.warn(`[AHIS-Detector] Connection timeout after ${config.connectTimeout}ms`);
        socket.disconnect();
        window.__AHIS_AVAILABLE__ = false;
        resolve(false);
      }, config.connectTimeout);
      
      // Handle connection success
      socket.on('connect', () => {
        clearTimeout(timeoutId);
        logger.info('[AHIS-Detector] Successfully connected to AHIS server');
        
        // Store socket and availability flag
        window.__AHIS_SOCKET__ = socket;
        window.__AHIS_AVAILABLE__ = true;
        
        // Set up event listeners
        socket.on('disconnect', () => {
          logger.warn('[AHIS-Detector] Disconnected from AHIS server');
          window.__AHIS_AVAILABLE__ = false;
        });
        
        socket.on('connect_error', (error) => {
          logger.error('[AHIS-Detector] Connection error', error.message);
          window.__AHIS_AVAILABLE__ = false;
        });
        
        resolve(true);
      });
      
      // Handle connection error
      socket.on('connect_error', (error) => {
        clearTimeout(timeoutId);
        logger.error(`[AHIS-Detector] Connection error: ${error.message}`);
        window.__AHIS_AVAILABLE__ = false;
        resolve(false);
      });
    });
  } catch (error) {
    logger.error(`[AHIS-Detector] Failed to initialize socket: ${error}`);
    window.__AHIS_AVAILABLE__ = false;
    return false;
  }
}

/**
 * Check if AHIS is available
 * 
 * @returns Boolean indicating if AHIS is available
 */
export function isAHISAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return !!window.__AHIS_AVAILABLE__;
}

/**
 * Get the AHIS socket instance if available
 * 
 * @returns Socket instance or undefined if not available
 */
export function getAHISSocket(): Socket | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  return window.__AHIS_SOCKET__;
}

// Export all functions and types
export default {
  initializeAHISConnection,
  isAHISAvailable,
  getAHISSocket,
  getAHISConfig,
  getAHISServerUrl,
  shouldUseAHIS
};
