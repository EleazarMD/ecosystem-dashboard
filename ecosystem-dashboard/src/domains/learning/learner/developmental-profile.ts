/**
 * Developmental Profile — rich child profile that captures age, gender,
 * cognitive maturity, and developmental parameters the agentic harness
 * uses to adapt LLM system prompts and response style.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §3 (Context) extension
 */

// ─── Core Types ──────────────────────────────────────────────────────────────

/** Broad age band for developmental staging. */
export type AgeBand = 'early' | 'middle' | 'tween' | 'teen';

/** Gender identity (kept open-ended for parental configuration). */
export type Gender = 'male' | 'female' | 'nonbinary' | 'unspecified';

/** Cognitive maturity level derived from performance data. */
export type CognitiveLevel =
  | 'emerging'    // still building foundational understanding
  | 'developing'  // solidifying core concepts
  | 'proficient'  // confident with current material
  | 'advanced';   // ready for stretch challenges

/** Reading level relative to peers. */
export type ReadingLevel =
  | 'below-grade'
  | 'at-grade'
  | 'above-grade';

/** Attention span estimate (minutes of sustained focus). */
export type AttentionSpan = 'short' | 'medium' | 'long';

/** How the child responds to celebration / praise. */
export type CelebrationResponse = 'energized' | 'neutral' | 'shy';

/** Preferred learning modality. */
export type LearningModality =
  | 'visual'
  | 'auditory'
  | 'kinesthetic'
  | 'reading'
  | 'mixed';

/** Sensory sensitivities that affect content delivery. */
export interface SensoryPreferences {
  /** Avoid loud / intense visual stimuli. */
  prefersCalm?: boolean;
  /** Benefits from high-contrast, bold visuals. */
  prefersHighContrast?: boolean;
  /** Sensitive to flashing / rapid animation. */
  noFlashing?: boolean;
  /** Prefers structured / predictable layouts. */
  prefersStructuredLayout?: boolean;
}

/** Language / communication preferences. */
export interface CommunicationPreferences {
  /** Primary language spoken at home. */
  homeLanguage?: string;
  /** Whether the child is bilingual or ESL. */
  isBilingual?: boolean;
  /** Preferred pronoun (he/she/they). */
  pronoun?: 'he' | 'she' | 'they';
}

/**
 * The full developmental profile of a child learner.
 * This is the canonical abstraction the agentic harness reads
 * to adapt system prompts, response length, vocabulary, tone,
 * and interaction style.
 */
export interface DevelopmentalProfile {
  // ─── Identity ──────────────────────────────────────────────────────────────
  /** Child's display name. */
  displayName: string;
  /** Chronological age (years). */
  age: number;
  /** Developmental age band. */
  ageBand: AgeBand;
  /** Gender identity. */
  gender: Gender;
  /** Grade level (e.g. "2nd grade", "3rd grade"). */
  gradeLevel?: string;

  // ─── Cognitive ─────────────────────────────────────────────────────────────
  /** Overall cognitive maturity level (derived from performance). */
  cognitiveLevel: CognitiveLevel;
  /** Numeric cognitive maturity score 0–1 (derived from mastery data). */
  cognitiveMaturityScore: number;
  /** Reading level relative to grade peers. */
  readingLevel: ReadingLevel;
  /** Estimated attention span. */
  attentionSpan: AttentionSpan;
  /** Working memory capacity estimate (items the child can hold). */
  workingMemoryCapacity: number; // typically 3–7

  // ─── Learning Style ────────────────────────────────────────────────────────
  /** Preferred learning modality. */
  learningModality: LearningModality;
  /** How the child responds to celebration. */
  celebrationResponse: CelebrationResponse;
  /** Pacing preference (auto-adjusted from performance). */
  pacingPreference: 'slow' | 'medium' | 'fast';
  /** Current difficulty level 1–5 (auto-adjusted). */
  difficultyLevel: number;

  // ─── Preferences & Needs ───────────────────────────────────────────────────
  /** Sensory preferences affecting content delivery. */
  sensory?: SensoryPreferences;
  /** Communication preferences. */
  communication?: CommunicationPreferences;
  /** Known interests (topics the child loves). */
  interests: string[];

