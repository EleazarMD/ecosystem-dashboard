/**
 * Voice Rotation System for News Stories
 * 
 * Maps story categories to appropriate voice profiles and rotates voices
 * to provide variety in the news audio experience.
 */

export interface VoiceMapping {
  category: string;
  voices: string[];
  description: string;
}

/**
 * Voice mappings for each news category
 * Based on available Qwen TTS library voices
 */
export const CATEGORY_VOICE_MAPPINGS: VoiceMapping[] = [
  {
    category: 'technology',
    voices: [
      'american_male_anchor',           // Professional tech news anchor
      'american_female_confident',      // Confident tech commentator
      'american_male_narrator',         // Authoritative tech narrator
      'american_male_executive',        // Clear tech analyst
    ],
    description: 'Tech news, AI, software, hardware',
  },
  {
    category: 'science',
    voices: [
      'american_male_narrator',         // Documentary-style science
      'british_female_sophisticated',   // Elegant science reporting
      'american_female_confident',      // Smart science explainer
      'american_male_refined',          // BBC-style science
    ],
    description: 'Scientific research, discoveries',
  },
  {
    category: 'business',
    voices: [
      'american_male_executive',        // Business analyst
      'british_female_sophisticated',   // Financial commentary
      'american_male_anchor',           // Business news anchor
      'british_female_anchor',          // Economic analysis
    ],
    description: 'Business, economics, markets',
  },
  {
    category: 'politics',
    voices: [
      'british_female_sophisticated',   // Political analysis
      'american_male_anchor',           // News anchor
      'american_male_narrator',         // Political commentary
      'american_male_executive',        // Policy analysis
    ],
    description: 'Political analysis, policy',
  },
  {
    category: 'healthcare',
    voices: [
      'american_female_warm',           // Compassionate health reporting
      'american_male_executive',        // Medical analysis
      'british_female_sophisticated',   // Health policy
      'american_male_narrator',         // Health documentaries
    ],
    description: 'Medical, health, pharma',
  },
  {
    category: 'general',
    voices: [
      'american_male_anchor',
      'american_female_warm',
      'american_male_narrator',
      'american_female_confident',
    ],
    description: 'General news and features',
  },
];

// Note: Mexican Spanish voices (mexican_male_*, mexican_female_*, spanish_female_*)
// are excluded from English news rotation as they are reserved for Spanish-language projects

/**
 * Get the next voice for a given category using round-robin rotation
 */
export function getNextVoiceForCategory(
  category: string,
  lastUsedVoices: Record<string, number> = {}
): string {
  // Find the voice mapping for this category
  const mapping = CATEGORY_VOICE_MAPPINGS.find(m => m.category === category);
  
  // If no mapping found, use general category
  const voices = mapping?.voices || CATEGORY_VOICE_MAPPINGS.find(m => m.category === 'general')!.voices;
  
  // Get the last used index for this category (default to -1)
  const lastIndex = lastUsedVoices[category] ?? -1;
  
  // Get next index (round-robin)
  const nextIndex = (lastIndex + 1) % voices.length;
  
  return voices[nextIndex];
}

/**
 * Get voice rotation state from database
 */
export async function getVoiceRotationState(pool: any): Promise<Record<string, number>> {
  try {
    const result = await pool.query(`
      SELECT category, voice_id, 
             ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) as rn
      FROM news.daily_stories
      WHERE audio_url IS NOT NULL
        AND category IS NOT NULL
        AND created_at >= NOW() - INTERVAL '7 days'
    `);
    
    const state: Record<string, number> = {};
    
    for (const row of result.rows) {
      if (row.rn === 1 && row.voice_id) {
        // Find the index of this voice in the category's voice list
        const mapping = CATEGORY_VOICE_MAPPINGS.find(m => m.category === row.category);
        if (mapping) {
          const index = mapping.voices.indexOf(row.voice_id);
          if (index !== -1) {
            state[row.category] = index;
          }
        }
      }
    }
    
    return state;
  } catch (error) {
    console.error('Error fetching voice rotation state:', error);
    return {};
  }
}

/**
 * Voice configuration from settings
 */
export interface VoiceSettings {
  enabled: boolean;
  provider: 'qwen' | 'gemini';
  selection_mode: 'manual' | 'rotation' | 'random' | 'category';
  default_voice: string;
  voice_pool: string[];
  category_voices: Record<string, string[]>;
  settings: {
    temperature: number;
    speed: number;
    auto_generate: boolean;
  };
}

/**
 * Select appropriate voice for a story based on category and settings
 */
export async function selectVoiceForStory(
  category: string,
  pool: any,
  voiceSettings?: VoiceSettings
): Promise<{ voiceId: string; voiceName: string; provider: string }> {
  // If no settings provided, use default rotation behavior
  if (!voiceSettings) {
    const rotationState = await getVoiceRotationState(pool);
    const voiceId = getNextVoiceForCategory(category, rotationState);
    return { voiceId, voiceName: voiceId, provider: 'qwen' };
  }

  const { selection_mode, default_voice, voice_pool, category_voices, provider } = voiceSettings;

  let voiceId: string;

  switch (selection_mode) {
    case 'manual':
      // Use the default voice for all stories
      voiceId = default_voice || 'american_male_anchor';
      break;

    case 'random':
      // Randomly select from voice pool
      const pool_voices = voice_pool?.length > 0 ? voice_pool : ['american_male_anchor'];
      voiceId = pool_voices[Math.floor(Math.random() * pool_voices.length)];
      break;

    case 'category':
      // Use category-specific voices with rotation
      const catVoices = category_voices?.[category] || category_voices?.['general'] || ['american_male_anchor'];
      if (catVoices.length === 0) {
        voiceId = default_voice || 'american_male_anchor';
      } else {
        // Get rotation state for this category
        const rotationState = await getVoiceRotationState(pool);
        const lastIndex = rotationState[category] ?? -1;
        const nextIndex = (lastIndex + 1) % catVoices.length;
        voiceId = catVoices[nextIndex];
      }
      break;

    case 'rotation':
    default:
      // Rotate through voice pool
      const rotationPool = voice_pool?.length > 0 ? voice_pool : ['american_male_anchor'];
      const rotationState = await getVoiceRotationState(pool);
      const lastIndex = rotationState[category] ?? -1;
      const nextIndex = (lastIndex + 1) % rotationPool.length;
      voiceId = rotationPool[nextIndex];
      break;
  }

  return { voiceId, voiceName: voiceId, provider: provider || 'qwen' };
}

/**
 * Get all available voices for a category
 */
export function getVoicesForCategory(category: string): string[] {
  const mapping = CATEGORY_VOICE_MAPPINGS.find(m => m.category === category);
  return mapping?.voices || CATEGORY_VOICE_MAPPINGS.find(m => m.category === 'general')!.voices;
}

/**
 * Get voice statistics for reporting
 */
export async function getVoiceUsageStats(pool: any): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        category,
        voice_id,
        COUNT(*) as usage_count,
        MAX(created_at) as last_used
      FROM news.daily_stories
      WHERE audio_url IS NOT NULL
        AND voice_id IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY category, voice_id
      ORDER BY category, usage_count DESC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching voice usage stats:', error);
    return [];
  }
}
