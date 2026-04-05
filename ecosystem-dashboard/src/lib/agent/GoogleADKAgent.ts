/**
 * Google ADK Unified Dashboard Agent
 * 
 * Single comprehensive agent that manages ALL dashboard analytics and insights
 * across Knowledge Graph, IDE Memory, AHIS, AI Gateway, Kubernetes, and more.
 */

import { Agent, AgentConfig as MockAgentConfig, Session, Message } from './mock-google-adk';
import { unifiedDashboardTools } from './tools/UnifiedDashboardTools';
import agentConfig from '../../config/agent-config';

export interface DashboardAgentRequest {
  type: 'query' | 'command' | 'insight' | 'analysis';
  message: string;
  sessionId?: string;
  context?: {
    service?: string;
    timeRange?: string;
    priority?: string;
  };
}

export interface DashboardAgentResponse {
  success: boolean;
  response: string;
  data?: any;
  insights?: any[];
  recommendations?: string[];
  sessionId: string;
  timestamp: string;
  toolsUsed?: string[];
  error?: string;
}

export class GoogleADKDashboardAgent {
  private agent: Agent;
  private config: MockAgentConfig;
  private sessions: Map<string, Session> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAgent();
  }

  private async initializeAgent(): Promise<void> {
    try {
      // Configure the Google ADK agent with all unified tools
      this.config = {
        model: {
          name: agentConfig.google_adk.agent_id,
          provider: 'google',
          temperature: 0.7,
          maxTokens: 4096
        },
        agent: {
          name: 'ai_homelab_dashboard_agent',
          description: `
            I am the AI Homelab Dashboard Intelligence Agent. I provide comprehensive 
            analytics, insights, and management capabilities across all dashboard resources:
            
            🔍 Knowledge Graph - Search documents, entities, and relationships
            🧠 IDE Memory - Manage development memories and context
            🏥 AHIS Service - Monitor service health and registry
            🤖 AI Gateway - Manage AI models and performance
            ☸️  Kubernetes - Cluster operations and service management
            📊 Dashboard Analytics - Cross-service insights and trends
            
            I can answer questions, execute commands, generate insights, and provide 
            proactive recommendations across your entire AI Homelab ecosystem.
          `,
          personality: {
            traits: [
              'helpful and proactive',
              'technically knowledgeable',
              'concise but comprehensive',
              'focused on actionable insights'
            ],
            tone: agentConfig.personality.communication_style.formality,
            expertise: [
              'kubernetes cluster management',
              'ai model operations',
              'service health monitoring',
              'knowledge graph analysis',
              'system performance optimization'
            ]
          }
        },
        tools: unifiedDashboardTools,
        session: {
          persistent: true,
          contextWindow: 8192,
          memoryEnabled: true
        }
      };

      if (!agentConfig.google_adk.enabled) {
        this.config.model.provider = 'mock';
      }

      this.agent = new Agent(this.config);
      this.isInitialized = true;
      
      console.log('✅ Google ADK Dashboard Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google ADK Dashboard Agent:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Process a request through the unified dashboard agent
   */
  async processRequest(request: DashboardAgentRequest): Promise<DashboardAgentResponse> {
    if (!this.isInitialized) {
      return this.createErrorResponse('Agent not initialized', request.sessionId);
    }

    const sessionId = request.sessionId || this.generateSessionId();
    const startTime = Date.now();

    try {
      // Get or create session
      let session = this.sessions.get(sessionId);
      if (!session) {
        session = await this.agent.createSession({
          id: sessionId,
          context: {
            dashboardVersion: '2.0',
            ecosystem: 'AI Homelab',
            capabilities: [
              'knowledge_graph_operations',
              'ide_memory_management', 
              'ahis_service_monitoring',
              'ai_gateway_management',
              'kubernetes_operations',
              'cross_service_analytics'
            ],
            ...request.context
          }
        });
        this.sessions.set(sessionId, session);
      }

      // Create message with enhanced context
      const message: Message = {
        content: this.enhanceMessageWithContext(request),
        type: request.type === 'command' ? 'command' : 'query',
        timestamp: new Date().toISOString(),
        metadata: {
          requestType: request.type,
          context: request.context
        }
      };

      // Process through Google ADK
      const response = await session.sendMessage(message);
      
      // Extract insights and recommendations
      const insights = this.extractInsights(response);
      const recommendations = this.extractRecommendations(response);
      const toolsUsed = this.extractToolsUsed(response);

      return {
        success: true,
        response: response.content,
        data: response.data,
        insights,
        recommendations,
        sessionId,
        timestamp: new Date().toISOString(),
        toolsUsed,
      };

    } catch (error) {
      console.error('Dashboard Agent processing error:', error);
      return this.createErrorResponse(error.message, sessionId);
    }
  }

  /**
   * Generate proactive insights based on system state
   */
  async generateProactiveInsights(): Promise<DashboardAgentResponse> {
    const request: DashboardAgentRequest = {
      type: 'insight',
      message: `
        Analyze the current state of all AI Homelab dashboard services and provide 
        proactive insights. Focus on:
        1. System health and performance trends
        2. Potential issues or optimization opportunities  
        3. Actionable recommendations for improvement
        4. Cross-service correlations and dependencies
        
        Use all available tools to gather comprehensive data.
      `,
      context: {
        timeRange: '1h',
        priority: 'all'
      }
    };

    return this.processRequest(request);
  }

  /**
   * Handle natural language queries about the dashboard
   */
  async handleQuery(query: string, sessionId?: string): Promise<DashboardAgentResponse> {
    return this.processRequest({
      type: 'query',
      message: query,
      sessionId
    });
  }

  /**
   * Execute dashboard management commands
   */
  async executeCommand(command: string, sessionId?: string): Promise<DashboardAgentResponse> {
    return this.processRequest({
      type: 'command', 
      message: command,
      sessionId
    });
  }

  /**
   * Get comprehensive system overview
   */
  async getSystemOverview(): Promise<DashboardAgentResponse> {
    const request: DashboardAgentRequest = {
      type: 'analysis',
      message: `
        Provide a comprehensive overview of the entire AI Homelab ecosystem:
        1. Check health status of all services (Knowledge Graph, AHIS, AI Gateway, Kubernetes)
        2. Get key metrics and performance indicators
        3. Identify any issues or areas needing attention
        4. Provide actionable recommendations
        
        Use the dashboard_system_overview tool and supplement with specific service checks.
      `
    };

    return this.processRequest(request);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private enhanceMessageWithContext(request: DashboardAgentRequest): string {
    let enhancedMessage = request.message;

    // Add context-specific guidance
    if (request.context?.service) {
      enhancedMessage += `\n\nFocus on the ${request.context.service} service.`;
    }

    if (request.context?.timeRange) {
      enhancedMessage += `\n\nConsider data from the last ${request.context.timeRange}.`;
    }

    if (request.type === 'insight') {
      enhancedMessage += `\n\nProvide actionable insights and specific recommendations.`;
    }

    return enhancedMessage;
  }

  private extractInsights(response: any): any[] {
    // Extract structured insights from agent response
    const insights: any[] = [];
    
    if (response.toolResults) {
      response.toolResults.forEach((result: any) => {
        if (result.toolName === 'dashboard_generate_insights' && result.data?.insights) {
          insights.push(...result.data.insights);
        }
      });
    }

    return insights;
  }

  private extractRecommendations(response: any): string[] {
    const recommendations: string[] = [];
    
    if (response.toolResults) {
      response.toolResults.forEach((result: any) => {
        if (result.data?.recommendations) {
          recommendations.push(...result.data.recommendations);
        }
      });
    }

    return recommendations;
  }

  private extractToolsUsed(response: any): string[] {
    const toolsUsed: string[] = [];
    
    if (response.toolResults) {
      response.toolResults.forEach((result: any) => {
        if (result.toolName) {
          toolsUsed.push(result.toolName);
        }
      });
    }

    return Array.from(new Set(toolsUsed)); // Remove duplicates
  }

  private createErrorResponse(error: string, sessionId?: string): DashboardAgentResponse {
    return {
      success: false,
      response: `I encountered an error: ${error}. Please try again or contact support.`,
      error,
      sessionId: sessionId || this.generateSessionId(),
      timestamp: new Date().toISOString()
    };
  }

  private generateSessionId(): string {
    return `dashboard_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get agent status and health
   */
  getStatus(): { initialized: boolean; activeSessions: number; uptime: number } {
    return {
      initialized: this.isInitialized,
      activeSessions: this.sessions.size,
      uptime: Date.now() - (this.initializeTime || Date.now())
    };
  }

  private initializeTime: number = Date.now();

  /**
   * Clean up old sessions
   */
  cleanupSessions(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (session.lastActivity && (now - session.lastActivity) > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export const dashboardAgent = new GoogleADKDashboardAgent();
