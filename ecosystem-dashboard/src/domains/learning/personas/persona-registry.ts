/**
 * Persona Registry — central registry for all personas.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §3
 *
 * Adding a persona = create one file in `personas/personas/`, export a
 * PersonaProfile, and call `personaRegistry.register(...)`.
 */

import type { PersonaProfile, PersonaArchetype } from './persona-types';

class PersonaRegistryImpl {
  private personas = new Map<string, PersonaProfile>();

  register(profile: PersonaProfile): void {
    if (this.personas.has(profile.id)) {
      console.warn(`[PersonaRegistry] Overwriting existing persona: ${profile.id}`);
    }
    this.personas.set(profile.id, profile);
  }

  get(id: string): PersonaProfile | undefined {
    return this.personas.get(id);
  }

  all(): PersonaProfile[] {
    return Array.from(this.personas.values());
  }

  byArchetype(archetype: PersonaArchetype): PersonaProfile[] {
    return this.all().filter((p) => p.archetype === archetype);
  }

  byActivity(activityId: string): PersonaProfile[] {
    return this.all().filter(
      (p) => p.universal || p.activityAffinities?.includes(activityId),
    );
  }

  bySkill(skillCode: string): PersonaProfile[] {
    return this.all().filter((p) => p.skillAffinities?.includes(skillCode));
  }

  has(id: string): boolean {
    return this.personas.has(id);
  }
}

export const personaRegistry = new PersonaRegistryImpl();
