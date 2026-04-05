/**
 * Sound Library - Basic Intro/Outro Music Assets
 * Free, royalty-free tracks for podcast production
 */

export interface AudioAsset {
  id: string;
  name: string;
  category: 'intro' | 'outro' | 'transition';
  duration: number; // seconds
  filePath: string; // relative to /public
  description: string;
  mood: string;
  bpm?: number;
}

/**
 * Curated collection of royalty-free audio assets
 * Note: Download these from YouTube Audio Library, Pixabay, or similar
 */
export const SOUND_LIBRARY: AudioAsset[] = [
  // INTRO MUSIC
  {
    id: 'intro-tech-upbeat',
    name: 'Tech & Upbeat',
    category: 'intro',
    duration: 8,
    filePath: '/audio/intros/tech-upbeat.mp3',
    description: 'Energetic tech-focused intro with electronic beats',
    mood: 'energetic',
    bpm: 128
  },
  {
    id: 'intro-professional',
    name: 'Professional News',
    category: 'intro',
    duration: 6,
    filePath: '/audio/intros/professional.mp3',
    description: 'Clean, professional news-style intro',
    mood: 'professional',
    bpm: 120
  },
  {
    id: 'intro-ambient',
    name: 'Ambient Focus',
    category: 'intro',
    duration: 10,
    filePath: '/audio/intros/ambient.mp3',
    description: 'Calm, atmospheric intro for thoughtful content',
    mood: 'calm',
    bpm: 80
  },
  {
    id: 'intro-cinematic',
    name: 'Cinematic Epic',
    category: 'intro',
    duration: 12,
    filePath: '/audio/intros/cinematic.mp3',
    description: 'Epic, dramatic intro for storytelling',
    mood: 'dramatic',
    bpm: 90
  },

  // OUTRO MUSIC
  {
    id: 'outro-upbeat',
    name: 'Upbeat Closing',
    category: 'outro',
    duration: 10,
    filePath: '/audio/outros/upbeat.mp3',
    description: 'Positive, uplifting outro',
    mood: 'upbeat',
    bpm: 120
  },
  {
    id: 'outro-professional',
    name: 'Professional Ending',
    category: 'outro',
    duration: 8,
    filePath: '/audio/outros/professional.mp3',
    description: 'Clean, professional closing theme',
    mood: 'professional',
    bpm: 110
  },
  {
    id: 'outro-ambient',
    name: 'Ambient Fade',
    category: 'outro',
    duration: 12,
    filePath: '/audio/outros/ambient.mp3',
    description: 'Gentle, fading outro',
    mood: 'calm',
    bpm: 75
  },

  // TRANSITIONS
  {
    id: 'transition-whoosh',
    name: 'Whoosh',
    category: 'transition',
    duration: 1,
    filePath: '/audio/transitions/whoosh.mp3',
    description: 'Quick whoosh transition sound',
    mood: 'neutral'
  },
  {
    id: 'transition-chime',
    name: 'Chime',
    category: 'transition',
    duration: 2,
    filePath: '/audio/transitions/chime.mp3',
    description: 'Subtle chime for section breaks',
    mood: 'neutral'
  }
];

export const INTRO_ASSETS = SOUND_LIBRARY.filter(a => a.category === 'intro');
export const OUTRO_ASSETS = SOUND_LIBRARY.filter(a => a.category === 'outro');
export const TRANSITION_ASSETS = SOUND_LIBRARY.filter(a => a.category === 'transition');

/**
 * Get asset by ID
 */
export function getAssetById(id: string): AudioAsset | undefined {
  return SOUND_LIBRARY.find(asset => asset.id === id);
}

/**
 * Get assets by category
 */
export function getAssetsByCategory(category: 'intro' | 'outro' | 'transition'): AudioAsset[] {
  return SOUND_LIBRARY.filter(asset => asset.category === category);
}

/**
 * Production configuration for podcast audio
 */
export interface ProductionConfig {
  introAssetId?: string;
  introFadeIn?: boolean;
  introVolume?: number; // 0.0 - 1.0
  introPlacement?: 'before' | 'after-greeting'; // 'before' = traditional, 'after-greeting' = music fades in under turn 2+
  introFadeDurationMs?: number; // How long the music fade-in takes (default 3000ms)
  outroAssetId?: string;
  outroFadeOut?: boolean;
  outroVolume?: number; // 0.0 - 1.0
  // Overlap & gap trimming settings
  trimSilence?: boolean;           // Auto-trim trailing silence from TTS output
  silenceThresholdDb?: number;     // Silence detection threshold in dB (default -40)
  minGapMs?: number;               // Minimum gap between speaker turns in ms
  maxGapMs?: number;               // Maximum gap between speaker turns in ms
  overlapDuration?: 'none' | 'short' | 'medium' | 'long'; // Speaker overlap amount
  overlapVolumeRatio?: number;     // Volume of overlapping voice (0.5 - 1.0)
  backchannelFrequency?: 'minimal' | 'moderate' | 'frequent'; // How often backchannels occur
}

export const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  introAssetId: 'intro-professional',
  introVolume: 0.4,
  introFadeIn: true,
  introPlacement: 'after-greeting',
  introFadeDurationMs: 3000,
  outroAssetId: 'outro-professional',
  outroVolume: 0.4,
  outroFadeOut: true,
  trimSilence: true,
  silenceThresholdDb: -40,
  minGapMs: 80,
  maxGapMs: 500,
  overlapDuration: 'none',
  overlapVolumeRatio: 0.7,
  backchannelFrequency: 'moderate',
};
