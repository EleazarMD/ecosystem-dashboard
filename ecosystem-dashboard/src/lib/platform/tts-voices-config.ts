/**
 * TTS Voice Configuration for Kids Portal
 * 
 * Maps TTS voices to specific GooseMind characters for each theme.
 * Uses Chatterbox TTS with zero-shot voice cloning (5-20 seconds of audio).
 * 
 * Character mappings:
 * - Pusheen theme: Pusheen, Stormy, Pip, Sloth, Bo, Cheek
 * - Minecraft theme: Steve, Alex, Creeper, Enderman, Villager, Redstone
 * - Space theme: Astronaut, Robot, Cosmic Narrator
 * - Gaming theme: Game Hero, Quest Guide, Announcer
 */

export interface TTSVoice {
  id: string;
  name: string;
  description: string;
  emoji: string;
  theme: string | null;  // null = universal
  gender: 'male' | 'female' | 'neutral';
  style: 'playful' | 'calm' | 'adventurous' | 'cute' | 'storyteller' | 'energetic';
  ageAppropriate: { min: number; max: number };
  // Chatterbox parameters
  exaggeration: number;  // 0.0-1.0, higher = more expressive
  cfgWeight: number;     // 0.0-1.0, voice cloning strength
  temperature: number;   // 0.5-1.0, variation
  // Character mapping for GooseMind integration
  characterId?: string;  // Maps to child-learning-types.ts character ID
  recipeId?: string;     // Maps to recipe ID if available
}

// ============================================================
// UNIVERSAL VOICES (All themes)
// ============================================================
export const UNIVERSAL_VOICES: TTSVoice[] = [
  {
    id: 'default',
    name: 'Friendly Reader',
    description: 'Clear and friendly voice for all content',
    emoji: '🎤',
    theme: null,
    gender: 'neutral',
    style: 'calm',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.5,
    cfgWeight: 0.5,
    temperature: 0.7,
  },
  {
    id: 'storyteller',
    name: 'Story Time',
    description: 'Expressive narrator for books and stories',
    emoji: '📚',
    theme: null,
    gender: 'neutral',
    style: 'storyteller',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.7,
    cfgWeight: 0.5,
    temperature: 0.8,
  },
  {
    id: 'teacher',
    name: 'Learning Helper',
    description: 'Patient and encouraging for educational content',
    emoji: '👩‍🏫',
    theme: null,
    gender: 'female',
    style: 'calm',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.4,
    cfgWeight: 0.6,
    temperature: 0.6,
  },
];

