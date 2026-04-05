// Agent Source Types
export type AgentSource = 'adk' | 'goose' | 'self' | 'mcp';

// Session Metadata for Goose agents
export interface SessionMetadata {
  session_id: string;
  file_path: string;
  started_at: Date;
  last_updated: Date;
  message_count: number;
  tool_calls_count: number;
  is_active: boolean;
  size_bytes: number;
}

// Tool Definition
export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: any;
  mcp_server?: string;
}

// MCP Server Configuration
export interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled?: boolean;
  status?: 'active' | 'inactive' | 'error';
}

// Unified Agent Interface (supports ADK, Goose, and Self-agents)
export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  endpoint?: string;
  port?: number;
  lastSeen: string;
  capabilities?: string[];
  version?: string;
  uptime?: number;
  health?: {
    status: string;
    score: number;
    memory_usage?: number;
    cpu_usage?: number;
  };
  configuration?: {
    model?: string;
    provider?: string;
    maxTokens?: number;
    temperature?: number;
    thinkingBudget?: number;
    aiGatewayUrl?: string;
  };
  
  // NEW: Agent source identification
  source?: AgentSource;
  
  // NEW: Session management (primarily for Goose agents)
  sessions?: {
    active: SessionMetadata[];
    history: SessionMetadata[];
    storage_path?: string;
  };
  
  // NEW: Tool/Extension tracking
  tools?: {
    available: ToolDefinition[];
    mcp_servers?: MCPServerConfig[];
    usage_stats?: {
      total_calls: number;
      success_rate: number;
    };
  };
  
  // NEW: Observability configuration
  observability?: {
    langfuse_enabled: boolean;
    otlp_enabled: boolean;
    session_export_formats?: string[];
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  metadata?: {
    action?: string;
    duration?: number;
    status?: 'success' | 'error' | 'pending';
    protocol?: string;
    trace_id?: string;
    llm_model?: string;
    llm_provider?: string;
  };
}

export interface EventTrace {
  id: string;
  timestamp: Date;
  event_type: string;
  agent_id?: string;
  function_name?: string;
  input?: any;
  output?: any;
  duration?: number;
  status: 'success' | 'error' | 'pending';
  trace_id?: string;
  protocol?: string;
  llm_model?: string;
  llm_provider?: string;
}

export interface AgentConfiguration {
  name: string;
  description: string;
  instructions: string;
  model: string;
  temperature: number;
  maxTokens: number;
  voiceEnabled: boolean;
  safetyGuardrails: boolean;
  role: string;
  priority: 'low' | 'medium' | 'high';
  maxConcurrentTasks: number;
  timeoutMs: number;
  capabilities: string[];
  canDelegate: boolean;
  memoryScope: 'session' | 'user' | 'app';
  delegationRules: string[];
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
