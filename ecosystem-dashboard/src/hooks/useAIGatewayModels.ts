/**
 * Hook for fetching and managing AI Gateway models
 */
import { useState, useEffect } from 'react';
import { aiGatewayService } from '../lib/api';
import { AIModel } from '../types/aiGateway';
import { generateMockAIModels } from '../utils/aiGatewayUtils';

export const useAIGatewayModels = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);
  
  // Set isClient to true once component mounts
  // This prevents hydration errors when server-rendered content doesn't match client-rendered content
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Function to fetch models data
  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let fetchedModels: AIModel[] = [];
      
      // Try to fetch from real API first
      try {
        const response = await fetch('/api/gateway/models', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          fetchedModels = data.models || [];
          console.log('Successfully fetched AI Gateway models:', fetchedModels.length, 'models');
        } else {
          throw new Error(`API responded with status: ${response.status}`);
        }
      } catch (apiError) {
        console.warn('Failed to fetch from API, using mock data:', apiError);
        // Fallback to mock data if API fails
        fetchedModels = generateMockAIModels();
      }
      
      setModels(fetchedModels);
    } catch (err) {
      console.error('Error fetching AI Gateway models:', err);
      setError(err as Error);
      
      // Final fallback to mock data
      setModels(generateMockAIModels());
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch models on component mount
  useEffect(() => {
    if (isClient) {
      fetchModels();
    }
  }, [isClient]);
  
  return {
    models,
    loading,
    error,
    fetchModels,
    isClient,
  };
};
