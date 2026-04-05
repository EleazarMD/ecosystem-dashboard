/**
 * Ollama AI Agent - Real AI Integration via AI Gateway
 * 
 * This agent connects directly to the AI Gateway's Ollama API to provide
 * real AI-powered responses for dashboard management and analytics.
 */

import { unifiedDashboardTools } from './tools/UnifiedDashboardTools';
import agentConfig from '../../config/agent-config';

export interface AIAgentRequest {
  type: 'query' | 'command' | 'insight' | 'analysis';
  message: string;
  context?: any;
  sessionId?: string;
  tools?: string[];
}

export interface AIAgentResponse {
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

export interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaAIAgent {
  private sessions: Map<string, { context: number[], lastActivity: number }> = new Map();
  private aiGatewayUrl: string;
  private model: string;
  private systemPrompt: string;

  constructor() {
    // Use AI Gateway endpoints from environment or defaults
    this.aiGatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:7777';
    this.model = agentConfig.ollama.model || 'gemma3:4b';
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    return `You are the AI Homelab Dashboard Intelligence Agent. You provide comprehensive analytics, insights, and management capabilities across all dashboard resources:

🔍 Knowledge Graph - Search documents, entities, and relationships
🧠 IDE Memory - Manage development memories and context  
🏥 AHIS Service - Monitor service health and registry
🤖 AI Gateway - Manage AI models and performance
☸️ Kubernetes - Cluster operations and service management
📊 Dashboard Analytics - Cross-service insights and trends

You have access to the following tools:
${Object.keys(unifiedDashboardTools).map(tool => `- ${tool}: ${unifiedDashboardTools[tool].description}`).join('\n')}

Guidelines:
- Be helpful, proactive, and technically knowledgeable
- Provide concise but comprehensive responses
- Focus on actionable insights and recommendations
- Use tools when needed to gather real-time data
- Format responses with clear structure and relevant emojis
- Always consider the context of the AI Homelab ecosystem

Current system status and context will be provided with each request.`;
  }

  /**
   * Process a request through the Ollama AI agent
   */
  async processRequest(request: AIAgentRequest): Promise<AIAgentResponse> {
    const sessionId = request.sessionId || this.generateSessionId();
    const timestamp = new Date().toISOString();

    try {
      console.log('🔄 Processing AI agent request:', request.message);

      // Simplified request - skip complex prompt building for now
      const simplePrompt = `${this.systemPrompt}\n\nUser: ${request.message}\n\nAssistant:`;

      // Make request to Ollama directly
      const ollamaRequest: OllamaRequest = {
        model: this.model,
        prompt: simplePrompt,
        stream: false
      };

      console.log('📤 Sending request to Ollama...');
      const ollamaResponse = await this.callOllamaAPI(ollamaRequest);
      console.log('📥 Received response from Ollama');

      return {
        success: true,
        response: ollamaResponse.response,
        sessionId,
        timestamp,
        data: {
          model: ollamaResponse.model,
          duration: ollamaResponse.total_duration,
          tokens: ollamaResponse.eval_count
        }
      };

    } catch (error) {
      console.error('❌ Ollama AI Agent error:', error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unknown error', sessionId);
    }
  }

  /**
   * Build enhanced prompt with context and available tools
   */
  private async buildEnhancedPrompt(request: AIAgentRequest): Promise<string> {
    let prompt = `User Request: ${request.message}\n`;
    prompt += `Request Type: ${request.type}\n`;

    // Add context if provided
    if (request.context) {
      prompt += `\nContext:\n${JSON.stringify(request.context, null, 2)}\n`;
    }

    // Add available tools information
    if (request.tools && request.tools.length > 0) {
      prompt += `\nAvailable Tools: ${request.tools.join(', ')}\n`;
    }

    // Add current system status
    try {
      const systemOverview = await this.getSystemOverview();
      prompt += `\nCurrent System Status:\n${JSON.stringify(systemOverview, null, 2)}\n`;
    } catch (error) {
      prompt += `\nSystem Status: Unable to fetch current status\n`;
    }

    prompt += `\nPlease provide a helpful response with actionable insights and recommendations.`;

    return prompt;
  }

  /**
   * Call Ollama API directly (simplified working approach)
   */
  private async callOllamaAPI(request: OllamaRequest): Promise<OllamaResponse> {
    console.log('🚀 Connecting directly to Ollama...');
    
    const ollamaUrl = 'http://localhost:11434';
    
    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Ollama response received successfully');
      return result;
    } catch (error) {
      console.error('❌ Ollama connection failed:', error);
      throw error;
    }
  }

  /**
   * Get system overview for context
   */
  private async getSystemOverview(): Promise<any> {
    try {
      // Find the relevant tools from the unified dashboard tools array
      const dashboardTool = unifiedDashboardTools.find(tool => tool.name === 'dashboard_system_overview');
      const ahisTool = unifiedDashboardTools.find(tool => tool.name === 'ahis_health_check');
      const kubernetesTool = unifiedDashboardTools.find(tool => tool.name === 'kubernetes_cluster_status');
      const aiGatewayTool = unifiedDashboardTools.find(tool => tool.name === 'ai_gateway_health');

      const results = await Promise.allSettled([
        dashboardTool?.handler({}),
        ahisTool?.handler({}),
        kubernetesTool?.handler({}),
        aiGatewayTool?.handler({})
      ]);

      return {
        dashboard: results[0].status === 'fulfilled' ? results[0].value : null,
        ahis: results[1].status === 'fulfilled' ? results[1].value : null,
        kubernetes: results[2].status === 'fulfilled' ? results[2].value : null,
        aiGateway: results[3].status === 'fulfilled' ? results[3].value : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Could not fetch system overview:', error);
      return { error: 'System overview unavailable' };
    }
  }

  /**
   * Extract insights and recommendations from AI response
   */
  private extractMetadata(response: string): { insights: any[], recommendations: string[], toolsUsed: string[] } {
    const insights: any[] = [];
    const recommendations: string[] = [];
    const toolsUsed: string[] = [];

    // Simple pattern matching for structured content
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Extract insights (lines starting with 💡, 📊, 🔍, etc.)
      if (trimmed.match(/^[💡📊🔍⚠️✅❌🚀]/)) {
        insights.push({
          type: 'insight',
          content: trimmed,
          timestamp: new Date().toISOString()
        });
      }
      
      // Extract recommendations (lines with "recommend", "suggest", "should")
      if (trimmed.toLowerCase().includes('recommend') || 
          trimmed.toLowerCase().includes('suggest') || 
          trimmed.toLowerCase().includes('should')) {
        recommendations.push(trimmed);
      }
      
      // Extract tool usage mentions
      Object.keys(unifiedDashboardTools).forEach(toolName => {
        if (trimmed.toLowerCase().includes(toolName.toLowerCase())) {
          if (!toolsUsed.includes(toolName)) {
            toolsUsed.push(toolName);
          }
        }
      });
    }

    return { insights, recommendations, toolsUsed };
  }

  /**
   * Generate system overview with AI insights
   */
  async generateSystemOverview(): Promise<AIAgentResponse> {
    return this.processRequest({
      type: 'analysis',
      message: 'Provide a comprehensive system overview with current status, health metrics, and actionable recommendations for the AI Homelab ecosystem.',
      context: { requestType: 'system_overview' }
    });
  }

  /**
   * Start a new session
   */
  startNewSession(): string {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, { context: [], lastActivity: Date.now() });
    return sessionId;
  }

  /**
   * Clear session context
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: string, sessionId?: string): AIAgentResponse {
    return {
      success: false,
      response: `I apologize, but I encountered an error: ${error}. Please try again or contact support if the issue persists.`,
      error,
      sessionId: sessionId || this.generateSessionId(),
      timestamp: new Date().toISOString(),
    };
  }

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
export const ollamaAIAgent = new OllamaAIAgent();
