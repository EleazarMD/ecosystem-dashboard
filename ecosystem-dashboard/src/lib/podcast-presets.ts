export interface PodcastPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'default' | 'custom';
  config: {
    participantCount: number;
    podcastFormat: string;
    participants: Array<{
      role: string;
      personality: string;
      name?: string;  // Optional: If provided, speakers can use this name in dialogue
    }>;
    length: string;
    tone: string;
    audience: string;
    style: string;
    emphasis?: string;
    includeStories: boolean;
    includeExamples: boolean;
    // Natural dialogue quality settings
    disfluencyLevel?: 'none' | 'low' | 'medium' | 'high';
    emotionalIntensity?: 'subdued' | 'natural' | 'expressive' | 'very-expressive';
    interruptionFrequency?: 'none' | 'occasional' | 'frequent';
    includeProsodyMarkers?: boolean;
    includeEmphasis?: boolean;
    // Language settings
    language?: 'english' | 'spanish';
    spanishDialect?: 'mexican' | 'castilian';
    // Podcast style (drives rich per-stage prompt guidance)
    podcastStyle?: 'analytical' | 'academic' | 'clinical' | 'narrative' | 'investigative' | 'editorial' | 'intimate' | 'comedic' | 'lifestyle' | 'explainer';
    // Narrative control settings
    informationDensity?: 'light' | 'moderate' | 'dense' | 'maximum';
    pacing?: 'slow-reflective' | 'measured' | 'dynamic' | 'rapid-fire';
    speakerBalance?: 'equal' | 'host-led' | 'expert-led' | 'interviewer-guest';
    humorLevel?: 'none' | 'dry-wit' | 'light' | 'frequent';
    tangentAllowance?: 'strict' | 'minimal' | 'moderate' | 'exploratory';
    technicalDepth?: 'surface' | 'accessible' | 'detailed' | 'expert';
    debateIntensity?: 'agreeable' | 'mild-challenge' | 'balanced-debate' | 'adversarial';
  };
}

