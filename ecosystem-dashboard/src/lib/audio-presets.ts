export interface VoiceAssignment {
  speakerId: string;
  voiceName: string;
  voiceId: string;
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  speakingRate: number;
  pitch: number;
}

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'default' | 'custom';
  config: {
    ttsProvider: string; // 'gemini', 'openai', 'elevenlabs'
    audioFormat: string; // 'mp3', 'wav', 'opus'
    sampleRate: number; // 44100, 48000
    voiceProfiles: Array<{
      role: string; // 'host', 'expert', etc.
      voiceName: string;
      gender: 'male' | 'female' | 'neutral';
      accent: string;
      speakingRate: number;
      pitch: number;
    }>;
    postProcessing?: {
      normalize: boolean;
      compression: boolean;
      backgroundMusic: boolean;
    };
  };
}

export const DEFAULT_AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'deep-masculine-documentary',
    name: 'Deep Masculine Documentary',
    description: 'CONFIRMED deep male voice (Charon) + professional female for authoritative content',
    icon: '🎙️',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'narrator',
          voiceName: 'Charon',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.85, // 15% slower = deeper, more authoritative
          pitch: 0.0,
        },
        {
          role: 'expert',
          voiceName: 'Leda',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.95,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'conversational-duo',
    name: 'Conversational Duo',
    description: 'Smooth male (Charon) + thoughtful female (Aoede) for engaging podcasts',
    icon: '☕',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'host',
          voiceName: 'Charon',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.90, // Slower = deeper, more conversational authority
          pitch: 0.0,
        },
        {
          role: 'co-host',
          voiceName: 'Aoede',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.95,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'expert-panel',
    name: 'Expert Panel (3 speakers)',
    description: 'CONFIRMED deep male (Algenib) + 2 professional females for expert discussions',
    icon: '🎓',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'moderator',
          voiceName: 'Algenib',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.88, // Deep, authoritative moderator
          pitch: 0.0,
        },
        {
          role: 'expert',
          voiceName: 'Erinome',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.95,
          pitch: 0.0,
        },
        {
          role: 'expert',
          voiceName: 'Leda',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.93,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'dramatic-storytelling',
    name: 'Dramatic Storytelling',
    description: 'CONFIRMED gravelly deep male (Algenib) + warm female (Despina) for narrative podcasts',
    icon: '📖',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'narrator',
          voiceName: 'Algenib',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.88, // Slow, dramatic pacing
          pitch: 0.0,
        },
        {
          role: 'character',
          voiceName: 'Despina',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.95,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'energetic-upbeat',
    name: 'Energetic & Upbeat',
    description: 'Firm energetic male (Alnilam) + bright female (Kore) for dynamic content',
    icon: '💻',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'host',
          voiceName: 'Alnilam',
          gender: 'male',
          accent: 'american',
          speakingRate: 1.0, // Normal speed for energy
          pitch: 0.0,
        },
        {
          role: 'co-host',
          voiceName: 'Kore',
          gender: 'female',
          accent: 'american',
          speakingRate: 1.0,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'educational-interview',
    name: 'Educational Interview',
    description: 'Clear conversational male (Charon) + articulate female (Erinome) for teaching',
    icon: '📚',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'host',
          voiceName: 'Charon',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.90,
          pitch: 0.0,
        },
        {
          role: 'expert',
          voiceName: 'Erinome',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.92,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'balanced-trio',
    name: 'Balanced Trio',
    description: 'CONFIRMED deep male (Puck) + bright female (Zephyr) + thoughtful female (Aoede)',
    icon: '🌍',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'host',
          voiceName: 'Puck',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.85,
          pitch: 0.0,
        },
        {
          role: 'co-host',
          voiceName: 'Zephyr',
          gender: 'female',
          accent: 'american',
          speakingRate: 1.0,
          pitch: 0.0,
        },
        {
          role: 'expert',
          voiceName: 'Aoede',
          gender: 'female',
          accent: 'american',
          speakingRate: 0.95,
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
  {
    id: 'premium-masculine',
    name: 'Premium Masculine Depth',
    description: 'CONFIRMED deepest male voice (Charon) optimized for maximum depth and authority',
    icon: '⭐',
    category: 'default',
    config: {
      ttsProvider: 'gemini',
      audioFormat: 'mp3',
      sampleRate: 44100,
      voiceProfiles: [
        {
          role: 'narrator',
          voiceName: 'Charon',
          gender: 'male',
          accent: 'american',
          speakingRate: 0.80, // Maximum depth: 20% slower
          pitch: 0.0,
        },
      ],
      postProcessing: {
        normalize: true,
        compression: true,
        backgroundMusic: false,
      },
    },
  },
];

// Database API functions
export async function loadAllAudioPresets(userId?: string): Promise<AudioPreset[]> {
  try {
    const params = userId ? `?userId=${userId}&type=audio` : '?type=audio';
    const response = await fetch(`/api/podcast-studio/audio-presets${params}`);
    if (!response.ok) throw new Error('Failed to load audio presets');
    return await response.json();
  } catch (error) {
    console.error('Failed to load audio presets from database:', error);
    // Fallback to default presets only
    return DEFAULT_AUDIO_PRESETS;
  }
}

export async function saveCustomAudioPreset(
  preset: Omit<AudioPreset, 'id' | 'category'>
): Promise<AudioPreset | null> {
  try {
    const response = await fetch('/api/podcast-studio/audio-presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });
    if (!response.ok) throw new Error('Failed to save audio preset');
    return await response.json();
  } catch (error) {
    console.error('Failed to save audio preset:', error);
    return null;
  }
}

export async function deleteCustomAudioPreset(presetId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/podcast-studio/audio-presets?id=${presetId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete audio preset:', error);
    return false;
  }
}

export async function incrementAudioPresetUsage(presetId: string): Promise<void> {
  try {
    await fetch(`/api/podcast-studio/audio-presets?id=${presetId}&action=use`, {
      method: 'PUT',
    });
  } catch (error) {
    console.error('Failed to increment audio preset usage:', error);
  }
}
