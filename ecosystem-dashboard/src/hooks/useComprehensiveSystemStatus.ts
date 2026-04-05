import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

interface Alert {
  level: 'info' | 'warning' | 'error';
  component: string;
  message: string;
  timestamp: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  component: string;
  action: string;
  description: string;
}

interface ComprehensiveSystemStatus {
  timestamp: string;
  overallStatus: 'fully_operational' | 'partially_operational' | 'degraded' | 'offline';
  components: {
    knowledgeGraph: {
      status: string;
      services: {
        total: number;
        healthy: number;
        categories: {
          database: number;
          core: number;
          inference: number;
          agent: number;
        };
      };
      agents: {
        total: number;
        healthy: number;
        a2aEnabled: number;
      };
      performance: {
        avgResponseTime: number;
        uptime: number;
        a2aCompliance: number;
      };
    };
    ideMemory: {
      status: string;
      memoryWatcher: {
        healthy: boolean;
        filesTracked: number;
        syncStatus: string;
        offlineSync: boolean;
      };
      memoryBackend: {
        healthy: boolean;
        memoriesLoaded: number;
        kgConnected: boolean;
      };
      metrics: {
        syncEfficiency: number;
        totalMemories: number;
        pendingApprovals: number;
      };
    };
    infrastructure: {
      databases: {
        neo4j: { healthy: boolean; responseTime?: number };
        postgresql: { healthy: boolean; responseTime?: number };
        redis: { healthy: boolean; responseTime?: number };
      };
      networking: {
        portCompliance: boolean;
        serviceDiscovery: boolean;
      };
      automation: {
        unifiedScripts: boolean;
        healthMonitoring: boolean;
        processManagement: boolean;
      };
    };
  };
  capabilities: {
    multiAgentOrchestration: boolean;
    a2aProtocol: boolean;
    offlineSync: boolean;
    memoryValidation: boolean;
    truthEngine: boolean;
    workspaceIsolation: boolean;
    realTimeMonitoring: boolean;
  };
  alerts: Alert[];
  recommendations: Recommendation[];
}

interface UseComprehensiveSystemStatusOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  showToasts?: boolean;
  onStatusChange?: (status: ComprehensiveSystemStatus) => void;
  onError?: (error: string) => void;
  onAlert?: (alert: Alert) => void;
}

export const useComprehensiveSystemStatus = (options: UseComprehensiveSystemStatusOptions = {}) => {
  const {
    refreshInterval = 60000, // 1 minute default
    autoRefresh = true,
    showToasts = false,
    onStatusChange,
    onError,
    onAlert
  } = options;

  const [status, setStatus] = useState<ComprehensiveSystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [previousAlerts, setPreviousAlerts] = useState<Alert[]>([]);

  const toast = useToast();

  // Fetch comprehensive system status
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/system/comprehensive-status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        const newStatus = data.data as ComprehensiveSystemStatus;
        setStatus(newStatus);
        setLastUpdate(new Date());
        
        // Check for new alerts
        if (previousAlerts.length > 0) {
          const newAlerts = newStatus.alerts.filter(alert => 
            !previousAlerts.some(prevAlert => 
              prevAlert.component === alert.component && 
              prevAlert.message === alert.message
            )
          );
          
          // Show toast notifications for new alerts
          if (showToasts) {
            newAlerts.forEach(alert => {
              toast({
                title: `${alert.level.toUpperCase()}: ${alert.component}`,
                description: alert.message,
                status: alert.level === 'error' ? 'error' : alert.level === 'warning' ? 'warning' : 'info',
                duration: alert.level === 'error' ? 10000 : 5000,
                isClosable: true
              });
            });
          }
          
          // Call alert callback for new alerts
          if (onAlert) {
            newAlerts.forEach(onAlert);
          }
        }
        
        setPreviousAlerts(newStatus.alerts);
        
        // Call status change callback
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        
        return newStatus;
      } else {
        throw new Error(data.message || 'Failed to fetch comprehensive status');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch comprehensive system status';
      console.error('Comprehensive system status error:', error);
      setError(errorMessage);
      
      if (showToasts) {
        toast({
          title: 'System Status Error',
          description: errorMessage,
          status: 'error',
          duration: 8000,
          isClosable: true
        });
      }
      
      // Call error callback
      if (onError) {
        onError(errorMessage);
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange, onError, onAlert, showToasts, toast, previousAlerts]);

  // Get status color for UI components
  const getStatusColor = useCallback((status?: string) => {
    switch (status) {
      case 'fully_operational': return 'green';
      case 'partially_operational': return 'yellow';
      case 'degraded': return 'orange';
      case 'offline': return 'red';
      default: return 'gray';
    }
  }, []);

  // Get priority color for recommendations
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  }, []);

  // Get alert color
  const getAlertColor = useCallback((level: string) => {
    switch (level) {
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  }, []);

  // Calculate system health percentage
  const systemHealthPercentage = status ? 
    Math.round((status.components.knowledgeGraph.services.healthy / status.components.knowledgeGraph.services.total) * 100) : 0;

  // Calculate capability score
  const capabilityScore = status ? 
    Object.values(status.capabilities).filter(Boolean).length / Object.keys(status.capabilities).length : 0;

  // Get critical alerts (error level)
  const criticalAlerts = status?.alerts.filter(alert => alert.level === 'error') || [];

  // Get high priority recommendations
  const highPriorityRecommendations = status?.recommendations.filter(rec => rec.priority === 'high') || [];

  // Initial load and refresh interval
  useEffect(() => {
    fetchStatus();
    
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, autoRefresh, refreshInterval]);

  return {
    // State
    status,
    isLoading,
    error,
    lastUpdate,
    systemHealthPercentage,
    capabilityScore,
    criticalAlerts,
    highPriorityRecommendations,
    
    // Actions
    fetchStatus,
    
    // Utilities
    getStatusColor,
    getPriorityColor,
    getAlertColor,
    
    // Computed values
    isSystemHealthy: status?.overallStatus === 'fully_operational',
    hasAlerts: (status?.alerts.length || 0) > 0,
    hasRecommendations: (status?.recommendations.length || 0) > 0,
    agentHealthPercentage: status ? 
      Math.round((status.components.knowledgeGraph.agents.healthy / status.components.knowledgeGraph.agents.total) * 100) : 0,
    memoryHealthPercentage: status?.components.ideMemory.metrics.syncEfficiency || 0
  };
};

export default useComprehensiveSystemStatus;
