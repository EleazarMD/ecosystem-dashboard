import React from 'react';
import logger from '@/lib/logger';

export interface InfrastructureService {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'inactive' | 'unknown';
  description?: string;
  version?: string;
  lastSeen?: string;
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    responseTime?: number;
  };
}

export interface InfrastructureData {
  services: InfrastructureService[];
  lastUpdated: string;
  source: 'real' | 'cached' | 'fallback';
}

/**
 * Fetches real infrastructure data from AHIS service registry
 */
export async function fetchRealInfrastructureData(): Promise<InfrastructureData> {
  try {
    logger.info('[InfrastructureData] Fetching real infrastructure data from AHIS');
    
    const response = await fetch('/api/infrastructure/services');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    logger.info('[InfrastructureData] Successfully fetched real infrastructure data');
    
    return {
      services: data.services || [],
      lastUpdated: new Date().toISOString(),
      source: 'real'
    };
  } catch (error) {
    logger.error('[InfrastructureData] Failed to fetch real infrastructure data:', error);
    throw error;
  }
}

/**
 * Fallback infrastructure data for when real data is unavailable
 */
export function getFallbackInfrastructureData(): InfrastructureData {
  return {
    services: [
      {
        id: 'openclaw',
        name: 'OpenClaw Gateway',
        status: 'active',
        description: 'Primary Orchestrator',
        version: '1.0.0'
      },
      {
        id: 'ai-inferencing',
        name: 'AI Inferencing Service',
        status: 'active',
        description: 'LLM Provider Routing',
        version: '2.5.0'
      },
      {
        id: 'agent-registry',
        name: 'Agent Registry Service',
        status: 'active',
        description: 'AHIS Service Registry',
        version: '1.5.0'
      },
      {
        id: 'knowledge-graph',
        name: 'Knowledge Graph Service',
        status: 'degraded',
        description: 'Neo4j + PostgreSQL Bundle',
        version: '1.2.0'
      },
      {
        id: 'ai-gateway',
        name: 'AI Gateway v2',
        status: 'degraded',
        description: 'Dual-Port Architecture',
        version: '2.0.0'
      }
    ],
    lastUpdated: new Date().toISOString(),
    source: 'fallback'
  };
}

/**
 * React hook for infrastructure data with graceful fallback
 */
export function useInfrastructureData(options: {
  refreshInterval?: number;
  fallbackTimeout?: number;
} = {}) {
  const [data, setData] = React.useState<InfrastructureData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { refreshInterval = 30000, fallbackTimeout = 5000 } = options;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch real data with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), fallbackTimeout)
      );

      const dataPromise = fetchRealInfrastructureData();
      const result = await Promise.race([dataPromise, timeoutPromise]);
      
      setData(result);
      logger.info('[useInfrastructureData] Using real infrastructure data');
    } catch (fetchError) {
      logger.warn('[useInfrastructureData] Real data unavailable, using fallback');
      setData(getFallbackInfrastructureData());
      setError('Using fallback data - service unavailable');
    } finally {
      setLoading(false);
    }
  }, [fallbackTimeout]);

  React.useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    isReal: data?.source === 'real',
    isFallback: data?.source === 'fallback'
  };
}
