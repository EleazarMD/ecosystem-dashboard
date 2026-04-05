/**
 * AI Gateway Detection Hook
 * 
 * This hook provides reactive state for detecting the availability of the AI Gateway
 * for Knowledge Graph MCP communication. It follows AI Homelab Ecosystem architecture
 * standards for direct communication with MCP servers via the AI Gateway.
 * 
 * Architecture Flow: Dashboard → AI Gateway → Knowledge Graph MCP Server
 */

import { useState, useEffect } from 'react';
import { isKGGatewayReadyWithAIGateway } from '@/lib/kg-gateway-initializer';

/**
 * Interface for the AI Gateway detection hook return value
 */
interface AIGatewayDetectionResult {
  isAvailable: boolean;
  error: Error | null;
}

/**
 * Hook to detect AI Gateway availability for Knowledge Graph MCP communication
 * 
 * @returns AIGatewayDetectionResult with availability status
 */
export function useAIGatewayDetection(): AIGatewayDetectionResult {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkAIGatewayAvailability = () => {
      try {
        // Check if the AI Gateway is available through the KG Gateway initializer
        if (typeof window !== 'undefined') {
          setIsAvailable(!!window.__AI_GATEWAY_AVAILABLE__);
        } else {
          setIsAvailable(isKGGatewayReadyWithAIGateway());
        }
        setError(null);
      } catch (err: any) {
        setIsAvailable(false);
        setError(new Error(err?.message || 'Failed to detect AI Gateway'));
      }
    };

    // Initial check
    checkAIGatewayAvailability();

    // Set up event listener for status updates
    const handleAIGatewayStatusChange = () => {
      checkAIGatewayAvailability();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ai-gateway-status-change', handleAIGatewayStatusChange);
    }

    // Clean up
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ai-gateway-status-change', handleAIGatewayStatusChange);
      }
    };
  }, []);

  return { isAvailable, error };
}
