/**
 * Platform Configuration Types
 * 
 * Central configuration system for managing Dashboard features,
 * services, agents, LLMs, and UI components.
 * 
 * This powers the Infrastructure > Platform Management page and
 * will control what features are available to end users.
 */

// ============================================================
// Service Configuration
// ============================================================

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'ai' | 'data' | 'integration' | 'monitoring';
  enabled: boolean;
  endpoint?: string;
  port?: number;
  healthCheck?: string;
  dependencies?: string[];
  settings?: Record<string, any>;
}

export const SERVICE_CATEGORIES = {
  core: { label: 'Core Services', icon: 'server', color: 'blue' },
  ai: { label: 'AI Services', icon: 'brain', color: 'purple' },
  data: { label: 'Data Services', icon: 'database', color: 'green' },
  integration: { label: 'Integrations', icon: 'link', color: 'orange' },
  monitoring: { label: 'Monitoring', icon: 'activity', color: 'cyan' },
} as const;

// ============================================================
// Agent Configuration
// ============================================================

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: 'personal' | 'workspace' | 'system' | 'specialized';
  enabled: boolean;
  endpoint?: string;
  model?: string;
  features: string[];
  mcpServers?: string[];
  settings?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    tools?: string[];
  };
}

export const AGENT_TYPES = {
  personal: { label: 'Personal Assistant', icon: 'user', color: 'purple' },
  workspace: { label: 'Workspace Agent', icon: 'layout', color: 'blue' },
  system: { label: 'System Agent', icon: 'settings', color: 'gray' },
  specialized: { label: 'Specialized Agent', icon: 'star', color: 'yellow' },
} as const;

// ============================================================
// LLM Configuration
// ============================================================

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'mistral' | 'groq';
  model: string;
  enabled: boolean;
  isDefault?: boolean;
  capabilities: ('chat' | 'vision' | 'code' | 'reasoning' | 'embedding')[];
  contextWindow: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  settings?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
}

export const LLM_PROVIDERS = {
  openai: { label: 'OpenAI', color: 'green' },
  anthropic: { label: 'Anthropic', color: 'orange' },
  google: { label: 'Google', color: 'blue' },
  ollama: { label: 'Ollama (Local)', color: 'purple' },
  mistral: { label: 'Mistral', color: 'cyan' },
  groq: { label: 'Groq', color: 'yellow' },
} as const;

// ============================================================
// UI Feature Configuration
// ============================================================

export interface UIFeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'workspace' | 'ai' | 'visualization' | 'developer';
  enabled: boolean;
  requiresAuth?: boolean;
  requiredServices?: string[];
  requiredAgents?: string[];
  settings?: Record<string, any>;
}

export const UI_CATEGORIES = {
  navigation: { label: 'Navigation & Layout', icon: 'menu', color: 'gray' },
  workspace: { label: 'Workspace Features', icon: 'folder', color: 'blue' },
  ai: { label: 'AI Features', icon: 'sparkles', color: 'purple' },
  visualization: { label: 'Visualization', icon: 'bar-chart', color: 'green' },
  developer: { label: 'Developer Tools', icon: 'code', color: 'orange' },
} as const;

// ============================================================
// Integration Configuration
// ============================================================

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  type: 'calendar' | 'email' | 'storage' | 'communication' | 'development' | 'other';
  enabled: boolean;
  authRequired: boolean;
  isConfigured: boolean;
  settings?: Record<string, any>;
}

// ============================================================
// Platform Configuration (Root)
// ============================================================

export interface PlatformConfig {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  lastUpdated: string;
  updatedBy: string;
  
  services: ServiceConfig[];
  agents: AgentConfig[];
  llms: LLMConfig[];
  uiFeatures: UIFeatureConfig[];
  integrations: IntegrationConfig[];
  
  globalSettings: {
    maintenanceMode: boolean;
    debugMode: boolean;
    analyticsEnabled: boolean;
    telemetryEnabled: boolean;
    maxConcurrentAgents: number;
    defaultLLM: string;
    defaultAgent: string;
  };
}

// ============================================================
// Default Configurations
// ============================================================

export const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: 'ai-gateway',
    name: 'AI Gateway',
    description: 'Multi-LLM routing and management service',
    category: 'ai',
    enabled: true,
    endpoint: 'http://100.108.41.22:8008',
    port: 8008,
    healthCheck: '/health',
  },
  {
    id: 'goose-mind',
    name: 'GooseMind',
    description: 'Personal AI assistant with voice, calendar, email',
    category: 'ai',
    enabled: true,
    endpoint: 'https://rtx-workstation.tailb64e64.ts.net:8031',
    port: 8031,
    healthCheck: '/health',
  },
  {
    id: 'chromadb',
    name: 'ChromaDB',
    description: 'Vector database for embeddings and semantic search',
    category: 'data',
    enabled: true,
    endpoint: 'http://100.108.41.22:8000',
    port: 8000,
  },
  {
    id: 'neo4j',
    name: 'Neo4j',
    description: 'Graph database for knowledge graph',
    category: 'data',
    enabled: true,
    endpoint: 'bolt://100.108.41.22:7687',
    port: 7687,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Primary relational database',
    category: 'data',
    enabled: true,
    port: 5432,
  },
  {
    id: 'dashboard-api',
    name: 'Dashboard API',
    description: 'Next.js API routes',
    category: 'core',
    enabled: true,
    endpoint: 'http://100.108.41.22:3000',
    port: 3000,
  },
];

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'goose-mind',
    name: 'GooseMind Personal Assistant',
    description: 'Voice-enabled personal AI with calendar, email, and KB',
    type: 'personal',
    enabled: true,
    endpoint: 'https://rtx-workstation.tailb64e64.ts.net:8031',
    model: 'ministral-14b',
    features: ['voice', 'calendar', 'email', 'kb-learning', 'approvals'],
  },
  {
    id: 'page-agent',
    name: 'Page Agent',
    description: 'Context-aware workspace page assistant',
    type: 'workspace',
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    features: ['streaming', 'tools', 'recipes', 'mcp'],
  },
  {
    id: 'workspace-ai',
    name: 'Workspace AI',
    description: 'General workspace assistant',
    type: 'workspace',
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    features: ['streaming', 'tools', 'knowledge-graph', 'web-search'],
  },
  {
    id: 'dashboard-ai',
    name: 'Dashboard AI',
    description: 'System monitoring and management assistant',
    type: 'system',
    enabled: true,
    model: 'claude-sonnet-4-20250514',
    features: ['streaming', 'tools', 'system-monitoring'],
  },
];

