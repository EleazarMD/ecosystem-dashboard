/**
 * Goose Feature Registry
 * Centralized feature definitions for all Goose UI implementations
 * 
 * Each Goose UI (GooseMind, PageAgent, WorkspaceAI, AgenticControl) can
 * enable/disable features based on their use case.
 */

export type GooseFeatureId =
  | 'voice-input'
  | 'voice-output'
  | 'streaming'
  | 'thinking-display'
  | 'tool-execution'
  | 'multi-turn-context'
  | 'recipes'
  | 'mcp-servers'
  | 'file-attachments'
  | 'code-execution'
  | 'approvals'
  | 'kb-learning'
  | 'calendar-integration'
  | 'email-integration'
  | 'workspace-integration'
  | 'knowledge-graph'
  | 'web-search'
  | 'session-persistence'
  | 'cost-tracking'
  | 'debug-mode';

export interface GooseFeature {
  id: GooseFeatureId;
  name: string;
  description: string;
  category: 'input' | 'output' | 'integration' | 'behavior' | 'monitoring';
  requiresBackend?: string;  // Backend service URL if required
  dependencies?: GooseFeatureId[];
}

export const GOOSE_FEATURES: Record<GooseFeatureId, GooseFeature> = {
  'voice-input': {
    id: 'voice-input',
    name: 'Voice Input',
    description: 'Whisper STT for voice-to-text',
    category: 'input',
    requiresBackend: 'https://rtx-workstation.tailb64e64.ts.net:8031/voice',
  },
  'voice-output': {
    id: 'voice-output',
    name: 'Voice Output',
    description: 'Chatterbox/NeMo TTS for text-to-speech',
    category: 'output',
    requiresBackend: 'https://rtx-workstation.tailb64e64.ts.net:8031/voice',
    dependencies: ['voice-input'],
  },
  'streaming': {
    id: 'streaming',
    name: 'Streaming Responses',
    description: 'Stream LLM responses token by token',
    category: 'output',
  },
  'thinking-display': {
    id: 'thinking-display',
    name: 'Thinking Display',
    description: 'Show reasoning steps and tool calls',
    category: 'output',
    dependencies: ['streaming'],
  },
  'tool-execution': {
    id: 'tool-execution',
    name: 'Tool Execution',
    description: 'Execute tools via agentic loop',
    category: 'behavior',
  },
  'multi-turn-context': {
    id: 'multi-turn-context',
    name: 'Multi-turn Context',
    description: 'Maintain conversation history across turns',
    category: 'behavior',
  },
  'recipes': {
    id: 'recipes',
    name: 'Recipes',
    description: 'Pre-defined prompt templates and workflows',
    category: 'behavior',
  },
  'mcp-servers': {
    id: 'mcp-servers',
    name: 'MCP Servers',
    description: 'Connect to MCP tool servers',
    category: 'integration',
  },
  'file-attachments': {
    id: 'file-attachments',
    name: 'File Attachments',
    description: 'Attach files to messages',
    category: 'input',
  },
  'code-execution': {
    id: 'code-execution',
    name: 'Code Execution',
    description: 'Execute code blocks in sandbox',
    category: 'behavior',
    dependencies: ['tool-execution'],
  },
  'approvals': {
    id: 'approvals',
    name: 'Approvals',
    description: 'Route sensitive actions to Dashboard for review',
    category: 'behavior',
    requiresBackend: 'http://100.108.41.22:3000/api/approvals',
  },
  'kb-learning': {
    id: 'kb-learning',
    name: 'KB Learning',
    description: 'Extract and store knowledge from conversations',
    category: 'integration',
    requiresBackend: 'http://100.108.41.22:8000',
    dependencies: ['approvals'],
  },
  'calendar-integration': {
    id: 'calendar-integration',
    name: 'Calendar Integration',
    description: 'Access Apple Calendar events',
    category: 'integration',
    requiresBackend: 'https://rtx-workstation.tailb64e64.ts.net:8031',
  },
  'email-integration': {
    id: 'email-integration',
    name: 'Email Integration',
    description: 'Access Apple Mail',
    category: 'integration',
    requiresBackend: 'https://rtx-workstation.tailb64e64.ts.net:8031',
  },
  'workspace-integration': {
    id: 'workspace-integration',
    name: 'Workspace Integration',
    description: 'Access Dashboard workspace pages',
    category: 'integration',
  },
  'knowledge-graph': {
    id: 'knowledge-graph',
    name: 'Knowledge Graph',
    description: 'Query Neo4j knowledge graph',
    category: 'integration',
    requiresBackend: 'bolt://100.108.41.22:7687',
  },
  'web-search': {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web via Brave/Perplexity',
    category: 'integration',
  },
  'session-persistence': {
    id: 'session-persistence',
    name: 'Session Persistence',
    description: 'Save and restore conversation sessions',
    category: 'behavior',
  },
  'cost-tracking': {
    id: 'cost-tracking',
    name: 'Cost Tracking',
    description: 'Track LLM API costs',
    category: 'monitoring',
  },
  'debug-mode': {
    id: 'debug-mode',
    name: 'Debug Mode',
    description: 'Show detailed logs and API calls',
    category: 'monitoring',
  },
};

/**
 * Goose UI Presets - predefined feature sets for different use cases
 */
export type GoosePresetId = 
  | 'goose-mind'
  | 'page-agent'
  | 'workspace-ai'
  | 'dashboard-ai'
  | 'agentic-control'
  | 'voice-assistant'
  | 'minimal';

export interface GoosePreset {
  id: GoosePresetId;
  name: string;
  description: string;
  features: GooseFeatureId[];
  backendUrl?: string;
  defaultModel?: string;
}

