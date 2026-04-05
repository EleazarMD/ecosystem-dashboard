/**
 * Chat Settings Profiles
 * Save and load AI configuration presets for podcast production
 */

export interface ChatSettingsProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: {
    chatModel: string;
    analysisModel: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
  createdAt: string;
  isCustom: boolean;
}

export const BUILT_IN_PROFILES: Record<string, ChatSettingsProfile> = {
  'news-research': {
    id: 'news-research',
    name: 'News & Research',
    description: 'Factual, precise responses for news and research podcasts',
    icon: '📰',
    settings: {
      chatModel: 'gemini-2.5-flash',
      analysisModel: 'gemini-2.5-flash',
      temperature: 0.4,
      maxTokens: 2500,
      systemPrompt: 'You are an expert research analyst and fact-checker helping create news and research podcasts. Focus on accuracy, source verification, and clear explanations of complex topics.',
    },
    createdAt: new Date().toISOString(),
    isCustom: false,
  },

  'conversational': {
    id: 'conversational',
    name: 'Conversational',
    description: 'Balanced setting for most podcast types',
    icon: '💬',
    settings: {
      chatModel: 'gemini-2.5-flash',
      analysisModel: 'gemini-2.5-flash',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful AI assistant specialized in research and content creation for podcasts.',
    },
    createdAt: new Date().toISOString(),
    isCustom: false,
  },

  'storytelling': {
    id: 'storytelling',
    name: 'Storytelling & Entertainment',
    description: 'Creative, engaging responses for story-based content',
    icon: '🎭',
    settings: {
      chatModel: 'gemini-2.5-pro',
      analysisModel: 'gemini-2.5-flash',
      temperature: 0.9,
      maxTokens: 3000,
      systemPrompt: 'You are a creative storyteller and content producer helping create engaging entertainment podcasts. Focus on narrative flow, emotional resonance, and audience engagement.',
    },
    createdAt: new Date().toISOString(),
    isCustom: false,
  },

  'educational': {
    id: 'educational',
    name: 'Educational',
    description: 'Clear explanations for teaching and learning',
    icon: '🎓',
    settings: {
      chatModel: 'gemini-2.5-pro',
      analysisModel: 'gemini-2.5-pro',
      temperature: 0.5,
      maxTokens: 2500,
      systemPrompt: 'You are an expert educator helping create educational podcasts. Focus on clear explanations, breaking down complex concepts, and providing examples that enhance understanding.',
    },
    createdAt: new Date().toISOString(),
    isCustom: false,
  },

  'investigative': {
    id: 'investigative',
    name: 'Investigative Journalism',
    description: 'In-depth analysis with critical thinking',
    icon: '🔍',
    settings: {
      chatModel: 'gemini-2.5-pro',
      analysisModel: 'gemini-2.5-pro',
      temperature: 0.3,
      maxTokens: 3000,
      systemPrompt: 'You are an investigative journalist helping research in-depth stories for podcasts. Focus on critical analysis, connecting dots, identifying patterns, and maintaining journalistic integrity.',
    },
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
};

// Local storage keys
const CUSTOM_PROFILES_KEY = 'podcast-studio-custom-profiles';
const ACTIVE_PROFILE_KEY = 'podcast-studio-active-profile';

/**
 * Get all profiles (built-in + custom)
 */
export function getAllProfiles(): ChatSettingsProfile[] {
  const builtIn = Object.values(BUILT_IN_PROFILES);
  const custom = getCustomProfiles();
  return [...builtIn, ...custom];
}

/**
 * Get custom profiles from localStorage
 */
export function getCustomProfiles(): ChatSettingsProfile[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CUSTOM_PROFILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom profiles:', error);
    return [];
  }
}

/**
 * Save a custom profile
 */
export function saveCustomProfile(profile: Omit<ChatSettingsProfile, 'id' | 'createdAt' | 'isCustom'>): ChatSettingsProfile {
  const newProfile: ChatSettingsProfile = {
    ...profile,
    id: `custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
    isCustom: true,
  };

  const customProfiles = getCustomProfiles();
  const updated = [...customProfiles, newProfile];
  
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));
  
  return newProfile;
}

/**
 * Delete a custom profile
 */
export function deleteCustomProfile(profileId: string): void {
  const customProfiles = getCustomProfiles();
  const updated = customProfiles.filter(p => p.id !== profileId);
  
  localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));
}

/**
 * Get active profile ID
 */
export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

/**
 * Set active profile
 */
export function setActiveProfile(profileId: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

/**
 * Get profile by ID
 */
export function getProfileById(profileId: string): ChatSettingsProfile | null {
  const allProfiles = getAllProfiles();
  return allProfiles.find(p => p.id === profileId) || null;
}

/**
 * Apply profile settings to context
 */
export function applyProfile(
  profile: ChatSettingsProfile,
  context: {
    setChatModel: (model: string) => void;
    setAnalysisModel: (model: string) => void;
    setTemperature: (temp: number) => void;
    setMaxTokens: (tokens: number) => void;
    setSystemPrompt: (prompt: string) => void;
  }
): void {
  context.setChatModel(profile.settings.chatModel);
  context.setAnalysisModel(profile.settings.analysisModel);
  context.setTemperature(profile.settings.temperature);
  context.setMaxTokens(profile.settings.maxTokens);
  context.setSystemPrompt(profile.settings.systemPrompt);
}
