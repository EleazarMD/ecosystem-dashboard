import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getBrowserAHISClient } from '../lib/browser-ahis-client';
import logger from '../lib/logger';

export interface ServiceStatus {
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  description?: string;
}

interface SystemStatusContextType {
  services: ServiceStatus[];
  loading: boolean;
  error: string | null;
  refreshStatus: () => void;
}

export const SystemStatusContext = createContext<SystemStatusContextType>({
  services: [],
  loading: true,
  error: null,
  refreshStatus: () => console.warn('SystemStatusProvider not found'),
});

export const useSystemStatus = () => useContext(SystemStatusContext);

interface SystemStatusProviderProps {
  children: ReactNode;
}

export const SystemStatusProvider: React.FC<SystemStatusProviderProps> = ({ children }) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the new API endpoint for system status
      const response = await fetch('/api/mcp/status');
      
      if (!response.ok) {
        // Handle server errors gracefully - don't throw, just log and use fallback
        logger.warn(`[SystemStatusContext] Status endpoint returned ${response.status}`);
        setServices([
          {
            name: 'System',
            status: response.status >= 500 ? 'DEGRADED' : 'UNKNOWN',
            description: `Status check returned ${response.status}`
          }
        ]);
        setLoading(false);
        return;
      }
      
      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn('[SystemStatusContext] Response is not JSON, content-type:', contentType);
        setServices([]);
        return;
      }
      
      const data = await response.json();
      logger.info('[SystemStatusContext] Successfully fetched system health:', data);

      // Map the data structure to ServiceStatus format
      if (data && data.health && data.health.components) {
        const statusServices: ServiceStatus[] = Object.entries(data.health.components).map(([name, info]: [string, any]) => ({
          name,
          status: info.status === 'healthy' ? 'OPERATIONAL' : 
                 info.status === 'degraded' ? 'DEGRADED' : 
                 info.status === 'down' ? 'DOWN' : 'UNKNOWN',
          description: info.metrics ? `Error rate: ${info.metrics.errorRate || 0}%` : undefined
        }));
        
        // Add overall system status
        statusServices.unshift({
          name: 'System',
          status: data.health.status === 'healthy' ? 'OPERATIONAL' : 
                 data.health.status === 'degraded' ? 'DEGRADED' : 
                 data.health.status === 'down' ? 'DOWN' : 'UNKNOWN',
          description: `Version: ${data.systemInfo?.version || 'unknown'}`
        });
        
        setServices(statusServices);
      } else {
        logger.warn('[SystemStatusContext] Fetched health data does not have expected structure:', data);
        setServices([]);
      }
    } catch (err: any) {
      // Reduce console noise by only logging warnings for network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        logger.warn('[SystemStatusContext] Network error fetching system health (service may be unavailable)');
      } else {
        logger.error('[SystemStatusContext] Error fetching system health:', err);
      }
      
      // Don't set error state for expected network failures
      if (err.name !== 'TypeError') {
        setError(err.message || 'An unknown error occurred.');
      }
      
      // Provide fallback services when fetch fails
      setServices([
        {
          name: 'System',
          status: 'UNKNOWN',
          description: 'Status check unavailable'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchStatus]);

  const value = {
    services,
    loading,
    error,
    refreshStatus: fetchStatus,
  };

  return (
    <SystemStatusContext.Provider value={value}>
      {children}
    </SystemStatusContext.Provider>
  );
};
