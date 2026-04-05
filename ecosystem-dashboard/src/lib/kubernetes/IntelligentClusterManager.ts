/**
 * Kubernetes Intelligent Cluster Manager
 * 
 * Dashboard integration with the Kubernetes Intelligent Cluster Operator.
 * Provides intelligent cluster lifecycle management through K8s-native APIs.
 */

import axios from 'axios';

export interface ClusterProfile {
  id: string;
  name: string;
  description: string;
  namespace: string;
  services: string[];
  resourceLimits: {
    cpu: string;
    memory: string;
    'nvidia.com/gpu'?: string;
  };
  autoScale: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
  };
  intelligentScheduling: {
    autoStart: string | null;
    autoStop: string | null;
    idleTimeout: number | null;
  };
}

export interface ClusterMetrics {
  cpu: {
    usage: number;
    available: number;
    requests: number;
    limits: number;
  };
  memory: {
    usage: number;
    available: number;
    requests: number;
    limits: number;
  };
  pods: {
    total: number;
    running: number;
    pending: number;
    failed: number;
    ready: number;
  };
  services: {
    total: number;
    external: number;
    internal: number;
    healthy: number;
  };
  lastActivity: string;
  predictedLoad: number;
  costPerHour: number;
  efficiency: number;
  network?: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  storage?: {
    used: number;
    available: number;
    iops: number;
  };
}

export interface ClusterRecommendation {
  clusterId: string;
  action: 'start' | 'stop' | 'scale_up' | 'scale_down' | 'maintain';
  confidence: number;
  reasoning: string[];
  estimatedImpact: {
    resourceSavings: number;
    performanceImprovement: number;
    costReduction: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  scheduledFor: string | null;
  alternatives: Array<{
    action: string;
    confidence: number;
    pros: string[];
    cons: string[];
    estimatedImpact: {
      costReduction: number;
      performanceImprovement: number;
      riskLevel: string;
    };
  }>;
  timestamp: string;
}

export interface ClusterStatus {
  clusterId: string;
  status: {
    state: 'running' | 'stopped' | 'error';
    pods: {
      running: number;
      total: number;
    };
    services: {
      active: number;
      ready: number;
    };
    ready: boolean;
    lastActivity: string;
    error?: string;
  };
  metrics: ClusterMetrics;
  recommendation: ClusterRecommendation;
  lastUpdated: string;
}

export interface OperationRequest {
  clusterId: string;
  action: 'start' | 'stop' | 'scale_up' | 'scale_down' | 'restart';
  context: {
    userActivity?: 'high' | 'medium' | 'low' | 'idle';
    urgency?: 'critical' | 'high' | 'medium' | 'low';
    reason?: string;
    override?: boolean;
  };
}

export interface OperationResult {
  success: boolean;
  result?: {
    decision: {
      action: string;
      confidence: number;
      shouldExecute: boolean;
      reason: string;
      alternatives: any[];
    };
    execution: {
      status: string;
      message?: string;
      timestamp?: string;
    };
    timestamp: string;
  };
  error?: string;
}

export class KubernetesIntelligentClusterManager {
  private operatorBaseUrl: string;
  private ahisBaseUrl: string;
  private isOperatorConnected: boolean = false;
  private isAhisConnected: boolean = false;

  constructor() {
    this.operatorBaseUrl = process.env.NEXT_PUBLIC_K8S_OPERATOR_URL || 'http://localhost:8081';
    this.ahisBaseUrl = process.env.NEXT_PUBLIC_AHIS_SERVER_URL || 'http://localhost:8895';
    this.checkConnections();
  }

  private async checkConnections() {
    try {
      // Check Kubernetes operator connection
      const operatorResponse = await axios.get(`${this.operatorBaseUrl}/health`, { timeout: 3000 });
      this.isOperatorConnected = operatorResponse.status === 200;
    } catch (error) {
      console.warn('Kubernetes operator not available:', error.message);
      this.isOperatorConnected = false;
    }

    try {
      // Check AHIS connection for coordination
      const ahisResponse = await axios.get(`${this.ahisBaseUrl}/health`, { timeout: 3000 });
      this.isAhisConnected = ahisResponse.status === 200;
    } catch (error) {
      console.warn('AHIS server not available for coordination:', error.message);
      this.isAhisConnected = false;
    }
  }

