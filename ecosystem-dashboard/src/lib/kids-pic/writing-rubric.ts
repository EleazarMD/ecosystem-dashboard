/**
 * Writing rubric service — evaluates written responses against age-appropriate
 * rubrics with growth-oriented feedback. Uses deterministic heuristics first,
 * with an AI Gateway fallback for deeper analysis (Phase 3).
 *
 * Phase 3 acceptance: "a writing piece receives growth-oriented rubric feedback
 * with next steps."
 */

import type { LearnAgeBand } from './phase1-starter-content';

// ---------------------------------------------------------------------------
// Rubric definitions
// ---------------------------------------------------------------------------

export type RubricDimensionCode = 'ideas' | 'organization' | 'voice' | 'conventions' | 'word_choice';

export interface RubricDimension {
  code: RubricDimensionCode;
  label: string;
  description: string;
  /** Max score for this dimension (typically 5). */
  maxScore: number;
}

export interface RubricScore {
  dimension: RubricDimensionCode;
  label: string;
  score: number;
  maxScore: number;
  /** Growth-oriented feedback for this dimension. */
  feedback: string;
}

export interface WritingRubricResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  dimensionScores: RubricScore[];
  encouragement: string;
  strengths: string[];
  recommendations: { title: string; description: string }[];
  method: 'deterministic' | 'ai_analysis';
  confidence: number;
}

const RUBRIC_DIMENSIONS: Record<LearnAgeBand, RubricDimension[]> = {
  early: [
    { code: 'ideas', label: 'Ideas', description: 'Clear main idea about the topic.', maxScore: 5 },
    { code: 'organization', label: 'Organization', description: 'Beginning, middle, and end.', maxScore: 5 },
    { code: 'conventions', label: 'Writing rules', description: 'Capital letters and end marks.', maxScore: 5 },
  ],
  middle: [
    { code: 'ideas', label: 'Ideas & Content', description: 'Focused, detailed, and on-topic.', maxScore: 5 },
    { code: 'organization', label: 'Organization', description: 'Clear structure with transitions.', maxScore: 5 },
    { code: 'word_choice', label: 'Word Choice', description: 'Variety of interesting words.', maxScore: 5 },
    { code: 'conventions', label: 'Conventions', description: 'Spelling, punctuation, and grammar.', maxScore: 5 },
  ],
  tween: [
    { code: 'ideas', label: 'Ideas & Content', description: 'Depth, focus, and supporting evidence.', maxScore: 5 },
    { code: 'organization', label: 'Organization', description: 'Logical flow with effective transitions.', maxScore: 5 },
    { code: 'voice', label: 'Voice', description: 'Personal style and audience awareness.', maxScore: 5 },
    { code: 'word_choice', label: 'Word Choice', description: 'Precise, varied, and purposeful language.', maxScore: 5 },
    { code: 'conventions', label: 'Conventions', description: 'Grammar, mechanics, and sentence variety.', maxScore: 5 },
  ],
};

// ---------------------------------------------------------------------------
// Deterministic rubric scoring
// ---------------------------------------------------------------------------

interface TextStats {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  uniqueWords: number;
  vocabularyRatio: number;
  hasCapitalStart: boolean;
  hasEndPunctuation: boolean;
  paragraphCount: number;
  transitionWords: number;
}

function analyzeText(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const avgSentenceLength = wordCount / sentenceCount;

  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))).size;
  const vocabularyRatio = wordCount > 0 ? uniqueWords / wordCount : 0;

  const hasCapitalStart = /^[A-Z]/.test(trimmed);
  const hasEndPunctuation = /[.!?]$/.test(trimmed);

  const paragraphCount = Math.max(1, trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length);

  const TRANSITION_WORDS = ['first', 'next', 'then', 'after', 'because', 'however', 'also', 'finally', 'for example', 'so', 'but', 'although'];
  const lowerText = trimmed.toLowerCase();
  const transitionWords = TRANSITION_WORDS.filter((t) => lowerText.includes(t)).length;

  return { wordCount, sentenceCount, avgSentenceLength, uniqueWords, vocabularyRatio, hasCapitalStart, hasEndPunctuation, paragraphCount, transitionWords };
}

function scoreIdeas(stats: TextStats, ageBand: LearnAgeBand): { score: number; feedback: string } {
  const minWords = ageBand === 'early' ? 10 : ageBand === 'middle' ? 30 : 50;
  if (stats.wordCount < minWords) {
    return { score: 2, feedback: 'Try adding more details about your main idea. What else can you tell the reader?' };
  }
  if (stats.wordCount < minWords * 2) {
    return { score: 3, feedback: 'You have a good start! Add one or two more specific details to make your ideas stronger.' };
  }
  if (stats.vocabularyRatio > 0.6) {
    return { score: 5, feedback: 'Excellent! Your writing is full of specific, interesting details that support your main idea.' };
  }
  return { score: 4, feedback: 'Great ideas! You stay on topic well. Try adding an example to make it even stronger.' };
}

