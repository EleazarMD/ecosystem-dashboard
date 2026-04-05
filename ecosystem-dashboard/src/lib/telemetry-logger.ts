/**
 * Telemetry Logger
 * Logs AI provider usage to AI Inferencing Service telemetry system
 */

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';

interface TelemetryEvent {
  serviceId: string;
  provider: string;
  model: string;
  requestType?: string;
  durationMs: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;
  costUsd?: number;
  status: 'success' | 'error';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log telemetry event to AI Inferencing Service
 */
export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    const response = await fetch(`${AI_INFERENCING_URL}/api/v1/telemetry/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceId: event.serviceId,
        provider: event.provider,
        model: event.model,
        requestType: event.requestType || 'unknown',
        durationMs: event.durationMs,
        tokensPrompt: event.tokensPrompt || 0,
        tokensCompletion: event.tokensCompletion || 0,
        tokensTotal: event.tokensTotal || 0,
        costUsd: event.costUsd || 0,
        status: event.status,
        errorMessage: event.errorMessage,
        metadata: event.metadata || {},
      }),
    });

    if (!response.ok) {
      console.warn('[Telemetry] Failed to log event:', response.statusText);
    } else {
      console.log(`[Telemetry] ✅ Logged ${event.provider}/${event.model} (${event.durationMs}ms, $${event.costUsd?.toFixed(4)})`);
    }
  } catch (error) {
    // Don't fail the main request if telemetry fails
    console.warn('[Telemetry] Failed to log event:', error);
  }
}

/**
 * Calculate approximate cost for Gemini TTS
 * Based on character count
 */
export function calculateGeminiTTSCost(textLength: number): number {
  // Gemini TTS pricing: ~$0.016 per 1000 characters
  return (textLength / 1000) * 0.016;
}

/**
 * Calculate approximate cost for OpenAI TTS
 * Based on character count
 */
export function calculateOpenAITTSCost(textLength: number, model: string): number {
  // OpenAI TTS pricing:
  // tts-1: $0.015 per 1000 characters
  // tts-1-hd: $0.030 per 1000 characters
  const pricePerK = model.includes('hd') ? 0.030 : 0.015;
  return (textLength / 1000) * pricePerK;
}

/**
 * Podcast Studio specific telemetry helpers
 */
export const PodcastTelemetry = {
  /**
   * Log Gemini TTS request
   */
  logGeminiTTS: async (params: {
    textLength: number;
    voice: string;
    durationMs: number;
    status: 'success' | 'error';
    errorMessage?: string;
  }) => {
    await logTelemetry({
      serviceId: 'podcast-studio',
      provider: 'google',
      model: 'gemini-2.5-flash-preview-tts',
      requestType: 'tts',
      durationMs: params.durationMs,
      tokensTotal: params.textLength, // Characters as proxy for tokens
      costUsd: calculateGeminiTTSCost(params.textLength),
      status: params.status,
      errorMessage: params.errorMessage,
      metadata: {
        voice: params.voice,
        textLength: params.textLength,
      },
    });
  },

  /**
   * Log OpenAI TTS request
   */
  logOpenAITTS: async (params: {
    textLength: number;
    voice: string;
    model: string;
    durationMs: number;
    status: 'success' | 'error';
    errorMessage?: string;
  }) => {
    await logTelemetry({
      serviceId: 'podcast-studio',
      provider: 'openai',
      model: params.model,
      requestType: 'tts',
      durationMs: params.durationMs,
      tokensTotal: params.textLength,
      costUsd: calculateOpenAITTSCost(params.textLength, params.model),
      status: params.status,
      errorMessage: params.errorMessage,
      metadata: {
        voice: params.voice,
        textLength: params.textLength,
      },
    });
  },

  /**
   * Log script generation request
   */
  logScriptGeneration: async (params: {
    provider: string;
    model: string;
    tokensPrompt: number;
    tokensCompletion: number;
    durationMs: number;
    costUsd: number;
    status: 'success' | 'error';
    errorMessage?: string;
  }) => {
    await logTelemetry({
      serviceId: 'podcast-studio',
      provider: params.provider,
      model: params.model,
      requestType: 'completion',
      durationMs: params.durationMs,
      tokensPrompt: params.tokensPrompt,
      tokensCompletion: params.tokensCompletion,
      tokensTotal: params.tokensPrompt + params.tokensCompletion,
      costUsd: params.costUsd,
      status: params.status,
      errorMessage: params.errorMessage,
    });
  },
};