  /**
   * Get all cluster statuses with metrics and recommendations
   */
  async getAllClusterStatuses(): Promise<ClusterStatus[]> {
    try {
      if (!this.isOperatorConnected) {
        console.warn('Kubernetes operator not available, returning sample data');
        return this.getMockClusterStatuses();
      }

      const response = await axios.get(`${this.operatorBaseUrl}/api/v1/clusters`);
      
      if (response.data.success) {
        return response.data.clusters;
      } else {
        throw new Error(response.data.error || 'Failed to fetch cluster statuses');
      }
    } catch (error) {
      console.error('Error fetching cluster statuses:', error);
      return this.getMockClusterStatuses();
    }
  }

  /**
   * Get metrics for all clusters
   */
  async getAllMetrics(): Promise<Record<string, ClusterMetrics>> {
    try {
      if (!this.isOperatorConnected) {
        console.warn('Kubernetes operator not available, returning sample metrics');
        return this.getMockMetrics();
      }

      const response = await axios.get(`${this.operatorBaseUrl}/api/v1/clusters/metrics`);
      
      if (response.data.success) {
        return response.data.metrics;
      } else {
        throw new Error('Failed to get cluster metrics');
      }
    } catch (error) {
      console.error('Failed to get cluster metrics:', error);
      return this.getMockMetrics();
    }
  }

  /**
   * Get recommendation for a specific cluster
   */
  async getClusterRecommendation(clusterId: string): Promise<ClusterRecommendation> {
    try {
      if (!this.isOperatorConnected) {
        console.warn('Kubernetes operator not available, returning sample recommendation');
        return this.getMockRecommendation(clusterId);
      }

      const response = await axios.get(`${this.operatorBaseUrl}/api/v1/clusters/${clusterId}/recommendation`);
      
      if (response.data.success) {
        return response.data.recommendation;
      } else {
        throw new Error('Failed to get cluster recommendation');
      }
    } catch (error) {
      console.error(`Failed to get recommendation for cluster ${clusterId}:`, error);
      return this.getMockRecommendation(clusterId);
    }
  }

