/**
 * useAHISDetection React Hook
 * 
 * This hook provides React components with access to AHIS server detection status
 * and connection initialization. It integrates with the ahis-detector module to
 * establish and monitor connections to the AHIS server.
 */

import { useState, useEffect } from 'react';
import ahisDetector from '@/lib/ahis-detector';
import logger from '@/lib/logger';

export interface AHISDetectionState {
  isAvailable: boolean;
  isDetecting: boolean;
  error: Error | null;
  checkAgain: () => Promise<boolean>;
}

/**
 * React hook for AHIS server detection and WebSocket connection
 * 
 * @param autoDetect - Whether to automatically detect AHIS on mount
 * @returns State object with AHIS availability information and check function
 */
export function useAHISDetection(autoDetect = true): AHISDetectionState {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initialize the AHIS connection and update state
   */
  const checkAHISAvailability = async (): Promise<boolean> => {
    if (isDetecting) return isAvailable;
    
    try {
      setIsDetecting(true);
      setError(null);
      
      const available = await ahisDetector.initializeAHISConnection();
      setIsAvailable(available);
      
      if (available) {
        logger.info('[AHIS-Detection] AHIS server is available');
      } else {
        logger.warn('[AHIS-Detection] AHIS server is not available');
      }
      
      return available;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(`[AHIS-Detection] Error detecting AHIS: ${error.message}`);
      setError(error);
      return false;
    } finally {
      setIsDetecting(false);
    }
  };
  
  // Auto-detect on mount if enabled
  useEffect(() => {
    if (autoDetect) {
      checkAHISAvailability();
    }
  }, [autoDetect]);

  return {
    isAvailable,
    isDetecting,
    error,
    checkAgain: checkAHISAvailability
  };
}

export default useAHISDetection;
