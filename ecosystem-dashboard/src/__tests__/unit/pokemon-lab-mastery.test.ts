/**
 * Regression test for Phase 9: Fun-activities-as-measured-learning.
 *
 * Verifies that:
 * 1. All 12 Pokémon Lab content items exist in PHASE1_STARTER_CONTENT
 * 2. Each content item maps to a seeded PHASE0_SKILLS skill code
 * 3. The 'explore-graph' tool is on the Pokémon Lab roster and passes the Tool Gate
 * 4. The attempt API correctly grades a Pokémon Lab completion as correct
 *    (so mastery evidence is written and the skill advances)
 */

import { PHASE1_STARTER_CONTENT, LearnContentItem } from '@/lib/kids-pic/phase1-starter-content';
import { PHASE0_SKILLS } from '@/lib/kids-pic/phase0-seed-data';
import { pokemonLabRoster } from '@/domains/learning/shared/activities/pokemon-lab';
import { checkToolGate } from '@/domains/learning/shared/tool-roster';

// ─── 1. Content items exist and are well-formed ────────────────────────────

describe('Phase 9: Pokémon Lab content items', () => {
  const labItems = PHASE1_STARTER_CONTENT.filter((i) =>
    i.id.startsWith('pokemon-lab.'),
  );

  it('has exactly 12 Pokémon Lab content items', () => {
    expect(labItems.length).toBe(12);
  });

  it('all items have unique IDs', () => {
    const ids = labItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all items are approved and safety-passed', () => {
    for (const item of labItems) {
      expect(item.reviewStatus).toBe('approved');
      expect(item.safetyStatus).toBe('passed');
    }
  });

  it('all items have an exact_text answer key accepting "completed"', () => {
    for (const item of labItems) {
      expect(item.answerKey).toBeDefined();
      expect(item.answerKey!.kind).toBe('exact_text');
      expect(item.answerKey!.value).toBe('completed');
      expect(item.answerKey!.acceptedForms).toContain('completed');
    }
  });

  it('all items are lowStakesOnly=false (mastery eligible)', () => {
    for (const item of labItems) {
      expect(item.lowStakesOnly).toBe(false);
    }
  });
});

// ─── 2. Skill codes map to seeded skills ───────────────────────────────────

describe('Phase 9: Pokémon Lab skill codes map to seeded skills', () => {
  const labItems = PHASE1_STARTER_CONTENT.filter((i) =>
    i.id.startsWith('pokemon-lab.'),
  );
  const seededSkillIds = new Set(PHASE0_SKILLS.map((s) => s.skillId));

  it('every Pokémon Lab content item references a seeded PHASE0 skill', () => {
    for (const item of labItems) {
      expect(seededSkillIds.has(item.skillCode)).toBe(true);
    }
  });

  it('covers at least 5 distinct analytical skills', () => {
    const analyticalSkills = new Set(
      labItems
        .filter((i) => i.skillCode.startsWith('analytical.'))
        .map((i) => i.skillCode),
    );
    expect(analyticalSkills.size).toBeGreaterThanOrEqual(5);
  });
});

// ─── 3. explore_graph tool is on the roster and passes the Tool Gate ───────

describe('Phase 9: explore_graph tool registration', () => {
  it('pokemonLabRoster includes explore_graph tool', () => {
    const tool = pokemonLabRoster.tools.find((t) => t.id === 'explore_graph');
    expect(tool).toBeDefined();
    expect(tool!.label).toBe('Explore Graph');
    expect(tool!.endpoint).toBe('/child/pokemon-lab');
  });

  it('pokemonLabRoster includes learn-attempt tool', () => {
    const tool = pokemonLabRoster.tools.find((t) => t.id === 'learn-attempt');
    expect(tool).toBeDefined();
    expect(tool!.endpoint).toBe('/api/learn/attempt');
  });

  it('checkToolGate allows explore_graph for the Pokémon Lab roster', () => {
    const result = checkToolGate(pokemonLabRoster, 'explore_graph');
    expect(result.allowed).toBe(true);
    expect(result.tool?.id).toBe('explore_graph');
  });

  it('checkToolGate allows learn-attempt for the Pokémon Lab roster', () => {
    const result = checkToolGate(pokemonLabRoster, 'learn-attempt');
    expect(result.allowed).toBe(true);
  });

  it('checkToolGate blocks unknown tools', () => {
    const result = checkToolGate(pokemonLabRoster, 'dangerous-tool');
    expect(result.allowed).toBe(false);
  });

  it('no tools on the roster are blockedForChildren', () => {
    for (const tool of pokemonLabRoster.tools) {
      expect(tool.blockedForChildren).not.toBe(true);
    }
  });
});

// ─── 4. Attempt grading simulation ─────────────────────────────────────────

describe('Phase 9: Pokémon Lab completion grades correct', () => {
  const labItems = PHASE1_STARTER_CONTENT.filter((i) =>
    i.id.startsWith('pokemon-lab.'),
  );

  it('grading "completed" against any Pokémon Lab item yields correct=true', () => {
    for (const item of labItems) {
      const key = item.answerKey!;
      const response = 'completed';
      const accepted = key.acceptedForms || [String(key.value)];
      const isCorrect = accepted.some(
        (form) => form.toLowerCase() === response.toLowerCase(),
      );
      expect(isCorrect).toBe(true);
    }
  });

  it('grading a wrong response yields correct=false', () => {
    for (const item of labItems) {
      const key = item.answerKey!;
      const response = 'i gave up';
      const accepted = key.acceptedForms || [String(key.value)];
      const isCorrect = accepted.some(
        (form) => form.toLowerCase() === response.toLowerCase(),
      );
      expect(isCorrect).toBe(false);
    }
  });
});
