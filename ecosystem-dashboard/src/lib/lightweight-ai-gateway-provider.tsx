/**
 * Lightweight AI Gateway Provider
 * Minimal implementation to prevent memory crashes during dashboard initialization
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface LightweightAIGatewayContextType {
  isConnected: boolean;
  status: string;
  error: string | null;
}

const LightweightAIGatewayContext = createContext<LightweightAIGatewayContextType>({
  isConnected: false,
  status: 'disconnected',
  error: null,
});

export const useLightweightAIGateway = () => {
  return useContext(LightweightAIGatewayContext);
};

interface LightweightAIGatewayProviderProps {
  children: ReactNode;
}

export const LightweightAIGatewayProvider: React.FC<LightweightAIGatewayProviderProps> = ({ children }) => {
  const contextValue: LightweightAIGatewayContextType = {
    isConnected: false,
    status: 'lightweight-mode',
    error: null,
  };

  return (
    <LightweightAIGatewayContext.Provider value={contextValue}>
      {children}
    </LightweightAIGatewayContext.Provider>
  );
};
