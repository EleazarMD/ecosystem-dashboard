/**
 * Simplified AI Gateway Client Provider
 * Minimal implementation to get dashboard working
 */

import React, { createContext, useContext, ReactNode } from 'react';

// Minimal types
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string };
  }>;
}

// Simple context interface
interface AIGatewayClientContextType {
  isConnected: boolean;
  isLoading: boolean;
  sendChatCompletion: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
}

// Create context
const AIGatewayClientContext = createContext<AIGatewayClientContextType | null>(null);

// Simple provider
export const AIGatewayClientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const contextValue: AIGatewayClientContextType = {
    isConnected: true,
    isLoading: false,
    sendChatCompletion: async (request: ChatCompletionRequest) => {
      // Mock implementation for now
      return {
        choices: [{ message: { content: 'Mock response' } }]
      };
    }
  };

  return (
    <AIGatewayClientContext.Provider value={contextValue}>
      {children}
    </AIGatewayClientContext.Provider>
  );
};

// Hook
export const useAIGatewayClient = (): AIGatewayClientContextType => {
  const context = useContext(AIGatewayClientContext);
  if (!context) {
    throw new Error('useAIGatewayClient must be used within an AIGatewayClientProvider');
  }
  return context;
};
