import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface Service {
  key: string;
  name: string;
  port: number;
  status: 'healthy' | 'stopped';
  healthy: boolean;
}

interface SystemStatus {
  services: Service[];
  summary: {
    healthy: number;
    total: number;
    status: 'fully_operational' | 'partially_operational' | 'stopped';
  };
}

interface ControlResult {
  success: boolean;
  message: string;
  logs?: string[];
}

interface UseKnowledgeGraphControlOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  onStatusChange?: (status: SystemStatus) => void;
  onError?: (error: string) => void;
}

export const useKnowledgeGraphControl = (options: UseKnowledgeGraphControlOptions = {}) => {
  const {
    refreshInterval = 30000,
    autoRefresh = true,
    onStatusChange,
    onError
  } = options;

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ [key: string]: string }>({});

  const toast = useToast();

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/knowledge-graph/control?action=status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: SystemStatus = await response.json();
      setSystemStatus(data);
      setLastUpdate(new Date());
      
      // Call status change callback
      if (onStatusChange) {
        onStatusChange(data);
      }
      
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch system status';
      console.error('Failed to fetch system status:', error);
      setError(errorMessage);
      
      // Call error callback
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange, onError]);

  // Fetch system logs
  const fetchLogs = useCallback(async (service?: string, lines: number = 20) => {
    try {
      const params = new URLSearchParams({
        action: 'logs',
        lines: lines.toString()
      });
      
      if (service) {
        params.append('service', service);
      }
      
      const response = await fetch(`/api/knowledge-graph/control?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.logs);
          return data.logs;
        }
      }
      
      return {};
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return {};
    }
  }, []);

  // Start Knowledge Graph system
  const startSystem = useCallback(async (): Promise<ControlResult> => {
    setIsToggling(true);
    try {
      const response = await fetch('/api/knowledge-graph/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const result: ControlResult = await response.json();
      
      if (result.success) {
        toast({
          title: 'Knowledge Graph Started',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        
        // Refresh status after a delay
        setTimeout(fetchSystemStatus, 2000);
      } else {
        throw new Error(result.message);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to start Knowledge Graph system';
      toast({
        title: 'Failed to start Knowledge Graph',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true
      });
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsToggling(false);
    }
  }, [toast, fetchSystemStatus]);

  // Stop Knowledge Graph system
  const stopSystem = useCallback(async (): Promise<ControlResult> => {
    setIsToggling(true);
    try {
      const response = await fetch('/api/knowledge-graph/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const result: ControlResult = await response.json();
      
      if (result.success) {
        toast({
          title: 'Knowledge Graph Stopped',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        
        // Refresh status after a delay
        setTimeout(fetchSystemStatus, 2000);
      } else {
        throw new Error(result.message);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to stop Knowledge Graph system';
      toast({
        title: 'Failed to stop Knowledge Graph',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true
      });
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsToggling(false);
    }
  }, [toast, fetchSystemStatus]);

  // Restart Knowledge Graph system
  const restartSystem = useCallback(async (): Promise<ControlResult> => {
    setIsToggling(true);
    try {
      const response = await fetch('/api/knowledge-graph/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' })
      });
      
      const result: ControlResult = await response.json();
      
      if (result.success) {
        toast({
          title: 'Knowledge Graph Restarted',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        
        // Refresh status after a delay
        setTimeout(fetchSystemStatus, 3000);
      } else {
        throw new Error(result.message);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to restart Knowledge Graph system';
      toast({
        title: 'Failed to restart Knowledge Graph',
        description: errorMessage,
        status: 'error',
        duration: 8000,
        isClosable: true
      });
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsToggling(false);
    }
  }, [toast, fetchSystemStatus]);

  // Toggle system on/off
  const toggleSystem = useCallback(async (enable: boolean): Promise<ControlResult> => {
    return enable ? startSystem() : stopSystem();
  }, [startSystem, stopSystem]);

  // Check if system is running
  const isSystemRunning = systemStatus?.summary.status !== 'stopped';

  // Calculate health percentage
  const healthPercentage = systemStatus ? 
    Math.round((systemStatus.summary.healthy / systemStatus.summary.total) * 100) : 0;

  // Get status color
  const getStatusColor = useCallback((status?: string) => {
    switch (status) {
      case 'fully_operational': return 'green';
      case 'partially_operational': return 'yellow';
      case 'stopped': return 'red';
      default: return 'gray';
    }
  }, []);

  // Initial load and refresh interval
  useEffect(() => {
    fetchSystemStatus();
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchSystemStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSystemStatus, autoRefresh, refreshInterval]);

  return {
    // State
    systemStatus,
    isLoading,
    isToggling,
    lastUpdate,
    error,
    logs,
    isSystemRunning,
    healthPercentage,
    
    // Actions
    fetchSystemStatus,
    fetchLogs,
    startSystem,
    stopSystem,
    restartSystem,
    toggleSystem,
    
    // Utilities
    getStatusColor
  };
};

export default useKnowledgeGraphControl;
