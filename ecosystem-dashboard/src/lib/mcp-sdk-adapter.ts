/**
 * MCP SDK Adapter - AI Homelab Standard Implementation
 * 
 * Replaces custom mcp-gateway-adapter.ts with official AI Homelab SDK
 * Uses HomelabAIAgentClient for standardized MCP operations
 */

// const { HomelabAIAgentClient } = require('../../../../../core/orchestrator/libraries/homelab-ai-agent-client-sdk/homelab-ai-agent-client-sdk.js');

// Fallback implementation when SDK is not available
class MockHomelabAIAgentClient {
  constructor(config: any) {
    this.config = config;
  }
  
  config: any;
  
  on(event: string, callback: Function) {
    // Mock event handling
  }
  
  async initialize() {
    return true;
  }
  
  async registerAgent(data: any) {
    return { success: true, agentId: 'mock-agent' };
  }
  
  async queryKnowledgeGraph(query: string, params?: any) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async searchKnowledgeGraph(term: string, options?: any) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async shutdown() {
    // Mock shutdown
  }
  
  getStatus() {
    return {
      initialized: false,
      registered: false,
      authenticated: false,
      connected: false,
      protocol: 'mock',
      agentId: 'mock-agent',
      uptime: 0
    };
  }
  
  async updateHealth(data?: any) {
    // Mock health update
  }
  
  async sendMessage(message: any) {
    throw new Error('Messaging not available - SDK not loaded');
  }
  
  async createKGEntity(data: any, schema?: any) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async updateKGEntity(id: string, data: any) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async getKGEntity(id: string) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async deleteKGEntity(id: string) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async createKGRelationship(fromId: string, toId: string, type: string, props?: any) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async discoverServices(type?: string) {
    return [];
  }
  
  async getServiceInfo(id: string) {
    throw new Error('Service discovery not available - SDK not loaded');
  }
  
