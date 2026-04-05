import { BrowserAHISClient } from './browser-ahis-client';

/**
 * Agent Registry Event Types
 */
export enum AgentRegistryEventType {
  AGENT_REGISTERED = 'agent:registered',
  AGENT_UPDATED = 'agent:updated',
  AGENT_REMOVED = 'agent:removed',
  PLATFORM_REGISTERED = 'platform:registered',
  PLATFORM_UPDATED = 'platform:updated',
  PLATFORM_REMOVED = 'platform:removed',
  CAPABILITY_REGISTERED = 'capability:registered',
  CAPABILITY_UPDATED = 'capability:updated',
  CAPABILITY_REMOVED = 'capability:removed',
  COMPLIANCE_UPDATED = 'compliance:updated',
  COMPLIANCE_CHECK_COMPLETED = 'compliance:check-completed',
  COMPLIANCE_CHANGED = 'agent-registry:compliance-changed',
}

/**
 * Agent Registry Client
 * 
 * A specialized client for interacting with the Agent Registry Service
 * using the AHIS client pattern for real-time updates.
 */
export class AgentRegistryClient {
  private ahisClient: BrowserAHISClient;
  private eventCallbacks: Map<string, Set<Function>>;
  
  /**
   * Constructor
   * 
   * @param ahisClient - The AHIS client instance
   */
  constructor(ahisClient: BrowserAHISClient) {
    this.ahisClient = ahisClient;
    this.eventCallbacks = new Map();
    
    // Subscribe to all agent registry events
    Object.values(AgentRegistryEventType).forEach(eventType => {
      this.ahisClient.subscribeToEvents(eventType, (data) => {
        this.handleEvent(eventType, data);
      });
    });
  }
  
  /**
   * Handle an event from the Agent Registry Service
   * 
   * @param eventType - The type of event
   * @param data - The event data
   */
  private handleEvent(eventType: string, data: any): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }
  
  /**
   * Subscribe to an event
   * 
   * @param eventType - The type of event to subscribe to
   * @param callback - The callback function to call when the event occurs
   * @returns A function to unsubscribe from the event
   */
  public subscribe(eventType: AgentRegistryEventType, callback: (data: any) => void): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set());
    }
    
    const callbacks = this.eventCallbacks.get(eventType)!;
    callbacks.add(callback);
    
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.eventCallbacks.delete(eventType);
      }
    };
  }
  
  /**
   * Subscribe to all agent events
   * 
   * @param callback - The callback function to call when any agent event occurs
   * @returns A function to unsubscribe from all agent events
   */
  public subscribeToAgentEvents(callback: (eventType: string, data: any) => void): () => void {
    const agentEvents = [
      AgentRegistryEventType.AGENT_REGISTERED,
      AgentRegistryEventType.AGENT_UPDATED,
      AgentRegistryEventType.AGENT_REMOVED
    ];
    
    const unsubscribers = agentEvents.map(eventType => 
      this.subscribe(eventType, (data) => callback(eventType, data))
    );
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  /**
   * Subscribe to all platform events
   * 
   * @param callback - The callback function to call when any platform event occurs
   * @returns A function to unsubscribe from all platform events
   */
  public subscribeToPlatformEvents(callback: (eventType: string, data: any) => void): () => void {
    const platformEvents = [
      AgentRegistryEventType.PLATFORM_REGISTERED,
      AgentRegistryEventType.PLATFORM_UPDATED,
      AgentRegistryEventType.PLATFORM_REMOVED
    ];
    
    const unsubscribers = platformEvents.map(eventType => 
      this.subscribe(eventType, (data) => callback(eventType, data))
    );
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  /**
   * Subscribe to all capability events
   * 
   * @param callback - The callback function to call when any capability event occurs
   * @returns A function to unsubscribe from all capability events
   */
  public subscribeToCapabilityEvents(callback: (eventType: string, data: any) => void): () => void {
    const capabilityEvents = [
      AgentRegistryEventType.CAPABILITY_REGISTERED,
      AgentRegistryEventType.CAPABILITY_REMOVED
    ];
    
    const unsubscribers = capabilityEvents.map(eventType => 
      this.subscribe(eventType, (data) => callback(eventType, data))
    );
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  /**
   * Execute a command on the Agent Registry Service
   * 
   * @param method - The method to execute
   * @param params - The parameters to pass to the method
   * @returns The result of the command
   */
  public async executeCommand(method: string, params?: any): Promise<any> {
    return this.ahisClient.executeCommand(`agent-registry.${method}`, params);
  }
  
  /**
   * Get all agents
   */
  async getAgents(): Promise<any[]> {
    try {
      const result = await this.ahisClient.executeCommand('agent-registry.getAgents');
      return result.agents || [];
    } catch (error) {
      console.error('Failed to get agents:', error);
      return [];
    }
  }

  /**
   * Get dashboard summary data
   */
  async getDashboardSummary(): Promise<any> {
    try {
      const result = await this.ahisClient.executeCommand('agent-registry.getDashboardSummary');
      return result.summary || null;
    } catch (error) {
      console.error('Failed to get dashboard summary:', error);
      return null;
    }
  }

  /**
   * Get dashboard compliance data
   */
  async getDashboardCompliance(): Promise<any> {
    try {
      const result = await this.ahisClient.executeCommand('agent-registry.getDashboardCompliance');
      return result.compliance || null;
    } catch (error) {
      console.error('Failed to get dashboard compliance:', error);
      return null;
    }
  }

  /**
   * Get dashboard capabilities data
   */
  async getDashboardCapabilities(): Promise<any> {
    try {
      const result = await this.ahisClient.executeCommand('agent-registry.getDashboardCapabilities');
      return result.capabilities || null;
    } catch (error) {
      console.error('Failed to get dashboard capabilities:', error);
      return null;
    }
  }

  /**
   * Get an agent by ID
   * 
   * @param agentId - The ID of the agent to get
   * @returns The agent with the specified ID
   */
  public async getAgentById(agentId: string): Promise<any> {
    return this.executeCommand('getAgentById', { agentId });
  }
  
  /**
   * Get all platforms
   * 
   * @returns A list of all platforms
   */
  public async getPlatforms(): Promise<any[]> {
    return this.executeCommand('getPlatforms');
  }
  
  /**
   * Get a platform by ID
   * 
   * @param platformId - The ID of the platform to get
   * @returns The platform with the specified ID
   */
  public async getPlatformById(platformId: string): Promise<any> {
    return this.executeCommand('getPlatformById', { platformId });
  }
  
  // Legacy methods for backward compatibility
  public async getComplianceData(): Promise<any> {
    return this.getDashboardCompliance();
  }
  
  public async getCapabilitiesData(): Promise<any> {
    return this.getDashboardCapabilities();
  }
}
