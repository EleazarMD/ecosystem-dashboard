/**
 * Shared Agent type definitions for the Agentic Control Dashboard
 * This ensures consistent Agent interfaces across all components
 */

export interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'configuring' | 'deploying' | 'stopping';
  platform: string;
  lastHeartbeat: string;
  capabilities: Record<string, boolean>;
  performance: {
    responseTime: number;
    throughput: number;
    uptime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    networkIO: number;
    diskIO: number;
  };
  health: {
    overall: number;
    components: {
      connectivity: number;
      performance: number;
      resources: number;
      dependencies: number;
      security: number;
    };
    trend: 'improving' | 'stable' | 'degrading';
    lastCheck: string;
    issues: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      component: string;
      message: string;
      timestamp: string;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
    type?: string;
    metric?: string;
    threshold?: number;
    currentValue?: number;
  }>;
  recommendations: Array<{
    id: string;
    category: 'performance' | 'security' | 'cost' | 'configuration' | 'scaling' | 'resource';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImprovement: string;
    implementationCost: 'low' | 'medium' | 'high';
    autoApplicable: boolean;
  }>;
  deployment: {
    strategy: 'rolling' | 'blue-green' | 'canary';
    replicas: {
      desired: number;
      current: number;
      ready: number;
    };
    resources: {
      requests: { cpu: string; memory: string; };
      limits: { cpu: string; memory: string; };
    };
    healthCheck: {
      enabled: boolean;
      path: string;
      interval: number;
      timeout?: number;
      retries?: number;
    };
    status: 'deployed' | 'deploying' | 'failed' | 'stopped';
    lastDeployed: string;
    lastDeployment?: string;
    environment?: string;
    rolloutStatus?: string;
    rolloutProgress?: number;
    history: Array<{
      version: string;
      timestamp: string;
      status: 'success' | 'failed' | 'rolled-back';
      duration: number;
    }>;
  };
  configuration: {
    features: Record<string, boolean>;
    resources: {
      cpu: number;
      memory: number;
    };
    environment: Record<string, string>;
    model?: string;
  };
  dependencies?: Array<{
    id: string;
    name: string;
    type: 'agent' | 'service' | 'database' | 'external';
    status: 'healthy' | 'degraded' | 'unavailable';
    lastCheck: string;
    responseTime?: number;
    uptime?: number;
  }>;
  metrics?: any;
  remediation?: any;
  incidents?: any;
  error?: string;
}

export interface AgentAction {
  type: 'start' | 'stop' | 'restart' | 'deploy' | 'configure';
  agentId: string;
  timestamp: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  details?: any;
}

export interface AgentConfiguration {
  features: Record<string, boolean>;
  resources: {
    cpu: number;
    memory: number;
  };
  environment: Record<string, string>;
}

export type AgentStatus = Agent['status'];
export type AgentType = Agent['type'];
export type DeploymentStrategy = Agent['deployment']['strategy'];
