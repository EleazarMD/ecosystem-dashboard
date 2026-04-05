/**
 * ADE UI Client SDK
 * 
 * Client library for integrating with Agent Development Environment (ADE) UI ecosystem.
 * Based on ADE UI AI Homelab Integration Guide v2.0
 * Provides agent registration, oversight communication, and real-time streaming.
 * 
 * @module lib/ade-ui-client-sdk
 * @version 2.0.0
 */

import { EventEmitter } from 'events';

export interface ADEAgent {
  id: string;
  name: string;
  version: string;
  capabilities: AgentCapability[];
  status: 'initializing' | 'active' | 'inactive' | 'error';
  health_endpoint: string;
  oversight_required: boolean;
  last_heartbeat?: string;
  metadata?: Record<string, any>;
}

export interface AgentCapability {
  type: string;
  scope: 'local' | 'workspace' | 'ecosystem';
  requires_approval: boolean;
  confidence_threshold: number;
  description?: string;
}

export interface ApprovalRequest {
  agent_id: string;
  correction_id: string;
  correction_data: any;
  requires_human_approval: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimated_impact: 'local' | 'workspace' | 'ecosystem';
  submitted_at?: string;
}

export interface ApprovalStatus {
  correction_id: string;
  status: 'pending' | 'approve' | 'reject' | 'modify';
  reviewer: string;
  timestamp: string;
  comments?: string;
  modified_content?: string;
}

export interface OversightChannel {
  agent_id: string;
  callback_url: string;
  notification_preferences: {
    high_priority: 'immediate' | 'batched' | 'daily_summary';
    medium_priority: 'immediate' | 'batched' | 'daily_summary';
    low_priority: 'immediate' | 'batched' | 'daily_summary';
  };
  communication_method: 'websocket' | 'webhook' | 'polling';
}

