/**
 * Agent-to-Agent Communication Layer
 * 
 * Provides Agent-to-Agent (A2A) communication framework using the Homelab AI Agent Client SDK.
 * Enables seamless communication between different AI agents in the ecosystem.
 */

import { HomelabAIAgentClient, type Message, type ServiceInfo } from '@ai-homelab/agent-client-sdk';
import { EventEmitter } from 'events';
import logger from '../logger';

export interface A2AMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'request' | 'response' | 'broadcast' | 'notification';
  content: any;
  timestamp: Date;
  correlationId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface A2ARequest {
  targetAgent: string;
  action: string;
  parameters?: Record<string, any>;
  timeout?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface A2AResponse {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  fromAgent: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  returnType?: string;
}

export interface RegisteredAgent {
  id: string;
  name: string;
  type: string;
  capabilities: AgentCapability[];
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
  metadata?: Record<string, any>;
}

export class AgentToAgentCommunicationLayer extends EventEmitter {
  private homelabClient: HomelabAIAgentClient;
  private registeredAgents = new Map<string, RegisteredAgent>();
  private pendingRequests = new Map<string, {
    resolve: (value: A2AResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private isInitialized = false;

  constructor(homelabClient: HomelabAIAgentClient) {
    super();
    this.homelabClient = homelabClient;
    this.setupEventHandlers();
  }

  /**
   * Initialize the A2A communication layer
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[A2A] Initializing Agent-to-Agent communication layer...');

      // Set up message handling
      this.homelabClient.on('message', (message: Message) => {
        this.handleIncomingMessage(message);
      });

      // Discover existing agents
      await this.discoverAgents();

      // Start periodic agent discovery
      setInterval(() => {
        this.discoverAgents().catch(error => {
          logger.error('[A2A] Periodic agent discovery failed:', error);
        });
      }, 30000); // Every 30 seconds

      this.isInitialized = true;
      logger.info('[A2A] Agent-to-Agent communication layer initialized successfully');
      this.emit('initialized');

    } catch (error) {
      logger.error('[A2A] Failed to initialize A2A communication layer:', error);
      throw error;
    }
  }

  /**
   * Send a request to another agent
   */
  async sendRequest(request: A2ARequest): Promise<A2AResponse> {
    if (!this.isInitialized) {
      throw new Error('A2A communication layer not initialized');
    }

    const messageId = `a2a_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request to agent ${request.targetAgent} timed out`));
      }, request.timeout || 30000);

      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      const a2aMessage: A2AMessage = {
        id: messageId,
        fromAgentId: this.homelabClient.getStatus().agentId,
        toAgentId: request.targetAgent,
        type: 'request',
        content: {
          action: request.action,
          parameters: request.parameters || {}
        },
        timestamp: new Date(),
        priority: request.priority || 'medium',
        metadata: {
          timeout: request.timeout || 30000,
          startTime
        }
      };

      // Send message through Homelab client
      this.homelabClient.sendMessage({
        type: 'a2a_request',
        content: JSON.stringify(a2aMessage),
        role: 'agent',
        timestamp: new Date().toISOString(),
        agent_id: this.homelabClient.getStatus().agentId,
        target_agent: request.targetAgent
      }).catch(error => {
        this.pendingRequests.delete(messageId);
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(content: any, type: 'notification' | 'broadcast' = 'broadcast'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('A2A communication layer not initialized');
    }

    const messageId = `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const a2aMessage: A2AMessage = {
      id: messageId,
      fromAgentId: this.homelabClient.getStatus().agentId,
      toAgentId: '*', // Broadcast to all
      type,
      content,
      timestamp: new Date(),
      priority: 'medium'
    };

    await this.homelabClient.sendMessage({
      type: 'a2a_broadcast',
      content: JSON.stringify(a2aMessage),
      role: 'agent',
      timestamp: new Date().toISOString(),
      agent_id: this.homelabClient.getStatus().agentId
    });

    logger.info(`[A2A] Broadcast message sent: ${messageId}`);
  }

  /**
   * Register capabilities that this agent can handle
   */
  registerCapabilities(capabilities: AgentCapability[]): void {
    // Store capabilities in agent metadata
    const currentAgent: RegisteredAgent = {
      id: this.homelabClient.getStatus().agentId,
      name: 'Dashboard Agent',
      type: 'dashboard-agent',
      capabilities,
      status: 'online',
      lastSeen: new Date(),
      metadata: {
        platform: 'dashboard',
        version: '2.0.0'
      }
    };

    this.registeredAgents.set(currentAgent.id, currentAgent);
    logger.info(`[A2A] Registered ${capabilities.length} capabilities for agent ${currentAgent.id}`);
  }

  /**
   * Get list of available agents
   */
  getAvailableAgents(): RegisteredAgent[] {
    return Array.from(this.registeredAgents.values());
  }

  /**
   * Find agents with specific capabilities
   */
  findAgentsByCapability(capabilityName: string): RegisteredAgent[] {
    return Array.from(this.registeredAgents.values()).filter(agent =>
      agent.capabilities.some(cap => cap.name === capabilityName)
    );
  }

  /**
   * Handle incoming A2A messages
   */
  private handleIncomingMessage(message: Message): void {
    try {
      if (message.type === 'a2a_request' || message.type === 'a2a_response' || message.type === 'a2a_broadcast') {
        const a2aMessage: A2AMessage = JSON.parse(message.content as string);

        switch (a2aMessage.type) {
          case 'request':
            this.handleIncomingRequest(a2aMessage);
            break;
          case 'response':
            this.handleIncomingResponse(a2aMessage);
            break;
          case 'broadcast':
          case 'notification':
            this.handleIncomingBroadcast(a2aMessage);
            break;
        }
      }
    } catch (error) {
      logger.error('[A2A] Error handling incoming message:', error);
    }
  }

  /**
   * Handle incoming request from another agent
   */
  private async handleIncomingRequest(message: A2AMessage): Promise<void> {
    logger.info(`[A2A] Received request from agent ${message.fromAgentId}: ${message.content.action}`);

    try {
      // Emit event for application to handle
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request handler timeout'));
        }, 30000);

        this.emit('request', {
          message,
          respond: (data: any) => {
            clearTimeout(timeout);
            resolve(data);
          },
          error: (error: string) => {
            clearTimeout(timeout);
            reject(new Error(error));
          }
        });
      });

      // Send response back
      await this.sendResponse(message, { success: true, data: response });

    } catch (error) {
      logger.error(`[A2A] Error handling request from ${message.fromAgentId}:`, error);
      await this.sendResponse(message, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle incoming response from another agent
   */
  private handleIncomingResponse(message: A2AMessage): void {
    const pendingRequest = this.pendingRequests.get(message.correlationId || message.id);
    
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(message.correlationId || message.id);

      const response: A2AResponse = {
        success: message.content.success || false,
        data: message.content.data,
        error: message.content.error,
        executionTime: Date.now() - (message.metadata?.startTime || 0),
        fromAgent: message.fromAgentId
      };

      if (response.success) {
        pendingRequest.resolve(response);
      } else {
        pendingRequest.reject(new Error(response.error || 'Request failed'));
      }
    }
  }

  /**
   * Handle incoming broadcast/notification
   */
  private handleIncomingBroadcast(message: A2AMessage): void {
    logger.info(`[A2A] Received ${message.type} from agent ${message.fromAgentId}`);
    this.emit(message.type, message);
  }

  /**
   * Send response to a request
   */
  private async sendResponse(originalMessage: A2AMessage, responseData: any): Promise<void> {
    const responseMessage: A2AMessage = {
      id: `response_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      fromAgentId: this.homelabClient.getStatus().agentId,
      toAgentId: originalMessage.fromAgentId,
      type: 'response',
      content: responseData,
      timestamp: new Date(),
      correlationId: originalMessage.id
    };

    await this.homelabClient.sendMessage({
      type: 'a2a_response',
      content: JSON.stringify(responseMessage),
      role: 'agent',
      timestamp: new Date().toISOString(),
      agent_id: this.homelabClient.getStatus().agentId,
      target_agent: originalMessage.fromAgentId
    });
  }

  /**
   * Discover available agents in the ecosystem
   */
  private async discoverAgents(): Promise<void> {
    try {
      const services = await this.homelabClient.discoverServices('agent');
      
      for (const service of services) {
        if (service.id !== this.homelabClient.getStatus().agentId) {
          const agent: RegisteredAgent = {
            id: service.id,
            name: service.name,
            type: service.type,
            capabilities: [], // Will be populated when agent announces capabilities
            status: service.status === 'healthy' ? 'online' : 'offline',
            lastSeen: new Date(),
            metadata: service.health
          };

          this.registeredAgents.set(agent.id, agent);
        }
      }

      logger.info(`[A2A] Discovered ${services.length} agents in the ecosystem`);
    } catch (error) {
      logger.warn('[A2A] Agent discovery failed:', error);
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.homelabClient.on('connected', () => {
      logger.info('[A2A] Homelab client connected, A2A communication available');
      this.emit('connected');
    });

    this.homelabClient.on('disconnected', () => {
      logger.warn('[A2A] Homelab client disconnected, A2A communication unavailable');
      this.emit('disconnected');
    });

    this.homelabClient.on('error', (error) => {
      logger.error('[A2A] Homelab client error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Get communication layer status
   */
  getStatus(): {
    initialized: boolean;
    connected: boolean;
    registeredAgents: number;
    pendingRequests: number;
  } {
    return {
      initialized: this.isInitialized,
      connected: this.homelabClient.getStatus().connected,
      registeredAgents: this.registeredAgents.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Shutdown the communication layer
   */
  async shutdown(): Promise<void> {
    logger.info('[A2A] Shutting down Agent-to-Agent communication layer...');
    
    // Clear pending requests
    Array.from(this.pendingRequests.entries()).forEach(([id, request]) => {
      clearTimeout(request.timeout);
      request.reject(new Error('Communication layer shutting down'));
    });
    this.pendingRequests.clear();

    // Clear registered agents
    this.registeredAgents.clear();

    this.isInitialized = false;
    this.emit('shutdown');
  }
}

export default AgentToAgentCommunicationLayer;
