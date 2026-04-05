/**
 * Unified TTS Voice Configuration
 * Integrates with AI Gateway and AI Inferencing architecture
 */

export type TTSProvider = 'qwen' | 'gemini' | 'openai';

export interface TTSVoice {
  id: string;
  name: string;
  provider: TTSProvider;
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  description: string;
  personality?: string;
  characteristics: string[];
  recommended_for: string[];
}

/**
 * Gemini TTS Voices (Default - Primary Choice)
 * From Gemini 2.5 Pro/Flash TTS - Complete 30 Voice Collection
 * 
 * Gender Distribution:
 * - 18 Male voices (varying depth/masculinity - many are high-pitched/androgynous)
 * - 12 Female voices
 * 
 * PRIORITY VOICES (Featured in UI - TESTED & CONFIRMED):
 * - Top 5 Deep Male: Charon, Algenib, Puck, Algieba, Pulcherrima (LOW PITCH)
 * - Top 6 Female: Zephyr, Kore, Aoede, Despina, Leda, Erinome (HIGH PITCH)
 * - CORRECTED: Autonoe = female high, Gacrux = female low (NOT male!)
 * - Source: Japanese voice testing (all 30 voices analyzed)
 */
export const GEMINI_VOICES: TTSVoice[] = [
  // === PRIORITY MALE VOICES (Actually Deep/Low Pitch - TOP 5) ===
  {
    id: 'Charon',
    name: 'Charon ⭐ DEEP',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Smooth, Low Pitch',
    description: 'CONFIRMED DEEP male voice - Smooth, low pitch, conversational authority',
    characteristics: ['deep', 'smooth', 'conversational', 'assured', 'trustworthy', 'low-pitch'],
    recommended_for: ['Podcast narration', 'Explainer videos', 'Corporate communications', 'Authoritative hosting']
  },
  {
    id: 'Algenib',
    name: 'Algenib ⭐ DEEP',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Gravelly, Low Pitch',
    description: 'CONFIRMED DEEP male - Gravelly texture with low pitch, distinctive and memorable',
    characteristics: ['deep', 'gravelly', 'distinctive', 'unique', 'memorable', 'masculine', 'low-pitch'],
    recommended_for: ['Dramatic reads', 'Distinctive character work', 'Storytelling with edge', 'Narrative depth']
  },
  {
    id: 'Puck',
    name: 'Puck ⭐',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Balanced, Low Pitch',
    description: 'CONFIRMED male low pitch - Balanced and versatile with masculine depth',
    characteristics: ['deep', 'balanced', 'versatile', 'masculine', 'low-pitch'],
    recommended_for: ['General hosting', 'Versatile content', 'Professional narration']
  },
  {
    id: 'Algieba',
    name: 'Algieba ⭐',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Smooth, Low Pitch',
    description: 'CONFIRMED male low pitch - Smooth and polished with masculine presence',
    characteristics: ['deep', 'smooth', 'polished', 'refined', 'low-pitch'],
    recommended_for: ['Professional content', 'Sophisticated narration', 'Premium branding']
  },
  {
    id: 'Pulcherrima',
    name: 'Pulcherrima',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Refined, Low Pitch',
    description: 'CONFIRMED male low pitch - Refined and sophisticated',
    characteristics: ['deep', 'refined', 'sophisticated', 'elegant', 'low-pitch'],
    recommended_for: ['Luxury branding', 'High-end narration', 'Sophisticated content']
  },

  // === PRIORITY FEMALE VOICES (Most Versatile - TOP 6) ===
  {
    id: 'Zephyr',
    name: 'Zephyr ⭐',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Bright, Energetic',
    description: 'Enthusiastic and bright voice with higher pitch - perfect for upbeat content',
    characteristics: ['bright', 'higher-pitch', 'enthusiastic', 'energetic'],
    recommended_for: ['Lifestyle', 'Entertainment', 'Casual discussions', 'Upbeat hosting']
  },
  {
    id: 'Kore',
    name: 'Kore ⭐',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Energetic, Confident',
    description: 'Energetic and youthful female voice, confident and enthusiastic with perky quality',
    characteristics: ['energetic', 'youthful', 'confident', 'perky'],
    recommended_for: ['Upbeat commercials', 'Young audience tutorials', 'Dynamic hosting']
  },
  {
    id: 'Aoede',
    name: 'Aoede ⭐',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Conversational, Thoughtful',
    description: 'Clear, conversational voice with thoughtful, engaging quality - excellent for long-form content',
    characteristics: ['conversational', 'thoughtful', 'intelligent', 'articulate'],
    recommended_for: ['Podcast hosting', 'E-learning', 'Informative content', 'Interviews']
  },
  {
    id: 'Despina',
    name: 'Despina ⭐',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Warm, Inviting',
    description: 'Warm and inviting voice, friendly and trustworthy with smooth delivery',
    characteristics: ['warm', 'inviting', 'friendly', 'trustworthy', 'smooth'],
    recommended_for: ['Lifestyle commercials', 'Customer service', 'Welcoming narrations', 'Friendly hosting']
  },
  {
    id: 'Leda',
    name: 'Leda ⭐',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Composed, Professional',
    description: 'Composed and professional voice conveying authority and calm - sophisticated delivery',
    characteristics: ['composed', 'professional', 'authoritative', 'sophisticated'],
    recommended_for: ['Corporate training', 'Serious narration', 'Formal announcements', 'Business content']
  },
  {
    id: 'Erinome',
    name: 'Erinome ⭐',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Professional, Articulate',
    description: 'Professional and articulate voice with measured, thoughtful delivery',
    characteristics: ['professional', 'articulate', 'thoughtful', 'sophisticated'],
    recommended_for: ['Educational content', 'Corporate narration', 'Museum guides', 'Technical explanations']
  },

  // === ADDITIONAL FEMALE VOICES (8 more for variety) ===
  {
    id: 'Autonoe',
    name: 'Autonoe',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Bright, High Pitch',
    description: 'CONFIRMED FEMALE HIGH PITCH - Bright, clear voice (NOT deep male!)',
    characteristics: ['bright', 'high-pitch', 'clear', 'feminine'],
    recommended_for: ['Upbeat content', 'Young audience', 'Energetic hosting']
  },
  {
    id: 'Gacrux',
    name: 'Gacrux',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Smooth, Low Pitch',
    description: 'CONFIRMED FEMALE LOW PITCH - Smooth, deeper female voice (NOT deep male!)',
    characteristics: ['smooth', 'low-pitch', 'confident', 'mature-female'],
    recommended_for: ['Professional female narrator', 'Mature content', 'Authoritative female voice']
  },
  {
    id: 'Callirhoe',
    name: 'Callirhoe',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Easy-going, Confident',
    description: 'Confident, clear voice projecting professionalism and energy',
    characteristics: ['confident', 'professional', 'energetic', 'articulate'],
    recommended_for: ['Business presentations', 'Corporate training', 'IVR systems']
  },
  {
    id: 'Laomedeia',
    name: 'Laomedeia',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Conversational, Inquisitive',
    description: 'Clear, conversational voice with inquisitive and engaging tone',
    characteristics: ['conversational', 'inquisitive', 'friendly', 'intelligent'],
    recommended_for: ['E-learning', 'Explainer videos', 'Podcast hosting']
  },
  {
    id: 'Achernar',
    name: 'Achernar',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Clear, Friendly',
    description: 'Clear voice with friendly and engaging tone',
    characteristics: ['clear', 'friendly', 'engaging'],
    recommended_for: ['General narration', 'Friendly content', 'Approachable hosting']
  },
  {
    id: 'Achird',
    name: 'Achird',
    provider: 'gemini',
    gender: 'female',
    accent: 'american',
    personality: 'Youthful, Breathy',
    description: 'Youthful voice, clear with slightly breathy quality',
    characteristics: ['youthful', 'clear', 'breathy', 'friendly', 'contemporary'],
    recommended_for: ['Young audience content', 'Contemporary tutorials', 'Character voices']
  },

  // === ADDITIONAL MALE VOICES (Mid-High pitch - less traditionally masculine) ===
  {
    id: 'Fenrir',
    name: 'Fenrir',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Excitable, Friendly',
    description: 'Friendly and clear voice with conversational style',
    characteristics: ['friendly', 'clear', 'conversational', 'approachable'],
    recommended_for: ['Explainer videos', 'Podcasting', 'E-learning']
  },
  {
    id: 'Orus',
    name: 'Orus',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Firm',
    description: 'Firm, authoritative male voice with professional delivery',
    characteristics: ['firm', 'authoritative', 'professional'],
    recommended_for: ['Business content', 'Professional narration', 'Training materials']
  },
  {
    id: 'Enceladus',
    name: 'Enceladus',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Breathy, Energetic',
    description: 'Energetic and enthusiastic voice, perfect for conveying excitement',
    characteristics: ['energetic', 'enthusiastic', 'impactful', 'promotional'],
    recommended_for: ['Promotional videos', 'Event announcements', 'High-energy commercials']
  },
  {
    id: 'Iapetus',
    name: 'Iapetus',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Clear, Casual',
    description: 'Friendly, casual "everyman" voice, approachable and relatable',
    characteristics: ['friendly', 'casual', 'relatable', 'approachable'],
    recommended_for: ['Informal tutorials', 'Vlogs', 'Conversational marketing']
  },
  {
    id: 'Umbriel',
    name: 'Umbriel',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Easy-going',
    description: 'Easy-going, relaxed male voice',
    characteristics: ['easy-going', 'relaxed', 'casual'],
    recommended_for: ['Casual content', 'Lifestyle podcasts', 'Relaxed hosting']
  },
  {
    id: 'Rasalgethi',
    name: 'Rasalgethi',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Resonant',
    description: 'Deep, resonant male voice with authority',
    characteristics: ['deep', 'resonant', 'authoritative'],
    recommended_for: ['Serious content', 'Documentary narration', 'Dramatic readings']
  },
  {
    id: 'Alnilam',
    name: 'Alnilam',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Energetic, Commercial',
    description: 'Energetic voice with commercial, enthusiastic quality',
    characteristics: ['energetic', 'enthusiastic', 'commercial', 'direct'],
    recommended_for: ['Commercials', 'Promotional material', 'Event hosting']
  },
  {
    id: 'Schedar',
    name: 'Schedar',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Warm',
    description: 'Warm, engaging male voice',
    characteristics: ['warm', 'engaging', 'friendly'],
    recommended_for: ['Friendly content', 'Approachable hosting', 'General narration']
  },
  {
    id: 'Zubenelgenubi',
    name: 'Zubenelgenubi',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Balanced',
    description: 'Well-balanced, versatile male voice',
    characteristics: ['balanced', 'versatile', 'professional'],
    recommended_for: ['General purpose', 'Versatile content', 'Professional hosting']
  },
  {
    id: 'Vindemiatrix',
    name: 'Vindemiatrix',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Clear',
    description: 'Clear, articulate male voice',
    characteristics: ['clear', 'articulate', 'professional'],
    recommended_for: ['Clear communication', 'Professional content', 'Training videos']
  },
  {
    id: 'Sadachbia',
    name: 'Sadachbia',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Steady',
    description: 'Steady, reliable male voice',
    characteristics: ['steady', 'reliable', 'consistent'],
    recommended_for: ['Dependable narration', 'Instructional content', 'Professional guides']
  },
  {
    id: 'Sadaltager',
    name: 'Sadaltager',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Strong',
    description: 'Strong, commanding male voice',
    characteristics: ['strong', 'commanding', 'powerful'],
    recommended_for: ['Leadership content', 'Motivational speaking', 'Strong narration']
  },
  {
    id: 'Sulafar',
    name: 'Sulafar',
    provider: 'gemini',
    gender: 'male',
    accent: 'american',
    personality: 'Dynamic',
    description: 'Dynamic, engaging male voice',
    characteristics: ['dynamic', 'engaging', 'versatile'],
    recommended_for: ['Dynamic content', 'Engaging hosting', 'Versatile narration']
  }
];

