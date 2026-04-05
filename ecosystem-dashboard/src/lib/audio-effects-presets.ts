/**
 * Audio Effects Presets for Podcast Studio
 * Professional audio processing configurations
 */

export interface EffectsSettings {
  noiseGate: {
    enabled: boolean;
    threshold: number; // -60 to 0 dB
  };
  eq: {
    enabled: boolean;
    lowCut: number; // Hz (80-300)
    midBoost: number; // dB (-12 to +12)
    highShelf: number; // dB (-12 to +12)
  };
  compressor: {
    enabled: boolean;
    threshold: number; // dB (-40 to 0)
    ratio: number; // 1-20
    attack: number; // ms (1-100)
    release: number; // ms (10-1000)
  };
  limiter: {
    enabled: boolean;
    ceiling: number; // dB (-6 to 0)
  };
  normalize: boolean;
}

export const EFFECTS_PRESETS: Record<string, EffectsSettings> = {
  'clean-voice': {
    noiseGate: {
      enabled: true,
      threshold: -50, // Gentle gate
    },
    eq: {
      enabled: true,
      lowCut: 80, // Remove rumble
      midBoost: 2, // Slight presence boost
      highShelf: 0,
    },
    compressor: {
      enabled: false,
      threshold: -20,
      ratio: 2,
      attack: 10,
      release: 100,
    },
    limiter: {
      enabled: true,
      ceiling: -1, // Prevent clipping
    },
    normalize: false,
  },

  'radio-ready': {
    noiseGate: {
      enabled: true,
      threshold: -40,
    },
    eq: {
      enabled: true,
      lowCut: 100, // Tighter low end
      midBoost: 4, // Strong presence
      highShelf: 3, // Brightness
    },
    compressor: {
      enabled: true,
      threshold: -18,
      ratio: 4, // Heavy compression
      attack: 5,
      release: 50,
    },
    limiter: {
      enabled: true,
      ceiling: -0.5,
    },
    normalize: true, // Broadcast loudness
  },

  'podcast-standard': {
    noiseGate: {
      enabled: true,
      threshold: -45,
    },
    eq: {
      enabled: true,
      lowCut: 90,
      midBoost: 3, // Voice clarity
      highShelf: 1,
    },
    compressor: {
      enabled: true,
      threshold: -20,
      ratio: 3, // Moderate compression
      attack: 8,
      release: 80,
    },
    limiter: {
      enabled: true,
      ceiling: -1,
    },
    normalize: true,
  },

  'loud-and-clear': {
    noiseGate: {
      enabled: true,
      threshold: -35, // Aggressive gate
    },
    eq: {
      enabled: true,
      lowCut: 120,
      midBoost: 6, // Maximum clarity
      highShelf: 4,
    },
    compressor: {
      enabled: true,
      threshold: -15,
      ratio: 6, // Very heavy compression
      attack: 3,
      release: 40,
    },
    limiter: {
      enabled: true,
      ceiling: -0.3, // Maximum loudness
    },
    normalize: true,
  },

  'bypass': {
    noiseGate: {
      enabled: false,
      threshold: -50,
    },
    eq: {
      enabled: false,
      lowCut: 0,
      midBoost: 0,
      highShelf: 0,
    },
    compressor: {
      enabled: false,
      threshold: -20,
      ratio: 2,
      attack: 10,
      release: 100,
    },
    limiter: {
      enabled: false,
      ceiling: -1,
    },
    normalize: false,
  },
};

export const DEFAULT_EFFECTS: EffectsSettings = EFFECTS_PRESETS['podcast-standard'];
