/**
 * Agent Registry — Modular, swappable agent-to-task binding system.
 *
 * Three layers of separation:
 * 1. Prompt builders — tied to task type, never change
 * 2. Model providers — swappable per agent, configurable at runtime
 * 3. Task-to-agent binding — which agent does which task, with negotiable vs. locked
 *
 * Non-negotiable (locked) assignments:
 *   - generate_image (high-quality) → must use a vision-capable image model (Gemini Image Pro / Nano Banana)
 *   - generate_audio → must use a child-safe TTS-capable model (MiniMax M3 / local-llm)
 *   - review_safety → must use a safety-trained model (local-llm / minimax-m3)
 *
 * Everything else is negotiable — any capable LLM can be swapped in at runtime
 * via the registry, env vars, or API config.
 */

import { AGENT_MODEL_MAP } from './AgentDispatchOrchestrator';
import {
  AGENT_CAPABILITIES,
  AGENT_LABELS,
  type AgentId,
  type TaskType,
} from './LessonLifecycleService';

// ─── Model provider config ──────────────────────────────────────────────────

export interface ModelProviderConfig {
  /** Logical agent ID (e.g. 'claude-opus', 'gpt-5.5') */
  agentId: AgentId;
  /** Human-readable label */
  label: string;
  /** AI Gateway model ID (e.g. 'claude-opus-4-7', 'gpt-5.5') */
  gatewayModel: string;
  /** Gateway endpoint URL */
  endpoint: string;
  /** Whether this model is child-safe (uses child safety key + metadata) */
  isChildSafe: boolean;
  /** What this model is best at */
  specializations: string[];
  /** Relative cost tier (1=cheap, 5=expensive) */
  costTier: number;
  /** Whether this provider is currently enabled */
  enabled: boolean;
}

// ─── Task binding config ────────────────────────────────────────────────────

export interface TaskBinding {
  /** The task type */
  taskType: TaskType;
  /** Which agent is currently assigned */
  agentId: AgentId;
  /** Whether this binding can be changed at runtime */
  negotiable: boolean;
  /** If not negotiable, why */
  lockReason?: string;
  /** Fallback agent if the primary is unavailable */
  fallbackAgentId?: AgentId;
  /** Temperature override for this task */
  temperature?: number;
  /** Max tokens override for this task */
  maxTokens?: number;
}

// ─── Registry state ─────────────────────────────────────────────────────────

class AgentRegistryImpl {
  private providers: Map<AgentId, ModelProviderConfig> = new Map();
  private bindings: Map<TaskType, TaskBinding> = new Map();
  private customAgents: Map<string, ModelProviderConfig> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    // ── Register default model providers ──────────────────────────────────
    this.registerProvider({
      agentId: 'claude-opus',
      label: 'Claude Opus',
      gatewayModel: 'claude-opus-4-7',
      endpoint: this.gatewayEndpoint(),
      isChildSafe: false,
      specializations: ['reasoning', 'pedagogy', 'narrative', 'long_context', 'structured_output'],
      costTier: 5,
      enabled: true,
    });

    this.registerProvider({
      agentId: 'gpt-5.5',
      label: 'GPT 5.5',
      gatewayModel: 'gpt-5.5',
      endpoint: this.gatewayEndpoint(),
      isChildSafe: false,
      specializations: ['problem_generation', 'math', 'assessments', 'code', 'structured_output'],
      costTier: 4,
      enabled: true,
    });

    this.registerProvider({
      agentId: 'gemini-image-pro',
      label: 'Gemini Image Pro',
      gatewayModel: 'gemini-2-5-pro',
      endpoint: this.gatewayEndpoint(),
      isChildSafe: false,
      specializations: ['image_generation', 'visual_reasoning', 'diagrams', 'multimodal'],
      costTier: 4,
      enabled: true,
    });