export const DEFAULT_PRESETS: PodcastPreset[] = [
  // ─── QUICK & TIGHT ────────────────────────────────────────────────
  {
    id: 'executive-brief',
    name: 'Executive Brief',
    description: 'Dense, no-fluff summary for busy professionals. Maximum information per minute.',
    icon: '⚡',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'co-host', personality: 'Sharp analyst, cuts to the point, highlights what matters' },
        { role: 'co-host', personality: 'Strategic thinker, connects implications, asks "so what?"' },
      ],
      length: 'executive',
      tone: 'professional',
      audience: 'executives',
      style: 'co-host',
      emphasis: 'Key takeaways, strategic implications, actionable insights only',
      includeStories: false,
      includeExamples: false,
      disfluencyLevel: 'none',
      emotionalIntensity: 'subdued',
      interruptionFrequency: 'none',
      includeProsodyMarkers: false,
      includeEmphasis: true,
      informationDensity: 'maximum',
      pacing: 'rapid-fire',
      speakerBalance: 'equal',
      humorLevel: 'none',
      tangentAllowance: 'strict',
      technicalDepth: 'accessible',
      debateIntensity: 'mild-challenge',
      podcastStyle: 'editorial',
    },
  },
  {
    id: 'quick-recap',
    name: 'Quick Recap',
    description: 'Fast, energetic recap hitting the highlights. Great for catching up.',
    icon: '🏃',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'co-host', personality: 'Energetic summarizer, picks out the most interesting bits' },
        { role: 'co-host', personality: 'Adds quick context and "why it matters" perspective' },
      ],
      length: 'essential',
      tone: 'energetic',
      audience: 'general',
      style: 'co-host',
      emphasis: 'Hit the highlights fast, make it memorable',
      includeStories: false,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'expressive',
      interruptionFrequency: 'frequent',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'rapid-fire',
      speakerBalance: 'equal',
      humorLevel: 'light',
      tangentAllowance: 'strict',
      technicalDepth: 'surface',
      debateIntensity: 'agreeable',
      podcastStyle: 'comedic',
    },
  },

  // ─── CONVERSATIONAL ────────────────────────────────────────────────
  {
    id: 'notebooklm-style',
    name: 'NotebookLM Style',
    description: 'Two curious hosts discover the material together. High energy, natural reactions, genuine surprise.',
    icon: '🧪',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'co-host', personality: 'Enthusiastic explorer, genuinely surprised by discoveries, asks "wait, really?"' },
        { role: 'co-host', personality: 'Knowledgeable guide, explains with analogies, builds on partner\'s reactions' },
      ],
      length: 'comprehensive',
      tone: 'conversational',
      audience: 'general',
      style: 'co-host',
      emphasis: 'Make complex topics feel like exciting discoveries',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'high',
      emotionalIntensity: 'very-expressive',
      interruptionFrequency: 'frequent',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'dynamic',
      speakerBalance: 'equal',
      humorLevel: 'light',
      tangentAllowance: 'moderate',
      technicalDepth: 'accessible',
      debateIntensity: 'mild-challenge',
      podcastStyle: 'narrative',
    },
  },
  {
    id: 'casual-conversation',
    name: 'Casual Conversation',
    description: 'Relaxed, friendly dialogue. Like chatting with a smart friend over coffee.',
    icon: '☕',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'co-host', personality: 'Curious and warm, asks clarifying questions, shares personal reactions' },
        { role: 'co-host', personality: 'Knowledgeable but laid-back, explains concepts simply and clearly' },
      ],
      length: 'comprehensive',
      tone: 'conversational',
      audience: 'general',
      style: 'co-host',
      emphasis: 'Make complex topics accessible and engaging',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'medium',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'occasional',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'measured',
      speakerBalance: 'equal',
      humorLevel: 'light',
      tangentAllowance: 'moderate',
      technicalDepth: 'accessible',
      debateIntensity: 'agreeable',
      podcastStyle: 'lifestyle',
    },
  },
  {
    id: 'joe-rogan-style',
    name: 'Long-Form Exploration',
    description: 'Deep, meandering conversation. Tangents welcome. Hosts follow curiosity wherever it leads.',
    icon: '🎙️',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'interview',
      participants: [
        { role: 'host', personality: 'Intensely curious, asks "dumb questions" that are actually profound, pushes back when skeptical' },
        { role: 'guest', personality: 'Deep domain expert, tells war stories, gets passionate about details' },
      ],
      length: 'deep-dive',
      tone: 'conversational',
      audience: 'enthusiasts',
      style: 'interview',
      emphasis: 'Follow the most interesting threads wherever they go',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'high',
      emotionalIntensity: 'expressive',
      interruptionFrequency: 'frequent',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'slow-reflective',
      speakerBalance: 'interviewer-guest',
      humorLevel: 'frequent',
      tangentAllowance: 'exploratory',
      technicalDepth: 'detailed',
      debateIntensity: 'mild-challenge',
      podcastStyle: 'narrative',
    },
  },

  // ─── PROFESSIONAL & ANALYTICAL ─────────────────────────────────────
  {
    id: 'medical-interview',
    name: 'Medical Interview',
    description: 'Professional medical interview. Evidence-based, patient-focused, clinically precise.',
    icon: '🏥',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'interview',
      participants: [
        { role: 'host', personality: 'Professional interviewer with medical knowledge, asks probing questions' },
        { role: 'expert', personality: 'Medical expert, authoritative yet accessible, patient-focused' },
      ],
      length: 'comprehensive',
      tone: 'professional',
      audience: 'professionals',
      style: 'interview',
      emphasis: 'Focus on clinical evidence and patient outcomes',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'none',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'measured',
      speakerBalance: 'interviewer-guest',
      humorLevel: 'none',
      tangentAllowance: 'minimal',
      technicalDepth: 'detailed',
      debateIntensity: 'mild-challenge',
      podcastStyle: 'clinical',
    },
  },
  {
    id: 'research-panel',
    name: 'Research Panel',
    description: 'Multi-expert panel. Methodological rigor, data-driven, multiple perspectives.',
    icon: '🔬',
    category: 'default',
    config: {
      participantCount: 4,
      podcastFormat: 'panel',
      participants: [
        { role: 'moderator', personality: 'Neutral facilitator, guides discussion, synthesizes key points' },
        { role: 'expert', personality: 'Clinical researcher, data-driven, methodical approach' },
        { role: 'expert', personality: 'Practicing physician, patient perspective, practical experience' },
        { role: 'expert', personality: 'Academic researcher, theoretical framework, big-picture thinking' },
      ],
      length: 'deep-dive',
      tone: 'analytical',
      audience: 'professionals',
      style: 'co-host',
      emphasis: 'Examine methodologies and implications of recent research',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'occasional',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'measured',
      speakerBalance: 'equal',
      humorLevel: 'dry-wit',
      tangentAllowance: 'minimal',
      technicalDepth: 'expert',
      debateIntensity: 'balanced-debate',
      podcastStyle: 'academic',
    },
  },
  {
    id: 'tech-deep-dive',
    name: 'Tech Deep Dive',
    description: 'Technical discussion for developers and engineers. Implementation details, trade-offs, code-level.',
    icon: '💻',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'co-host', personality: 'Technical expert, detailed explanations, explores edge cases' },
        { role: 'co-host', personality: 'Implementation specialist, practical applications, best practices' },
      ],
      length: 'deep-dive',
      tone: 'analytical',
      audience: 'technical',
      style: 'co-host',
      emphasis: 'Technical depth with implementation details and trade-offs',
      includeStories: false,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'occasional',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'measured',
      speakerBalance: 'equal',
      humorLevel: 'dry-wit',
      tangentAllowance: 'minimal',
      technicalDepth: 'expert',
      debateIntensity: 'balanced-debate',
      podcastStyle: 'analytical',
    },
  },

  // ─── NARRATIVE & STORYTELLING ──────────────────────────────────────
  {
    id: 'npr-narrative',
    name: 'NPR Narrative',
    description: 'Polished storytelling with emotional depth. Measured pacing, vivid scenes, reflective moments.',
    icon: '📻',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'interview',
      participants: [
        { role: 'host', personality: 'Thoughtful narrator, paints vivid scenes, lets silence breathe' },
        { role: 'expert', personality: 'Subject expert who shares personal anecdotes and humanizes data' },
      ],
      length: 'comprehensive',
      tone: 'narrative',
      audience: 'general',
      style: 'interview',
      emphasis: 'Weave human stories through the facts. Show, don\'t tell.',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'expressive',
      interruptionFrequency: 'none',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'slow-reflective',
      speakerBalance: 'host-led',
      humorLevel: 'dry-wit',
      tangentAllowance: 'moderate',
      technicalDepth: 'accessible',
      debateIntensity: 'agreeable',
      podcastStyle: 'intimate',
    },
  },
  {
    id: 'ted-talk-style',
    name: 'TED Talk Style',
    description: 'One big idea, clearly structured. Builds to a powerful conclusion with memorable takeaways.',
    icon: '🎤',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'interview',
      participants: [
        { role: 'host', personality: 'Skilled interviewer who guides the narrative arc toward the big idea' },
        { role: 'expert', personality: 'Visionary thinker, uses analogies and stories to make ideas stick' },
      ],
      length: 'essential',
      tone: 'inspirational',
      audience: 'general',
      style: 'interview',
      emphasis: 'Build toward ONE powerful insight. Every point supports the central thesis.',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'none',
      emotionalIntensity: 'expressive',
      interruptionFrequency: 'none',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'dynamic',
      speakerBalance: 'expert-led',
      humorLevel: 'light',
      tangentAllowance: 'strict',
      technicalDepth: 'accessible',
      debateIntensity: 'agreeable',
      podcastStyle: 'narrative',
    },
  },

  // ─── EDUCATIONAL ───────────────────────────────────────────────────
  {
    id: 'educational-series',
    name: 'Educational Series',
    description: 'Structured learning format. Step-by-step explanations, checks for understanding.',
    icon: '📚',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'interview',
      participants: [
        { role: 'host', personality: 'Teacher/instructor, clear explanations, patient and encouraging' },
        { role: 'co-host', personality: 'Student perspective, asks questions learners would ask' },
      ],
      length: 'comprehensive',
      tone: 'educational',
      audience: 'students',
      style: 'interview',
      emphasis: 'Break down concepts step-by-step with clear examples',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'occasional',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'measured',
      speakerBalance: 'expert-led',
      humorLevel: 'light',
      tangentAllowance: 'minimal',
      technicalDepth: 'accessible',
      debateIntensity: 'agreeable',
      podcastStyle: 'explainer',
    },
  },

  // ─── DEBATE & ANALYSIS ─────────────────────────────────────────────
  {
    id: 'debate-format',
    name: 'Debate Format',
    description: 'Balanced debate with opposing viewpoints. Steel-man arguments, evidence-based.',
    icon: '⚖️',
    category: 'default',
    config: {
      participantCount: 3,
      podcastFormat: 'debate',
      participants: [
        { role: 'moderator', personality: 'Impartial moderator, ensures balanced discussion, asks tough questions' },
        { role: 'expert', personality: 'Advocate for position A, presents evidence and reasoning' },
        { role: 'expert', personality: 'Advocate for position B, challenges assumptions, offers counterpoints' },
      ],
      length: 'comprehensive',
      tone: 'analytical',
      audience: 'general',
      style: 'debate',
      emphasis: 'Present both sides fairly with evidence-based arguments',
      includeStories: false,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'expressive',
      interruptionFrequency: 'frequent',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'dynamic',
      speakerBalance: 'equal',
      humorLevel: 'none',
      tangentAllowance: 'strict',
      technicalDepth: 'detailed',
      debateIntensity: 'adversarial',
      podcastStyle: 'investigative',
    },
  },
  {
    id: 'investigative',
    name: 'Investigative',
    description: 'Skeptical, evidence-driven investigation. Question everything, follow the data.',
    icon: '🔍',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'co-host', personality: 'Skeptical investigator, questions claims, demands evidence, plays devil\'s advocate' },
        { role: 'co-host', personality: 'Research analyst, digs into methodology, finds the nuance others miss' },
      ],
      length: 'comprehensive',
      tone: 'skeptical',
      audience: 'general',
      style: 'co-host',
      emphasis: 'Challenge assumptions, examine evidence quality, find what others miss',
      includeStories: false,
      includeExamples: true,
      disfluencyLevel: 'low',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'occasional',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'measured',
      speakerBalance: 'equal',
      humorLevel: 'dry-wit',
      tangentAllowance: 'minimal',
      technicalDepth: 'detailed',
      debateIntensity: 'balanced-debate',
      podcastStyle: 'investigative',
    },
  },

  // ─── SPANISH LANGUAGE ────────────────────────────────────────────────
  {
    id: 'spanish-deep-dive',
    name: 'Deep Dive en Español',
    description: 'Exploración profunda en español. Dos anfitriones descubren el material juntos con energía y naturalidad.',
    icon: '🇲🇽',
    category: 'default',
    config: {
      participantCount: 2,
      podcastFormat: 'roundtable',
      participants: [
        { name: 'Alexa', role: 'co-host', personality: 'Curiosa y entusiasta, hace preguntas perspicaces, reacciona con sorpresa genuina. Usa expresiones coloquiales mexicanas.' },
        { name: 'Diego', role: 'co-host', personality: 'Guía conocedor, explica con analogías claras, construye sobre las reacciones de su compañera. Tono cálido y accesible.' },
      ],
      language: 'spanish',
      spanishDialect: 'mexican',
      length: 'deep-dive',
      tone: 'conversational',
      audience: 'general',
      style: 'co-host',
      emphasis: 'Hacer que temas complejos se sientan como descubrimientos emocionantes. Usar lenguaje natural y accesible.',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'high',
      emotionalIntensity: 'very-expressive',
      interruptionFrequency: 'frequent',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'moderate',
      pacing: 'dynamic',
      speakerBalance: 'equal',
      humorLevel: 'light',
      tangentAllowance: 'moderate',
      technicalDepth: 'accessible',
      debateIntensity: 'mild-challenge',
      podcastStyle: 'narrative',
    },
  },

  // ─── NEWS & CURRENT EVENTS ─────────────────────────────────────────
  {
    id: 'news-analysis',
    name: 'News Analysis',
    description: 'Current events with expert commentary. Context, implications, what to watch for.',
    icon: '📰',
    category: 'default',
    config: {
      participantCount: 3,
      podcastFormat: 'roundtable',
      participants: [
        { role: 'host', personality: 'News anchor, objective presenter, frames key issues' },
        { role: 'expert', personality: 'Policy analyst, provides context and implications' },
        { role: 'expert', personality: 'Field expert, on-the-ground perspective and practical insights' },
      ],
      length: 'essential',
      tone: 'professional',
      audience: 'general',
      style: 'co-host',
      emphasis: 'Explain significance and context of current developments',
      includeStories: true,
      includeExamples: true,
      disfluencyLevel: 'none',
      emotionalIntensity: 'natural',
      interruptionFrequency: 'occasional',
      includeProsodyMarkers: true,
      includeEmphasis: true,
      informationDensity: 'dense',
      pacing: 'dynamic',
      speakerBalance: 'host-led',
      humorLevel: 'none',
      tangentAllowance: 'strict',
      technicalDepth: 'accessible',
      debateIntensity: 'mild-challenge',
      podcastStyle: 'editorial',
    },
  },
];