export const GOOSE_PRESETS: Record<GoosePresetId, GoosePreset> = {
  'goose-mind': {
    id: 'goose-mind',
    name: 'GooseMind Personal Assistant',
    description: 'Full-featured personal AI assistant with voice, calendar, email',
    backendUrl: 'https://rtx-workstation.tailb64e64.ts.net:8031',
    defaultModel: 'ministral-14b',
    features: [
      'voice-input',
      'voice-output',
      'streaming',
      'thinking-display',
      'tool-execution',
      'multi-turn-context',
      'approvals',
      'kb-learning',
      'calendar-integration',
      'email-integration',
      'knowledge-graph',
      'web-search',
      'session-persistence',
    ],
  },
  'voice-assistant': {
    id: 'voice-assistant',
    name: 'Voice-First Assistant',
    description: 'Voice-focused interface for hands-free interaction',
    backendUrl: 'https://rtx-workstation.tailb64e64.ts.net:8031',
    defaultModel: 'ministral-14b',
    features: [
      'voice-input',
      'voice-output',
      'streaming',
      'tool-execution',
      'multi-turn-context',
      'calendar-integration',
      'email-integration',
    ],
  },
  'page-agent': {
    id: 'page-agent',
    name: 'Page Agent',
    description: 'Context-aware assistant for workspace pages',
    backendUrl: '/api/goose',
    defaultModel: 'claude-sonnet-4-20250514',
    features: [
      'streaming',
      'thinking-display',
      'tool-execution',
      'multi-turn-context',
      'recipes',
      'mcp-servers',
      'workspace-integration',
      'file-attachments',
    ],
  },
  'workspace-ai': {
    id: 'workspace-ai',
    name: 'Workspace AI',
    description: 'General-purpose workspace assistant',
    backendUrl: '/api/goose',
    defaultModel: 'claude-sonnet-4-20250514',
    features: [
      'streaming',
      'thinking-display',
      'tool-execution',
      'multi-turn-context',
      'recipes',
      'mcp-servers',
      'workspace-integration',
      'knowledge-graph',
      'web-search',
      'file-attachments',
      'session-persistence',
    ],
  },
  'dashboard-ai': {
    id: 'dashboard-ai',
    name: 'Dashboard AI',
    description: 'Dashboard management and system monitoring',
    backendUrl: '/api/goose',
    defaultModel: 'claude-sonnet-4-20250514',
    features: [
      'streaming',
      'thinking-display',
      'tool-execution',
      'multi-turn-context',
      'mcp-servers',
      'knowledge-graph',
      'cost-tracking',
      'debug-mode',
    ],
  },
  'agentic-control': {
    id: 'agentic-control',
    name: 'Agentic Control',
    description: 'Multi-agent testing and monitoring interface',
    backendUrl: '/api/agentic-control',
    features: [
      'streaming',
      'thinking-display',
      'tool-execution',
      'multi-turn-context',
      'mcp-servers',
      'debug-mode',
      'cost-tracking',
    ],
  },
  'minimal': {
    id: 'minimal',
    name: 'Minimal Chat',
    description: 'Simple chat interface with no extras',
    backendUrl: '/api/goose',
    defaultModel: 'ministral-14b',
    features: [
      'streaming',
      'multi-turn-context',
    ],
  },
};

/**
 * Get features for a preset with all dependencies resolved
 */
export function getPresetFeatures(presetId: GoosePresetId): GooseFeature[] {
  const preset = GOOSE_PRESETS[presetId];
  if (!preset) return [];
  
  const features = new Set<GooseFeatureId>();
  
  // Add all preset features and their dependencies
  const addWithDeps = (featureId: GooseFeatureId) => {
    if (features.has(featureId)) return;
    
    const feature = GOOSE_FEATURES[featureId];
    if (!feature) return;
    
    // Add dependencies first
    feature.dependencies?.forEach(dep => addWithDeps(dep));
    features.add(featureId);
  };
  
  preset.features.forEach(addWithDeps);
  
  return Array.from(features).map(id => GOOSE_FEATURES[id]);
}

/**
 * Check if a feature is available (backend reachable)
 */
export async function checkFeatureAvailability(feature: GooseFeature): Promise<boolean> {
  if (!feature.requiresBackend) return true;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Try health endpoint
    const healthUrl = feature.requiresBackend.replace(/\/$/, '') + '/health';
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create a feature configuration object for a Goose UI
 */
export interface GooseFeatureConfig {
  preset: GoosePresetId;
  enabledFeatures: Set<GooseFeatureId>;
  disabledFeatures: Set<GooseFeatureId>;
  backendUrl: string;
  model: string;
}

export function createFeatureConfig(
  presetId: GoosePresetId,
  overrides?: {
    enable?: GooseFeatureId[];
    disable?: GooseFeatureId[];
    backendUrl?: string;
    model?: string;
  }
): GooseFeatureConfig {
  const preset = GOOSE_PRESETS[presetId];
  const baseFeatures = new Set(preset.features);
  
  // Apply overrides
  overrides?.enable?.forEach(f => baseFeatures.add(f));
  overrides?.disable?.forEach(f => baseFeatures.delete(f));
  
  return {
    preset: presetId,
    enabledFeatures: baseFeatures,
    disabledFeatures: new Set(overrides?.disable || []),
    backendUrl: overrides?.backendUrl || preset.backendUrl || '/api/goose',
    model: overrides?.model || preset.defaultModel || 'ministral-14b',
  };
}

export function hasFeature(config: GooseFeatureConfig, featureId: GooseFeatureId): boolean {
  return config.enabledFeatures.has(featureId);
}