// ============================================================
// MINECRAFT THEME VOICES
// Maps to characters from child-learning-types.ts
// ============================================================
export const MINECRAFT_VOICES: TTSVoice[] = [
  {
    id: 'minecraft-steve',
    name: 'Steve',
    description: 'Brave builder who explains through crafting - "Let\'s craft some knowledge!"',
    emoji: '⛏️',
    theme: 'minecraft',
    gender: 'male',
    style: 'adventurous',
    ageAppropriate: { min: 5, max: 10 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
    characterId: 'steve',  // Maps to THEME_CHARACTERS.steve
  },
  {
    id: 'minecraft-alex',
    name: 'Alex',
    description: 'Explorer who teaches through adventure - "Let\'s go on an adventure!"',
    emoji: '🗺️',
    theme: 'minecraft',
    gender: 'female',
    style: 'adventurous',
    ageAppropriate: { min: 5, max: 10 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
    characterId: 'alex',
  },
  {
    id: 'minecraft-creeper',
    name: 'Creeper',
    description: 'Friendly creeper with sssurprising facts - "Mind-blowing!"',
    emoji: '💚',
    theme: 'minecraft',
    gender: 'neutral',
    style: 'playful',
    ageAppropriate: { min: 5, max: 10 },
    exaggeration: 0.7,
    cfgWeight: 0.5,
    temperature: 0.8,
    characterId: 'creeper',
  },
  {
    id: 'minecraft-enderman',
    name: 'Enderman',
    description: 'Mysterious teacher of new perspectives - "Fascinating!"',
    emoji: '🟣',
    theme: 'minecraft',
    gender: 'neutral',
    style: 'calm',
    ageAppropriate: { min: 5, max: 10 },
    exaggeration: 0.4,
    cfgWeight: 0.6,
    temperature: 0.6,
    characterId: 'enderman',
  },
  {
    id: 'minecraft-villager',
    name: 'Villager',
    description: 'Wise trader who shares knowledge - "Hmm! Great trade!"',
    emoji: '👨‍🌾',
    theme: 'minecraft',
    gender: 'neutral',
    style: 'calm',
    ageAppropriate: { min: 5, max: 10 },
    exaggeration: 0.4,
    cfgWeight: 0.6,
    temperature: 0.6,
    characterId: 'villager',
  },
  {
    id: 'minecraft-redstone',
    name: 'Redstone Engineer',
    description: 'Tech-savvy engineer for logic puzzles - "Circuit complete!"',
    emoji: '🔴',
    theme: 'minecraft',
    gender: 'neutral',
    style: 'energetic',
    ageAppropriate: { min: 5, max: 10 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
    characterId: 'redstone',
  },
];

// ============================================================
// PUSHEEN THEME VOICES (Cute/Kawaii style)
// Maps to characters from child-learning-types.ts
// ============================================================
export const PUSHEEN_VOICES: TTSVoice[] = [
  {
    id: 'pusheen-main',
    name: 'Pusheen',
    description: 'Sweet fluffy cat who loves snacks - "Purr-fect!"',
    emoji: '🐱',
    theme: 'pusheen',
    gender: 'female',
    style: 'cute',
    ageAppropriate: { min: 7, max: 12 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
    characterId: 'pusheen',  // Maps to THEME_CHARACTERS.pusheen
  },
  {
    id: 'pusheen-stormy',
    name: 'Stormy',
    description: 'Grumpy little sister with a secretly sweet heart - "...Not bad."',
    emoji: '😾',
    theme: 'pusheen',
    gender: 'female',
    style: 'playful',
    ageAppropriate: { min: 7, max: 12 },
    exaggeration: 0.5,  // Lower for dry delivery
    cfgWeight: 0.5,
    temperature: 0.7,
    characterId: 'stormy',
  },
  {
    id: 'pusheen-pip',
    name: 'Pip',
    description: 'Hyperactive little brother, fearless and fun - "Let\'s GO!"',
    emoji: '🐱',
    theme: 'pusheen',
    gender: 'male',
    style: 'energetic',
    ageAppropriate: { min: 7, max: 12 },
    exaggeration: 0.9,  // Very expressive
    cfgWeight: 0.5,
    temperature: 0.9,
    characterId: 'pip',
  },
  {
    id: 'pusheen-sloth',
    name: 'Sloth',
    description: 'Chill best friend who takes things slow - "Nice and slow..."',
    emoji: '🦥',
    theme: 'pusheen',
    gender: 'neutral',
    style: 'calm',
    ageAppropriate: { min: 7, max: 12 },
    exaggeration: 0.2,  // Very calm
    cfgWeight: 0.6,
    temperature: 0.4,
    characterId: 'sloth',
  },
  {
    id: 'pusheen-bo',
    name: 'Bo',
    description: 'Creative parakeet with big dreams - "Dream big!"',
    emoji: '🐦',
    theme: 'pusheen',
    gender: 'neutral',
    style: 'playful',
    ageAppropriate: { min: 7, max: 12 },
    exaggeration: 0.7,
    cfgWeight: 0.5,
    temperature: 0.8,
    characterId: 'bo',
  },
  {
    id: 'pusheen-cheek',
    name: 'Cheek',
    description: 'Friendly hamster baker who shares treats - "So sweet!"',
    emoji: '🐹',
    theme: 'pusheen',
    gender: 'neutral',
    style: 'cute',
    ageAppropriate: { min: 7, max: 12 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
    characterId: 'cheek',
  },
];

// ============================================================
// SPACE/SCIENCE THEME VOICES
// ============================================================
export const SPACE_VOICES: TTSVoice[] = [
  {
    id: 'space-astronaut',
    name: 'Astronaut',
    description: 'Brave space explorer sharing cosmic knowledge',
    emoji: '👨‍🚀',
    theme: 'space',
    gender: 'neutral',
    style: 'adventurous',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
  },
  {
    id: 'space-robot',
    name: 'Friendly Robot',
    description: 'Helpful AI companion for learning',
    emoji: '🤖',
    theme: 'space',
    gender: 'neutral',
    style: 'calm',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.3,
    cfgWeight: 0.7,
    temperature: 0.5,
  },
  {
    id: 'space-narrator',
    name: 'Cosmic Narrator',
    description: 'Epic voice for space adventures',
    emoji: '🌟',
    theme: 'space',
    gender: 'male',
    style: 'storyteller',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.7,
    cfgWeight: 0.5,
    temperature: 0.8,
  },
];

// ============================================================
// GAMING THEME VOICES
// ============================================================
export const GAMING_VOICES: TTSVoice[] = [
  {
    id: 'gaming-hero',
    name: 'Game Hero',
    description: 'Brave and confident adventure voice',
    emoji: '🎮',
    theme: 'gaming',
    gender: 'neutral',
    style: 'adventurous',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.7,
    cfgWeight: 0.5,
    temperature: 0.8,
  },
  {
    id: 'gaming-quest',
    name: 'Quest Guide',
    description: 'Helpful guide for learning quests',
    emoji: '🗺️',
    theme: 'gaming',
    gender: 'neutral',
    style: 'playful',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.6,
    cfgWeight: 0.5,
    temperature: 0.7,
  },
  {
    id: 'gaming-announcer',
    name: 'Level Up!',
    description: 'Exciting announcer for achievements',
    emoji: '🏆',
    theme: 'gaming',
    gender: 'male',
    style: 'energetic',
    ageAppropriate: { min: 5, max: 12 },
    exaggeration: 0.9,
    cfgWeight: 0.4,
    temperature: 0.9,
  },
];

// ============================================================
// ALL VOICES COMBINED
// ============================================================
export const ALL_TTS_VOICES: TTSVoice[] = [
  ...UNIVERSAL_VOICES,
  ...MINECRAFT_VOICES,
  ...PUSHEEN_VOICES,
  ...SPACE_VOICES,
  ...GAMING_VOICES,
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get voices for a specific theme
 */
export function getVoicesForTheme(theme: string | null): TTSVoice[] {
  if (!theme) {
    return UNIVERSAL_VOICES;
  }
  
  const themeVoices = ALL_TTS_VOICES.filter(v => v.theme === theme || v.theme === null);
  return themeVoices.length > 0 ? themeVoices : UNIVERSAL_VOICES;
}

/**
 * Get voices appropriate for a child's age
 */
export function getVoicesForAge(age: number, theme?: string): TTSVoice[] {
  let voices = theme ? getVoicesForTheme(theme) : ALL_TTS_VOICES;
  return voices.filter(v => age >= v.ageAppropriate.min && age <= v.ageAppropriate.max);
}

/**
 * Get a specific voice by ID
 */
export function getVoiceById(voiceId: string): TTSVoice | undefined {
  return ALL_TTS_VOICES.find(v => v.id === voiceId);
}

/**
 * Get default voice for a theme
 */
export function getDefaultVoiceForTheme(theme: string | null): TTSVoice {
  if (theme === 'minecraft') {
    return MINECRAFT_VOICES[0]; // Steve
  }
  if (theme === 'pusheen') {
    return PUSHEEN_VOICES[0]; // Pusheen
  }
  if (theme === 'space') {
    return SPACE_VOICES[0]; // Astronaut
  }
  if (theme === 'gaming') {
    return GAMING_VOICES[0]; // Game Hero
  }
  return UNIVERSAL_VOICES[0]; // Default
}

/**
 * Get voice by GooseMind character ID
 * Maps character from child-learning-types.ts to TTS voice
 */
export function getVoiceByCharacterId(characterId: string): TTSVoice | undefined {
  return ALL_TTS_VOICES.find(v => v.characterId === characterId);
}

/**
 * Get the recommended voice for a character in a specific context
 * Used by GooseMind to select appropriate TTS voice for responses
 */
export function getVoiceForCharacter(
  characterId: string,
  theme?: string
): TTSVoice {
  // First try to find voice by character ID
  const characterVoice = getVoiceByCharacterId(characterId);
  if (characterVoice) {
    return characterVoice;
  }
  
  // Fall back to theme default
  if (theme) {
    return getDefaultVoiceForTheme(theme);
  }
  
  // Ultimate fallback
  return UNIVERSAL_VOICES[0];
}

/**
 * Character to Voice mapping for GooseMind integration
 * Maps each theme character to their TTS voice configuration
 */
export const CHARACTER_VOICE_MAP: Record<string, string> = {
  // Pusheen theme characters
  pusheen: 'pusheen-main',
  stormy: 'pusheen-stormy',
  pip: 'pusheen-pip',
  sloth: 'pusheen-sloth',
  bo: 'pusheen-bo',
  cheek: 'pusheen-cheek',
  
  // Minecraft theme characters
  steve: 'minecraft-steve',
  alex: 'minecraft-alex',
  creeper: 'minecraft-creeper',
  enderman: 'minecraft-enderman',
  villager: 'minecraft-villager',
  redstone: 'minecraft-redstone',
  
  // Space theme characters
  astronaut: 'space-astronaut',
  robot: 'space-robot',
  cosmic: 'space-narrator',
  
  // Gaming theme characters
  hero: 'gaming-hero',
  quest: 'gaming-quest',
  announcer: 'gaming-announcer',
};

/**
 * Get Chatterbox TTS parameters for a voice
 * Returns the voice-specific settings for the Chatterbox API call
 */
export function getChatterboxParams(voice: TTSVoice): {
  exaggeration: number;
  cfg_weight: number;
  temperature: number;
} {
  return {
    exaggeration: voice.exaggeration,
    cfg_weight: voice.cfgWeight,
    temperature: voice.temperature,
  };
}

/**
 * Voice sample sources for creating custom Chatterbox voices
 * These are suggestions for where to find appropriate voice samples
 */
export const VOICE_SAMPLE_SOURCES = {
  minecraft: {
    description: 'Adventure/gaming style voices',
    sources: [
      'LibriVox adventure audiobooks (public domain)',
      'Freesound.org - search "adventure narrator"',
      'YouTube Creative Commons gaming narration',
    ],
  },
  pusheen: {
    description: 'Cute/kawaii style voices',
    sources: [
      'Freesound.org - search "cute voice", "kawaii"',
      'Anime dubbing samples (check licensing)',
      'Children\'s audiobook narrators',
    ],
  },
  space: {
    description: 'Sci-fi/educational style voices',
    sources: [
      'NASA public domain audio',
      'Science documentary narration',
      'LibriVox science fiction audiobooks',
    ],
  },
  general: {
    description: 'General child-friendly voices',
    sources: [
      'Mozilla Common Voice dataset',
      'LibriVox children\'s stories',
      'Freesound.org - search "child friendly narrator"',
    ],
  },
};

/**
 * Instructions for uploading voices to Chatterbox
 */
export const CHATTERBOX_UPLOAD_INSTRUCTIONS = `
# Adding Custom Voices to Chatterbox TTS

Chatterbox supports zero-shot voice cloning with just 5-20 seconds of audio.

## Requirements
- Audio format: WAV or MP3
- Duration: 5-20 seconds (quality > length)
- Quality: Clean, single speaker, minimal background noise
- Content: Clear speech, no music or effects

## Upload via API
\`\`\`bash
curl -X POST http://localhost:5003/voices \\
  -F "voice_file=@voice-sample.wav" \\
  -F "voice_name=minecraft-steve"
\`\`\`

## Upload via Web UI
1. Go to http://localhost:4321
2. Click "Voice Library"
3. Upload your voice sample
4. Name it with theme prefix (e.g., "minecraft-steve", "pusheen-narrator")

## Recommended Voice Samples by Theme

### Minecraft Theme
- Adventurous male voice for Steve
- Friendly female voice for Alex
- Calm, wise voice for Villager
- Epic narrator voice for quests

### Pusheen Theme
- Sweet, cozy female voice for Pusheen
- Sassy, playful voice for Stormy
- Energetic, bouncy voice for Pip
- Slow, relaxed voice for Sloth

### Space Theme
- Confident, clear voice for Astronaut
- Robotic but friendly voice for Robot
- Epic, dramatic voice for cosmic narration

## Testing
After upload, test with:
\`\`\`bash
curl -X POST http://localhost:5003/v1/audio/speech \\
  -H "Content-Type: application/json" \\
  -d '{"input": "Hello! I am your new voice!", "voice": "minecraft-steve"}' \\
  --output test.wav
\`\`\`
`;
