import { buildAdaptationDirective } from '@/domains/learning/features/adaptation-directive';
import type { AdaptationPlan } from '@/domains/learning/learner/learner-types';

describe('buildAdaptationDirective', () => {
  const basePlan: AdaptationPlan = {
    pacing: 'medium',
    difficulty: 3,
    hintEscalationSpeed: 'normal',
    celebrationIntensity: 'normal',
    stretchChallengeProbability: 0,
    recommendedNextSkills: [],
  };

  it('includes the header line', () => {
    const lines = buildAdaptationDirective(basePlan);
    expect(lines[0]).toBe('Adaptation directives (follow these):');
  });

  it('emits slow pacing directive', () => {
    const lines = buildAdaptationDirective({ ...basePlan, pacing: 'slow' });
    expect(lines.some((l) => l.includes('PACING: Slow down'))).toBe(true);
  });

  it('emits fast pacing directive', () => {
    const lines = buildAdaptationDirective({ ...basePlan, pacing: 'fast' });
    expect(lines.some((l) => l.includes('PACING: Move briskly'))).toBe(true);
  });

  it('emits medium pacing directive', () => {
    const lines = buildAdaptationDirective({ ...basePlan, pacing: 'medium' });
    expect(lines.some((l) => l.includes('PACING: Steady pace'))).toBe(true);
  });

  it('emits high difficulty directive for level >= 4', () => {
    const lines = buildAdaptationDirective({ ...basePlan, difficulty: 5 });
    expect(lines.some((l) => l.includes('DIFFICULTY: Level 5/5') && l.includes('stretch questions'))).toBe(true);
  });

  it('emits low difficulty directive for level <= 2', () => {
    const lines = buildAdaptationDirective({ ...basePlan, difficulty: 1 });
    expect(lines.some((l) => l.includes('DIFFICULTY: Level 1/5') && l.includes('simple and foundational'))).toBe(true);
  });

  it('emits immediate hint directive for struggling learners', () => {
    const lines = buildAdaptationDirective({ ...basePlan, hintEscalationSpeed: 'immediate' });
    expect(lines.some((l) => l.includes('HINTS: Offer hints quickly'))).toBe(true);
  });

  it('emits delayed hint directive for high mastery learners', () => {
    const lines = buildAdaptationDirective({ ...basePlan, hintEscalationSpeed: 'delayed' });
    expect(lines.some((l) => l.includes('HINTS: Let the learner try independently'))).toBe(true);
  });

  it('emits subtle celebration directive for shy learners', () => {
    const lines = buildAdaptationDirective({ ...basePlan, celebrationIntensity: 'subtle' });
    expect(lines.some((l) => l.includes('CELEBRATION: Keep praise brief and calm'))).toBe(true);
  });

  it('emits exuberant celebration directive for energized learners', () => {
    const lines = buildAdaptationDirective({ ...basePlan, celebrationIntensity: 'exuberant' });
    expect(lines.some((l) => l.includes('CELEBRATION: Be enthusiastic'))).toBe(true);
  });

  it('emits stretch challenge directive when probability >= 0.3', () => {
    const lines = buildAdaptationDirective({ ...basePlan, stretchChallengeProbability: 0.4 });
    expect(lines.some((l) => l.includes('STRETCH: Offer a stretch challenge'))).toBe(true);
  });

  it('does not emit stretch challenge directive when probability < 0.3', () => {
    const lines = buildAdaptationDirective({ ...basePlan, stretchChallengeProbability: 0.15 });
    expect(lines.some((l) => l.includes('STRETCH'))).toBe(false);
  });

  it('emits recommended next skills when present', () => {
    const lines = buildAdaptationDirective({
      ...basePlan,
      recommendedNextSkills: ['math.add', 'math.sub'],
    });
    expect(lines.some((l) => l.includes('NEXT SKILLS') && l.includes('math.add, math.sub'))).toBe(true);
  });

  it('does not emit recommended next skills when empty', () => {
    const lines = buildAdaptationDirective({ ...basePlan, recommendedNextSkills: [] });
    expect(lines.some((l) => l.includes('NEXT SKILLS'))).toBe(false);
  });

  it('produces a complete directive set for a struggling learner', () => {
    const strugglingPlan: AdaptationPlan = {
      pacing: 'slow',
      difficulty: 1,
      hintEscalationSpeed: 'immediate',
      celebrationIntensity: 'subtle',
      stretchChallengeProbability: 0,
      recommendedNextSkills: [],
    };
    const lines = buildAdaptationDirective(strugglingPlan);
    expect(lines).toContain('Adaptation directives (follow these):');
    expect(lines.some((l) => l.includes('PACING: Slow down'))).toBe(true);
    expect(lines.some((l) => l.includes('DIFFICULTY: Level 1/5'))).toBe(true);
    expect(lines.some((l) => l.includes('HINTS: Offer hints quickly'))).toBe(true);
    expect(lines.some((l) => l.includes('CELEBRATION: Keep praise brief'))).toBe(true);
  });

  it('produces a complete directive set for an advanced learner', () => {
    const advancedPlan: AdaptationPlan = {
      pacing: 'fast',
      difficulty: 5,
      hintEscalationSpeed: 'delayed',
      celebrationIntensity: 'exuberant',
      stretchChallengeProbability: 0.4,
      recommendedNextSkills: ['math.mult', 'math.div'],
    };
    const lines = buildAdaptationDirective(advancedPlan);
    expect(lines.some((l) => l.includes('PACING: Move briskly'))).toBe(true);
    expect(lines.some((l) => l.includes('DIFFICULTY: Level 5/5'))).toBe(true);
    expect(lines.some((l) => l.includes('HINTS: Let the learner try independently'))).toBe(true);
    expect(lines.some((l) => l.includes('CELEBRATION: Be enthusiastic'))).toBe(true);
    expect(lines.some((l) => l.includes('STRETCH: Offer a stretch challenge'))).toBe(true);
    expect(lines.some((l) => l.includes('NEXT SKILLS') && l.includes('math.mult, math.div'))).toBe(true);
  });
});
