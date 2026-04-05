/**
 * ADK/A2A Integration Module
 * 
 * Main entry point for Google ADK compatible agent discovery,
 * registration, and connection management in the AI Homelab ecosystem.
 */

export { default as AgentDiscoveryService } from './AgentDiscoveryService';
export { default as MCPToolsetAdapter } from './MCPToolsetAdapter';
export { default as AgentConnectionManager } from './AgentConnectionManager';

export type {
  AgentCard,
  AgentCapability,
  ConnectionInfo,
  AgentMetadata,
  A2ADiscoveryMessage,
  AgentDiscoveryFilter
} from './AgentDiscoveryService';

export type {
  ADKTool,
  ToolParameterSchema,
  ToolParameter,
  ToolCallRequest,
  ToolCallResponse,
  MCPServerConnection,
  ToolFilter
} from './MCPToolsetAdapter';

export type {
  AgentConnection,
  ConnectionRequest,
  AgentTask,
  ConnectionPool
} from './AgentConnectionManager';

// Integration factory and utilities
export { ADKCompatibilityLayer } from './ADKCompatibilityLayer';
