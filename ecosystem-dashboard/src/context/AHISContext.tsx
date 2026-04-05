import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserAHISClient } from '../lib/browser-ahis-client';
// import { AHISClientProvider, useAHISClient } from '../lib/ahis-client-provider';

// Define the context type
interface AHISContextType {
  client: BrowserAHISClient | null;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
}

// Create the context with default values
const AHISContext = createContext<AHISContextType>({
  client: null,
  isConnected: false,
  isLoading: true,
  error: null,
});

/**
 * AHIS Provider Component
 * 
 * Provides the AHIS Client to all child components
 * Simplified to use BrowserAHISClient directly
 */
export const AHISProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client] = useState(() => new BrowserAHISClient());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeClient = async () => {
      try {
        await client.connect();
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeClient();

    return () => {
      client.disconnect();
    };
  }, [client]);

  const value = {
    client,
    isConnected,
    isLoading,
    error
  };
  
  return (
    <AHISContext.Provider value={value}>
      {children}
    </AHISContext.Provider>
  );
};

/**
 * Use AHIS Hook
 * 
 * A custom hook to access the AHIS Client
 * For direct access to the enhanced client with health monitoring,
 * use the useAHISClient hook from '../lib/ahis-client-provider' instead
 * 
 * @returns The AHIS context
 */
export const useAHIS = () => useContext(AHISContext);

export default AHISContext;
