/**
 * Mock AI Gateway Client Provider for Development
 * 
 * This is a temporary mock implementation to prevent import errors
 * while the AI Gateway SDK is being resolved
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Mock types
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  provider?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  responseTime: number;
  dependencies: Record<string, string>;
  version?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface ChatCompletionStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

// Mock AI Gateway Client Context Interface
interface AIGatewayClientContextType {
  // Client instance
  client: any | null;
  
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  isLoading: boolean;
  
  // Health and status
  healthStatus: HealthStatus | null;
  lastHealthCheck: Date | null;
  
  // Available models
  models: Model[];
  isLoadingModels: boolean;
  
  // Error handling
  error: string | null;
  lastError: any | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshHealth: () => Promise<void>;
  refreshModels: () => Promise<void>;
  
  // Chat methods
  createChatCompletion: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
  createStreamingChatCompletion: (
    request: ChatCompletionRequest,
    onChunk?: (chunk: ChatCompletionStreamResponse) => void
  ) => AsyncGenerator<ChatCompletionStreamResponse>;
  
  // Quick helpers
  quickChat: (message: string, model?: string) => Promise<string>;
  quickSearch: (query: string) => Promise<any>;
}

// Create the context
const AIGatewayClientContext = createContext<AIGatewayClientContextType | null>(null);

// Provider Props
interface AIGatewayClientProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  config?: any;
}

// Mock AI Gateway Client Provider Component
export const AIGatewayClientProvider: React.FC<AIGatewayClientProviderProps> = ({
  children,
  autoConnect = false,
  config = {}
}) => {
  // State management
  const [client] = useState<any | null>(null);
  const [isConnected] = useState(false);
  const [connectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isLoading] = useState(false);
  const [healthStatus] = useState<HealthStatus | null>(null);
  const [lastHealthCheck] = useState<Date | null>(null);
  const [models] = useState<Model[]>([]);
  const [isLoadingModels] = useState(false);
  const [error] = useState<string | null>('AI Gateway SDK not available - using mock mode');
  const [lastError] = useState<any | null>(null);

  // Mock functions
  const connect = async (): Promise<void> => {
    console.log('Mock AI Gateway connect called');
  };

  const disconnect = (): void => {
    console.log('Mock AI Gateway disconnect called');
  };

  const refreshHealth = async (): Promise<void> => {
    console.log('Mock AI Gateway refreshHealth called');
  };

  const refreshModels = async (): Promise<void> => {
    console.log('Mock AI Gateway refreshModels called');
  };

  const createChatCompletion = async (request: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
    return {
      choices: [{
        message: {
          content: 'Mock response: AI Gateway SDK not available'
        }
      }]
    };
  };

  const createStreamingChatCompletion = async function* (
    request: ChatCompletionRequest,
    onChunk?: (chunk: ChatCompletionStreamResponse) => void
  ): AsyncGenerator<ChatCompletionStreamResponse> {
    const mockChunk = {
      choices: [{
        delta: {
          content: 'Mock streaming response'
        }
      }]
    };
    
    if (onChunk) {
      onChunk(mockChunk);
    }
    yield mockChunk;
  };

  const quickChat = async (message: string, model?: string): Promise<string> => {
    return 'Mock response: AI Gateway SDK not available';
  };

  const quickSearch = async (query: string): Promise<any> => {
    return {
      results: [],
      message: 'Mock search: AI Gateway SDK not available'
    };
  };

  // Context value
  const contextValue: AIGatewayClientContextType = {
    client,
    isConnected,
    connectionState,
    isLoading,
    healthStatus,
    lastHealthCheck,
    models,
    isLoadingModels,
    error,
    lastError,
    connect,
    disconnect,
    refreshHealth,
    refreshModels,
    createChatCompletion,
    createStreamingChatCompletion,
    quickChat,
    quickSearch
  };

  return (
    <AIGatewayClientContext.Provider value={contextValue}>
      {children}
    </AIGatewayClientContext.Provider>
  );
};

// Custom hook to use AI Gateway client
export const useAIGatewayClient = (): AIGatewayClientContextType => {
  const context = useContext(AIGatewayClientContext);
  if (!context) {
    throw new Error('useAIGatewayClient must be used within an AIGatewayClientProvider');
  }
  return context;
};

// Export types for external use
export type { AIGatewayClientContextType, AIGatewayClientProviderProps };
