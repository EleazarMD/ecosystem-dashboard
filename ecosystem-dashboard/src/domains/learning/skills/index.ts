/**
 * Skills barrel — registers all SkillModules with the singleton registry.
 *
 * To add a new tool:
 * 1. Create `src/domains/learning/skills/<your-tool>.ts` exporting a SkillModule.
 * 2. Import it here and call `skillRegistry.register(...)`.
 * 3. That's it — the roster, gate, and dispatcher all update automatically.
 *
 * See `.windsurf/skills/kids-dashboard-tool-creation/SKILL.md` for the full guide.
 */

import { skillRegistry } from '../shared/skill-module';

import { askSocraticSkill } from './ask-socratic';
import { giveHintSkill } from './give-hint';
import { checkAnswerSkill } from './check-answer';
import { defineWordSkill } from './define-word';
import { exploreGraphSkill } from './explore-graph';
import { getChildStatsSkill } from './get-child-stats';
import { recommendActivitySkill } from './recommend-activity';
import { generateProblemSkill } from './generate-problem';
import { celebrateSkill } from './celebrate';
import { drawImageSkill } from './draw-image';
import { journalWriteSkill } from './journal-write';
import { readWithMeSkill } from './read-with-me';
import { showPassageSkill } from './show-passage';
import { workspaceCreatePageSkill } from './workspace-create-page';
import { workspaceAddBlockSkill } from './workspace-add-block';
import { workspaceUpdateBlockSkill } from './workspace-update-block';
import { workspaceDeleteBlockSkill } from './workspace-delete-block';
import { workspaceGetPagesSkill } from './workspace-get-pages';
import { workspaceSearchSkill } from './workspace-search';
import { pokedexSearchSkill } from './pokedex-search';
import { pokedexDetailSkill } from './pokedex-detail';
import { pokedexTypeEffectivenessSkill } from './pokedex-type-effectiveness';
import { pokedexEvolutionSkill } from './pokedex-evolution';
import { pokedexNlQuerySkill } from './pokedex-nl-query';

// ─── Register all skills ────────────────────────────────────────────────────

skillRegistry.register(askSocraticSkill);
skillRegistry.register(giveHintSkill);
skillRegistry.register(checkAnswerSkill);
skillRegistry.register(defineWordSkill);
skillRegistry.register(exploreGraphSkill);
skillRegistry.register(getChildStatsSkill);
skillRegistry.register(recommendActivitySkill);
skillRegistry.register(generateProblemSkill);
skillRegistry.register(celebrateSkill);
skillRegistry.register(drawImageSkill);
skillRegistry.register(journalWriteSkill);
skillRegistry.register(readWithMeSkill);
skillRegistry.register(showPassageSkill);
skillRegistry.register(workspaceCreatePageSkill);
skillRegistry.register(workspaceAddBlockSkill);
skillRegistry.register(workspaceUpdateBlockSkill);
skillRegistry.register(workspaceDeleteBlockSkill);
skillRegistry.register(workspaceGetPagesSkill);
skillRegistry.register(workspaceSearchSkill);
skillRegistry.register(pokedexSearchSkill);
skillRegistry.register(pokedexDetailSkill);
skillRegistry.register(pokedexTypeEffectivenessSkill);
skillRegistry.register(pokedexEvolutionSkill);
skillRegistry.register(pokedexNlQuerySkill);

// ─── Re-exports for convenience ─────────────────────────────────────────────

export { skillRegistry } from '../shared/skill-module';
export type {
  SkillModule,
  SkillCategory,
  ToolContext,
  ToolExecutionResult,
} from '../shared/skill-module';
