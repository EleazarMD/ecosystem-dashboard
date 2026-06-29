/**
 * Developmental Profile Resolver — resolves a child's DevelopmentalProfile
 * from the database (child_profiles) + performance data (mastery calculator).
 *
 * This is the bridge between stored child data and the developmental
 * abstraction the agentic harness uses.
 */

import dbPool from '@/lib/db/client';
import {
  type DevelopmentalProfile,
  type DevelopmentalSummary,
  type AgeBand,
  type Gender,
  type ReadingLevel,
  type AttentionSpan,
  type LearningModality,
  type CelebrationResponse,
  type CognitiveLevel,
  createDevelopmentalProfile,
  ageToBand,
  ageToGrade,
  masteryToCognitiveLevel,
  deriveAttentionSpan,
  toDevelopmentalSummary,
} from './developmental-profile';
import { getCognitiveMaturityCalculator } from './cognitive-maturity-calculator';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChildProfileRow {
  id: string;
  display_name: string;
  age_group: string;
  grade_level?: string;
  learning_style?: string;
  interests?: string[];
  strengths?: string[];
  areas_for_growth?: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map DB age_group to numeric age estimate. */
function ageGroupToAge(ageGroup: string): number {
  switch (ageGroup) {
    case 'early': return 6;
    case 'middle': return 8;
    case 'tween': return 11;
    case 'teen': return 14;
    default: return 8;
  }
}

/** Map DB age_group to AgeBand. */
function ageGroupToBand(ageGroup: string): AgeBand {
  switch (ageGroup) {
    case 'early': return 'early';
    case 'middle': return 'middle';
    case 'tween': return 'tween';
    case 'teen': return 'teen';
    default: return 'middle';
  }
}

/** Map DB learning_style to LearningModality. */
function learningStyleToModality(style?: string): LearningModality {
  switch (style) {
    case 'visual': return 'visual';
    case 'auditory': return 'auditory';
    case 'kinesthetic': return 'kinesthetic';
    case 'reading': return 'reading';
    default: return 'mixed';
  }
}

// ─── Resolver ────────────────────────────────────────────────────────────────

/**
 * Resolve a DevelopmentalProfile for a child by combining:
 * 1. Static data from child_profiles (age group, interests, learning style)
 * 2. Dynamic cognitive maturity from the CognitiveMaturityCalculator
 *
 * @param childUserId  The child's user ID (from session)
 * @param childName    Display name (fallback if DB row not found)
 * @param ageGroup     Age group from PCG/context (fallback)
 */
export async function resolveDevelopmentalProfile(
  childUserId: string,
  childName?: string,
  ageGroup?: string,
): Promise<DevelopmentalProfile | null> {
  let row: ChildProfileRow | null = null;

  try {
    const result = await dbPool.query(
      `SELECT id, display_name, age_group, grade_level, learning_style,
              interests, strengths, areas_for_growth
       FROM child_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [childUserId],
    );
    if (result.rows.length > 0) {
      row = result.rows[0] as ChildProfileRow;
    }
  } catch {
    // DB unavailable — proceed with fallbacks
  }

  // Use DB data or fallbacks
  const displayName = row?.display_name || childName || 'Learner';
  const dbAgeGroup = row?.age_group || ageGroup || 'middle';
  const age = ageGroupToAge(dbAgeGroup);
  const ageBand = ageGroupToBand(dbAgeGroup);
  const gradeLevel = row?.grade_level
    ? ageToGrade(parseInt(row.grade_level, 10) + 5)
    : ageToGrade(age);
  const learningModality = learningStyleToModality(row?.learning_style);
  const interests = row?.interests || [];

  // Compute cognitive maturity from performance data
  const maturity = getCognitiveMaturityCalculator().compute(childUserId, age);

  // Build the profile
  const profile = createDevelopmentalProfile(
    displayName,
    age,
    'unspecified', // gender not stored in DB yet — parent can configure
    {
      ageBand,
      gradeLevel,
      learningModality,
      interests,
      cognitiveLevel: maturity.level,
      cognitiveMaturityScore: maturity.score,
      averageMastery: maturity.averageMastery,
      attentionSpan: maturity.attentionSpan,
      recentStruggles: maturity.strugglingSkills,
      recentStrengths: maturity.strongSkills,
      totalAttempts: maturity.totalAttempts,
      currentStreak: maturity.currentStreak,
      difficultyLevel: 2, // will be auto-adjusted by LearnerProfileService
      celebrationResponse: 'energized', // default — will be learned over time
      pacingPreference: maturity.averageMastery < 0.4 ? 'slow'
        : maturity.averageMastery > 0.8 ? 'fast' : 'medium',
    },
  );

  return profile;
}

/**
 * Resolve a compact DevelopmentalSummary for the ContextEnvelope.
 * This is the convenience function for agent-turn.ts to call.
 */
export async function resolveDevelopmentalSummary(
  childUserId: string,
  childName?: string,
  ageGroup?: string,
): Promise<DevelopmentalSummary | undefined> {
  const profile = await resolveDevelopmentalProfile(childUserId, childName, ageGroup);
  if (!profile) return undefined;
  return toDevelopmentalSummary(profile);
}
