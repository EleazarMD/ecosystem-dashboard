/**
 * TypeScript types for Workspace AI Conversation System
 * Maps to database schema in workspace.ai_conversations and workspace.ai_messages
 */

export interface AIProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  conversation_count: number;
  total_messages: number;
  total_cost: number;
}

export interface AIConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  pinned: boolean;
  project_id: string | null;
  config: AIConversationConfig;
  context: AIConversationContext;
  message_count: number;
  total_cost: number;
  total_tokens: number;
  last_message_at: string | null;
}

export interface AIConversationConfig {
  model: string;
  mode: 'direct' | 'goose';
  agency_level?: 'auto' | 'approve' | 'smart_approve' | 'chat';
  web_search_enabled: boolean;
  mcp_servers_enabled: string[];
}

export interface AIConversationContext {
  scope: 'full_workspace' | 'page' | 'database' | 'custom';
  pages_accessed: string[];
  databases_accessed: string[];
  blocks_modified: string[];
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  created_at: string;
  metadata: AIMessageMetadata;
  workspace_actions: WorkspaceActions;
}

export interface AIMessageMetadata {
  model_used: string | null;
  cost: number;
  tokens: {
    input: number;
    output: number;
  };
  sources?: Array<{
    title: string;
    url: string;
  }>;
  tool_calls?: Array<{
    tool: string;
    timestamp: string;
    result: any;
  }>;
  execution_time_ms: number;
  recipe?: string;
  subRecipe?: string;
  systemContext?: string;
  sessionId?: string;
  workingDirectory?: string;
  agencyMode?: string;
  context?: any;
}

export interface WorkspaceActions {
  pages_created: string[];
  pages_modified: string[];
  blocks_modified: string[];
}

// API Request/Response types
export interface CreateConversationRequest {
  title?: string;
  config?: Partial<AIConversationConfig>;
}

export interface CreateConversationResponse {
  conversation: AIConversation;
}

export interface ListConversationsResponse {
  conversations: AIConversation[];
  total: number;
}

export interface GetConversationResponse {
  conversation: AIConversation;
  messages: AIMessage[];
}

export interface AddMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Partial<AIMessageMetadata>;
  workspace_actions?: Partial<WorkspaceActions>;
  mode?: string;
  model?: string;
  web_search_enabled?: boolean;
}

export interface AddMessageResponse {
  message: AIMessage;
}

export interface UpdateConversationRequest {
  title?: string;
  pinned?: boolean;
  archived?: boolean;
  project_id?: string | null;
  config?: Partial<AIConversationConfig>;
  context?: Partial<AIConversationContext>;
}

// Projects
export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface ListProjectsResponse {
  projects: AIProject[];
  total: number;
}

// Search
export interface SearchConversationsRequest {
  query: string;
  project_id?: string;
  limit?: number;
}

export interface SearchResult {
  conversation: AIConversation;
  message: AIMessage;
  highlight: string;
  rank: number;
}

export interface SearchConversationsResponse {
  results: SearchResult[];
  total: number;
}

// Auto-title
export interface GenerateTitleRequest {
  conversation_id: string;
  first_message?: string;
}

export interface GenerateTitleResponse {
  title: string;
}

// Export
export interface ExportConversationRequest {
  conversation_id: string;
  format: 'json' | 'markdown' | 'text';
}

export interface ExportedConversation {
  conversation: AIConversation;
  messages: AIMessage[];
  export_date: string;
  format: string;
}
