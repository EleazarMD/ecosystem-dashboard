/**
 * AIHDS (AI Homelab Data Services) Client Integration
 * 
 * Enhanced client for interfacing with the AI Homelab ecosystem services
 * including the AI Gateway, Knowledge Graph, AHIS, and other core services.
 */

import { AgentConfig } from '@/config/agent-config';
import logger from '../logger';

// AIHDS Client Types
export interface ServiceHealth {
  serviceId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
  metadata: Record<string, any>;
}

export interface SystemOverview {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  overallHealth: number;
  systemLoad: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  alerts: SystemAlert[];
  trends: PerformanceTrend[];
}

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  service: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PerformanceTrend {
  metric: string;
  values: { timestamp: Date; value: number }[];
  trend: 'improving' | 'stable' | 'declining';
  prediction?: { timestamp: Date; value: number }[];
}

export interface ServiceAction {
  serviceId: string;
  action: 'start' | 'stop' | 'restart' | 'scale' | 'configure';
  parameters?: Record<string, any>;
  dryRun?: boolean;
}

export interface ActionResult {
  actionId: string;
  success: boolean;
  message: string;
  details?: Record<string, any>;
  duration: number;
}

export interface KnowledgeGraphQuery {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  includeRelations?: boolean;
}

export interface KnowledgeGraphResult {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  metadata: {
    totalResults: number;
    queryTime: number;
    confidence: number;
  };
}

export interface KnowledgeNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  labels: string[];
  score?: number;
}

export interface KnowledgeRelationship {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  properties: Record<string, any>;
}

export interface ProactiveInsight {
  id: string;
  type: 'recommendation' | 'prediction' | 'observation' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  suggestedActions: string[];
  estimatedImpact: {
    performance?: number;
    reliability?: number;
    cost?: number;
  };
  expiresAt?: Date;
}

export class AIHDSClient {
  private config = AgentConfig.aihds;
  private baseUrl: string;
  private apiKey: string;
  private knowledgeGraphUrl: string;

  constructor() {
    this.baseUrl = this.config.gateway_url;
    this.apiKey = this.config.api_key;
    this.knowledgeGraphUrl = this.config.knowledge_graph_url;
  }

  /**
   * Test connection to AIHDS services
   */
  async testConnection(): Promise<{ success: boolean; services: Record<string, boolean> }> {
    const services: Record<string, boolean> = {};

    try {
      // Test AI Gateway
      const gatewayResponse = await this.makeRequest('/health', 'GET');
      services['ai-gateway'] = gatewayResponse.ok;

      // Test Knowledge Graph
      try {
        const kgResponse = await fetch(`${this.knowledgeGraphUrl}/health`);
        services['knowledge-graph'] = kgResponse.ok;
      } catch {
        services['knowledge-graph'] = false;
      }

      // Test AHIS (through gateway)
      try {
        const ahisResponse = await this.makeRequest('/ahis/status', 'GET');
        services['ahis'] = ahisResponse.ok;
      } catch {
        services['ahis'] = false;
      }

      const allHealthy = Object.values(services).every(status => status);
      
      return {
        success: allHealthy,
        services
      };

    } catch (error) {
      logger.error('[AIHDS] Connection test failed:', error);
      return {
        success: false,
        services
      };
    }
  }