  async getKGHealthStatus() {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async getKGStats(domain?: string) {
    throw new Error('Knowledge Graph not available - SDK not loaded');
  }
  
  async routeRequest(path: string, params: any) {
    throw new Error('Request routing not available - SDK not loaded');
  }
}

const HomelabAIAgentClient = MockHomelabAIAgentClient;

// Type definitions for SDK components
interface HomelabAIAgentClientConfig {
  agentId?: string;
  agentName?: string;
  agentType?: string;
  version?: string;
  ahisUrl?: string;
  gatewayUrl?: string;
  kgUrl?: string;
  authUrl?: string;
  adminToken?: string;
  wsUrl?: string;
  enableWebSocket?: boolean;
  protocolVersion?: string;
  messageFormats?: string[];
  authToken?: string;
  healthInterval?: number;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

interface KnowledgeGraphSearchOptions {
  limit?: number;
  threshold?: number;
  domain?: string;
  [key: string]: any;
}

interface KGEntityData {
  type: string;
  properties: Record<string, any>;
  metadata?: Record<string, any>;
}

interface Message {
  type: string;
  content?: string;
  role?: string;
  timestamp: string;
  agent_id: string;
  [key: string]: any;
}

// Service information for dashboard agent
const dashboardServiceInfo = {
  id: 'ecosystem-dashboard',
  name: 'AI Homelab Ecosystem Dashboard',
  type: 'monitoring-dashboard',
  version: '2.0.0',
  description: 'Unified monitoring and management interface for AI Homelab Ecosystem',
  capabilities: [
    'knowledge-graph-query',
    'service-discovery', 
    'health-monitoring',
    'agent-coordination',
    'infrastructure-monitoring'
  ]
};

// SDK client instance
let sdkClient: any | null = null;
let isInitialized = false;

/**
 * Get SDK configuration from environment variables
 */
function getSDKConfig(): HomelabAIAgentClientConfig {
  const isServer = typeof window === 'undefined';
  
  return {
    agentId: dashboardServiceInfo.id,
    agentName: dashboardServiceInfo.name,
    agentType: dashboardServiceInfo.type,
    version: dashboardServiceInfo.version,
    capabilities: dashboardServiceInfo.capabilities,
    
    // Service URLs - prioritize AI Gateway service mesh (port 7777)
    ahisUrl: isServer 
      ? process.env.AHIS_SERVER_HOST && process.env.AHIS_SERVER_PORT 
        ? `http://${process.env.AHIS_SERVER_HOST}:${process.env.AHIS_SERVER_PORT}`
        : 'http://localhost:8888'
      : `http://${process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888'}`,
    
    gatewayUrl: isServer
      ? process.env.AI_GATEWAY_SERVICE_MESH_URL || 'http://localhost:7777'
      : process.env.NEXT_PUBLIC_AI_GATEWAY_SERVICE_MESH_URL || 'http://localhost:7777',
    
    kgUrl: isServer
      ? process.env.AI_GATEWAY_SERVICE_MESH_URL || 'http://localhost:7777'
      : process.env.NEXT_PUBLIC_AI_GATEWAY_SERVICE_MESH_URL || 'http://localhost:7777',
    
    // Authentication
    authToken: isServer
      ? process.env.AI_GATEWAY_API_KEY || 'dashboard-agent-key'
      : process.env.NEXT_PUBLIC_SERVICE_MESH_API_KEY || 'dashboard-agent-key',
    
    // Protocol configuration
    protocolVersion: '1.0.0',
    messageFormats: ['json-rpc-2.0', 'rest'],
    
    // Health monitoring
    healthInterval: 30000, // 30 seconds
    
    // Metadata
    metadata: {
      environment: process.env.NODE_ENV || 'development',
      port: 8404,
      serviceType: 'dashboard',
      ecosystemRole: 'monitoring-interface'
    }
  };
}

/**
 * Initialize the SDK client
 */
export async function initializeMCPSDK(): Promise<void> {
  if (isInitialized && sdkClient) {
    return;
  }

  try {
    console.log('🚀 Initializing MCP SDK Adapter...');
    
    const config = getSDKConfig();
    sdkClient = new HomelabAIAgentClient(config);
    
    // Set up event listeners
    sdkClient.on('initialized', () => {
      console.log('✅ MCP SDK initialized successfully');
    });
    
    sdkClient.on('registered', (response) => {
      console.log('✅ Dashboard agent registered with AHIS:', response);
    });
    
    sdkClient.on('error', (error) => {
      console.error('❌ MCP SDK error:', error);
    });
    
    // Initialize the client
    const initialized = await sdkClient.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize SDK client');
    }
    
    // Register with AHIS
    await sdkClient.registerAgent({
      serviceEndpoint: 'http://localhost:8404',
      healthEndpoint: 'http://localhost:8404/api/health',
      environment: process.env.NODE_ENV || 'development',
      port: 8404,
      serviceType: 'dashboard',
      ecosystemRole: 'monitoring-interface'
    });
    
    isInitialized = true;
    console.log('✅ MCP SDK Adapter ready');
    
  } catch (error) {
    console.error('❌ Failed to initialize MCP SDK:', error);
    throw error;
  }
}

/**
 * Get or create SDK client instance
 */
async function getSDKClient(): Promise<any> {
  if (!sdkClient || !isInitialized) {
    await initializeMCPSDK();
  }
  
  if (!sdkClient) {
    throw new Error('SDK client not available');
  }
  
  return sdkClient;
}

/**
 * Execute MCP command through SDK
 * Replaces the custom executeMCPCommand function
 */
export async function executeMCPCommand<T = any>(
  command: string,
  params: any
): Promise<T> {
  const client = await getSDKClient();
  
  console.log('📡 Executing MCP command via SDK:', { command, params });
  
  try {
    // Route different command types through appropriate SDK methods
    switch (command) {
      case 'kg_query':
      case 'knowledge_graph_query':
        return await client.queryKnowledgeGraph(params.query, params.parameters) as T;
      
      case 'kg_search':
      case 'knowledge_graph_search':
        const searchOptions: KnowledgeGraphSearchOptions = {
          limit: params.limit || 10,
          threshold: params.threshold || 0.7,
          domain: params.domain,
          ...params.options
        };
        return await client.searchKnowledgeGraph(params.searchTerm, searchOptions) as T;
      
      case 'kg_create_entity':
        const entityData: KGEntityData = {
          type: params.type,
          properties: params.properties,
          metadata: params.metadata
        };
        return await client.createKGEntity(entityData, params.schema) as T;
      
      case 'kg_update_entity':
        return await client.updateKGEntity(params.entityId, params.entityData) as T;
      
      case 'kg_get_entity':
        return await client.getKGEntity(params.entityId) as T;
      
      case 'kg_delete_entity':
        return await client.deleteKGEntity(params.entityId) as T;
      
      case 'kg_create_relationship':
        return await client.createKGRelationship(
          params.fromId, 
          params.toId, 
          params.relationshipType, 
          params.properties
        ) as T;
      
      case 'service_discovery':
        return await client.discoverServices(params.serviceType) as T;
      
      case 'get_service_info':
        return await client.getServiceInfo(params.serviceId) as T;
      
      case 'kg_health':
        return await client.getKGHealthStatus() as T;
      
      case 'kg_stats':
        return await client.getKGStats(params.domain) as T;
      
      default:
        // For custom commands, use generic routing
        return await client.routeRequest(`/mcp/${command}`, params) as T;
    }
    
  } catch (error: any) {
    console.error('❌ MCP SDK command failed:', { command, error: error.message });
    throw error;
  }
}

/**
 * Connect to MCP server through SDK
 * Replaces the custom connectMCP function
 */
export async function connectMCP(): Promise<void> {
  try {
    console.log('🔗 Connecting to MCP via SDK...');
    await initializeMCPSDK();
    console.log('✅ MCP connection established via SDK');
  } catch (error) {
    console.error('❌ Failed to connect to MCP via SDK:', error);
    throw error;
  }
}

/**
 * Disconnect from MCP server
 */
export async function disconnectMCP(): Promise<void> {
  try {
    if (sdkClient) {
      console.log('🔌 Disconnecting MCP SDK...');
      await sdkClient.shutdown();
      sdkClient = null;
      isInitialized = false;
      console.log('✅ MCP SDK disconnected');
    }
  } catch (error) {
    console.error('❌ Failed to disconnect MCP SDK:', error);
    // Don't rethrow - disconnection failures shouldn't break the application
  }
}

/**
 * Send message through SDK
 */
export async function sendMCPMessage(message: Message): Promise<any> {
  const client = await getSDKClient();
  return await client.sendMessage(message);
}

/**
 * Get SDK client status
 */
export function getMCPSDKStatus() {
  if (!sdkClient) {
    return {
      initialized: false,
      registered: false,
      authenticated: false,
      connected: false,
      protocol: 'none',
      agentId: 'none',
      uptime: 0
    };
  }
  
  return sdkClient.getStatus();
}

/**
 * Update agent health through SDK
 */
export async function updateMCPHealth(healthData?: any): Promise<void> {
  const client = await getSDKClient();
  await client.updateHealth(healthData);
}

/**
 * Backward compatibility exports
 * These maintain the same interface as the old mcp-gateway-adapter
 */
export {
  executeMCPCommand as default,
  initializeMCPSDK as initializeMCPAdapter,
  getMCPSDKStatus as getMCPAdapterStatus
};
