/**
 * AI Gateway Client Provider - Fixed Version
 * Working implementation with proper TypeScript support
 */

import * as React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

// Types
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
    finish_reason?: string;
  }>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
}

// Context interface
interface AIGatewayClientContextType {
  isConnected: boolean;
  isInitialized: boolean;
  connectionState: ConnectionState;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  sendChatCompletion: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
  getHealth: () => Promise<HealthStatus>;
  clearError: () => void;
}

// Create context
const AIGatewayClientContext = createContext<AIGatewayClientContextType | null>(null);

// Default config - use external IP for browser access
const DEFAULT_CONFIG = {
  url: process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://100.108.41.22:8777',
  apiKey: 'ai-gateway-api-key-2024',
  timeout: 30000,
  maxRetries: 3
};

// Provider component
export function AIGatewayClientProvider({ 
  children, 
  config = DEFAULT_CONFIG 
}: { 
  children: ReactNode;
  config?: typeof DEFAULT_CONFIG;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize connection
  useEffect(() => {
    const initializeClient = async () => {
      try {
        setConnectionState(ConnectionState.CONNECTING);
        
        // Test connection with health check
        const response = await fetch(`${config.url}/health`, {
          headers: {
            'X-API-Key': config.apiKey
          }
        });

        if (response.ok) {
          setIsConnected(true);
          setConnectionState(ConnectionState.CONNECTED);
          setIsInitialized(true);
          console.log('✅ AI Gateway Client initialized successfully');
        } else {
          throw new Error(`Health check failed: ${response.status}`);
        }
      } catch (err) {
        console.warn('⚠️ AI Gateway health check failed, but client is available:', err);
        setIsConnected(false);
        setConnectionState(ConnectionState.FAILED);
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsInitialized(true); // Still mark as initialized for fallback functionality
      }
    };

    initializeClient();
  }, [config.url, config.apiKey]);

  // Send chat completion
  const sendChatCompletion = async (request: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.url}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({
          ...request,
          serviceId: 'ecosystem-dashboard', // REQUIRED: Routes through AI Inferencing for tracking
        })
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Get health status
  const getHealth = async (): Promise<HealthStatus> => {
    const response = await fetch(`${config.url}/api/v1/health/comprehensive`, {
      headers: {
        'X-API-Key': config.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      status: data.success ? 'healthy' : 'unhealthy',
      timestamp: data.timestamp,
      version: data.data?.gateway?.version || 'unknown'
    };
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const contextValue: AIGatewayClientContextType = {
    isConnected,
    isInitialized,
    connectionState,
    isLoading,
    error,
    
    sendChatCompletion,
    getHealth,
    clearError
  };

  return (
    <AIGatewayClientContext.Provider value={contextValue}>
      {children}
    </AIGatewayClientContext.Provider>
  );
}

// Hook to use the context
export function useAIGatewayClient(): AIGatewayClientContextType {
  const context = useContext(AIGatewayClientContext);
  if (!context) {
    throw new Error('useAIGatewayClient must be used within AIGatewayClientProvider');
  }
  return context;
}

export default AIGatewayClientProvider;