// Database API functions
export async function loadAllPresets(userId?: string): Promise<PodcastPreset[]> {
  try {
    const params = userId ? `?userId=${userId}` : '';
    const response = await fetch(`/api/podcast-studio/presets${params}`);
    if (!response.ok) throw new Error('Failed to load presets');
    return await response.json();
  } catch (error) {
    console.error('Failed to load presets from database:', error);
    // Fallback to default presets only
    return DEFAULT_PRESETS;
  }
}

export async function saveCustomPreset(preset: Omit<PodcastPreset, 'id' | 'created_at' | 'updated_at'>): Promise<PodcastPreset | null> {
  try {
    const response = await fetch('/api/podcast-studio/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });
    if (!response.ok) throw new Error('Failed to save preset');
    return await response.json();
  } catch (error) {
    console.error('Failed to save preset:', error);
    return null;
  }
}

export async function updateCustomPreset(presetId: string, preset: Partial<PodcastPreset>): Promise<PodcastPreset | null> {
  try {
    const response = await fetch(`/api/podcast-studio/presets?id=${presetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });
    if (!response.ok) throw new Error('Failed to update preset');
    return await response.json();
  } catch (error) {
    console.error('Failed to update preset:', error);
    return null;
  }
}

export async function deleteCustomPreset(presetId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/podcast-studio/presets?id=${presetId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete preset:', error);
    return false;
  }
}

export async function incrementPresetUsage(presetId: string): Promise<void> {
  try {
    // Skip incrementing for default presets (they have string IDs like 'default-casual')
    if (presetId.startsWith('default-')) return;
    
    await fetch(`/api/podcast-studio/presets?id=${presetId}`, {
      method: 'PATCH',
    });
  } catch (error) {
    console.error('Failed to increment preset usage:', error);
  }
}

// Legacy: Keep for backwards compatibility
export function getAllPresets(): PodcastPreset[] {
  return DEFAULT_PRESETS;
}
