/**
 * LLM Model Config — hierarchical single source of truth for all LLM model
 * resolution in the kids learning platform.
 *
 * Hierarchy (top wins):
 *   1. Explicit env override for the specific use case
 *   2. Parent use-case env (e.g. AGENT_LOOP_MODEL falls back to LEARN_TUTOR_MODEL)
 *   3. Global default for the platform
 *
 * Use cases:
 *   - Child chat (direct, low-latency, child-facing)    → GLM-5.2 on RTX
 *   - Agent loop (background tool-selection hops)        → Qwen3-30B-A3B on DGX
 *   - Learn tutor (socratic coaching, hint generation)   → Qwen3-30B-A3B on DGX
 *   - Content generation (parent portal)                 → GLM-5.3-Flash on RTX,
 *                                                          cloud fallbacks via chain
 *   - Vision / screen analysis                           → see vision-model-config.ts
 *
 * Swapping a model for any use case is an env change — no code edits needed.
 * Adding a new use case: add a function here, never copy-paste a constant.
 *
 * Contract: docs/FSD_AGENTIC_HARNESS.md (layer rules — model resolution is shared infra)
 */

// ─── Use-case model resolution ───────────────────────────────────────────────

/**
 * Model for direct child chat (companion, dictionary, pokedex, email, journal).
 * Low-latency, child-facing, runs on RTX (GLM-5.2 via llama-server :8010).
 */
export function getChildChatModel(): string {
  return process.env.CHILD_AI_MODEL || 'glm-5.2';
}

/**
 * Model for background agentic loops (picode-transport tool selection,
 * proactive nudges, research synthesis). Runs on DGX-spark (Qwen3-30B-A3B
 * via vLLM :8008). Falls back to LEARN_TUTOR_MODEL then CHILD_AI_MODEL
 * so a single env override covers all background loops if needed.
 */
export function getAgentLoopModel(): string {
  return (
    process.env.AGENT_LOOP_MODEL ||
    process.env.LEARN_TUTOR_MODEL ||
    getChildChatModel()
  );
}

/**
 * Model for the learn tutor (socratic coaching, hint generation, attempt
 * feedback). Runs on DGX-spark (Qwen3-30B-A3B via vLLM :8008). Falls back
 * to AGENT_LOOP_MODEL so the two stay in sync unless explicitly overridden.
 */
export function getLearnTutorModel(): string {
  return (
    process.env.LEARN_TUTOR_MODEL ||
    process.env.AGENT_LOOP_MODEL ||
    getChildChatModel()
  );
}

/**
 * Model for parent-portal content generation (lesson item generation,
 * page-builder structures, redesigns). Primary: GLM-5.3-Flash on RTX
 * (local, free, 131K ctx, multimodal). Cloud models (Anthropic/Google via
 * the AI Gateway) act as fallbacks when the local backend is unavailable.
 */
export function getContentGenModel(): string {
  return process.env.CONTENT_GEN_MODEL || 'glm-5.3-flash';
}

/**
 * Ordered model chain for content generation. First entry is primary; the
 * rest are fallbacks tried in order (see lib/services/content-gen-client.ts).
 * Override with CONTENT_GEN_MODEL_CHAIN (comma-separated) to repoint the
 * whole tier without code edits.
 */
export function getContentGenModelChain(): string[] {
  const raw = process.env.CONTENT_GEN_MODEL_CHAIN;
  if (raw && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [getContentGenModel(), 'claude-sonnet-5', 'gemini-3.1-pro-preview'];
}

/**
 * Safety contract for child-facing model calls. All child interactions
 * use the 'minor-restricted' contract enforced by the AI Gateway.
 */
export function getChildSafetyContract(): string {
  return process.env.LEARN_TUTOR_CONTRACT || 'minor-restricted';
}

// ─── Model family metadata (for audit/harness events) ────────────────────────

/**
 * Resolve the model family tag for harness audit metadata.
 * Maps model IDs to short family names used in service_id / audit logs.
 */
export function getModelFamily(model: string): string {
  if (model.startsWith('qwen3')) return 'qwen3';
  if (model.startsWith('glm')) return 'glm';
  if (model.startsWith('minimax')) return 'minimax';
  if (model.startsWith('claude')) return 'anthropic';
  if (model.startsWith('gemini')) return 'google';
  return 'unknown';
}

// ─── Convenience re-exports for incremental migration ────────────────────────
// These let files import { CHILD_AI_MODEL } from '@/lib/llm-model-config'
// as a drop-in replacement for their local const, then migrate to the
// function call form at their own pace.

export const CHILD_AI_MODEL = getChildChatModel();
export const AGENT_LOOP_MODEL = getAgentLoopModel();
export const LEARN_TUTOR_MODEL = getLearnTutorModel();
export const CONTENT_GEN_MODEL = getContentGenModel();
export const LEARN_TUTOR_CONTRACT = getChildSafetyContract();