/**
 * OpenAI TTS Voices (Secondary Option - User Explicit Choice)
 * From OpenAI TTS-HD - For specific high-quality needs
 */
export const OPENAI_VOICES: TTSVoice[] = [
  {
    id: 'alloy',
    name: 'Alloy',
    provider: 'openai',
    gender: 'neutral',
    accent: 'american',
    description: 'Professional, versatile voice ideal for narration',
    characteristics: ['neutral', 'balanced', 'professional'],
    recommended_for: ['Professional narration', 'Versatile content', 'General hosting']
  },
  {
    id: 'echo',
    name: 'Echo',
    provider: 'openai',
    gender: 'male',
    accent: 'american',
    description: 'Clear male voice, great for interviews and discussions',
    characteristics: ['authoritative', 'clear', 'professional'],
    recommended_for: ['Interviews', 'Discussions', 'Business content']
  },
  {
    id: 'fable',
    name: 'Fable',
    provider: 'openai',
    gender: 'neutral',
    accent: 'british',
    description: 'Engaging storytelling voice with British accent',
    characteristics: ['expressive', 'british', 'storytelling'],
    recommended_for: ['Narrative podcasts', 'Storytelling', 'Literary content']
  },
  {
    id: 'onyx',
    name: 'Onyx',
    provider: 'openai',
    gender: 'male',
    accent: 'american',
    description: 'Deep, resonant voice perfect for hosting',
    characteristics: ['deep', 'smooth', 'resonant'],
    recommended_for: ['Professional hosting', 'Deep analysis', 'Serious content']
  },
  {
    id: 'nova',
    name: 'Nova',
    provider: 'openai',
    gender: 'female',
    accent: 'american',
    description: 'Friendly female voice, excellent for conversations',
    characteristics: ['warm', 'friendly', 'conversational'],
    recommended_for: ['Conversations', 'Co-hosting', 'Casual content']
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    provider: 'openai',
    gender: 'female',
    accent: 'american',
    description: 'Bright, expressive voice for dynamic content',
    characteristics: ['energetic', 'expressive', 'dynamic'],
    recommended_for: ['Dynamic content', 'Entertainment', 'Upbeat shows']
  }
];

