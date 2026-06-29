/**
 * Personas barrel — imports all persona definitions to register them.
 *
 * To add a new persona:
 * 1. Create `personas/<your-persona>.ts` exporting a PersonaProfile.
 * 2. Import it here.
 * 3. That's it — the resolver and registry update automatically.
 */

import './personas/buddy';
import './personas/professor-oak';
import './personas/artist-pusheen';
import './personas/explorer-quinn';

export { personaRegistry } from './persona-registry';
export { resolvePersona } from './persona-resolver';
export type { PersonaResolutionContext } from './persona-resolver';
export type {
  PersonaProfile,
  PersonaArchetype,
  VoiceStyle,
  PersonalityTraits,
  GreetingStyle,
  CelebrationStyle,
  CoachingStyle,
  PersonaThemeFlavor,
} from './persona-types';
export { toPersonaRef } from './persona-types';
