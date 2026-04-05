/**
 * Intelligent Cluster Manager - Dashboard Integration
 * 
 * Provides the Dashboard-side interface for intelligent cluster management
 * that communicates with AHIS server for decision-making and orchestration.
 * 
 * Part of the AI Homelab Ecosystem architecture.
 */

import { getAHISClient, trackDashboardActivity } from '../ahis-service';
import { EventEmitter } from 'events';

export interface ClusterProfile {
  id: string;
  name: string;
  description: string;
  services: string[];
  resourceRequirements: {
    minCpu: number;
    minMemory: number;
    maxCpu: number;
    maxMemory: number;
  };
  schedule?: {
    autoStart?: string; // cron expression
    autoStop?: string;  // cron expression
    timezone?: string;
  };
  triggers: {
    startConditions: ClusterTrigger[];
    stopConditions: ClusterTrigger[];
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  intelligence: {
    learningEnabled: boolean;
    optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
    costAwareness: 'low' | 'medium' | 'high';
  };
}

export interface ClusterTrigger {
  type: 'time' | 'resource' | 'service_request' | 'user_activity' | 'external_event';
  condition: string;
  threshold?: number;
  duration?: number; // minutes
  enabled: boolean;
}

export interface ClusterMetrics {
  cpu: { usage: number; available: number };
  memory: { usage: number; available: number };
  pods: { running: number; total: number };
  services: { healthy: number; total: number };
  lastActivity: Date;
  predictedLoad: number; // 0-1 scale
  costPerHour: number;
  efficiency: number; // 0-1 scale
}

export interface IntelligentRecommendation {
  action: 'start' | 'stop' | 'scale_up' | 'scale_down' | 'maintain' | 'migrate';
  confidence: number; // 0-1
  reasoning: string[];
  estimatedImpact: {
    resourceSavings?: number;
    performanceImprovement?: number;
    costReduction?: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  scheduledFor?: Date;
  alternatives: AlternativeAction[];
}

export interface AlternativeAction {
  action: string;
  confidence: number;
  pros: string[];
  cons: string[];
  estimatedImpact: any;
}

export interface ClusterOperationRequest {
  clusterId: string;
  action: 'start' | 'stop' | 'restart' | 'scale' | 'evaluate';
  parameters?: {
    replicas?: number;
    resourceLimits?: { cpu: number; memory: string };
    services?: string[];
    timeout?: number;
  };
  context?: {
    userActivity?: 'low' | 'medium' | 'high';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    reason?: string;
  };
}

export interface ClusterOperationResponse {
  success: boolean;
  recommendation?: IntelligentRecommendation;
  executionResult?: {
    status: 'completed' | 'in_progress' | 'failed';
    message: string;
    details?: any;
  };
  error?: string;
}

export class IntelligentClusterManager extends EventEmitter {
  private profiles: Map<string, ClusterProfile> = new Map();
  private metrics: Map<string, ClusterMetrics> = new Map();
  private recommendations: Map<string, IntelligentRecommendation> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeDefaultProfiles();
    this.startIntelligentMonitoring();
  }