    this.registerProvider({
      agentId: 'nano-banana',
      label: 'Nano Banana',
      gatewayModel: 'gemini-2-5-flash',
      endpoint: this.gatewayEndpoint(),
      isChildSafe: false,
      specializations: ['image_generation', 'icons', 'fast_inference', 'lightweight'],
      costTier: 2,
      enabled: true,
    });

    this.registerProvider({
      agentId: 'minimax-m3',
      label: 'MiniMax M3',
      gatewayModel: 'minimax-m3',
      endpoint: this.gatewayEndpoint(),
      isChildSafe: true,
      specializations: ['child_facing', 'narration', 'interactive_content', 'safety_review'],
      costTier: 2,
      enabled: true,
    });

    this.registerProvider({
      agentId: 'local-llm',
      label: 'Local LLM',
      gatewayModel: process.env.CHILD_AI_MODEL || 'minimax-m3',
      endpoint: this.gatewayEndpoint(),
      isChildSafe: true,
      specializations: ['safety_review', 'child_facing', 'low_latency', 'offline'],
      costTier: 1,
      enabled: true,
    });

    this.registerProvider({
      agentId: 'human',
      label: 'Human Reviewer',
      gatewayModel: '',
      endpoint: '',
      isChildSafe: false,
      specializations: ['manual_review', 'editorial_judgment', 'final_approval'],
      costTier: 0,
      enabled: true,
    });

    // ── Register default task bindings ────────────────────────────────────
    // Negotiable tasks — can be swapped at runtime
    this.bindTask({
      taskType: 'design_spec',
      agentId: 'claude-opus',
      negotiable: true,
      fallbackAgentId: 'gpt-5.5',
      temperature: 0.8,
      maxTokens: 1500,
    });

    this.bindTask({
      taskType: 'write_content',
      agentId: 'claude-opus',
      negotiable: true,
      fallbackAgentId: 'gpt-5.5',
      temperature: 0.7,
      maxTokens: 1000,
    });

    this.bindTask({
      taskType: 'generate_problem',
      agentId: 'gpt-5.5',
      negotiable: true,
      fallbackAgentId: 'claude-opus',
      temperature: 0.6,
      maxTokens: 1000,
    });

    this.bindTask({
      taskType: 'create_assessment',
      agentId: 'gpt-5.5',
      negotiable: true,
      fallbackAgentId: 'claude-opus',
      temperature: 0.5,
      maxTokens: 800,
    });

    this.bindTask({
      taskType: 'review_content',
      agentId: 'claude-opus',
      negotiable: true,
      fallbackAgentId: 'gpt-5.5',
      temperature: 0.3,
      maxTokens: 800,
    });

    // Non-negotiable tasks — locked to specialized models
    this.bindTask({
      taskType: 'generate_image',
      agentId: 'gemini-image-pro',
      negotiable: false,
      lockReason: 'Image generation requires a vision-capable model. Use gemini-image-pro for high-quality or nano-banana for lightweight.',
      fallbackAgentId: 'nano-banana',
      temperature: 0.6,
      maxTokens: 800,
    });

    this.bindTask({
      taskType: 'generate_audio',
      agentId: 'minimax-m3',
      negotiable: false,
      lockReason: 'Audio narration must use a child-safe TTS-capable model.',
      fallbackAgentId: 'local-llm',
      temperature: 0.5,
      maxTokens: 800,
    });

    this.bindTask({
      taskType: 'review_safety',
      agentId: 'local-llm',
      negotiable: false,
      lockReason: 'Safety review must use a safety-trained model with child-safe filtering.',
      fallbackAgentId: 'minimax-m3',
      temperature: 0.2,
      maxTokens: 500,
    });

    // Human-only tasks
    this.bindTask({
      taskType: 'manual_review',
      agentId: 'human',
      negotiable: false,
      lockReason: 'Manual review requires human judgment.',
      temperature: 0,
      maxTokens: 0,
    });

