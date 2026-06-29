/**
 * Persona Resolver — picks the best persona for a given activity + learner.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §3
 *
 * Resolution order:
 * 1. Learner's preferred persona (if set and compatible with activity)
 * 2. Activity-specific persona (if activity has an affinity)
 * 3. Skill-matched persona (if the activity's skill matches a persona's affinity)
 * 4. Default "Buddy" companion persona
 */

import { personaRegistry } from './persona-registry';
import type { PersonaProfile } from './persona-types';

export interface PersonaResolutionContext {
  activityId: string;
  skillCodes?: string[];
  learnerAge?: number;
  learnerPreferredPersonaId?: string;
}

const DEFAULT_PERSONA_ID = 'buddy';

export function resolvePersona(ctx: PersonaResolutionContext): PersonaProfile {
  // 1. Learner preference (if compatible)
  if (ctx.learnerPreferredPersonaId) {
    const preferred = personaRegistry.get(ctx.learnerPreferredPersonaId);
    if (preferred && isCompatible(preferred, ctx)) {
      return preferred;
    }
  }

  // 2. Activity-specific persona (prefer explicit affinity over universal)
  const activityPersonas = personaRegistry.byActivity(ctx.activityId);
  if (activityPersonas.length > 0) {
    // Prefer personas with explicit activity affinity over universal ones
    const explicit = activityPersonas.filter(
      (p) => !p.universal && p.activityAffinities?.includes(ctx.activityId),
    );
    if (explicit.length > 0) {
      return pickBestMatch(explicit, ctx);
    }
    return pickBestMatch(activityPersonas, ctx);
  }

  // 3. Skill-matched persona
  if (ctx.skillCodes && ctx.skillCodes.length > 0) {
    for (const skillCode of ctx.skillCodes) {
      const skillPersonas = personaRegistry.bySkill(skillCode);
      if (skillPersonas.length > 0) {
        return pickBestMatch(skillPersonas, ctx);
      }
    }
  }

  // 4. Default fallback
  return personaRegistry.get(DEFAULT_PERSONA_ID) ?? createFallbackPersona();
}

function isCompatible(persona: PersonaProfile, ctx: PersonaResolutionContext): boolean {
  if (persona.universal) return true;
  if (persona.activityAffinities?.includes(ctx.activityId)) return true;
  if (ctx.skillCodes && persona.skillAffinities?.some((s) => ctx.skillCodes!.includes(s))) return true;
  return false;
}

function pickBestMatch(personas: PersonaProfile[], ctx: PersonaResolutionContext): PersonaProfile {
  // For now, pick the first match. Future: score by age range + personality fit.
  if (ctx.learnerAge !== undefined) {
    const ageMatch = personas.find(
      (p) => p.ageRange && ctx.learnerAge! >= p.ageRange[0] && ctx.learnerAge! <= p.ageRange[1],
    );
    if (ageMatch) return ageMatch;
  }
  return personas[0];
}

function createFallbackPersona(): PersonaProfile {
  return {
    id: 'fallback',
    name: 'Friend',
    avatar: '🌟',
    archetype: 'companion',
    voice: {
      tone: 'warm',
      vocabulary: 'simple',
      sentenceLength: 'short',
      emojiFrequency: 'occasional',
    },
    personality: {
      curiosity: 0.7,
      patience: 0.8,
      enthusiasm: 0.6,
      precision: 0.5,
      playfulness: 0.6,
    },
    systemPrompt:
      'You are a warm, friendly companion. Be brief, age-appropriate, and encouraging.',
    greetingStyle: {
      template: 'Hi there! Ready to learn?',
      energyLevel: 'medium',
    },
    celebrationStyle: {
      template: 'Great job! You did it!',
      intensity: 'normal',
      emoji: '🎉',
    },
    coachingStyle: {
      approach: 'socratic',
      hintEscalation: 'normal',
      encouragementFrequency: 'medium',
    },
    universal: true,
  };
}