  /**
   * Execute an intelligent cluster operation
   */
  async executeIntelligentOperation(request: OperationRequest): Promise<any> {
    try {
      if (!this.isOperatorConnected) {
        throw new Error('Kubernetes operator not available');
      }

      const response = await axios.post(
        `${this.operatorBaseUrl}/api/v1/clusters/${request.clusterId}/intelligent-operation`,
        {
          action: request.action,
          context: request.context
        }
      );
      
      if (response.data.success) {
        return response.data.result;
      } else {
        throw new Error(response.data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error executing intelligent operation:', error);
      throw error;
    }
  }

  /**
   * Get cluster profiles (from operator configuration)
   */
  async getClusterProfiles(): Promise<ClusterProfile[]> {
    // These are defined in the operator, but we'll provide them here for the UI
    return [
      {
        id: 'development',
        name: 'Development Environment',
        description: 'Lightweight cluster for active development work',
        namespace: 'dev-cluster',
        services: ['api-gateway', 'knowledge-graph', 'monitoring-basic'],
        resourceLimits: {
          cpu: '6000m',
          memory: '8Gi'
        },
        autoScale: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 5
        },
        intelligentScheduling: {
          autoStart: '0 9 * * 1-5',
          autoStop: '0 18 * * 1-5',
          idleTimeout: 30
        }
      },
      {
        id: 'production',
        name: 'Production Services',
        description: 'Full production cluster with all services',
        namespace: 'prod-cluster',
        services: ['all'],
        resourceLimits: {
          cpu: '12000m',
          memory: '16Gi'
        },
        autoScale: {
          enabled: true,
          minReplicas: 3,
          maxReplicas: 10
        },
        intelligentScheduling: {
          autoStart: null,
          autoStop: null,
          idleTimeout: null
        }
      },
      {
        id: 'research',
        name: 'ML/AI Research Environment',
        description: 'High-resource cluster for ML/AI research',
        namespace: 'research-cluster',
        services: ['knowledge-graph', 'ai-gateway', 'jupyter', 'gpu-services'],
        resourceLimits: {
          cpu: '24000m',
          memory: '64Gi',
          'nvidia.com/gpu': '2'
        },
        autoScale: {
          enabled: true,
          minReplicas: 1,
          maxReplicas: 8
        },
        intelligentScheduling: {
          autoStart: '0 8 * * 1-5',
          autoStop: '0 22 * * *',
          idleTimeout: 60
        }
      }
    ];
  }

  /**
   * Get AHIS coordination data (if available)
   */
  async getAHISCoordinationData(): Promise<any> {
    if (!this.isAhisConnected) {
      return null;
    }

    try {
      const response = await axios.get(`${this.ahisBaseUrl}/api/ahis/v1/ecosystem/insights`);
      return response.data;
    } catch (error) {
      console.warn('Failed to get AHIS coordination data:', error);
      return null;
    }
  }

  /**
   * Check if operator and AHIS are available
   */
  getConnectionStatus() {
    return {
      operator: this.isOperatorConnected,
      ahis: this.isAhisConnected,
      mode: this.isOperatorConnected ? 'kubernetes-native' : 'mock'
    };
  }

  // Mock data methods for development/fallback
  private getMockClusterStatuses(): ClusterStatus[] {
    const mockMetrics = this.getMockMetrics();
    
    return Object.keys(mockMetrics).map(clusterId => ({
      clusterId,
      status: {
        state: Math.random() > 0.3 ? 'running' : 'stopped',
        pods: {
          running: Math.floor(Math.random() * 8) + 2,
          total: 10
        },
        services: {
          active: Math.floor(Math.random() * 4) + 2,
          ready: Math.floor(Math.random() * 3) + 2
        },
        ready: Math.random() > 0.2,
        lastActivity: new Date().toISOString()
      },
      metrics: mockMetrics[clusterId],
      recommendation: this.getMockRecommendation(clusterId),
      lastUpdated: new Date().toISOString()
    }));
  }

  private getMockMetrics(): Record<string, ClusterMetrics> {
    return {
      development: {
        cpu: { usage: 25.5, available: 100, requests: 20, limits: 60 },
        memory: { usage: 2048, available: 8192, requests: 1800, limits: 6000 },
        pods: { total: 10, running: 8, pending: 1, failed: 0, ready: 7 },
        services: { total: 5, external: 2, internal: 3, healthy: 4 },
        lastActivity: new Date().toISOString(),
        predictedLoad: 0.6,
        costPerHour: 0.45,
        efficiency: 0.75
      },
      production: {
        cpu: { usage: 45.2, available: 100, requests: 40, limits: 80 },
        memory: { usage: 8192, available: 16384, requests: 7000, limits: 12000 },
        pods: { total: 15, running: 14, pending: 0, failed: 0, ready: 13 },
        services: { total: 8, external: 4, internal: 4, healthy: 7 },
        lastActivity: new Date().toISOString(),
        predictedLoad: 0.8,
        costPerHour: 1.25,
        efficiency: 0.85
      },
      research: {
        cpu: { usage: 65.8, available: 100, requests: 60, limits: 90 },
        memory: { usage: 32768, available: 65536, requests: 28000, limits: 50000 },
        pods: { total: 12, running: 10, pending: 1, failed: 0, ready: 9 },
        services: { total: 6, external: 2, internal: 4, healthy: 5 },
        lastActivity: new Date().toISOString(),
        predictedLoad: 0.9,
        costPerHour: 2.80,
        efficiency: 0.70
      }
    };
  }

  private getMockRecommendation(clusterId: string): ClusterRecommendation {
    const actions = ['start', 'stop', 'scale_up', 'scale_down', 'maintain'] as const;
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    return {
      clusterId,
      action,
      confidence: Math.random() * 0.4 + 0.5, // 0.5 to 0.9
      reasoning: [
        'Based on current resource utilization patterns',
        'User activity levels indicate optimal timing',
        'Cost optimization opportunity identified'
      ],
      estimatedImpact: {
        resourceSavings: action === 'stop' ? 85 : action === 'scale_down' ? 40 : 0,
        performanceImprovement: action === 'start' ? 80 : action === 'scale_up' ? 60 : 0,
        costReduction: action === 'stop' ? 0.8 : action === 'scale_down' ? 0.3 : -0.2,
        riskLevel: action === 'stop' ? 'medium' : 'low'
      },
      scheduledFor: Math.random() > 0.5 ? new Date(Date.now() + 3600000).toISOString() : null,
      alternatives: [
        {
          action: 'scale_down',
          confidence: 0.6,
          pros: ['Maintains availability', 'Reduces costs'],
          cons: ['Partial optimization only'],
          estimatedImpact: {
            costReduction: 50,
            performanceImprovement: 0,
            riskLevel: 'low'
          }
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
}
