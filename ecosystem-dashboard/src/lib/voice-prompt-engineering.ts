/**
 * Voice Prompt Engineering Library
 * 
 * Curated natural language prompts to guide Gemini TTS voice characteristics.
 * Based on tested voice personalities and speaker roles.
 */

export interface VoicePromptConfig {
  enabled: boolean;
  voice: string;
  role: string;
  gender: 'male' | 'female' | 'neutral';
}

/**
 * Curated voice prompts optimized for different roles and voices
 * Format: [voice][role] = prompt instruction
 */
const VOICE_PROMPT_LIBRARY: Record<string, Record<string, string>> = {
  // === DEEP MALE VOICES (CONFIRMED) ===
  
  'Charon': {
    'narrator': 'Speak in a deep, smooth voice with calm authority and measured pacing, like a seasoned documentary narrator',
    'host': 'Speak with conversational confidence and approachable professionalism, using a warm deep tone',
    'expert': 'Speak authoritatively but warmly, like an experienced professor explaining complex topics',
    'moderator': 'Speak with calm, balanced authority while maintaining conversational warmth',
    'default': 'Speak in a deep, smooth voice with conversational authority and measured pacing'
  },
  
  'Algenib': {
    'narrator': 'Speak in a gravelly, distinctive voice with dramatic emphasis and memorable character',
    'character': 'Use a unique, memorable vocal character with gravelly texture and strong personality',
    'host': 'Speak with distinctive gravelly tone, combining character with professionalism',
    'storyteller': 'Speak dramatically with gravelly emphasis, pausing for impact and building tension',
    'default': 'Speak in a gravelly, distinctive voice with dramatic flair and memorable presence'
  },
  
  'Puck': {
    'host': 'Speak in a balanced, versatile male voice with professional warmth and clarity',
    'narrator': 'Speak with clear, balanced delivery and natural pacing, like a trusted guide',
    'expert': 'Speak with professional authority and approachable confidence',
    'default': 'Speak in a balanced, versatile voice with professional warmth and natural delivery'
  },
  
  'Algieba': {
    'host': 'Speak in a smooth, polished voice with sophisticated professionalism',
    'narrator': 'Speak with refined elegance and polished delivery, like a premium brand voice',
    'expert': 'Speak authoritatively with smooth, sophisticated confidence',
    'default': 'Speak in a smooth, polished voice with refined sophistication'
  },
  
  'Pulcherrima': {
    'narrator': 'Speak with refined sophistication and elegant delivery, conveying premium quality',
    'host': 'Speak sophisticatedly with polished professionalism and cultured elegance',
    'expert': 'Speak with distinguished authority and refined intellectual presence',
    'default': 'Speak in a refined, sophisticated voice with elegant, cultured delivery'
  },
  
  // === PRIORITY FEMALE VOICES ===
  
  'Zephyr': {
    'host': 'Speak with bright enthusiasm and upbeat energy, maintaining warm engagement',
    'co-host': 'Speak cheerfully with engaging warmth and dynamic enthusiasm',
    'moderator': 'Speak energetically while maintaining professionalism and clarity',
    'default': 'Speak in a bright, enthusiastic voice with upbeat, engaging energy'
  },
  
  'Kore': {
    'host': 'Speak with confident, youthful energy and dynamic professionalism',
    'co-host': 'Speak energetically with confident enthusiasm and perky engagement',
    'expert': 'Speak authoritatively with youthful confidence and clear articulation',
    'default': 'Speak in an energetic, confident voice with youthful enthusiasm'
  },
  
  'Aoede': {
    'host': 'Speak in a clear, thoughtful voice with intelligent curiosity and warm engagement',
    'interviewer': 'Speak with engaged interest, thoughtful questioning, and warm professionalism',
    'moderator': 'Speak thoughtfully with balanced intelligence and conversational warmth',
    'expert': 'Speak articulately with thoughtful intelligence and measured expertise',
    'default': 'Speak in a clear, conversational voice with thoughtful, engaging intelligence'
  },
  
  'Despina': {
    'host': 'Speak warmly with inviting friendliness and trustworthy professionalism',
    'narrator': 'Speak with warm, smooth delivery that feels welcoming and trustworthy',
    'co-host': 'Speak with friendly warmth and engaging approachability',
    'default': 'Speak in a warm, inviting voice with friendly, trustworthy delivery'
  },
  
  'Leda': {
    'host': 'Speak with composed professionalism and sophisticated authority',
    'expert': 'Speak authoritatively with composed intelligence and professional gravitas',
    'moderator': 'Speak with calm, professional authority while maintaining approachability',
    'narrator': 'Speak with sophisticated composure and professional elegance',
    'default': 'Speak in a composed, professional voice with sophisticated authority'
  },
  
  'Erinome': {
    'expert': 'Speak articulately with professional precision and sophisticated intelligence',
    'narrator': 'Speak with measured, thoughtful delivery and professional elegance',
    'host': 'Speak professionally with articulate clarity and sophisticated warmth',
    'educator': 'Speak clearly with measured patience and professional expertise',
    'default': 'Speak in a professional, articulate voice with measured, thoughtful delivery'
  },
  
  // === ADDITIONAL VOICES (Selected) ===
  
  'Enceladus': {
    'host': 'Speak energetically with enthusiastic excitement and impactful delivery',
    'narrator': 'Speak with breathy energy and enthusiastic conviction',
    'default': 'Speak energetically with enthusiastic, impactful delivery'
  },
  
  'Sadaltager': {
    'narrator': 'Speak with strong, commanding presence and powerful authority',
    'host': 'Speak commandingly with strong conviction and authoritative power',
    'default': 'Speak in a strong, commanding voice with powerful authority'
  },
  
  'Zubenelgenubi': {
    'host': 'Speak in a well-balanced, versatile voice with professional confidence',
    'narrator': 'Speak with balanced clarity and versatile professionalism',
    'default': 'Speak in a balanced, versatile voice with professional delivery'
  }
};