export interface ADEUIClientConfig {
  adeBackendUrl?: string;
  adeFrontendUrl?: string;
  clientId: string;
  clientName?: string;
  authToken?: string;
  timeout?: number;
  retryAttempts?: number;
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  debug?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface SimulationResult {
  sessionId: string;
  agentId: string;
  status: 'started' | 'running' | 'stopped' | 'error';
  embedUrl?: string;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StreamingChunk {
  agentId: string;
  messageId: string;
  chunk: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

export class ADEUIClient extends EventEmitter {
  private config: ADEUIClientConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private websocket?: WebSocket;
  private isInitialized: boolean = false;

  constructor(config: ADEUIClientConfig) {
    super();
    this.config = {
      adeBackendUrl: 'http://localhost:8405',
      adeFrontendUrl: 'http://localhost:3003',
      timeout: 30000,
      retryAttempts: 3,
      enableHeartbeat: true,
      heartbeatInterval: 60000, // 1 minute
      debug: false,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      ...config
    };
  }

  /**
   * Initialize ADE client connection
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.debug) {
        console.log(`[ADE Client] Initializing client for: ${this.config.clientId}`);
      }
      
      const response = await this.makeRequest('GET', '/api/health');
      
      if (response.success || response.status === 'healthy') {
        this.isInitialized = true;
        
        // Start heartbeat if enabled
        if (this.config.enableHeartbeat) {
          this.startHeartbeat(this.config.clientId);
        }
        
        this.emit('initialized', { clientId: this.config.clientId });
        
        if (this.config.debug) {
          console.log(`[ADE Client] Client initialized successfully: ${this.config.clientId}`);
        }
      } else {
        throw new Error('ADE Backend health check failed');
      }
      
    } catch (error) {
      console.error('[ADE Client] Client initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register agent with ADE ecosystem
   */
  async registerAgent(agent: ADEAgent): Promise<{ success: boolean; agent_id: string }> {
    try {
      console.log(`[ADE Client] Registering agent: ${agent.id}`);
      
      const response = await this.makeRequest('POST', '/api/agents/register', agent);
      
      if (response.success) {
        // Start heartbeat if enabled
        if (this.config.enableHeartbeat) {
          this.startHeartbeat(agent.id);
        }
        
        console.log(`[ADE Client] Agent registered successfully: ${agent.id}`);
      }
      
      return response;
    } catch (error) {
      console.error('[ADE Client] Agent registration failed:', error);
      throw error;
    }
  }

  /**
   * Submit correction for human approval
   */
  async submitForApproval(request: ApprovalRequest): Promise<{ success: boolean; approval_id: string }> {
    try {
      console.log(`[ADE Client] Submitting for approval: ${request.correction_id}`);
      
      const requestWithTimestamp = {
        ...request,
        submitted_at: new Date().toISOString()
      };
      
      const response = await this.makeRequest('POST', '/api/approvals/submit', requestWithTimestamp);
      
      console.log(`[ADE Client] Approval request submitted: ${response.approval_id}`);
      return response;
    } catch (error) {
      console.error('[ADE Client] Approval submission failed:', error);
      throw error;
    }
  }

  /**
   * Update approval status
   */
  async updateApprovalStatus(status: ApprovalStatus): Promise<{ success: boolean }> {
    try {
      console.log(`[ADE Client] Updating approval status: ${status.correction_id} -> ${status.status}`);
      
      const response = await this.makeRequest('PUT', `/api/approvals/${status.correction_id}/status`, status);
      
      return response;
    } catch (error) {
      console.error('[ADE Client] Approval status update failed:', error);
      throw error;
    }
  }

  /**
   * Set up oversight communication channel
   */
  async setupOversightChannel(channel: OversightChannel): Promise<{ success: boolean; channel_id: string }> {
    try {
      console.log(`[ADE Client] Setting up oversight channel for agent: ${channel.agent_id}`);
      
      const response = await this.makeRequest('POST', '/api/oversight/channels', channel);
      
      console.log(`[ADE Client] Oversight channel established: ${response.channel_id}`);
      return response;
    } catch (error) {
      console.error('[ADE Client] Oversight channel setup failed:', error);
      throw error;
    }
  }

  /**
   * Get pending approvals for agent
   */
  async getPendingApprovals(agentId: string): Promise<ApprovalRequest[]> {
    try {
      const response = await this.makeRequest('GET', `/api/agents/${agentId}/approvals/pending`);
      return response.approvals || [];
    } catch (error) {
      console.error('[ADE Client] Failed to get pending approvals:', error);
      throw error;
    }
  }

  /**
   * Send agent health status
   */
  async sendHealthStatus(agentId: string, health: any): Promise<{ success: boolean }> {
    try {
      const healthData = {
        agent_id: agentId,
        status: health.status || 'active',
        timestamp: new Date().toISOString(),
        metrics: health.metrics || {},
        connectivity: health.connectivity || {}
      };
      
      const response = await this.makeRequest('POST', `/api/agents/${agentId}/health`, healthData);
      return response;
    } catch (error) {
      console.error('[ADE Client] Health status update failed:', error);
      throw error;
    }
  }

  /**
   * Get agent configuration from ADE
   */
  async getAgentConfig(agentId: string): Promise<any> {
    try {
      const response = await this.makeRequest('GET', `/api/agents/${agentId}/config`);
      return response.config;
    } catch (error) {
      console.error('[ADE Client] Failed to get agent config:', error);
      throw error;
    }
  }

  /**
   * Unregister agent from ADE ecosystem
   */
  async unregisterAgent(agentId: string): Promise<{ success: boolean }> {
    try {
      console.log(`[ADE Client] Unregistering agent: ${agentId}`);
      
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }
      
      const response = await this.makeRequest('DELETE', `/api/agents/${agentId}`);
      
      console.log(`[ADE Client] Agent unregistered: ${agentId}`);
      return response;
    } catch (error) {
      console.error('[ADE Client] Agent unregistration failed:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request to ADE Backend endpoint
   */
  private async makeRequest(method: string, path: string, data?: any): Promise<any> {
    const url = `${this.config.adeBackendUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authToken && { 'Authorization': `Bearer ${this.config.authToken}` })
      },
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.config.timeout!);
        return controller.signal;
      })()
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        if (this.config.debug) {
          console.log(`[ADE Client] ${method} ${url} (attempt ${attempt})`);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
        
      } catch (error: any) {
        lastError = error;
        if (this.config.debug) {
          console.warn(`[ADE Client] Request attempt ${attempt} failed:`, error.message);
        }
        
        if (attempt < this.config.retryAttempts!) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Start heartbeat to maintain agent registration
   */
  private startHeartbeat(agentId: string): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHealthStatus(agentId, { status: 'active' });
      } catch (error) {
        console.warn('[ADE Client] Heartbeat failed:', error);
      }
    }, this.config.heartbeatInterval!);
    
    console.log(`[ADE Client] Heartbeat started for agent: ${agentId}`);
  }

  /**
   * Stop heartbeat and cleanup
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    console.log('[ADE Client] Client destroyed');
  }
}

// Utility functions for ADE integration
export const ADEUtils = {
  /**
   * Create agent capability definition
   */
  createCapability(
    type: string, 
    scope: 'local' | 'workspace' | 'ecosystem',
    requiresApproval: boolean = true,
    confidenceThreshold: number = 0.8
  ): AgentCapability {
    return {
      type,
      scope,
      requires_approval: requiresApproval,
      confidence_threshold: confidenceThreshold
    };
  },

  /**
   * Validate agent configuration
   */
  validateAgentConfig(agent: ADEAgent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!agent.id) errors.push('Agent ID is required');
    if (!agent.name) errors.push('Agent name is required');
    if (!agent.version) errors.push('Agent version is required');
    if (!agent.capabilities || agent.capabilities.length === 0) {
      errors.push('At least one capability is required');
    }
    if (!agent.health_endpoint) errors.push('Health endpoint is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Create approval request
   */
  createApprovalRequest(
    agentId: string,
    correctionId: string,
    correctionData: any,
    urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): ApprovalRequest {
    return {
      agent_id: agentId,
      correction_id: correctionId,
      correction_data: correctionData,
      requires_human_approval: true,
      urgency,
      estimated_impact: correctionData.impact_assessment?.scope || 'workspace'
    };
  }
};

export default ADEUIClient;