export const DEFAULT_LLMS: LLMConfig[] = [
  {
    id: 'ministral-14b',
    name: 'Ministral 14B',
    provider: 'mistral',
    model: 'ministral-14b',
    enabled: true,
    isDefault: true,
    capabilities: ['chat', 'code', 'reasoning'],
    contextWindow: 32768,
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    enabled: true,
    capabilities: ['chat', 'vision', 'code', 'reasoning'],
    contextWindow: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: true,
    capabilities: ['chat', 'vision', 'code', 'reasoning'],
    contextWindow: 128000,
    costPer1kTokens: { input: 0.005, output: 0.015 },
  },
  {
    id: 'llama3.2-vision',
    name: 'Llama 3.2 Vision 11B',
    provider: 'ollama',
    model: 'llama3.2-vision:11b',
    enabled: true,
    capabilities: ['chat', 'vision'],
    contextWindow: 8192,
  },
  {
    id: 'qwen-coder',
    name: 'Qwen 2.5 Coder 14B',
    provider: 'ollama',
    model: 'qwen2.5-coder:14b',
    enabled: true,
    capabilities: ['chat', 'code'],
    contextWindow: 32768,
  },
];

export const DEFAULT_UI_FEATURES: UIFeatureConfig[] = [
  {
    id: 'workspace-pages',
    name: 'Workspace Pages',
    description: 'Notion-like page editor and management',
    category: 'workspace',
    enabled: true,
  },
  {
    id: 'goose-mind-panel',
    name: 'GooseMind Panel',
    description: 'Voice-enabled personal assistant panel',
    category: 'ai',
    enabled: true,
    requiredAgents: ['goose-mind'],
  },
  {
    id: 'page-agent-sidebar',
    name: 'Page Agent Sidebar',
    description: 'Context-aware AI assistant in workspace',
    category: 'ai',
    enabled: true,
    requiredAgents: ['page-agent'],
  },
  {
    id: 'knowledge-graph-viz',
    name: 'Knowledge Graph Visualization',
    description: '3D knowledge graph explorer',
    category: 'visualization',
    enabled: true,
    requiredServices: ['neo4j'],
  },
  {
    id: 'agentic-control',
    name: 'Agentic Control Dashboard',
    description: 'Multi-agent testing and monitoring',
    category: 'developer',
    enabled: true,
  },
  {
    id: 'podcast-studio',
    name: 'Podcast Studio',
    description: 'AI-powered podcast creation tools',
    category: 'ai',
    enabled: true,
  },
  {
    id: 'approvals-page',
    name: 'Approvals Page',
    description: 'Human-in-the-loop approval workflow',
    category: 'ai',
    enabled: true,
  },
  {
    id: 'infrastructure-monitoring',
    name: 'Infrastructure Monitoring',
    description: 'Service health and metrics dashboards',
    category: 'developer',
    enabled: true,
  },
];

export const DEFAULT_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'apple-calendar',
    name: 'Apple Calendar',
    description: 'macOS Calendar integration via AppleScript',
    type: 'calendar',
    enabled: true,
    authRequired: false,
    isConfigured: true,
  },
  {
    id: 'apple-mail',
    name: 'Apple Mail',
    description: 'macOS Mail integration via AppleScript',
    type: 'email',
    enabled: true,
    authRequired: false,
    isConfigured: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repository and PR management',
    type: 'development',
    enabled: true,
    authRequired: true,
    isConfigured: false,
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web search integration',
    type: 'other',
    enabled: true,
    authRequired: true,
    isConfigured: true,
  },
];

export function createDefaultPlatformConfig(): PlatformConfig {
  return {
    id: 'homelab-dashboard',
    name: 'AI Homelab Dashboard',
    version: '2.0.0',
    environment: 'development',
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    services: DEFAULT_SERVICES,
    agents: DEFAULT_AGENTS,
    llms: DEFAULT_LLMS,
    uiFeatures: DEFAULT_UI_FEATURES,
    integrations: DEFAULT_INTEGRATIONS,
    globalSettings: {
      maintenanceMode: false,
      debugMode: false,
      analyticsEnabled: true,
      telemetryEnabled: true,
      maxConcurrentAgents: 5,
      defaultLLM: 'ministral-14b',
      defaultAgent: 'goose-mind',
    },
  };
}
