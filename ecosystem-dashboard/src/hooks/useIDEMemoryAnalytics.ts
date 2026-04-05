/**
 * Enhanced IDE Memory Analytics Hooks
 * 
 * Custom React hooks for integrating contextual intelligence, quality scoring,
 * ecosystem state monitoring, and predictive analytics into the dashboard.
 * 
 * @module hooks/useIDEMemoryAnalytics
 * @updated 2025-08-14
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

// Main hook export
export const useIDEMemoryAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Mock data for now - replace with actual API calls
    setTimeout(() => {
      setData({
        system_health: 0.85,
        total_memories: 1406,
        quality_score: 92,
        ecosystem_integration: 0.88
      });
      setLoading(false);
    }, 1000);
  }, []);
  
  return { data, loading };
};

// Types for enhanced analytics data
export interface ContextualIntelligence {
  ecosystemIntegration: {
    score: number;
    serviceConnections: Array<{
      service: string;
      connection_strength: number;
      last_interaction: string;
    }>;
    complianceStatus: Record<string, any>;
    healthIndicators: Record<string, number>;
  };
  predictiveAnalytics: {
    relevanceForecasting: Array<{
      memory_id: string;
      current_relevance: number;
      predicted_relevance_7d: number;
      trend: string;
    }>;
    conflictPredictions: Array<{
      type: string;
      probability: number;
      affected_memories: string[];
      predicted_date: string;
      severity: string;
    }>;
    optimizationRecommendations: Array<{
      type: string;
      priority: string;
      affected_memories: string[];
      potential_improvement: number;
      description: string;
    }>;
  };
  knowledgeGraphRelationships: {
    memoryConnections: Array<{
      from: string;
      to: string;
      relationship: string;
      strength: number;
    }>;
    serviceRelationships: Array<{
      memory_id: string;
      service: string;
      relationship_type: string;
      strength: number;
    }>;
    architecturalPatterns: Array<{
      pattern: string;
      memories: string[];
      coherence_score: number;
    }>;
  };
  contextualRecommendations: {
    activeProjectContext: Array<{
      project: string;
      relevant_memories: string[];
      context_score: number;
      recommendations: string[];
    }>;
    relevantMemories: Array<{
      memory_id: string;
      relevance_score: number;
      reason: string;
    }>;
    suggestedActions: Array<{
      action: string;
      priority: string;
      description: string;
      estimated_impact: number;
    }>;
  };
  realTimeMetrics: {
    memoryQualityScores: {
      accuracy: number;
      consistency: number;
      relevance: number;
      completeness: number;
      overall: number;
    };
    ecosystemHealthStatus: {
      service_connectivity: number;
      integration_health: number;
      compliance_score: number;
      performance_index: number;
    };
    integrationMetrics: {
      knowledge_graph_sync: number;
      mcp_connectivity: number;
      api_response_time: number;
      data_freshness: number;
    };
  };
}

export interface QualityScoring {
  overallQuality: {
    score: number;
    grade: string;
    trend: string;
    lastUpdated: string;
  };
  dimensionalScores: {
    accuracy: {
      score: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
      recommendations: string[];
    };
    consistency: {
      score: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
      recommendations: string[];
    };
    relevance: {
      score: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
      recommendations: string[];
    };
    completeness: {
      score: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
      recommendations: string[];
    };
    temporalDecay: {
      score: number;
      confidence: number;
      factors: Array<{
        factor: string;
        impact: number;
        description: string;
      }>;
      recommendations: string[];
    };
  };
  historicalTrends?: {
    qualityEvolution: Array<{
      date: string;
      overall_score: number;
      accuracy: number;
      consistency: number;
      relevance: number;
      completeness: number;
    }>;
    trendAnalysis: {
      overall_trend: string;
      improvement_rate: number;
      strongest_improvement: string;
      areas_needing_attention: string[];
    };
  };
  predictiveAnalytics?: {
    futureQualityProjection: Array<{
      date: string;
      predicted_score: number;
      confidence: number;
    }>;
    riskAssessment: {
      decay_risk: number;
      obsolescence_risk: number;
      conflict_risk: number;
      overall_risk: number;
    };
  };
  actionableInsights: {
    immediateActions: Array<{
      action: string;
      priority: string;
      estimated_impact: number;
      description: string;
    }>;
    longTermRecommendations: Array<{
      recommendation: string;
      timeline: string;
      estimated_impact: number;
      description: string;
    }>;
  };
}

export interface EcosystemState {
  serviceHealth: {
    services: Array<{
      service: string;
      status: string;
      responseTime: number;
      details: string;
      endpoint?: string;
    }>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
      unknown: number;
    };
  };
  performanceMetrics: {
    responseTimeMetrics: {
      avg_response_time: number;
      p95_response_time: number;
      p99_response_time: number;
      timeout_rate: number;
    };
    throughputMetrics: {
      requests_per_second: number;
      successful_requests: number;
      error_rate: number;
      concurrent_connections: number;
    };
    resourceUtilization: {
      cpu_usage: number;
      memory_usage: number;
      disk_usage: number;
      network_io: number;
    };
  };
  complianceStatus: {
    portRegistryCompliance: {
      compliant_services: number;
      total_services: number;
      compliance_rate: number;
      violations: Array<{
        service: string;
        violation: string;
        severity: string;
        port?: number;
      }>;
    };
    securityCompliance: {
      authentication_enabled: boolean;
      tls_encryption: boolean;
      api_key_rotation: boolean;
      compliance_score: number;
      recommendations?: string[];
    };
  };
  overallHealth: {
    score: number;
    grade: string;
    status: string;
    recommendations: string[];
  };
}

export interface PredictiveAnalytics {
  relevanceForecasting: {
    predictions: Array<{
      memory_id: string;
      current_relevance: number;
      predicted_relevance: Array<{
        date: string;
        relevance: number;
        confidence: number;
      }>;
      trend: string;
      factors: string[];
    }>;
    trends: {
      overall_relevance_trend: string;
      high_risk_memories: number;
      improving_memories: number;
      stable_memories: number;
    };
  };
  conflictPrediction: {
    potentialConflicts: Array<{
      conflict_id: string;
      type: string;
      affected_memories: string[];
      probability: number;
      predicted_date: string;
      severity: string;
      description: string;
    }>;
    riskAssessment: {
      overall_conflict_risk: number;
      high_risk_areas: string[];
      risk_trends: string;
      mitigation_effectiveness: number;
    };
  };
  optimizationOpportunities: {
    consolidationCandidates: Array<{
      opportunity_id: string;
      type: string;
      memories: string[];
      potential_improvement: number;
      effort_required: string;
      description: string;
    }>;
    qualityImprovements: Array<{
      improvement_id: string;
      type: string;
      memory_id: string;
      current_score: number;
      potential_score: number;
      required_actions: string[];
    }>;
  };
  actionableInsights: {
    immediateActions: Array<{
      action: string;
      priority: string;
      timeline: string;
      estimated_impact: number;
      description: string;
    }>;
    strategicRecommendations: Array<{
      recommendation: string;
      timeline: string;
      estimated_impact: number;
      description: string;
    }>;
  };
}

// Hook for contextual intelligence data
export const useContextualIntelligence = (workspace: string = 'all') => {
  const [data, setData] = useState<ContextualIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchContextualIntelligence = useCallback(async () => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ide-memory/contextual-intelligence?workspace=${workspace}&includeEcosystemState=true&includePredictions=true&includeRelationships=true`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Handle service unavailable (503) and other error responses
        const errorResponse = await response.json().catch(() => ({}));
        const errorMessage = errorResponse.error || errorResponse.message || `HTTP ${response.status}`;
        const details = errorResponse.details || 'Service temporarily unavailable';
        
        throw new Error(`${errorMessage}: ${details}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching contextual intelligence:', err);
        setError(err.message);
        // Don't show toast for expected API failures during development
      }
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchContextualIntelligence();

    const start = () => {
      if (intervalRef.current) return;
      // Refresh every 30s when visible
      intervalRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchContextualIntelligence();
        }
      }, 30000);
    };

    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        start();
        // Kick a refresh immediately when returning visible
        fetchContextualIntelligence();
      } else {
        stop();
        // Abort any in-flight request when hidden
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }
    };

    // Initialize according to current visibility
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      start();
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refresh: fetchContextualIntelligence };
};

// Hook for quality scoring data
export const useQualityScoring = (memoryId?: string) => {
  const [data, setData] = useState<QualityScoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Provide mock data for now until API endpoints are implemented
    const mockData: QualityScoring = {
      overallQuality: {
        score: 0.87,
        grade: 'B+',
        trend: 'improving',
        lastUpdated: new Date().toISOString()
      },
      dimensionalScores: {
        accuracy: {
          score: 0.89,
          confidence: 0.92,
          factors: [
            { factor: 'Source verification', impact: 0.25, description: 'High-quality sources referenced' }
          ],
          recommendations: ['Verify recent updates', 'Cross-reference with documentation']
        },
        consistency: {
          score: 0.91,
          confidence: 0.88,
          factors: [
            { factor: 'Terminology alignment', impact: 0.30, description: 'Consistent technical terminology' }
          ],
          recommendations: ['Standardize naming conventions']
        },
        relevance: {
          score: 0.84,
          confidence: 0.85,
          factors: [
            { factor: 'Current project alignment', impact: 0.35, description: 'Matches active development' }
          ],
          recommendations: ['Update context tags', 'Review project relevance']
        },
        completeness: {
          score: 0.78,
          confidence: 0.80,
          factors: [
            { factor: 'Documentation coverage', impact: 0.40, description: 'Some gaps in implementation details' }
          ],
          recommendations: ['Add implementation examples', 'Include troubleshooting steps']
        },
        temporalDecay: {
          score: 0.82,
          confidence: 0.75,
          factors: [
            { factor: 'Last update recency', impact: 0.45, description: 'Recently updated content' }
          ],
          recommendations: ['Schedule regular reviews', 'Monitor for outdated references']
        }
      },
      actionableInsights: {
        immediateActions: [
          {
            action: 'Update outdated references',
            priority: 'high',
            estimated_impact: 0.12,
            description: 'Replace deprecated API references with current versions'
          },
          {
            action: 'Add missing examples',
            priority: 'medium',
            estimated_impact: 0.08,
            description: 'Include practical implementation examples'
          }
        ],
        longTermRecommendations: [
          {
            recommendation: 'Implement automated quality monitoring',
            timeline: '2-3 weeks',
            estimated_impact: 0.25,
            description: 'Set up continuous quality assessment pipeline'
          },
          {
            recommendation: 'Establish memory lifecycle management',
            timeline: '1 month',
            estimated_impact: 0.18,
            description: 'Create systematic approach to memory maintenance'
          }
        ]
      }
    };

    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 300);
  }, [memoryId]);

  return { data, loading, error, refresh: () => {} };
};

// Hook for ecosystem state monitoring
export const useEcosystemState = () => {
  const [data, setData] = useState<EcosystemState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEcosystemState = useCallback(async () => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        '/api/ide-memory/ecosystem-state?includeServices=true&includeMetrics=true&includeCompliance=true',
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Handle service unavailable (503) and other error responses
        const errorResponse = await response.json().catch(() => ({}));
        const errorMessage = errorResponse.error || errorResponse.message || `HTTP ${response.status}`;
        const details = errorResponse.details || 'Service temporarily unavailable';
        
        throw new Error(`${errorMessage}: ${details}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching ecosystem state:', err);
        setError(err.message);
        // Removed toast dependency to prevent infinite recursion
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEcosystemState();

    const start = () => {
      if (intervalRef.current) return;
      // Refresh every 15s when visible
      intervalRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchEcosystemState();
        }
      }, 15000);
    };

    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        start();
        // Immediate refresh upon becoming visible
        fetchEcosystemState();
      } else {
        stop();
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }
    };

    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      start();
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refresh: fetchEcosystemState };
};

// Hook for predictive analytics
export const usePredictiveAnalytics = (predictionHorizon: string = '30d') => {
  const [data, setData] = useState<PredictiveAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchPredictiveAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ide-memory/predictive-analytics?predictionHorizon=${predictionHorizon}&analysisType=comprehensive&includeRecommendations=true&confidenceThreshold=0.7`
      );

      if (!response.ok) {
        // Handle service unavailable (503) and other error responses
        const errorResponse = await response.json().catch(() => ({}));
        const errorMessage = errorResponse.error || errorResponse.message || `HTTP ${response.status}`;
        const details = errorResponse.details || 'Service temporarily unavailable';
        
        throw new Error(`${errorMessage}: ${details}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching predictive analytics:', err);
      setError(err.message);
      toast({
        title: 'Predictive Analytics Error',
        description: 'Failed to load predictive analytics data. Using fallback data.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [predictionHorizon, toast]);

  useEffect(() => {
    fetchPredictiveAnalytics();
    
    // Set up periodic refresh (every 5 minutes for predictive data)
    const interval = setInterval(fetchPredictiveAnalytics, 300000);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchPredictiveAnalytics]);

  return { data, loading, error, refresh: fetchPredictiveAnalytics };
};
