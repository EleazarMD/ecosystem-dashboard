/**
 * Agent Registry Real-time Metrics Hook
 * 
 * Provides real-time metrics and updates from the Agent Registry Hub
 * for dashboard display and monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AgentRegistryHub, { AgentConfiguration, AgentRegistryEvent } from '../services/AgentRegistryHub';
import AgentRegistryWebSocketClient from '../services/AgentRegistryWebSocketClient';

interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  modelDistribution: Record<string, number>;
  costEstimate: number;
  avgResponseTime: number;
  errorRate: number;
  lastUpdated: string;
}

interface ModelUsageStats {
  model: string;
  agentCount: number;
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  costPerRequest: number;
  totalCost: number;
}

export function useAgentRegistryMetrics() {
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalAgents: 0,
    activeAgents: 0,
    modelDistribution: {},
    costEstimate: 0,
    avgResponseTime: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString()
  });
  
  const [modelStats, setModelStats] = useState<ModelUsageStats[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentConfiguration>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    registry: boolean;
    websocket: boolean;
    lastUpdate: string;
  }>({
    registry: false,
    websocket: false,
    lastUpdate: new Date().toISOString()
  });

  const wsClient = useRef<AgentRegistryWebSocketClient | null>(null);
  const registryHub = useRef<AgentRegistryHub | null>(null);

  // Initialize registry and real-time connections
  useEffect(() => {
    const initializeMetrics = async () => {
      try {
        // Initialize Agent Registry Hub
        registryHub.current = AgentRegistryHub.getInstance();
        await registryHub.current.initialize();
        
        // Load initial agent data
        const allAgents = await registryHub.current.getAllAgents();
        setAgents(allAgents);
        updateMetrics(allAgents);
        
        setConnectionStatus(prev => ({
          ...prev,
          registry: true,
          lastUpdate: new Date().toISOString()
        }));

        console.log('✅ Agent Registry Hub initialized with', Object.keys(allAgents).length, 'agents');
        
        // Initialize WebSocket connection for real-time updates
        try {
          wsClient.current = new AgentRegistryWebSocketClient('ws://localhost:8888', {
            debug: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 5
          });

          // WebSocket event handlers
          wsClient.current.on('connected', () => {
            console.log('✅ Agent Registry WebSocket connected');
            setConnectionStatus(prev => ({
              ...prev,
              websocket: true,
              lastUpdate: new Date().toISOString()
            }));
          });

          wsClient.current.on('disconnected', () => {
            console.log('🔌 Agent Registry WebSocket disconnected');
            setConnectionStatus(prev => ({
              ...prev,
              websocket: false,
              lastUpdate: new Date().toISOString()
            }));
          });

          wsClient.current.on('registry:event', (event: any) => {
            console.log('📊 Real-time agent registry update:', event.type, event.agentId);
            handleRealtimeUpdate(event);
          });

          // Connect to WebSocket
          await wsClient.current.connect();

        } catch (wsError) {
          console.warn('⚠️ WebSocket connection failed, using polling fallback:', wsError);
          // Continue without WebSocket - will use registry subscription instead
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Failed to initialize agent registry metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize metrics');
        setIsLoading(false);
      }
    };

    initializeMetrics();

    // Cleanup on unmount
    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
    };
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const registry = AgentRegistryHub.getInstance();
    
    const unsubscribe = registry.subscribeToRegistry((event: AgentRegistryEvent) => {
      console.log('📊 Metrics update from registry:', event.type, event.agentId);
      
      // Update agents state
      setAgents(prevAgents => {
        const updatedAgents = { ...prevAgents };
        
        if (event.type === 'agent:deactivated') {
          delete updatedAgents[event.agentId];
        } else {
          updatedAgents[event.agentId] = event.configuration;
        }
        
        // Recalculate metrics with updated data
        updateMetrics(updatedAgents);
        
        return updatedAgents;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle real-time WebSocket updates
  const handleRealtimeUpdate = useCallback((event: any) => {
    setAgents(prevAgents => {
      const updatedAgents = { ...prevAgents };
      
      if (event.type === 'agent:deactivated') {
        delete updatedAgents[event.agentId];
      } else if (event.agent) {
        updatedAgents[event.agentId] = event.agent;
      } else if (event.configuration && event.agentId) {
        updatedAgents[event.agentId] = event.configuration;
      }
      
      // Recalculate metrics with updated data
      updateMetrics(updatedAgents);
      
      // Update connection status
      setConnectionStatus(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString()
      }));
      
      return updatedAgents;
    });
  }, []);

  const updateMetrics = useCallback((agentData: Record<string, AgentConfiguration>) => {
    const activeAgentList = Object.values(agentData).filter(agent => agent.isActive !== false);
    const modelDist: Record<string, number> = {};
    let totalCost = 0;
    const modelStatsList: ModelUsageStats[] = [];

    // Calculate model distribution and stats
    activeAgentList.forEach(agent => {
      const model = agent.model;
      modelDist[model] = (modelDist[model] || 0) + 1;
      
      // Estimate cost per agent (mock calculation)
      const costPerRequest = getModelCostEstimate(model);
      const dailyRequests = 100; // Mock daily requests per agent
      totalCost += costPerRequest * dailyRequests;
    });

    // Create model usage stats
    Object.entries(modelDist).forEach(([model, count]) => {
      const costPerRequest = getModelCostEstimate(model);
      const dailyRequests = count * 100; // Mock requests
      
      modelStatsList.push({
        model,
        agentCount: count,
        requestCount: dailyRequests,
        avgResponseTime: getModelResponseTime(model),
        errorRate: getModelErrorRate(model),
        costPerRequest,
        totalCost: costPerRequest * dailyRequests
      });
    });

    // Sort by total cost descending
    modelStatsList.sort((a, b) => b.totalCost - a.totalCost);

    const newMetrics: AgentMetrics = {
      totalAgents: Object.keys(agentData).length,
      activeAgents: activeAgentList.length,
      modelDistribution: modelDist,
      costEstimate: totalCost,
      avgResponseTime: calculateAverageResponseTime(modelStatsList),
      errorRate: calculateAverageErrorRate(modelStatsList),
      lastUpdated: new Date().toISOString()
    };

    setMetrics(newMetrics);
    setModelStats(modelStatsList);
  }, []);

  // Force refresh metrics
  const refreshMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const registry = AgentRegistryHub.getInstance();
      const allAgents = await registry.getAllAgents();
      setAgents(allAgents);
      updateMetrics(allAgents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metrics');
    } finally {
      setIsLoading(false);
    }
  }, [updateMetrics]);

  return {
    metrics,
    modelStats,
    agents,
    isLoading,
    error,
    connectionStatus,
    refreshMetrics
  };
}

// Helper functions for cost and performance estimation
function getModelCostEstimate(model: string): number {
  const costMap: Record<string, number> = {
    'gemini-2.0-flash-thinking-exp': 0.05,
    'gemini-2.0-flash-exp': 0.02,
    'gemini-1.5-pro': 0.015,
    'gemini-1.5-flash': 0.005,
    'mistral:latest': 0.01,
    'llama3.2:3b': 0.003,
    'llama3.2-vision:11b': 0.025,
    'gemma3:4b': 0.004
  };
  return costMap[model] || 0.01;
}

function getModelResponseTime(model: string): number {
  const responseTimeMap: Record<string, number> = {
    'gemini-2.0-flash-thinking-exp': 3500,
    'gemini-2.0-flash-exp': 1200,
    'gemini-1.5-pro': 2000,
    'gemini-1.5-flash': 800,
    'mistral:latest': 1500,
    'llama3.2:3b': 900,
    'llama3.2-vision:11b': 4000,
    'gemma3:4b': 1100
  };
  return responseTimeMap[model] || 1500;
}

function getModelErrorRate(model: string): number {
  const errorRateMap: Record<string, number> = {
    'gemini-2.0-flash-thinking-exp': 0.02,
    'gemini-2.0-flash-exp': 0.01,
    'gemini-1.5-pro': 0.015,
    'gemini-1.5-flash': 0.008,
    'mistral:latest': 0.02,
    'llama3.2:3b': 0.025,
    'llama3.2-vision:11b': 0.03,
    'gemma3:4b': 0.02
  };
  return errorRateMap[model] || 0.015;
}

function calculateAverageResponseTime(modelStats: ModelUsageStats[]): number {
  if (modelStats.length === 0) return 0;
  
  const totalWeightedTime = modelStats.reduce((sum, stat) => {
    return sum + (stat.avgResponseTime * stat.requestCount);
  }, 0);
  
  const totalRequests = modelStats.reduce((sum, stat) => sum + stat.requestCount, 0);
  
  return totalRequests > 0 ? totalWeightedTime / totalRequests : 0;
}

function calculateAverageErrorRate(modelStats: ModelUsageStats[]): number {
  if (modelStats.length === 0) return 0;
  
  const totalWeightedErrors = modelStats.reduce((sum, stat) => {
    return sum + (stat.errorRate * stat.requestCount);
  }, 0);
  
  const totalRequests = modelStats.reduce((sum, stat) => sum + stat.requestCount, 0);
  
  return totalRequests > 0 ? totalWeightedErrors / totalRequests : 0;
}