/**
 * Combined voice list - Gemini first (default), OpenAI second (optional)
 */
export const ALL_VOICES: TTSVoice[] = [
  ...GEMINI_VOICES,
  ...OPENAI_VOICES
];

/**
 * Provider metadata for UI display
 */
export const PROVIDER_INFO = {
  gemini: {
    name: 'Gemini TTS',
    badge: 'PRIMARY',
    color: 'blue',
    description: 'Gemini Flash/Pro TTS — 30 built-in voices via Gemini API (NOT Google Cloud TTS)',
    costInfo: 'Flash: ~$0.01–0.04 per 10-min podcast | Pro: ~$0.02–0.08 per 10-min podcast',
    quality: 'Natural, conversational',
    models: ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'],
    defaultModel: 'gemini-2.5-flash-preview-tts'
  },
  openai: {
    name: 'OpenAI TTS',
    badge: 'PREMIUM',
    color: 'green',
    description: 'OpenAI\'s HD neural TTS for professional quality',
    costInfo: '$15/1M characters (~$0.90 per 10-min podcast)',
    quality: 'Professional, polished',
    models: ['tts-1-hd'],
    defaultModel: 'tts-1-hd'
  }
} as const;

/**
 * Get voices by provider
 */
export function getVoicesByProvider(provider: TTSProvider): TTSVoice[] {
  return provider === 'gemini' ? GEMINI_VOICES : OPENAI_VOICES;
}

