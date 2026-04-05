/**
 * Script Metadata Structure
 * Defines what should be saved in generation_params JSONB field
 */

export interface ScriptStats {
  dialogue_count: number;
  total_words: number;
  estimated_duration_minutes: number;
  speaker_count: number;
  avg_words_per_exchange: number;
  speakers: Array<{
    id: string;
    name: string;
    line_count: number;
  }>;
}

export interface ScriptGenerationParams {
  // Stats from script analysis
  stats: ScriptStats;
  
  // Generation settings (from UI)
  script_length: 'brief' | 'default' | 'deep-dive';
  script_tone?: string;          // e.g., "professional", "casual", "educational"
  script_audience?: string;      // e.g., "professionals", "general", "experts"
  script_style?: string;         // e.g., "co-host", "interview", "narrative"
  script_focus?: string;         // Custom focus text from "Advanced options"
  
  // AI generation metadata
  ai_model?: string;
  ai_provider?: string;
  generation_time_ms?: number;
  
  // Source materials used
  source_materials?: Array<{
    id: string;
    title: string;
  }>;
  
  // Timestamp
  generated_at?: string;
}

/**
 * Calculate script statistics from dialogue turns
 */
export function calculateScriptStats(
  dialogue: Array<{ speaker: string; content: string; duration?: number }>,
  speakers: Array<{ id: string; name: string }>
): ScriptStats {
  const total_words = dialogue.reduce(
    (sum, turn) => sum + turn.content.split(' ').length,
    0
  );
  
  const dialogue_count = dialogue.length;
  
  const estimated_duration_minutes = dialogue.reduce(
    (sum, turn) => sum + (turn.duration || 0),
    0
  ) / 60;
  
  const speaker_count = speakers.length;
  
  const avg_words_per_exchange = dialogue_count > 0 
    ? Math.round(total_words / dialogue_count)
    : 0;
  
  // Calculate line count per speaker
  const speakerStats = speakers.map(speaker => ({
    id: speaker.id,
    name: speaker.name,
    line_count: dialogue.filter(turn => turn.speaker === speaker.name).length,
  }));
  
  return {
    dialogue_count,
    total_words,
    estimated_duration_minutes,
    speaker_count,
    avg_words_per_exchange,
    speakers: speakerStats,
  };
}

/**
 * Create complete generation params object for saving
 */
export function createGenerationParams(
  dialogue: Array<{ speaker: string; content: string; duration?: number }>,
  speakers: Array<{ id: string; name: string }>,
  options: {
    script_length: 'brief' | 'default' | 'deep-dive';
    script_tone?: string;
    script_audience?: string;
    script_style?: string;
    script_focus?: string;
    ai_model?: string;
    ai_provider?: string;
    generation_time_ms?: number;
    source_materials?: Array<{ id: string; title: string }>;
  }
): ScriptGenerationParams {
  const stats = calculateScriptStats(dialogue, speakers);
  
  return {
    stats,
    script_length: options.script_length,
    script_tone: options.script_tone,
    script_audience: options.script_audience,
    script_style: options.script_style,
    script_focus: options.script_focus,
    ai_model: options.ai_model,
    ai_provider: options.ai_provider,
    generation_time_ms: options.generation_time_ms,
    source_materials: options.source_materials,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Extract stats from saved generation params
 */
export function extractStats(generation_params: any): ScriptStats | null {
  if (!generation_params || !generation_params.stats) {
    return null;
  }
  
  return generation_params.stats;
}
