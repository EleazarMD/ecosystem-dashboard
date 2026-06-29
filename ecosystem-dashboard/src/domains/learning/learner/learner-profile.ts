/**
 * Learner Profile Service — aggregates mastery, preferences, and memory
 * into a single LearnerProfile. Provides update + sync hooks.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §4
 */

import type { LearnerProfile, JournalEntry } from './learner-types';
import { createLearnerProfile } from './learner-types';
import { getMasteryCalculator } from './mastery-calculator';
import { getLearnerMemory } from './learner-memory';
import { getEventBus } from '../shared/event-bus';

class LearnerProfileServiceImpl {
  private profiles = new Map<string, LearnerProfile>();

  /** Get or create a profile for a child. */
  getOrCreate(
    childId: string,
    displayName: string,
    ageBand: string,
    init?: Partial<LearnerProfile>,
  ): LearnerProfile {
    let profile = this.profiles.get(childId);
    if (!profile) {
      profile = createLearnerProfile(childId, displayName, ageBand, init);
      this.profiles.set(childId, profile);
    }
    return profile;
  }

  get(childId: string): LearnerProfile | undefined {
    return this.profiles.get(childId);
  }

  /** Update mastery scores from the mastery calculator. */
  syncMastery(childId: string): void {
    const profile = this.profiles.get(childId);
    if (!profile) return;
    profile.skillMastery = getMasteryCalculator().getAll(childId);
  }

  /** Record an attempt and update mastery + profile. */
  recordAttempt(
    childId: string,
    skillCode: string,
    correct: boolean,
    attemptNumber: number,
  ): void {
    const mastery = getMasteryCalculator().update({
      childId,
      skillCode,
      correct,
      timestamp: Date.now(),
      attemptNumber,
    });

    const profile = this.profiles.get(childId);
    if (profile) {
      // Update recent strengths/struggles
      if (correct) {
        if (!profile.recentStrengths.includes(skillCode)) {
          profile.recentStrengths = [skillCode, ...profile.recentStrengths].slice(0, 5);
        }
        // Remove from struggles if present
        profile.recentStruggles = profile.recentStruggles.filter((s) => s !== skillCode);
      } else {
        if (!profile.recentStruggles.includes(skillCode)) {
          profile.recentStruggles = [skillCode, ...profile.recentStruggles].slice(0, 5);
        }
      }

      // Update recent topics
      if (!profile.recentTopics.includes(skillCode)) {
        profile.recentTopics = [skillCode, ...profile.recentTopics].slice(0, 10);
      }

      // Adjust preferred difficulty based on mastery trend
      if (mastery >= 0.85 && profile.preferredDifficulty < 5) {
        profile.preferredDifficulty = Math.min(5, profile.preferredDifficulty + 0.1);
      } else if (mastery <= 0.3 && profile.preferredDifficulty > 1) {
        profile.preferredDifficulty = Math.max(1, profile.preferredDifficulty - 0.1);
      }
    }

    getEventBus().emit('attempt.graded', {
      childId,
      contentItemId: '',
      skillCode,
      correct,
      attemptNumber,
      timestamp: Date.now(),
    });
  }

  /** Set the learner's preferred persona. */
  setPreferredPersona(childId: string, personaId: string): void {
    const profile = this.profiles.get(childId);
    if (profile) {
      profile.preferredPersonaId = personaId;
    }
  }

  /** Get the session journal for a child. */
  getJournal(childId: string, lastN: number = 10): JournalEntry[] {
    return getLearnerMemory().getJournal(childId, lastN);
  }

  /** Clear profile for a child. */
  clear(childId: string): void {
    this.profiles.delete(childId);
    getMasteryCalculator().clear(childId);
    getLearnerMemory().clear(childId);
  }

  reset(): void {
    this.profiles.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: LearnerProfileServiceImpl | null = null;

export function getLearnerProfileService(): LearnerProfileServiceImpl {
  if (!_instance) {
    _instance = new LearnerProfileServiceImpl();
  }
  return _instance;
}

export function _resetLearnerProfileService(): void {
  _instance?.reset();
  _instance = null;
}
