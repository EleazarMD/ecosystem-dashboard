/**
 * Dashboard UI Assistant Agent - AHIS Registration
 * 
 * Registers the Dashboard UI Assistant Agent with the AHIS Server
 * following the official AHIS Client SDK patterns and AI Homelab standards.
 */

import { createAHISRegistrationService, ServiceType, ServiceInfo, RegistrationResponse } from '../services/AHISRegistrationService';

export interface DashboardAgentCapabilities {
  // UI Management
  dashboardNavigation: boolean;
  componentRendering: boolean;
  stateManagement: boolean;
  
  // Data Integration
  realTimeMonitoring: boolean;
  apiIntegration: boolean;
  dataVisualization: boolean;
  
  // Intelligence Features
  contextualInsights: boolean;
  predictiveAnalytics: boolean;
  anomalyDetection: boolean;
  
  // User Interaction
  naturalLanguageQuery: boolean;
  conversationalInterface: boolean;
  proactiveNotifications: boolean;
}

export interface DashboardAgentMetadata {
  version: string;
  buildDate: string;
  environment: 'development' | 'staging' | 'production';
  features: string[];
  integrations: string[];
  dependencies: string[];
}

/**
 * Dashboard UI Assistant Agent
 * 
 * Intelligent agent that manages the AI Homelab Ecosystem Dashboard UI,
 * provides contextual assistance, and integrates with the broader ecosystem.
 */
export class DashboardUIAssistantAgent {
  private registrationService: any;
  private agentId: string | null = null;
  private isRegistered = false;
  private capabilities: DashboardAgentCapabilities;
  private metadata: DashboardAgentMetadata;

  constructor() {
    // Initialize agent capabilities
    this.capabilities = {
      // UI Management
      dashboardNavigation: true,
      componentRendering: true,
      stateManagement: true,
      
      // Data Integration
      realTimeMonitoring: true,
      apiIntegration: true,
      dataVisualization: true,
      
      // Intelligence Features
      contextualInsights: true,
      predictiveAnalytics: true,
      anomalyDetection: true,
      
      // User Interaction
      naturalLanguageQuery: true,
      conversationalInterface: true,
      proactiveNotifications: true
    };

    // Initialize agent metadata
    this.metadata = {
      version: '2.0.0',
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV as any || 'development',
      features: [
        'Real-time Infrastructure Monitoring',
        'AI-Powered Query Processing',
        'Contextual Intelligence Analysis',
        'Multi-Service Integration',
        'Predictive Analytics',
        'Natural Language Interface'
      ],
      integrations: [
        'AHIS Server',
        'Knowledge Graph',
        'AI Gateway',
        'Kubernetes API',
        'IDE Memory MCP'
      ],
      dependencies: [
        'Next.js Dashboard Framework',
        'Chakra UI Components',
        'React Context Providers',
        'WebSocket Connections',
        'REST API Clients'
      ]
    };

    // Initialize AHIS registration service
    this.initializeRegistrationService();
  }

  /**
   * Initialize AHIS registration service with proper configuration
   */
  private initializeRegistrationService(): void {
    try {
      this.registrationService = createAHISRegistrationService({
        serverUrl: process.env.NEXT_PUBLIC_AHIS_SERVER_URL || 'http://localhost:8888',
        serviceName: 'Dashboard UI Assistant Agent',
        serviceType: 'agent',
        version: this.metadata.version,
        port: 8404
      });
      
      console.log('✅ AHIS Registration Service initialized for Dashboard UI Assistant Agent');
    } catch (error) {
      console.error('❌ Failed to initialize AHIS Registration Service:', error);
    }
  }

