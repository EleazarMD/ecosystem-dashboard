/**
 * ADK Bridge - Integration between TypeScript Dashboard and Python ADK Agent
 * Provides seamless communication with ADK v2.0 compliant Dashboard Agent
 */

import { v4 as uuidv4 } from 'uuid';

export interface ADKAgentCard {
  name: string;
  description: string;
  version: string;
  author: string;
  capabilities: string[];
  tools: ADKTool[];
  transport: {
    type: 'http' | 'websocket';
    host: string;
    port: number;
    https?: boolean;
  };
  authentication?: {
    type: 'bearer' | 'api_key' | 'none';
    required: boolean;
  };
}

export interface ADKTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
}

export interface ADKSession {
  session_id: string;
  agent_name: string;
  created_at: string;
  last_activity: string;
  conversation_history: ADKMessage[];
}

export interface ADKMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ADKResponse {
  success: boolean;
  response?: string;
  error?: string;
  session_id?: string;
  tool_calls?: Array<{
    tool_name: string;
    parameters: Record<string, any>;
    result: any;
  }>;
  metadata?: Record<string, any>;
}

export class ADKBridge {
  private baseUrl: string;
  private currentSession: string | null = null;
  private agentCard: ADKAgentCard | null = null;

  constructor(baseUrl: string = 'http://localhost:8405') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize connection to ADK agent and fetch agent card
   */
  async initialize(): Promise<boolean> {
    try {
      // Check health
      const healthResponse = await fetch(`${this.baseUrl}/health`);
      if (!healthResponse.ok) {
        throw new Error(`ADK agent health check failed: ${healthResponse.status}`);
      }

      // Fetch agent card
      const cardResponse = await fetch(`${this.baseUrl}/agent_cards`);
      if (cardResponse.ok) {
        const cards = await cardResponse.json();
        this.agentCard = cards[0]; // Get first agent card
        console.log('✅ ADK Agent connected:', this.agentCard?.name);
        return true;
      }

      throw new Error('Failed to fetch agent cards');
    } catch (error) {
      console.error('❌ ADK Bridge initialization failed:', error);
      return false;
    }
  }

  /**
   * Create a new session with the ADK agent
   */
  async createSession(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: this.agentCard?.name || 'dashboard_ai_coordinator'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const sessionData = await response.json();
      this.currentSession = sessionData.session_id;
      return this.currentSession;
    } catch (error) {
      console.error('❌ Failed to create ADK session:', error);
      // Fallback to generated session ID
      this.currentSession = uuidv4();
      return this.currentSession;
    }
  }

  /**
   * Send message to ADK agent and get response
   */
  async sendMessage(message: string, context?: Record<string, any>): Promise<ADKResponse> {
    if (!this.currentSession) {
      await this.createSession();
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions/${this.currentSession}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: context || {},
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`ADK agent request failed: ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        response: responseData.response,
        session_id: this.currentSession,
        tool_calls: responseData.tool_calls,
        metadata: responseData.metadata,
      };
    } catch (error) {
      console.error('❌ ADK message send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        session_id: this.currentSession,
      };
    }
  }

  /**
   * Call a specific tool on the ADK agent
   */
  async callTool(toolName: string, parameters: Record<string, any>): Promise<ADKResponse> {
    if (!this.currentSession) {
      await this.createSession();
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions/${this.currentSession}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`ADK tool call failed: ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        response: responseData.result,
        session_id: this.currentSession,
        tool_calls: [{
          tool_name: toolName,
          parameters,
          result: responseData.result,
        }],
      };
    } catch (error) {
      console.error(`❌ ADK tool call failed (${toolName}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        session_id: this.currentSession,
      };
    }
  }

  /**
   * Get session information
   */
  async getSession(): Promise<ADKSession | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions/${this.currentSession}`);
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get ADK session:', error);
      return null;
    }
  }

  /**
   * Get agent capabilities and tools
   */
  getAgentCard(): ADKAgentCard | null {
    return this.agentCard;
  }

  /**
   * Get available tools from agent card
   */
  getAvailableTools(): ADKTool[] {
    return this.agentCard?.tools || [];
  }

  /**
   * Check if ADK agent is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get agent status and health
   */
  async getStatus(): Promise<{
    healthy: boolean;
    agent_name?: string;
    uptime?: number;
    sessions?: number;
    version?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        return { healthy: false };
      }

      const healthData = await response.json();
      return {
        healthy: true,
        agent_name: this.agentCard?.name,
        uptime: healthData.uptime,
        sessions: healthData.active_sessions,
        version: this.agentCard?.version,
      };
    } catch (error) {
      return { healthy: false };
    }
  }

  /**
   * Close current session
   */
  async closeSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    try {
      await fetch(`${this.baseUrl}/sessions/${this.currentSession}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('❌ Failed to close ADK session:', error);
    } finally {
      this.currentSession = null;
    }
  }
}

// Singleton instance for dashboard use
export const adkBridge = new ADKBridge();
