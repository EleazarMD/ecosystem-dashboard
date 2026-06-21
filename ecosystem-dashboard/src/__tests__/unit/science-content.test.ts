/**
 * Unit tests for Phase 5 science content items
 */

import { PHASE1_STARTER_CONTENT } from '@/lib/kids-pic/phase1-starter-content';
import { PHASE0_DOMAINS, PHASE0_SKILLS, PHASE0_CHILDREN } from '@/lib/kids-pic/phase0-seed-data';

describe('Phase 5: Science content items', () => {
  const scienceItems = PHASE1_STARTER_CONTENT.filter((i) => i.subject === 'science');

  it('has at least 6 science content items', () => {
    expect(scienceItems.length).toBeGreaterThanOrEqual(6);
  });

  it('covers all three age bands', () => {
    const bands = new Set(scienceItems.map((i) => i.ageBand));
    expect(bands.has('early')).toBe(true);
    expect(bands.has('middle')).toBe(true);
    expect(bands.has('tween')).toBe(true);
  });

  it('has unique IDs', () => {
    const ids = scienceItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all science items are approved and safety-passed', () => {
    for (const item of scienceItems) {
      expect(item.reviewStatus).toBe('approved');
      expect(item.safetyStatus).toBe('passed');
    }
  });

  it('all science items have science.* skill codes', () => {
    for (const item of scienceItems) {
      expect(item.skillCode.startsWith('science.')).toBe(true);
    }
  });

  it('includes a reasoning-type item (ecosystems)', () => {
    const reasoning = scienceItems.find((i) => i.type === 'reasoning');
    expect(reasoning).toBeDefined();
    expect(reasoning?.expectedReasoning).toBeDefined();
    expect(reasoning!.expectedReasoning!.length).toBeGreaterThan(0);
  });

  it('deterministic items have answer keys', () => {
    const deterministic = scienceItems.filter((i) => i.type !== 'reasoning');
    for (const item of deterministic) {
      expect(item.answerKey).toBeDefined();
    }
  });

  it('all items have at least 2 hints', () => {
    for (const item of scienceItems) {
      expect(item.hintSet.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Phase 5: Science seed data', () => {
  it('includes science as a domain', () => {
    const scienceDomain = PHASE0_DOMAINS.find((d) => d.code === 'science');
    expect(scienceDomain).toBeDefined();
    expect(scienceDomain!.name).toBe('Science');
    expect(scienceDomain!.icon).toBe('🔬');
  });

  it('includes science skills with prerequisites', () => {
    const scienceSkills = PHASE0_SKILLS.filter((s) => s.subject === 'science');
    expect(scienceSkills.length).toBeGreaterThanOrEqual(6);

    const ecosystems = scienceSkills.find((s) => s.skillId === 'science.life.ecosystems');
    expect(ecosystems).toBeDefined();
    expect(ecosystems!.prerequisites).toContain('science.life.plant_parts');
    expect(ecosystems!.assessmentType).toBe('ai_analysis');
  });

  it('Luca has science readiness skills', () => {
    const luca = PHASE0_CHILDREN.find((c) => c.key === 'luca');
    expect(luca).toBeDefined();
    expect(luca!.readinessSkillsBySubject.science).toBeDefined();
    expect(luca!.readinessSkillsBySubject.science!.length).toBeGreaterThan(0);
    expect(luca!.stretchSkillsBySubject.science).toBeDefined();
  });

  it('Sofia has science readiness skills', () => {
    const sofia = PHASE0_CHILDREN.find((c) => c.key === 'sofia');
    expect(sofia).toBeDefined();
    expect(sofia!.readinessSkillsBySubject.science).toBeDefined();
    expect(sofia!.readinessSkillsBySubject.science!.length).toBeGreaterThan(0);
  });
});