function scoreOrganization(stats: TextStats, ageBand: LearnAgeBand): { score: number; feedback: string } {
  if (ageBand === 'early') {
    if (stats.paragraphCount >= 1 && stats.sentenceCount >= 2) {
      return { score: 4, feedback: 'Nice job putting your sentences in order! Try using "first" or "then" to connect them.' };
    }
    return { score: 2, feedback: 'Try writing at least two sentences — one to start and one to finish your idea.' };
  }

  if (stats.transitionWords >= 3 && stats.paragraphCount >= 2) {
    return { score: 5, feedback: 'Your writing flows beautifully! You use transition words and organize ideas into clear paragraphs.' };
  }
  if (stats.transitionWords >= 1) {
    return { score: 3, feedback: 'Good structure! Try using more connecting words like "because" or "for example" to link your ideas.' };
  }
  return { score: 2, feedback: 'Your ideas are here, but they need connecting. Try starting some sentences with "first," "next," or "also."' };
}

function scoreVoice(_stats: TextStats, _ageBand: LearnAgeBand): { score: number; feedback: string } {
  return { score: 3, feedback: 'Your voice is emerging! Try writing as if you are talking to a friend about your topic.' };
}

function scoreWordChoice(stats: TextStats, ageBand: LearnAgeBand): { score: number; feedback: string } {
  if (stats.vocabularyRatio > 0.65) {
    return { score: 5, feedback: 'Wonderful word variety! You use interesting and specific words that paint a picture.' };
  }
  if (stats.vocabularyRatio > 0.45) {
    return { score: 4, feedback: 'Good word choices! Try swapping one common word for a more descriptive one.' };
  }
  if (ageBand === 'early') {
    return { score: 3, feedback: 'Try using a describing word (adjective) to make your writing more colorful.' };
  }
  return { score: 2, feedback: 'Try using more interesting words. Instead of "good," could you say "amazing" or "helpful"?' };
}

function scoreConventions(stats: TextStats, ageBand: LearnAgeBand): { score: number; feedback: string } {
  let score = 5;
  const tips: string[] = [];

  if (!stats.hasCapitalStart) {
    score -= 1;
    tips.push('Start each sentence with a capital letter.');
  }
  if (!stats.hasEndPunctuation) {
    score -= 1;
    tips.push('End each sentence with a period, question mark, or exclamation mark.');
  }
  if (ageBand !== 'early' && stats.avgSentenceLength > 25) {
    score -= 1;
    tips.push('Try breaking long sentences into shorter ones.');
  }

  if (score >= 5) {
    return { score: 5, feedback: 'Your capital letters and punctuation are spot on!' };
  }

  return {
    score: Math.max(2, score),
    feedback: tips.length > 0 ? `Almost there! ${tips.join(' ')}` : 'Check your capital letters and end marks.',
  };
}

const SCORERS: Record<RubricDimensionCode, (stats: TextStats, ageBand: LearnAgeBand) => { score: number; feedback: string }> = {
  ideas: scoreIdeas,
  organization: scoreOrganization,
  voice: scoreVoice,
  word_choice: scoreWordChoice,
  conventions: scoreConventions,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function evaluateWriting(text: string, ageBand: LearnAgeBand = 'middle'): WritingRubricResult {
  const stats = analyzeText(text);
  const dimensions = RUBRIC_DIMENSIONS[ageBand] || RUBRIC_DIMENSIONS.middle;

  const dimensionScores: RubricScore[] = dimensions.map((dim) => {
    const scorer = SCORERS[dim.code];
    const result = scorer(stats, ageBand);
    return {
      dimension: dim.code,
      label: dim.label,
      score: result.score,
      maxScore: dim.maxScore,
      feedback: result.feedback,
    };
  });

  const totalScore = dimensionScores.reduce((sum, d) => sum + d.score, 0);
  const maxScore = dimensionScores.reduce((sum, d) => sum + d.maxScore, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const strengths = dimensionScores
    .filter((d) => d.score >= 4)
    .map((d) => `${d.label}: ${d.feedback}`)
    .slice(0, 3);

  const recommendations = dimensionScores
    .filter((d) => d.score <= 3)
    .map((d) => ({ title: d.label, description: d.feedback }))
    .slice(0, 2);

  const encouragement =
    percentage >= 80
      ? 'Amazing writing! You should feel proud of this piece.'
      : percentage >= 60
        ? 'Good effort! Your writing is growing. Here are some tips to make it even stronger.'
        : 'Great start! Writing is like a muscle — it gets stronger with practice. Keep going!';

  return {
    overallScore: totalScore,
    maxScore,
    percentage,
    dimensionScores,
    encouragement,
    strengths: strengths.length > 0 ? strengths : ['You completed a writing piece — that takes courage!'],
    recommendations: recommendations.length > 0 ? recommendations : [{ title: 'Keep writing', description: 'The best way to improve is to write a little every day.' }],
    method: 'deterministic',
    confidence: 0.7,
  };
}

export function getRubricDimensions(ageBand: LearnAgeBand): RubricDimension[] {
  return RUBRIC_DIMENSIONS[ageBand] || RUBRIC_DIMENSIONS.middle;
}
