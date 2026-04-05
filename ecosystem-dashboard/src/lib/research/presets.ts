/**
 * Research Presets — predefined and user-saved configurations
 * for the Deep Research Settings panel.
 *
 * Stored in localStorage under 'research-presets-custom'.
 */

export interface ResearchPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  builtIn: boolean;
  // Settings snapshot
  model: string;
  sonarModel?: string;
  audienceLevel: string;
  researchDepth: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  enableClarification: boolean;
  enableSynthesis: boolean;
  mode: 'synchronous' | 'asynchronous';
  sourceRecency?: string;
  searchDomainFocus?: string;
  outputFormats: {
    academicReport: boolean;
    executiveSummary: boolean;
    podcastScript: boolean;
    presentationSlides: boolean;
    newsStory?: boolean;
  };
  dataSources: {
    webResearch: boolean;
    knowledgeGraph: boolean;
    codeAnalysis: boolean;
    customMCP: boolean;
    emailIntelligence: boolean;
    contactNetwork: boolean;
  };
}

// ── Built-in presets ────────────────────────────────────────────

export const BUILT_IN_PRESETS: ResearchPreset[] = [
  {
    id: 'perplexity-deep',
    name: 'Perplexity Deep Research',
    icon: '🔬',
    description: 'Comprehensive multi-step web research with Sonar Deep Research',
    builtIn: true,
    model: 'perplexity',
    sonarModel: 'sonar-deep-research',
    audienceLevel: 'general',
    researchDepth: 3,
    reasoningEffort: 'medium',
    enableClarification: false,
    enableSynthesis: false,
    mode: 'asynchronous',
    sourceRecency: 'any',
    searchDomainFocus: '',
    outputFormats: {
      academicReport: true,
      executiveSummary: false,
      podcastScript: false,
      presentationSlides: false,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: false,
      codeAnalysis: false,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
  {
    id: 'quick-web-search',
    name: 'Quick Web Search',
    icon: '⚡',
    description: 'Fast Perplexity search for quick factual answers',
    builtIn: true,
    model: 'perplexity',
    sonarModel: 'sonar-pro',
    audienceLevel: 'general',
    researchDepth: 1,
    reasoningEffort: 'low',
    enableClarification: false,
    enableSynthesis: false,
    mode: 'synchronous',
    sourceRecency: 'any',
    searchDomainFocus: '',
    outputFormats: {
      academicReport: false,
      executiveSummary: true,
      podcastScript: false,
      presentationSlides: false,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: false,
      codeAnalysis: false,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
  {
    id: 'medical-literature',
    name: 'Medical Literature Review',
    icon: '🩺',
    description: 'Clinical research with PubMed focus and academic output',
    builtIn: true,
    model: 'perplexity',
    sonarModel: 'sonar-deep-research',
    audienceLevel: 'clinical_researcher',
    researchDepth: 5,
    reasoningEffort: 'high',
    enableClarification: false,
    enableSynthesis: false,
    mode: 'asynchronous',
    sourceRecency: 'year',
    searchDomainFocus: 'pubmed.gov, nih.gov, nejm.org',
    outputFormats: {
      academicReport: true,
      executiveSummary: true,
      podcastScript: false,
      presentationSlides: false,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: false,
      codeAnalysis: false,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    icon: '📊',
    description: 'Market research with executive summary and slides',
    builtIn: true,
    model: 'perplexity',
    sonarModel: 'sonar-deep-research',
    audienceLevel: 'entrepreneur',
    researchDepth: 4,
    reasoningEffort: 'high',
    enableClarification: false,
    enableSynthesis: false,
    mode: 'asynchronous',
    sourceRecency: 'month',
    searchDomainFocus: '',
    outputFormats: {
      academicReport: false,
      executiveSummary: true,
      podcastScript: false,
      presentationSlides: true,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: false,
      codeAnalysis: false,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
  {
    id: 'tech-deep-dive',
    name: 'Technical Deep Dive',
    icon: '💻',
    description: 'Engineering-focused research with code analysis',
    builtIn: true,
    model: 'o3-mini',
    audienceLevel: 'software_engineer',
    researchDepth: 4,
    reasoningEffort: 'high',
    enableClarification: true,
    enableSynthesis: true,
    mode: 'asynchronous',
    outputFormats: {
      academicReport: true,
      executiveSummary: false,
      podcastScript: false,
      presentationSlides: false,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: true,
      codeAnalysis: true,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
  {
    id: 'podcast-prep',
    name: 'Podcast Prep',
    icon: '🎙️',
    description: 'Research optimized for podcast source material',
    builtIn: true,
    model: 'perplexity',
    sonarModel: 'sonar-deep-research',
    audienceLevel: 'content_creator',
    researchDepth: 3,
    reasoningEffort: 'medium',
    enableClarification: false,
    enableSynthesis: false,
    mode: 'asynchronous',
    sourceRecency: 'month',
    searchDomainFocus: '',
    outputFormats: {
      academicReport: false,
      executiveSummary: true,
      podcastScript: true,
      presentationSlides: false,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: false,
      codeAnalysis: false,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
  {
    id: 'investment-research',
    name: 'Investment Research',
    icon: '💰',
    description: 'Financial analysis with recent data focus',
    builtIn: true,
    model: 'perplexity',
    sonarModel: 'sonar-deep-research',
    audienceLevel: 'investor',
    researchDepth: 5,
    reasoningEffort: 'high',
    enableClarification: false,
    enableSynthesis: false,
    mode: 'asynchronous',
    sourceRecency: 'week',
    searchDomainFocus: 'sec.gov, bloomberg.com, reuters.com',
    outputFormats: {
      academicReport: true,
      executiveSummary: true,
      podcastScript: false,
      presentationSlides: true,
    },
    dataSources: {
      webResearch: true,
      knowledgeGraph: false,
      codeAnalysis: false,
      customMCP: false,
      emailIntelligence: false,
      contactNetwork: false,
    },
  },
];

// ── localStorage helpers ────────────────────────────────────────

const CUSTOM_PRESETS_KEY = 'research-presets-custom';

export function getCustomPresets(): ResearchPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: ResearchPreset): void {
  const existing = getCustomPresets();
  const idx = existing.findIndex((p) => p.id === preset.id);
  if (idx >= 0) {
    existing[idx] = preset;
  } else {
    existing.push(preset);
  }
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(existing));
}

export function deleteCustomPreset(id: string): void {
  const existing = getCustomPresets().filter((p) => p.id !== id);
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(existing));
}

export function getAllPresets(): ResearchPreset[] {
  return [...BUILT_IN_PRESETS, ...getCustomPresets()];
}
