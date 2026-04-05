/**
 * Hook for fetching and managing AI Gateway status
 */
import { useState, useEffect } from 'react';
import { AIGatewayStatus } from '../types/aiGateway';
import { generateMockGatewayStatus } from '../utils/aiGatewayUtils';

export const useAIGatewayStatus = () => {
  const [status, setStatus] = useState<AIGatewayStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);
  
  // Set isClient to true once component mounts
  // This prevents hydration errors when server-rendered content doesn't match client-rendered content
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Function to fetch gateway status
  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let gatewayStatus: AIGatewayStatus;
      
      // Try to fetch from real API first
      try {
        const response = await fetch('/api/gateway/status', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          gatewayStatus = {
            ...data,
            lastUpdated: new Date()
          };
          console.log('Successfully fetched AI Gateway status:', gatewayStatus.status);
        } else {
          throw new Error(`API responded with status: ${response.status}`);
        }
      } catch (apiError) {
        console.warn('Failed to fetch from API, using mock data:', apiError);
        // Fallback to mock data if API fails
        gatewayStatus = generateMockGatewayStatus();
      }
      
      setStatus(gatewayStatus);
    } catch (err) {
      console.error('Error fetching AI Gateway status:', err);
      setError(err as Error);
      
      // Final fallback to mock data
      setStatus(generateMockGatewayStatus());
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch status on component mount
  useEffect(() => {
    if (isClient) {
      fetchStatus();
    }
  }, [isClient]);
  
  return {
    status,
    loading,
    error,
    fetchStatus,
    isClient,
  };
};