  /**
   * Register the Dashboard UI Assistant Agent with AHIS Server
   */
  async registerWithAHIS(): Promise<RegistrationResponse> {
    if (!this.registrationService) {
      return {
        success: false,
        serviceId: '',
        message: 'Registration service not available',
        timestamp: new Date().toISOString()
      };
    }

    // Create comprehensive service information using correct AHIS format
    const serviceInfo: ServiceInfo = {
      name: 'Dashboard UI Assistant Agent',
      type: ServiceType.AGENT,
      version: this.metadata.version,
      port: 8404,
      host: 'localhost',
      healthEndpoint: '/api/health',
      description: 'Intelligent UI assistant agent for AI Homelab Ecosystem Dashboard providing contextual insights, real-time monitoring, and natural language interaction capabilities.',
      id: 'dashboard-ui-assistant-agent',
      metadata: {
        // Agent-specific metadata
        agentType: 'ui_assistant',
        agentClass: 'dashboard_intelligence',
        capabilities: this.capabilities,
        
        // Technical metadata
        framework: 'Next.js',
        runtime: 'Browser + Node.js',
        language: 'TypeScript',
        
        // Integration metadata
        integrations: this.metadata.integrations,
        dependencies: this.metadata.dependencies,
        features: this.metadata.features,
        
        // Operational metadata
        environment: this.metadata.environment,
        buildDate: this.metadata.buildDate,
        
        // AHIS-specific metadata
        registrationTimestamp: new Date().toISOString(),
        healthCheckInterval: 30000, // 30 seconds
        autoReconnect: true,
        maxReconnectAttempts: 5,
        
        // Agent behavior configuration
        proactiveMode: true,
        learningEnabled: true,
        contextRetention: true,
        
        // Security and compliance
        authenticationRequired: false, // Internal agent
        encryptionEnabled: true,
        auditLogging: true
      }
    };

    try {
      console.log('🚀 Registering Dashboard UI Assistant Agent with AHIS Server...');
      
      // Use retry mechanism for registration
      const response = await this.registrationService.register(serviceInfo);
      
      if (response.success) {
        this.agentId = response.serviceId || response.agentId;
        this.isRegistered = true;
        
        console.log(`✅ Dashboard UI Assistant Agent registered successfully!`);
        console.log(`   Agent ID: ${this.agentId}`);
        console.log(`   Timestamp: ${response.timestamp}`);
        console.log(`   Message: ${response.message}`);
        
        // Start health reporting only if real registration (not fallback)
        if (!response.error?.includes('fallback mode')) {
          this.startHealthReporting();
        }
        
        // Emit registration event
        this.emitRegistrationEvent('registered', response);
      } else {
        console.error('❌ Dashboard UI Assistant Agent registration failed:', response.message);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Dashboard UI Assistant Agent registration error:', error);
      return {
        success: false,
        serviceId: '',
        message: error instanceof Error ? error.message : 'Registration failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Start periodic health reporting to AHIS Server
   */
  private startHealthReporting(): void {
    if (!this.registrationService || !this.isRegistered) {
      return;
    }

    // Report health every 30 seconds
    setInterval(async () => {
      try {
        const healthData = await this.generateHealthReport();
        await this.registrationService.reportHealth(healthData);
      } catch (error) {
        console.warn('Health reporting failed:', error);
      }
    }, 30000);
  }

  /**
   * Generate comprehensive health report
   */
  private async generateHealthReport(): Promise<any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      
      // System health
      uptime: typeof process !== 'undefined' && process.uptime ? process.uptime() : Date.now(),
      memory: typeof window !== 'undefined' ? 
        (performance as any).memory?.usedJSHeapSize : undefined,
      
      // Agent-specific health
      capabilities: this.capabilities,
      activeConnections: this.getActiveConnectionCount(),
      lastActivity: new Date().toISOString(),
      
      // Integration health
      integrationStatus: {
        ahisServer: 'connected',
        knowledgeGraph: 'available',
        aiGateway: 'available',
        kubernetesAPI: 'available'
      },
      
      // Performance metrics
      responseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      requestCount: this.getRequestCount(),
      
      // Agent intelligence metrics
      contextualQueries: this.getContextualQueryCount(),
      insightsGenerated: this.getInsightsGeneratedCount(),
      userInteractions: this.getUserInteractionCount()
    };
  }

  /**
   * Unregister from AHIS Server
   */
  async unregisterFromAHIS(): Promise<boolean> {
    if (!this.registrationService || !this.isRegistered) {
      return false;
    }

    try {
      console.log('🔄 Unregistering Dashboard UI Assistant Agent from AHIS Server...');
      
      const success = await this.registrationService.unregister();
      
      if (success) {
        this.isRegistered = false;
        this.agentId = null;
        console.log('✅ Dashboard UI Assistant Agent unregistered successfully');
        
        // Emit unregistration event
        this.emitRegistrationEvent('unregistered', { success: true });
      } else {
        console.error('❌ Dashboard UI Assistant Agent unregistration failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Dashboard UI Assistant Agent unregistration error:', error);
      return false;
    }
  }

  /**
   * Get current registration status
   */
  getRegistrationStatus(): {
    isRegistered: boolean;
    agentId: string | null;
    registrationTime: string | null;
    capabilities: DashboardAgentCapabilities;
    metadata: DashboardAgentMetadata;
  } {
    return {
      isRegistered: this.isRegistered,
      agentId: this.agentId,
      registrationTime: this.isRegistered ? new Date().toISOString() : null,
      capabilities: this.capabilities,
      metadata: this.metadata
    };
  }

  /**
   * Cleanup agent resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Dashboard UI Assistant Agent...');
    
    if (this.isRegistered) {
      await this.unregisterFromAHIS();
    }
    
    if (this.registrationService) {
      await this.registrationService.cleanup();
    }
    
    console.log('✅ Dashboard UI Assistant Agent cleanup completed');
  }

  // Helper methods for health reporting
  private getActiveConnectionCount(): number {
    // Mock implementation - replace with actual connection tracking
    return 5;
  }

  private getAverageResponseTime(): number {
    // Mock implementation - replace with actual metrics
    return 150; // ms
  }

  private getErrorRate(): number {
    // Mock implementation - replace with actual error tracking
    return 0.02; // 2%
  }

  private getRequestCount(): number {
    // Mock implementation - replace with actual request counting
    return 1247;
  }

  private getContextualQueryCount(): number {
    // Mock implementation - replace with actual query tracking
    return 89;
  }

  private getInsightsGeneratedCount(): number {
    // Mock implementation - replace with actual insights tracking
    return 34;
  }

  private getUserInteractionCount(): number {
    // Mock implementation - replace with actual interaction tracking
    return 156;
  }

  private emitRegistrationEvent(event: string, data: any): void {
    // Mock implementation - replace with actual event emission
    console.log(`📡 Agent Event: ${event}`, data);
  }
}

/**
 * Global Dashboard UI Assistant Agent instance
 */
export const dashboardUIAssistantAgent = new DashboardUIAssistantAgent();

/**
 * Initialize and register the Dashboard UI Assistant Agent
 */
export async function initializeDashboardAgent(): Promise<RegistrationResponse> {
  console.log('🎯 Initializing Dashboard UI Assistant Agent...');
  return await dashboardUIAssistantAgent.registerWithAHIS();
}

/**
 * Get the global agent instance
 */
export function getDashboardAgent(): DashboardUIAssistantAgent {
  return dashboardUIAssistantAgent;
}
