/**
 * Learner Types — profile, memory, and adaptation types.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §4 (Learner Profile + Memory)
 */

export interface JournalEntry {
  sessionId: string;
  timestamp: number;
  summary: string;              // 1-2 sentence recap
  skillsPracticed: string[];
  mood?: string;                // observed from language
  toolsUsed: string[];
  correctCount: number;
  totalAttempts: number;
  bestStreak: number;
}

export interface LearnerReflection {
  childId: string;
  timestamp: number;
  skillCode?: string;
  stepTitle?: string;
  /** Child's self-assessed difficulty: easy / just-right / hard */
  difficultyRating: 'easy' | 'just-right' | 'hard';
  /** Optional free-text note from the child */
  note?: string;
  /** Whether the step was completed successfully */
  wasCompleted: boolean;
}

export interface LearnerProfile {
  childId: string;
  displayName: string;
  ageBand: string;
  interests: string[];
  goals: string[];

  // Mastery (synced from PCG)
  skillMastery: Record<string, number>;

  // Preferences (learned over time)
  preferredPersonaId?: string;
  preferredPacing: 'slow' | 'medium' | 'fast';
  preferredDifficulty: number;  // 1-5, auto-adjusted
  responseToCelebration: 'energized' | 'neutral' | 'shy';

  // Memory
  recentTopics: string[];
  recentStruggles: string[];
  recentStrengths: string[];

  // Session journal (persisted conversation memory)
  sessionJournal: JournalEntry[];

  // ─── Developmental Profile ────────────────────────────────────────────────
  /** Chronological age (years). */
  age?: number;
  /** Gender identity. */
  gender?: 'male' | 'female' | 'nonbinary' | 'unspecified';
  /** Grade level (e.g. "2nd grade"). */
  gradeLevel?: string;
  /** Reading level relative to peers. */
  readingLevel?: 'below-grade' | 'at-grade' | 'above-grade';
  /** Estimated attention span. */
  attentionSpan?: 'short' | 'medium' | 'long';
  /** Working memory capacity (items). */
  workingMemoryCapacity?: number;
  /** Preferred learning modality. */
  learningModality?: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  /** Sensory preferences. */
  sensory?: {
    prefersCalm?: boolean;
    prefersHighContrast?: boolean;
    noFlashing?: boolean;
    prefersStructuredLayout?: boolean;
  };
  /** Communication preferences. */
  communication?: {
    homeLanguage?: string;
    isBilingual?: boolean;
    pronoun?: 'he' | 'she' | 'they';
  };
  /** Overall cognitive maturity score 0–1 (derived from performance). */
  cognitiveMaturityScore?: number;
  /** Discrete cognitive level. */
  cognitiveLevel?: 'emerging' | 'developing' | 'proficient' | 'advanced';
}

export interface AdaptationPlan {
  pacing: 'slow' | 'medium' | 'fast';
  difficulty: number;           // 1-5
  hintEscalationSpeed: 'immediate' | 'normal' | 'delayed';
  celebrationIntensity: 'subtle' | 'normal' | 'exuberant';
  stretchChallengeProbability: number;  // 0-1
  recommendedNextSkills: string[];
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createLearnerProfile(
  childId: string,
  displayName: string,
  ageBand: string,
  init?: Partial<LearnerProfile>,
): LearnerProfile {
  return {
    childId,
    displayName,
    ageBand,
    interests: [],
    goals: [],
    skillMastery: {},
    preferredPacing: 'medium',
    preferredDifficulty: 2,
    responseToCelebration: 'energized',
    recentTopics: [],
    recentStruggles: [],
    recentStrengths: [],
    sessionJournal: [],
    ...init,
  };
}