/**
 * Find voice by ID across all providers
 */
export function findVoice(voiceId: string): TTSVoice | undefined {
  return ALL_VOICES.find(v => v.id === voiceId);
}

/**
 * Get provider for a voice ID
 */
export function getVoiceProvider(voiceId: string): TTSProvider | undefined {
  const voice = findVoice(voiceId);
  return voice?.provider;
}

/**
 * Get priority voices for UI selection (balanced, high-quality subset)
 * Returns 11 voices total: 5 CONFIRMED deep male + 6 versatile female
 * UPDATED: Based on actual Japanese voice testing data
 */
export function getPriorityVoices(): TTSVoice[] {
  const priorityIds = [
    // Top 5 CONFIRMED Deep Male (LOW PITCH - tested!)
    'Charon', 'Algenib', 'Puck', 'Algieba', 'Pulcherrima',
    // Top 6 Versatile Female (HIGH PITCH)
    'Zephyr', 'Kore', 'Aoede', 'Despina', 'Leda', 'Erinome'
  ];
  
  return GEMINI_VOICES.filter(v => priorityIds.includes(v.id));
}

/**
 * Get all Gemini voices organized by priority
 */
export function getGeminiVoicesByPriority(): { priority: TTSVoice[], additional: TTSVoice[] } {
  const priority = getPriorityVoices();
  const priorityIds = new Set(priority.map(v => v.id));
  const additional = GEMINI_VOICES.filter(v => !priorityIds.has(v.id));
  
  return { priority, additional };
}