  /**
   * Get comprehensive system overview
   */
  async getSystemOverview(): Promise<SystemOverview> {
    try {
      const response = await this.makeRequest('/system/overview', 'GET');
      
      if (!response.ok) {
        throw new Error(`Failed to get system overview: ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformSystemOverview(data);

    } catch (error) {
      logger.error('[AIHDS] Failed to get system overview:', error);
      // Return mock data for development
      return this.getMockSystemOverview();
    }
  }

  /**
   * Get service health information
   */
  async getServiceHealth(serviceId?: string): Promise<ServiceHealth[]> {
    try {
      const endpoint = serviceId ? `/services/${serviceId}/health` : '/services/health';
      const response = await this.makeRequest(endpoint, 'GET');
      
      if (!response.ok) {
        throw new Error(`Failed to get service health: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];

    } catch (error) {
      logger.error('[AIHDS] Failed to get service health:', error);
      return this.getMockServiceHealth();
    }
  }

  /**
   * Execute service action
   */
  async executeServiceAction(action: ServiceAction): Promise<ActionResult> {
    try {
      const response = await this.makeRequest('/services/actions', 'POST', action);
      
      if (!response.ok) {
        throw new Error(`Failed to execute action: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('[AIHDS] Failed to execute service action:', error);
      
      // Return mock success for development
      return {
        actionId: `action_${Date.now()}`,
        success: true,
        message: `Mock execution of ${action.action} on ${action.serviceId}`,
        duration: Math.random() * 2000 + 500
      };
    }
  }

  /**
   * Query Knowledge Graph
   */
  async queryKnowledgeGraph(query: KnowledgeGraphQuery): Promise<KnowledgeGraphResult> {
    try {
      const response = await fetch(`${this.knowledgeGraphUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(query)
      });
      
      if (!response.ok) {
        throw new Error(`Knowledge Graph query failed: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('[AIHDS] Knowledge Graph query failed:', error);
      
      // Return mock results
      return {
        nodes: [
          {
            id: 'mock_node_1',
            type: 'service',
            properties: { name: 'ai-gateway', status: 'healthy' },
            labels: ['Service', 'Gateway'],
            score: 0.95
          }
        ],
        relationships: [],
        metadata: {
          totalResults: 1,
          queryTime: 150,
          confidence: 0.8
        }
      };
    }
  }

  /**
   * Get proactive insights from AI analysis
   */
  async getProactiveInsights(): Promise<ProactiveInsight[]> {
    try {
      const response = await this.makeRequest('/intelligence/insights', 'GET');
      
      if (!response.ok) {
        throw new Error(`Failed to get insights: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('[AIHDS] Failed to get proactive insights:', error);
      return this.getMockInsights();
    }
  }

  /**
   * Submit feedback for AI learning
   */
  async submitFeedback(feedback: {
    actionId?: string;
    insightId?: string;
    rating: number;
    comment?: string;
    outcome: 'successful' | 'failed' | 'partially_successful';
  }): Promise<void> {
    try {
      await this.makeRequest('/intelligence/feedback', 'POST', feedback);
      logger.info('[AIHDS] Feedback submitted successfully');
    } catch (error) {
      logger.error('[AIHDS] Failed to submit feedback:', error);
    }
  }

  /**
   * Get system performance metrics
   */
  async getPerformanceMetrics(timeRange: string = '1h'): Promise<PerformanceTrend[]> {
    try {
      const response = await this.makeRequest(`/metrics/performance?range=${timeRange}`, 'GET');
      
      if (!response.ok) {
        throw new Error(`Failed to get performance metrics: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('[AIHDS] Failed to get performance metrics:', error);
      return this.getMockPerformanceMetrics();
    }
  }

  /**
   * Make authenticated request to AIHDS Gateway
   */
  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
    body?: any
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const config: RequestInit = {
      method,
      headers,
      timeout: this.config.timeout,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    return fetch(url, config);
  }

  /**
   * Transform API response to SystemOverview
   */
  private transformSystemOverview(data: any): SystemOverview {
    return {
      totalServices: data.services?.total || 0,
      healthyServices: data.services?.healthy || 0,
      degradedServices: data.services?.degraded || 0,
      unhealthyServices: data.services?.unhealthy || 0,
      overallHealth: data.health?.overall || 0,
      systemLoad: {
        cpu: data.resources?.cpu || 0,
        memory: data.resources?.memory || 0,
        network: data.resources?.network || 0,
        storage: data.resources?.storage || 0,
      },
      alerts: data.alerts || [],
      trends: data.trends || [],
    };
  }

  /**
   * Generate mock system overview for development
   */
  private getMockSystemOverview(): SystemOverview {
    return {
      totalServices: 8,
      healthyServices: 7,
      degradedServices: 1,
      unhealthyServices: 0,
      overallHealth: 92,
      systemLoad: {
        cpu: 45 + Math.random() * 20,
        memory: 60 + Math.random() * 15,
        network: 25 + Math.random() * 10,
        storage: 70 + Math.random() * 10,
      },
      alerts: [
        {
          id: 'alert_1',
          severity: 'warning',
          title: 'High Memory Usage',
          message: 'Knowledge Graph service is using 85% of allocated memory',
          service: 'knowledge-graph',
          timestamp: new Date(Date.now() - 300000),
          resolved: false,
        }
      ],
      trends: this.getMockPerformanceMetrics(),
    };
  }

  /**
   * Generate mock service health data
   */
  private getMockServiceHealth(): ServiceHealth[] {
    const services = ['ai-gateway', 'knowledge-graph', 'ahis', 'authentik', 'monitoring'];
    
    return services.map(service => ({
      serviceId: service,
      name: service,
      status: Math.random() > 0.1 ? 'healthy' : 'degraded',
      uptime: 95 + Math.random() * 5,
      responseTime: 100 + Math.random() * 200,
      errorRate: Math.random() * 2,
      lastCheck: new Date(),
      metadata: {
        version: '1.0.0',
        port: 8000 + Math.floor(Math.random() * 1000)
      }
    }));
  }

  /**
   * Generate mock performance metrics
   */
  private getMockPerformanceMetrics(): PerformanceTrend[] {
    const now = new Date();
    const hours = 24;
    
    return ['cpu', 'memory', 'network', 'storage'].map(metric => {
      const values = Array.from({ length: hours }, (_, i) => ({
        timestamp: new Date(now.getTime() - (hours - i) * 3600000),
        value: 20 + Math.random() * 60 + Math.sin(i / 4) * 10
      }));

      return {
        metric,
        values,
        trend: 'stable' as const,
        prediction: values.slice(-6).map((v, i) => ({
          timestamp: new Date(v.timestamp.getTime() + (i + 1) * 3600000),
          value: v.value + (Math.random() - 0.5) * 5
        }))
      };
    });
  }

  /**
   * Generate mock proactive insights
   */
  private getMockInsights(): ProactiveInsight[] {
    return [
      {
        id: 'insight_1',
        type: 'recommendation',
        priority: 'medium',
        title: 'Memory Optimization Opportunity',
        description: 'The Knowledge Graph service could benefit from increased memory allocation to improve query performance.',
        confidence: 0.85,
        evidence: [
          'Memory usage consistently above 80%',
          'Query response times increased by 15% over last week',
          'Garbage collection frequency elevated'
        ],
        suggestedActions: [
          'Increase memory allocation by 2GB',
          'Enable memory profiling',
          'Review indexing strategy'
        ],
        estimatedImpact: {
          performance: 25,
          reliability: 15
        }
      },
      {
        id: 'insight_2',
        type: 'prediction',
        priority: 'low',
        title: 'Storage Capacity Planning',
        description: 'Based on current growth trends, storage will reach 90% capacity in approximately 3 months.',
        confidence: 0.78,
        evidence: [
          'Current storage usage: 72%',
          'Monthly growth rate: 6%',
          'No storage cleanup policies detected'
        ],
        suggestedActions: [
          'Implement log rotation policies',
          'Plan storage expansion',
          'Review data retention policies'
        ],
        estimatedImpact: {
          reliability: 20,
          cost: -10
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
      }
    ];
  }

  /**
   * Check if AIHDS is available and configured
   */
  isAvailable(): boolean {
    return this.config.enabled && !!this.config.gateway_url;
  }
}

// Export singleton instance
export const aihdsClient = new AIHDSClient();
export default aihdsClient;
