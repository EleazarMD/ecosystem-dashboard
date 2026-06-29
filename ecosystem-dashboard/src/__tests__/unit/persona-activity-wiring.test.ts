/**
 * Tests for PersonaResolver wiring in activity registrations.
 *
 * Verifies that all registered activities use PersonaResolver-derived
 * personas instead of hardcoded PersonaRef objects.
 */

import { activityRegistry, KNOWN_ACTIVITY_IDS } from '../../domains/learning/shared/activity-types';
import { personaRegistry } from '../../domains/learning/personas';

// Ensure all activities are registered
import '../../domains/learning/shared/activities/builtin-activities';
import '../../domains/learning/shared/activities/learn-hub';
import '../../domains/learning/shared/activities/pokemon-lab';

describe('PersonaResolver wiring in activities', () => {
  it('all activities with personas resolve to registered persona IDs', () => {
    const activities = activityRegistry.all();
    const activitiesWithPersona = activities.filter((a) => a.persona);

    expect(activitiesWithPersona.length).toBeGreaterThanOrEqual(10);

    for (const activity of activitiesWithPersona) {
      expect(activity.persona).toBeDefined();
      expect(activity.persona!.id).toBeTruthy();
      // Every persona ID must exist in the persona registry
      const profile = personaRegistry.get(activity.persona!.id);
      expect(profile).toBeDefined();
      expect(profile!.name).toBe(activity.persona!.name);
    }
  });

  it('free-chat resolves to a registered persona (Buddy or Explorer Quinn)', () => {
    const freeChat = activityRegistry.get(KNOWN_ACTIVITY_IDS.FREE_CHAT);
    expect(freeChat?.persona).toBeDefined();
    const personaId = freeChat!.persona!.id;
    // Explorer Quinn has activityAffinity for free-chat, so it should resolve there
    expect(['explorer-quinn', 'buddy']).toContain(personaId);
  });

  it('learn-hub resolves to Professor Oak (has activityAffinity)', () => {
    const learnHub = activityRegistry.get(KNOWN_ACTIVITY_IDS.LEARN_HUB);
    expect(learnHub?.persona).toBeDefined();
    // Professor Oak has activityAffinity for learn-hub
    expect(learnHub!.persona!.id).toBe('professor-oak');
  });

  it('pokemon-lab resolves to a persona with pokemon-lab affinity', () => {
    const pokemonLab = activityRegistry.get(KNOWN_ACTIVITY_IDS.POKEMON_LAB);
    expect(pokemonLab?.persona).toBeDefined();
    // Both Professor Oak and Explorer Quinn have pokemon-lab affinity
    // Professor Oak is registered first, so it wins by pickBestMatch
    const personaId = pokemonLab!.persona!.id;
    expect(['professor-oak', 'explorer-quinn']).toContain(personaId);
  });

  it('art-studio resolves to Pusheen (has activityAffinity)', () => {
    const artStudio = activityRegistry.get(KNOWN_ACTIVITY_IDS.ART_STUDIO);
    expect(artStudio?.persona).toBeDefined();
    expect(artStudio!.persona!.id).toBe('artist-pusheen');
  });

  it('journal resolves to Pusheen (has activityAffinity)', () => {
    const journal = activityRegistry.get(KNOWN_ACTIVITY_IDS.JOURNAL);
    expect(journal?.persona).toBeDefined();
    expect(journal!.persona!.id).toBe('artist-pusheen');
  });

  it('activities without skill affinities fall back to Buddy', () => {
    const planner = activityRegistry.get(KNOWN_ACTIVITY_IDS.PLANNER);
    expect(planner?.persona).toBeDefined();
    // Planner has no skill codes and no persona has planner affinity → Buddy
    expect(planner!.persona!.id).toBe('buddy');
  });

  it('all personas have system prompts', () => {
    const activities = activityRegistry.all();
    for (const activity of activities) {
      if (activity.persona) {
        expect(activity.persona.systemPrompt).toBeTruthy();
        expect(activity.persona.systemPrompt!.length).toBeGreaterThan(20);
      }
    }
  });

  it('no activity uses a hardcoded persona ID from the old system', () => {
    const oldPersonaIds = [
      'companion',
      'art-buddy',
      'journal-buddy',
      'reading-buddy',
      'planner-buddy',
      'workspace-buddy',
      'word-buddy',
      'email-buddy',
      'path-buddy',
      'team-buddy',
      'learn-tutor',
      'pokemon-lab-tutor',
    ];

    const activities = activityRegistry.all();
    for (const activity of activities) {
      if (activity.persona) {
        expect(oldPersonaIds).not.toContain(activity.persona.id);
      }
    }
  });
});
