/**
 * AI Gateway Metrics Hook
 * 
 * Custom hook for fetching and managing AI Gateway metrics data with caching and auto-refresh.
 * Part of the AI Homelab Ecosystem dashboard modularization effort.
 */

import { useState, useEffect, useCallback } from 'react';
import { AIMetrics } from '@/types/aiGateway';
import { getMetrics } from '@/lib/api/aiGatewayService';

// Configuration
const CACHE_TTL = 60 * 1000; // 60 seconds cache time to live
const REFRESH_INTERVAL = 30 * 1000; // 30 seconds refresh interval

interface UseAIGatewayMetricsOptions {
  initialTimeRange?: string; // Time range for fetching metrics (e.g., '1h', '24h', '7d')
  autoRefresh?: boolean; // Whether to automatically refresh metrics
  refreshInterval?: number; // Custom refresh interval in milliseconds
}

interface UseAIGatewayMetricsState {
  metrics: AIMetrics | null;
  timeRange: string;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

interface UseAIGatewayMetricsReturn extends UseAIGatewayMetricsState {
  refreshMetrics: () => Promise<void>;
  setTimeRange: (timeRange: string) => void;
}

/**
 * Hook for fetching and managing AI Gateway metrics
 */
export function useAIGatewayMetrics({
  initialTimeRange = '24h',
  autoRefresh = true,
  refreshInterval = REFRESH_INTERVAL
}: UseAIGatewayMetricsOptions = {}): UseAIGatewayMetricsReturn {
  // State
  const [state, setState] = useState<UseAIGatewayMetricsState>({
    metrics: null,
    timeRange: initialTimeRange,
    loading: false,
    error: null,
    lastUpdated: null
  });
  
  // Cache for metrics data by timeRange
  const [cache, setCache] = useState<Record<string, { data: AIMetrics; timestamp: number }>>({});
  
  // Fetch metrics based on time range
  const fetchMetrics = useCallback(async (timeRange: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Check cache first
      const now = Date.now();
      const cachedItem = cache[timeRange];
      
      if (cachedItem && now - cachedItem.timestamp < CACHE_TTL) {
        setState(prev => ({
          ...prev,
          metrics: cachedItem.data,
          loading: false,
          lastUpdated: new Date(cachedItem.timestamp)
        }));
        return;
      }
      
      // Fetch from API if not in cache or cache expired
      const data = await getMetrics(timeRange);
      
      // Update cache
      setCache(prev => ({
        ...prev,
        [timeRange]: { data, timestamp: now }
      }));
      
      setState(prev => ({
        ...prev,
        metrics: data,
        loading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
    }
  }, [cache]);
  
  // Function to refresh metrics
  const refreshMetrics = useCallback(async () => {
    await fetchMetrics(state.timeRange);
  }, [fetchMetrics, state.timeRange]);
  
  // Function to change time range
  const setTimeRange = useCallback((newTimeRange: string) => {
    setState(prev => ({ ...prev, timeRange: newTimeRange }));
  }, []);
  
  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMetrics(state.timeRange);
    
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchMetrics(state.timeRange);
      }, refreshInterval);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchMetrics, state.timeRange, autoRefresh, refreshInterval]);
  
  // Re-fetch when time range changes
  useEffect(() => {
    fetchMetrics(state.timeRange);
  }, [fetchMetrics, state.timeRange]);
  
  return {
    ...state,
    refreshMetrics,
    setTimeRange
  };
}
