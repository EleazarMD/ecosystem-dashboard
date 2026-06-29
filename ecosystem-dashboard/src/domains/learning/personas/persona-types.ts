/**
 * Persona Types — character/persona system for the kids dashboard.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §3 (Persona System)
 *
 * A PersonaProfile bundles voice, personality, visual flavor, and coaching
 * style. The PersonaResolver picks the best persona for each activity + learner.
 */

export type PersonaArchetype =
  | 'mentor'      // wise, patient, guides discovery
  | 'explorer'    // curious, energetic, loves adventure
  | 'artist'      // creative, playful, expressive
  | 'scientist'   // precise, analytical, evidence-driven
  | 'companion';  // warm, friendly, supportive

export interface VoiceStyle {
  tone: 'warm' | 'energetic' | 'calm' | 'playful' | 'scholarly';
  vocabulary: 'simple' | 'standard' | 'rich';
  sentenceLength: 'short' | 'medium' | 'varied';
  emojiFrequency: 'none' | 'occasional' | 'frequent';
  catchphrases?: string[];
}

export interface PersonalityTraits {
  curiosity: number;      // 0-1
  patience: number;       // 0-1
  enthusiasm: number;     // 0-1
  precision: number;      // 0-1
  playfulness: number;    // 0-1
}

export interface GreetingStyle {
  template: string;       // e.g. "Hi {name}! Ready for an adventure?"
  energyLevel: 'low' | 'medium' | 'high';
}

export interface CelebrationStyle {
  template: string;       // e.g. "Amazing work, {name}! You figured it out!"
  intensity: 'subtle' | 'normal' | 'exuberant';
  emoji: string;
}

export interface CoachingStyle {
  approach: 'socratic' | 'direct' | 'story-based' | 'visual';
  hintEscalation: 'immediate' | 'normal' | 'delayed';
  encouragementFrequency: 'low' | 'medium' | 'high';
}

export interface PersonaThemeFlavor {
  primaryColor?: string;
  fontAccent?: string;
  iconSet?: string;
  backgroundImage?: string;
}

export interface PersonaProfile {
  id: string;
  name: string;
  avatar: string;               // emoji or URL
  archetype: PersonaArchetype;

  voice: VoiceStyle;
  personality: PersonalityTraits;

  systemPrompt: string;         // injected into agent system prompt
  greetingStyle: GreetingStyle;
  celebrationStyle: CelebrationStyle;
  coachingStyle: CoachingStyle;

  themeFlavor?: PersonaThemeFlavor;

  skillAffinities?: string[];   // skill codes this persona excels at
  ageRange?: [number, number];  // optimal age band
  activityAffinities?: string[]; // activity ids where this persona shines

  /** Whether this persona is available for all activities. */
  universal?: boolean;
}

// ─── Compatibility with existing PersonaRef ─────────────────────────────────

/**
 * Convert a PersonaProfile to the legacy PersonaRef shape used by
 * agent-transport.ts. This lets the persona system work with existing
 * code without a breaking change.
 */
export function toPersonaRef(profile: PersonaProfile): {
  id: string;
  name: string;
  systemPrompt?: string;
  avatar?: string;
} {
  return {
    id: profile.id,
    name: profile.name,
    systemPrompt: profile.systemPrompt,
    avatar: profile.avatar,
  };
}
