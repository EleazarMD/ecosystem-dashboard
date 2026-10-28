/**
 * Vision Model Config — single source of truth for the active vision model.
 *
 * The dashboard NEVER hardcodes a specific vision model. Instead, all vision
 * consumers (vlm-service, agent registry, dispatch orchestrator, API proxies)
 * resolve the model through this module. Swapping vision models is a config
 * change, not a code change:
 *
 *   1. Point the AI Gateway alias at the new backend
 *      (core/ai-gateway-v2/config/routing-rules.json), OR
 *   2. Override via env: VISION_MODEL_ID / VISION_MODEL_LABEL
 *      (NEXT_PUBLIC_ variants for client-side display).
 *
 * The gateway model id is itself an abstraction — the AI Gateway routes it to
 * whatever backend is currently deployed (local vLLM, cloud, etc.). The label
 * is display-only and should describe the actual deployed model so the UI
 * never lies about what is running.
 */

/** Default gateway model id for vision requests. The AI Gateway routes this
 * to the DGX-spark vLLM backend (Qwen3.8-27B-FP8 multimodal on port 8000). */
const DEFAULT_VISION_MODEL_ID = 'qwen3.8-27b';

/** Display label for the deployed vision model. Keep in sync with the actual
 * model behind the gateway routing — verify with the gateway routing rules. */
const DEFAULT_VISION_MODEL_LABEL = 'Qwen3.8-27B (DGX, multimodal)';

/**
 * The gateway model id to send in vision chat-completion requests.
 * Server-side: VISION_MODEL_ID. Client bundles: NEXT_PUBLIC_VISION_MODEL_ID.
 */
export function getVisionModelId(): string {
  return (
    process.env.VISION_MODEL_ID ||
    process.env.NEXT_PUBLIC_VISION_MODEL_ID ||
    DEFAULT_VISION_MODEL_ID
  );
}

/**
 * Human-readable label of the deployed vision model (for UI/registry display).
 */
export function getVisionModelLabel(): string {
  return (
    process.env.VISION_MODEL_LABEL ||
    process.env.NEXT_PUBLIC_VISION_MODEL_LABEL ||
    DEFAULT_VISION_MODEL_LABEL
  );
}

/**
 * Known aliases that should resolve to the active vision model when clients
 * send legacy/shorthand ids (e.g. 'qwen-vlm', 'local').
 */
export const VISION_MODEL_ALIASES = ['qwen-vlm', 'qwen-vision', 'qwen3-vl-30b-a3b', 'qwen3.8-27b', 'local'] as const;

/** True when the given model id refers to the local/gateway vision model. */
export function isVisionModelAlias(model: string | undefined): boolean {
  return !!model && (VISION_MODEL_ALIASES as readonly string[]).includes(model);
}