  // ─── Performance Signals ───────────────────────────────────────────────────
  /** Average mastery across all skills (0–1). */
  averageMastery: number;
  /** Skills the child is currently struggling with. */
  recentStruggles: string[];
  /** Skills the child is excelling at. */
  recentStrengths: string[];
  /** Total interactions / attempts recorded. */
  totalAttempts: number;
  /** Current streak (consecutive correct). */
  currentStreak: number;

  // ─── Metadata ──────────────────────────────────────────────────────────────
  /** When the profile was last computed. */
  computedAt: string; // ISO timestamp
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a DevelopmentalProfile with sensible defaults for an age.
 */
export function createDevelopmentalProfile(
  displayName: string,
  age: number,
  gender: Gender = 'unspecified',
  init?: Partial<DevelopmentalProfile>,
): DevelopmentalProfile {
  const ageBand = ageToBand(age);
  const defaults = ageBandDefaults(ageBand);

  return {
    displayName,
    age,
    ageBand,
    gender,
    gradeLevel: ageToGrade(age),
    cognitiveLevel: 'developing',
    cognitiveMaturityScore: 0.5,
    readingLevel: 'at-grade',
    attentionSpan: defaults.attentionSpan,
    workingMemoryCapacity: defaults.workingMemoryCapacity,
    learningModality: 'mixed',
    celebrationResponse: 'energized',
    pacingPreference: 'medium',
    difficultyLevel: 2,
    interests: [],
    averageMastery: 0.5,
    recentStruggles: [],
    recentStrengths: [],
    totalAttempts: 0,
    currentStreak: 0,
    computedAt: new Date().toISOString(),
    ...init,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert numeric age to a developmental band. */
export function ageToBand(age: number): AgeBand {
  if (age <= 7) return 'early';
  if (age <= 10) return 'middle';
  if (age <= 12) return 'tween';
  return 'teen';
}

/** Estimate grade level from age. */
export function ageToGrade(age: number): string {
  if (age <= 5) return 'kindergarten';
  if (age === 6) return '1st grade';
  if (age === 7) return '2nd grade';
  if (age === 8) return '3rd grade';
  if (age === 9) return '4th grade';
  if (age === 10) return '5th grade';
  if (age === 11) return '6th grade';
  if (age === 12) return '7th grade';
  return `${age - 5}th grade`;
}

/** Sensible defaults for an age band. */
export function ageBandDefaults(band: AgeBand): {
  attentionSpan: AttentionSpan;
  workingMemoryCapacity: number;
  maxResponseWords: number;
  vocabularyLevel: 'simple' | 'moderate' | 'rich';
} {
  switch (band) {
    case 'early':
      return { attentionSpan: 'short', workingMemoryCapacity: 3, maxResponseWords: 50, vocabularyLevel: 'simple' };
    case 'middle':
      return { attentionSpan: 'medium', workingMemoryCapacity: 4, maxResponseWords: 80, vocabularyLevel: 'moderate' };
    case 'tween':
      return { attentionSpan: 'medium', workingMemoryCapacity: 5, maxResponseWords: 120, vocabularyLevel: 'moderate' };
    case 'teen':
      return { attentionSpan: 'long', workingMemoryCapacity: 6, maxResponseWords: 200, vocabularyLevel: 'rich' };
  }
}

/**
 * Derive a CognitiveLevel from a numeric mastery score.
 */
export function masteryToCognitiveLevel(score: number): CognitiveLevel {
  if (score < 0.3) return 'emerging';
  if (score < 0.6) return 'developing';
  if (score < 0.85) return 'proficient';
  return 'advanced';
}

/**
 * Derive attention span from age and performance signals.
 * Children who struggle tend to have shorter effective attention.
 */
export function deriveAttentionSpan(
  age: number,
  averageMastery: number,
): AttentionSpan {
  const baseSpan = ageToBand(age) === 'early' ? 'short'
    : ageToBand(age) === 'teen' ? 'long'
    : 'medium';
  // If child is struggling, effective attention is shorter
  if (averageMastery < 0.3) return 'short';
  return baseSpan;
}

// ─── System Prompt Adapter ───────────────────────────────────────────────────

/**
 * Generate LLM adaptation directives from a DevelopmentalProfile.
 * These are injected into the system prompt so the model adjusts
 * vocabulary, response length, tone, and interaction style.
 */
export function buildLearnerDirectives(profile: DevelopmentalProfile): string {
  const defaults = ageBandDefaults(profile.ageBand);
  const pronoun = profile.communication?.pronoun
    ? profile.communication.pronoun
    : profile.gender === 'male' ? 'he'
    : profile.gender === 'female' ? 'she'
    : 'they';

  const directives: string[] = [
    `LEARNER PROFILE:`,
    `- Name: ${profile.displayName}`,
    `- Age: ${profile.age} (${profile.ageBand} band, ${profile.gradeLevel || 'unknown grade'})`,
    `- Gender: ${profile.gender} (use ${pronoun}/${pronoun === 'they' ? 'them' : pronoun === 'he' ? 'him' : 'her'} pronouns)`,
    `- Cognitive maturity: ${profile.cognitiveLevel} (score: ${profile.cognitiveMaturityScore.toFixed(2)})`,
    `- Reading level: ${profile.readingLevel}`,
    `- Attention span: ${profile.attentionSpan}`,
    `- Working memory: ${profile.workingMemoryCapacity} items`,
    `- Learning modality: ${profile.learningModality}`,
    `- Pacing: ${profile.pacingPreference}`,
    `- Difficulty level: ${profile.difficultyLevel}/5`,
    `- Celebration response: ${profile.celebrationResponse}`,
  ];

  // Interests
  if (profile.interests.length > 0) {
    directives.push(`- Interests: ${profile.interests.slice(0, 5).join(', ')}`);
  }

  // Performance signals
  if (profile.recentStruggles.length > 0) {
    directives.push(`- Currently struggling with: ${profile.recentStruggles.slice(0, 3).join(', ')}`);
  }
  if (profile.recentStrengths.length > 0) {
    directives.push(`- Excelling at: ${profile.recentStrengths.slice(0, 3).join(', ')}`);
  }
  if (profile.currentStreak > 0) {
    directives.push(`- Current streak: ${profile.currentStreak} correct in a row`);
  }

  // Sensory
  if (profile.sensory?.prefersCalm) {
    directives.push(`- Sensory: prefers calm, low-intensity visuals`);
  }
  if (profile.sensory?.noFlashing) {
    directives.push(`- Sensory: avoid flashing/rapid animation references`);
  }

  // Communication
  if (profile.communication?.isBilingual) {
    directives.push(`- Bilingual (home language: ${profile.communication.homeLanguage || 'unknown'})`);
  }

  // Adaptation directives
  directives.push('');
  directives.push('ADAPTATION RULES:');
  directives.push(`- Keep responses under ${defaults.maxResponseWords} words.`);
  directives.push(`- Use ${defaults.vocabularyLevel} vocabulary.`);

  if (profile.cognitiveLevel === 'emerging') {
    directives.push(
      '- The child is still building foundations. Break concepts into very small steps.',
      '- Use concrete, tangible examples. Avoid abstract language.',
      '- Repeat key ideas in different words. Check understanding frequently.',
      '- Offer lots of encouragement. Every small step is a win.',
    );
  } else if (profile.cognitiveLevel === 'developing') {
    directives.push(
      '- The child is solidifying core concepts. Use scaffolding — model, then guide, then let them try.',
      '- Connect new ideas to things they already know.',
      '- Use the "I do, we do, you do" pattern when explaining.',
    );
  } else if (profile.cognitiveLevel === 'proficient') {
    directives.push(
      '- The child is confident. Introduce richer vocabulary and multi-step reasoning.',
      '- Ask stretch questions that push beyond the basics.',
      '- Let the child lead exploration. Be a guide, not a lecturer.',
    );
  } else {
    directives.push(
      '- The child is advanced. Offer complex, open-ended challenges.',
      '- Introduce edge cases, exceptions, and deeper "why" questions.',
      '- Encourage teaching back / explaining to others as a mastery check.',
    );
  }

  // Attention span adaptations
  if (profile.attentionSpan === 'short') {
    directives.push(
      '- The child has a short attention span. Keep interactions punchy and varied.',
      '- Change activity or stimulus every 2–3 minutes.',
      '- Use visual breaks and movement cues.',
    );
  } else if (profile.attentionSpan === 'long') {
    directives.push(
      '- The child can sustain focus. Longer explanations and deeper dives are OK.',
    );
  }

  // Celebration adaptation
  if (profile.celebrationResponse === 'shy') {
    directives.push('- Use gentle, quiet praise. Avoid exclamation-heavy celebration.');
  } else if (profile.celebrationResponse === 'energized') {
    directives.push('- Use enthusiastic, high-energy celebration with emojis!');
  } else {
    directives.push('- Use measured, factual praise. Acknowledge effort without excess.');
  }

  // Reading level
  if (profile.readingLevel === 'below-grade') {
    directives.push(
      '- The child reads below grade level. Use shorter sentences and simpler words.',
      '- Offer to read content aloud. Define any unfamiliar word immediately.',
    );
  } else if (profile.readingLevel === 'above-grade') {
    directives.push(
      '- The child reads above grade level. Richer text and longer passages are welcome.',
    );
  }

  // Learning modality
  if (profile.learningModality === 'visual') {
    directives.push('- The child learns visually. Describe images, use spatial metaphors, suggest drawing.');
  } else if (profile.learningModality === 'auditory') {
    directives.push('- The child learns by hearing. Use rhythm, rhyme, and verbal repetition cues.');
  } else if (profile.learningModality === 'kinesthetic') {
    directives.push('- The child learns by doing. Suggest hands-on activities and physical metaphors.');
  }

  // Pacing
  if (profile.pacingPreference === 'slow') {
    directives.push('- Pace slowly. One idea at a time. Pause for understanding checks.');
  } else if (profile.pacingPreference === 'fast') {
    directives.push('- Pace briskly. The child absorbs quickly — move to the next challenge.');
  }

  return directives.join('\n');
}

// ─── Compact Summary (for ContextEnvelope) ───────────────────────────────────

/**
 * A compact representation of the DevelopmentalProfile suitable for
 * inclusion in the LearnerModelSummary / ContextEnvelope.
 * This is what actually travels through the agent loop.
 */
export interface DevelopmentalSummary {
  age: number;
  ageBand: AgeBand;
  gender: Gender;
  cognitiveLevel: CognitiveLevel;
  cognitiveMaturityScore: number;
  readingLevel: ReadingLevel;
  attentionSpan: AttentionSpan;
  learningModality: LearningModality;
  pacingPreference: 'slow' | 'medium' | 'fast';
  difficultyLevel: number;
  celebrationResponse: CelebrationResponse;
  interests: string[];
  recentStruggles: string[];
  recentStrengths: string[];
  averageMastery: number;
  pronoun?: 'he' | 'she' | 'they';
}

/**
 * Project a full DevelopmentalProfile into a compact DevelopmentalSummary
 * for the ContextEnvelope.
 */
export function toDevelopmentalSummary(
  profile: DevelopmentalProfile,
): DevelopmentalSummary {
  return {
    age: profile.age,
    ageBand: profile.ageBand,
    gender: profile.gender,
    cognitiveLevel: profile.cognitiveLevel,
    cognitiveMaturityScore: profile.cognitiveMaturityScore,
    readingLevel: profile.readingLevel,
    attentionSpan: profile.attentionSpan,
    learningModality: profile.learningModality,
    pacingPreference: profile.pacingPreference,
    difficultyLevel: profile.difficultyLevel,
    celebrationResponse: profile.celebrationResponse,
    interests: profile.interests.slice(0, 5),
    recentStruggles: profile.recentStruggles.slice(0, 3),
    recentStrengths: profile.recentStrengths.slice(0, 3),
    averageMastery: profile.averageMastery,
    pronoun: profile.communication?.pronoun,
  };
}