/**
 * Get natural language prompt for a voice and role combination
 */
export function getVoicePrompt(voice: string, role: string): string | null {
  const voicePrompts = VOICE_PROMPT_LIBRARY[voice];
  if (!voicePrompts) return null;
  
  // Try exact role match first, then fall back to default
  return voicePrompts[role.toLowerCase()] || voicePrompts['default'] || null;
}

/**
 * Apply voice prompt to text if prompting is enabled
 */
export function applyVoicePrompt(
  text: string,
  config: VoicePromptConfig
): string {
  if (!config.enabled) {
    return text;
  }
  
  const prompt = getVoicePrompt(config.voice, config.role);
  
  if (!prompt) {
    // No prompt available for this voice/role combo
    return text;
  }
  
  // Format: [instruction] actual text
  return `[${prompt}] ${text}`;
}

/**
 * Get available voice prompts for a given voice
 */
export function getAvailablePrompts(voice: string): Record<string, string> | null {
  return VOICE_PROMPT_LIBRARY[voice] || null;
}

/**
 * Check if voice has prompt engineering support
 */
export function hasPromptSupport(voice: string): boolean {
  return voice in VOICE_PROMPT_LIBRARY;
}

/**
 * Get all voices with prompt engineering support
 */
export function getSupportedVoices(): string[] {
  return Object.keys(VOICE_PROMPT_LIBRARY);
}

/**
 * Format multi-speaker script with voice prompts
 * For advanced use: applying different prompts per speaker turn
 */
export function formatMultiSpeakerScript(
  speakers: Array<{ name: string; voice: string; role: string; text: string }>,
  enabled: boolean = true
): string {
  if (!enabled) {
    return speakers.map(s => `${s.name}: ${s.text}`).join('\n');
  }
  
  return speakers.map(speaker => {
    const prompt = getVoicePrompt(speaker.voice, speaker.role);
    const instruction = prompt ? `[${prompt}] ` : '';
    return `${speaker.name}: ${instruction}${speaker.text}`;
  }).join('\n');
}