  /**
   * Initialize default cluster profiles for common AI Homelab scenarios
   */
  private initializeDefaultProfiles(): void {
    const profiles: ClusterProfile[] = [
      {
        id: 'development',
        name: 'Development Environment',
        description: 'Lightweight cluster for active development work',
        services: ['api-gateway', 'knowledge-graph', 'monitoring-basic'],
        resourceRequirements: {
          minCpu: 2,
          minMemory: 4096,
          maxCpu: 6,
          maxMemory: 8192
        },
        schedule: {
          autoStart: '0 9 * * 1-5', // 9 AM weekdays
          autoStop: '0 18 * * 1-5', // 6 PM weekdays
          timezone: 'America/Chicago'
        },
        triggers: {
          startConditions: [
            {
              type: 'user_activity',
              condition: 'ide_active',
              enabled: true
            },
            {
              type: 'service_request',
              condition: 'api_request_received',
              enabled: true
            }
          ],
          stopConditions: [
            {
              type: 'user_activity',
              condition: 'idle',
              duration: 30, // 30 minutes of inactivity
              enabled: true
            },
            {
              type: 'resource',
              condition: 'low_usage',
              threshold: 0.1, // 10% usage
              duration: 15,
              enabled: true
            }
          ]
        },
        priority: 'medium',
        intelligence: {
          learningEnabled: true,
          optimizationLevel: 'aggressive',
          costAwareness: 'high'
        }
      },
      {
        id: 'production',
        name: 'Production Services',
        description: 'Full production cluster with all services',
        services: ['all'],
        resourceRequirements: {
          minCpu: 4,
          minMemory: 8192,
          maxCpu: 12,
          maxMemory: 16384
        },
        triggers: {
          startConditions: [
            {
              type: 'external_event',
              condition: 'external_api_request',
              enabled: true
            }
          ],
          stopConditions: [
            {
              type: 'resource',
              condition: 'critical_low_usage',
              threshold: 0.05,
              duration: 60,
              enabled: false // Never auto-stop production
            }
          ]
        },
        priority: 'critical',
        intelligence: {
          learningEnabled: true,
          optimizationLevel: 'conservative',
          costAwareness: 'medium'
        }
      },
      {
        id: 'research',
        name: 'ML/AI Research Environment',
        description: 'High-resource cluster for ML/AI research',
        services: ['knowledge-graph', 'ai-gateway', 'jupyter', 'gpu-services'],
        resourceRequirements: {
          minCpu: 8,
          minMemory: 16384,
          maxCpu: 24,
          maxMemory: 65536
        },
        schedule: {
          autoStart: '0 8 * * 1-5', // 8 AM weekdays
          autoStop: '0 22 * * *',  // 10 PM daily
          timezone: 'America/Chicago'
        },
        triggers: {
          startConditions: [
            {
              type: 'time',
              condition: 'business_hours',
              enabled: true
            },
            {
              type: 'resource',
              condition: 'gpu_needed',
              enabled: true
            }
          ],
          stopConditions: [
            {
              type: 'time',
              condition: 'after_hours',
              enabled: true
            },
            {
              type: 'resource',
              condition: 'low_usage',
              threshold: 0.05,
              duration: 60,
              enabled: true
            }
          ]
        },
        priority: 'high',
        intelligence: {
          learningEnabled: true,
          optimizationLevel: 'balanced',
          costAwareness: 'medium'
        }
      }
    ];

    profiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });
  }

  /**
   * Start intelligent monitoring and recommendation generation
   */
  private startIntelligentMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        await this.generateRecommendations();
      } catch (error) {
        console.error('Error in intelligent monitoring:', error);
      }
    }, 30000);
  }

  /**
   * Request cluster operation with intelligent decision support
   */
  async requestClusterOperation(request: ClusterOperationRequest): Promise<ClusterOperationResponse> {
    try {
      // Track the activity
      await trackDashboardActivity({
        taskId: `cluster-${request.action}-${request.clusterId}`,
        action: `cluster_${request.action}`,
        details: request
      });

      // Get AHIS client
      const ahisClient = await getAHISClient();

      // Send request to AHIS for intelligent processing
      const response = await ahisClient.executeCommand('cluster/intelligent-operation', {
        request,
        context: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          dashboardVersion: '1.0.0'
        }
      });

      // Emit event for UI updates
      this.emit('operation_requested', { request, response });

      return response;
    } catch (error) {
      console.error('Error requesting cluster operation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get intelligent recommendation for a cluster
   */
  async getRecommendation(clusterId: string): Promise<IntelligentRecommendation | null> {
    try {
      const ahisClient = await getAHISClient();
      
      const response = await ahisClient.executeCommand('cluster/recommendation/' + clusterId, {
        context: {
          currentMetrics: this.metrics.get(clusterId),
          profile: this.profiles.get(clusterId)
        }
      });

      return response.recommendation || null;
    } catch (error) {
      console.error('Error getting recommendation:', error);
      return null;
    }
  }

  /**
   * Update cluster metrics from AHIS
   */
  private async updateMetrics(): Promise<void> {
    try {
      const ahisClient = await getAHISClient();
      
      const response = await ahisClient.executeCommand('cluster/metrics', {});
      
      if (response.success && response.metrics) {
        Object.entries(response.metrics).forEach(([clusterId, metrics]) => {
          this.metrics.set(clusterId, metrics as ClusterMetrics);
        });

        this.emit('metrics_updated', this.metrics);
      }
    } catch (error) {
      // Silently handle metrics update errors to avoid spam
      console.debug('Error updating metrics:', error);
    }
  }

  /**
   * Generate intelligent recommendations
   */
  private async generateRecommendations(): Promise<void> {
    try {
      const ahisClient = await getAHISClient();
      
      const response = await ahisClient.executeCommand('cluster/recommendations', {
        profiles: Array.from(this.profiles.values()),
        currentMetrics: Object.fromEntries(this.metrics)
      });

      if (response.success && response.recommendations) {
        Object.entries(response.recommendations).forEach(([clusterId, recommendation]) => {
          this.recommendations.set(clusterId, recommendation as IntelligentRecommendation);
        });

        this.emit('recommendations_updated', this.recommendations);
      }
    } catch (error) {
      console.debug('Error generating recommendations:', error);
    }
  }

  /**
   * Get all cluster profiles
   */
  getProfiles(): ClusterProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get cluster profile by ID
   */
  getProfile(clusterId: string): ClusterProfile | undefined {
    return this.profiles.get(clusterId);
  }

  /**
   * Update cluster profile
   */
  async updateProfile(profile: ClusterProfile): Promise<boolean> {
    try {
      const ahisClient = await getAHISClient();
      
      const response = await ahisClient.executeCommand('cluster/profile', {
        profile
      });

      if (response.success) {
        this.profiles.set(profile.id, profile);
        this.emit('profile_updated', profile);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  /**
   * Get current metrics for a cluster
   */
  getMetrics(clusterId: string): ClusterMetrics | undefined {
    return this.metrics.get(clusterId);
  }

  /**
   * Get all current metrics
   */
  getAllMetrics(): Map<string, ClusterMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get current recommendation for a cluster
   */
  getCurrentRecommendation(clusterId: string): IntelligentRecommendation | undefined {
    return this.recommendations.get(clusterId);
  }

  /**
   * Get all current recommendations
   */
  getAllRecommendations(): Map<string, IntelligentRecommendation> {
    return new Map(this.recommendations);
  }

  /**
   * Enable/disable learning for a cluster
   */
  async setLearningEnabled(clusterId: string, enabled: boolean): Promise<boolean> {
    try {
      const profile = this.profiles.get(clusterId);
      if (!profile) return false;

      profile.intelligence.learningEnabled = enabled;
      return await this.updateProfile(profile);
    } catch (error) {
      console.error('Error setting learning enabled:', error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
let clusterManagerInstance: IntelligentClusterManager | null = null;

export function getIntelligentClusterManager(): IntelligentClusterManager {
  if (!clusterManagerInstance) {
    clusterManagerInstance = new IntelligentClusterManager();
  }
  return clusterManagerInstance;
}

export default getIntelligentClusterManager;
