import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useMCP } from '@/hooks/useMCP'; // Assuming a hook for MCP tools
import logger from '../lib/logger';

interface AgenticCommandContextType {
  response: any;
  loading: boolean;
  error: string | null;
  executeQuery: (query: string) => void;
  executionTime: number;
  confidence: number;
}

export const AgenticCommandContext = createContext<AgenticCommandContextType>({
  response: null,
  loading: false,
  error: null,
  executeQuery: () => console.warn('AgenticCommandProvider not found'),
  executionTime: 0,
  confidence: 0,
});

export const useAgenticCommand = () => useContext(AgenticCommandContext);

interface AgenticCommandProviderProps {
  children: ReactNode;
}

export const AgenticCommandProvider: React.FC<AgenticCommandProviderProps> = ({ children }) => {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const { kg_query } = useMCP();

  const executeQuery = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      logger.info(`[AgenticCommandContext] Executing KG Query: ${query}`);
      const result = await kg_query({ query, output_format: 'inline' });
      logger.info('[AgenticCommandContext] Received KG Query response:', result);
      setResponse(result);
    } catch (err: any) {
      logger.error('[AgenticCommandContext] Error executing KG Query:', err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [kg_query]);

  const value = {
    response,
    loading,
    error,
    executeQuery,
    executionTime,
    confidence,
  };

  return (
    <AgenticCommandContext.Provider value={value}>
      {children}
    </AgenticCommandContext.Provider>
  );
};