    this.bindTask({
      taskType: 'manual_edit',
      agentId: 'human',
      negotiable: false,
      lockReason: 'Manual editing requires human input.',
      temperature: 0,
      maxTokens: 0,
    });

    // Assemble is negotiable but defaults to the lead agent
    this.bindTask({
      taskType: 'assemble',
      agentId: 'claude-opus',
      negotiable: true,
      fallbackAgentId: 'gpt-5.5',
      temperature: 0.3,
      maxTokens: 500,
    });
  }

  private gatewayEndpoint(): string {
    const url = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
    return `${url}/api/v1/chat/completions`;
  }

  // ── Provider management ─────────────────────────────────────────────────

  registerProvider(config: ModelProviderConfig): void {
    this.providers.set(config.agentId, config);
  }

  /**
   * Register a custom agent not in the default AgentId union.
   * This allows adding new LLMs without changing the type system.
   */
  registerCustomAgent(config: ModelProviderConfig): void {
    this.customAgents.set(config.agentId, config);
    this.providers.set(config.agentId, config);
  }

  getProvider(agentId: AgentId | string): ModelProviderConfig | undefined {
    return this.providers.get(agentId as AgentId);
  }

  listProviders(): ModelProviderConfig[] {
    return Array.from(this.providers.values());
  }

  listEnabledProviders(): ModelProviderConfig[] {
    return this.listProviders().filter((p) => p.enabled);
  }

  enableProvider(agentId: AgentId): void {
    const provider = this.providers.get(agentId);
    if (provider) provider.enabled = true;
  }

  disableProvider(agentId: AgentId): void {
    const provider = this.providers.get(agentId);
    if (provider) provider.enabled = false;
  }

  /**
   * Update a provider's model ID at runtime (e.g. when a new model version drops).
   */
  updateProviderModel(agentId: AgentId, gatewayModel: string): void {
    const provider = this.providers.get(agentId);
    if (provider) provider.gatewayModel = gatewayModel;
  }

  // ── Task binding management ─────────────────────────────────────────────

  bindTask(binding: TaskBinding): void {
    this.bindings.set(binding.taskType, binding);
  }

  /**
   * Reassign a task to a different agent.
   * Throws if the binding is non-negotiable.
   */
  rebindTask(taskType: TaskType, newAgentId: AgentId): { success: boolean; message: string } {
    const binding = this.bindings.get(taskType);
    if (!binding) {
      return { success: false, message: `No binding found for task type: ${taskType}` };
    }

    if (!binding.negotiable) {
      return {
        success: false,
        message: `Cannot rebind ${taskType}: ${binding.lockReason || 'binding is locked'}`,
      };
    }

    // Verify the new agent has the capability
    const capabilities = AGENT_CAPABILITIES[newAgentId];
    if (!capabilities || !capabilities.includes(taskType)) {
      return {
        success: false,
        message: `Agent ${newAgentId} does not have capability for ${taskType}. Required capabilities: ${capabilities?.join(', ') || 'none'}`,
      };
    }

    // Verify the provider exists and is enabled
    const provider = this.providers.get(newAgentId);
    if (!provider || !provider.enabled) {
      return {
        success: false,
        message: `Agent ${newAgentId} is not registered or not enabled`,
      };
    }

    binding.agentId = newAgentId;
    return {
      success: true,
      message: `Task ${taskType} rebound from ${binding.agentId} to ${newAgentId}`,
    };
  }

  getBinding(taskType: TaskType): TaskBinding | undefined {
    return this.bindings.get(taskType);
  }

  getAgentForTask(taskType: TaskType): AgentId {
    const binding = this.bindings.get(taskType);
    if (!binding) throw new Error(`No binding for task type: ${taskType}`);
    return binding.agentId;
  }

  getFallbackAgent(taskType: TaskType): AgentId | undefined {
    const binding = this.bindings.get(taskType);
    return binding?.fallbackAgentId;
  }

  /**
   * Resolve the agent for a task, with fallback if the primary is disabled.
   */
  resolveAgent(taskType: TaskType): AgentId {
    const binding = this.bindings.get(taskType);
    if (!binding) throw new Error(`No binding for task type: ${taskType}`);

    const primary = this.providers.get(binding.agentId);
    if (primary && primary.enabled) {
      return binding.agentId;
    }

    // Try fallback
    if (binding.fallbackAgentId) {
      const fallback = this.providers.get(binding.fallbackAgentId);
      if (fallback && fallback.enabled) {
        return binding.fallbackAgentId;
      }
    }

    // Last resort: find any enabled provider with the capability
    for (const [agentId, capabilities] of Object.entries(AGENT_CAPABILITIES) as [AgentId, TaskType[]][]) {
      if (capabilities.includes(taskType)) {
        const provider = this.providers.get(agentId);
        if (provider && provider.enabled) {
          return agentId;
        }
      }
    }

    throw new Error(`No enabled agent available for task type: ${taskType}`);
  }

  listBindings(): TaskBinding[] {
    return Array.from(this.bindings.values());
  }

  listNegotiableBindings(): TaskBinding[] {
    return this.listBindings().filter((b) => b.negotiable);
  }

  listLockedBindings(): TaskBinding[] {
    return this.listBindings().filter((b) => !b.negotiable);
  }

  // ── Gateway call params ─────────────────────────────────────────────────

  /**
   * Get the gateway call parameters for a task type.
   * Resolves the agent, model, endpoint, and auth from the registry.
   */
  getGatewayParams(taskType: TaskType): {
    agentId: AgentId;
    model: string;
    endpoint: string;
    authKey: string;
    isChildSafe: boolean;
    temperature: number;
    maxTokens: number;
  } {
    const agentId = this.resolveAgent(taskType);
    const provider = this.providers.get(agentId);
    if (!provider) throw new Error(`No provider for agent ${agentId}`);

    const binding = this.bindings.get(taskType);
    const childSafetyKey = process.env.CHILD_SAFETY_API_KEY || 'child-safety-key';
    const gatewayKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

    return {
      agentId,
      model: provider.gatewayModel,
      endpoint: provider.endpoint,
      authKey: provider.isChildSafe ? childSafetyKey : gatewayKey,
      isChildSafe: provider.isChildSafe,
      temperature: binding?.temperature ?? 0.7,
      maxTokens: binding?.maxTokens ?? 2000,
    };
  }

  // ── Config snapshot ─────────────────────────────────────────────────────

  /**
   * Get a full configuration snapshot for display or persistence.
   */
  getConfigSnapshot(): {
    providers: ModelProviderConfig[];
    bindings: TaskBinding[];
    customAgents: ModelProviderConfig[];
  } {
    return {
      providers: this.listProviders(),
      bindings: this.listBindings(),
      customAgents: Array.from(this.customAgents.values()),
    };
  }

  /**
   * Load configuration from a snapshot (e.g. from DB or env).
   */
  loadConfigSnapshot(snapshot: {
    providers?: Partial<ModelProviderConfig>[];
    bindings?: Partial<TaskBinding>[];
  }): void {
    if (snapshot.providers) {
      for (const p of snapshot.providers) {
        if (p.agentId) {
          const existing = this.providers.get(p.agentId);
          if (existing) {
            this.providers.set(p.agentId, { ...existing, ...p } as ModelProviderConfig);
          }
        }
      }
    }
    if (snapshot.bindings) {
      for (const b of snapshot.bindings) {
        if (b.taskType) {
          const existing = this.bindings.get(b.taskType);
          if (existing) {
            this.bindings.set(b.taskType, { ...existing, ...b } as TaskBinding);
          }
        }
      }
    }
  }
}

// ─── Singleton export ───────────────────────────────────────────────────────

export const agentRegistry = new AgentRegistryImpl();
export { AgentRegistryImpl };
