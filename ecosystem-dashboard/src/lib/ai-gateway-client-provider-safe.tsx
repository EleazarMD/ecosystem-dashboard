/**
 * Safe AI Gateway Client Provider - Temporary Fix
 * 
 * This is a temporary safe version that doesn't use the real AI Gateway SDK
 * to prevent forEach errors during development
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Mock types to match the real interface
interface Model {
  id: string;
  provider: string;
  owned_by: string;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  services: any[];
}

interface ChatCompletionRequest {
  messages: any[];
  model?: string;
}

interface ChatCompletionResponse {
  choices: any[];
  model: string;
  usage: any;
}

// Mock connection states
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting'
}

// Context type
interface AIGatewayClientContextType {
  client: any | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  isLoading: boolean;
  healthStatus: HealthStatus | null;
  lastHealthCheck: Date | null;
  models: Model[];
  isLoadingModels: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshHealth: () => Promise<void>;
  refreshModels: () => Promise<void>;
  quickChat: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
  quickSearch: (query: string) => Promise<any>;
}

// Create context
const AIGatewayClientContext = createContext<AIGatewayClientContextType | undefined>(undefined);

// Provider props
interface AIGatewayClientProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  config?: any;
}

// Safe Provider Component
export function SafeAIGatewayClientProvider({ 
  children, 
  autoConnect = false
}: AIGatewayClientProviderProps) {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock functions
  const connect = async (): Promise<void> => {
    setIsLoading(true);
    setConnectionState(ConnectionState.CONNECTING);
    
    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
      setHealthStatus({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0-mock',
        uptime: 12345,
        services: []
      });
      setLastHealthCheck(new Date());
      setModels([
        { id: 'llama3.1:8b', provider: 'ollama', owned_by: 'meta' },
        { id: 'gpt-4', provider: 'openai', owned_by: 'openai' }
      ]);
      setIsLoading(false);
      setError(null);
    }, 1000);
  };

  const disconnect = (): void => {
    setIsConnected(false);
    setConnectionState(ConnectionState.DISCONNECTED);
    setHealthStatus(null);
    setModels([]);
  };

  const refreshHealth = async (): Promise<void> => {
    if (!isConnected) return;
    setHealthStatus({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-mock',
      uptime: 12345,
      services: []
    });
    setLastHealthCheck(new Date());
  };

  const refreshModels = async (): Promise<void> => {
    if (!isConnected) return;
    setIsLoadingModels(true);
    setTimeout(() => {
      setModels([
        { id: 'llama3.1:8b', provider: 'ollama', owned_by: 'meta' },
        { id: 'gpt-4', provider: 'openai', owned_by: 'openai' }
      ]);
      setIsLoadingModels(false);
    }, 500);
  };

  const quickChat = async (request: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
    return {
      choices: [{ message: { content: 'Mock response' } }],
      model: request.model || 'llama3.1:8b',
      usage: { total_tokens: 100 }
    };
  };

  const quickSearch = async (query: string): Promise<any> => {
    return {
      results: [{ title: 'Mock result', content: 'Mock search result' }]
    };
  };

  // Context value
  const contextValue: AIGatewayClientContextType = {
    client: null,
    isConnected,
    connectionState,
    isLoading,
    healthStatus,
    lastHealthCheck,
    models,
    isLoadingModels,
    error,
    connect,
    disconnect,
    refreshHealth,
    refreshModels,
    quickChat,
    quickSearch
  };

  return (
    <AIGatewayClientContext.Provider value={contextValue}>
      {children}
    </AIGatewayClientContext.Provider>
  );
}

// Hook to use the context
export const useAIGatewayClient = (): AIGatewayClientContextType => {
  const context = useContext(AIGatewayClientContext);
  if (context === undefined) {
    throw new Error('useAIGatewayClient must be used within an AIGatewayClientProvider');
  }
  return context;
};
