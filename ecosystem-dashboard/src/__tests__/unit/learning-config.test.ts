import {
  getAgeBandSessionConfig,
  getDefaultDailyLimitMinutes,
  EXTERNAL_TUTORING_APIS_ALLOWED,
  CHILD_AI_GATEWAY_PATH,
  DEFAULT_CURRICULUM_FRAMEWORK,
  CURRICULUM_FRAMEWORKS,
  CURRICULUM_ENABLED_BY_DEFAULT,
} from '@/domains/learning/shared/learning-config';

describe('getAgeBandSessionConfig', () => {
  it('returns early config for "early" band', () => {
    const config = getAgeBandSessionConfig('early');
    expect(config.defaultSessionMinutes).toBe(15);
    expect(config.dailyLearningTargetMinutes).toBe(30);
    expect(config.defaultDailyLimitMinutes).toBe(45);
    expect(config.breakMinutes).toBe(10);
    expect(config.maxActivitiesPerSession).toBe(3);
  });

  it('returns middle config for "middle" band', () => {
    const config = getAgeBandSessionConfig('middle');
    expect(config.defaultSessionMinutes).toBe(20);
    expect(config.dailyLearningTargetMinutes).toBe(45);
    expect(config.defaultDailyLimitMinutes).toBe(60);
    expect(config.breakMinutes).toBe(5);
    expect(config.maxActivitiesPerSession).toBe(4);
  });

  it('returns tween config for "tween" band', () => {
    const config = getAgeBandSessionConfig('tween');
    expect(config.defaultSessionMinutes).toBe(25);
    expect(config.dailyLearningTargetMinutes).toBe(60);
    expect(config.defaultDailyLimitMinutes).toBe(90);
    expect(config.breakMinutes).toBe(5);
    expect(config.maxActivitiesPerSession).toBe(5);
  });

  it('falls back to middle for unknown band', () => {
    const config = getAgeBandSessionConfig('unknown');
    expect(config.defaultSessionMinutes).toBe(20);
  });

  it('falls back to middle for undefined', () => {
    const config = getAgeBandSessionConfig(undefined);
    expect(config.defaultSessionMinutes).toBe(20);
  });
});

describe('getDefaultDailyLimitMinutes', () => {
  it('returns 45 for early', () => {
    expect(getDefaultDailyLimitMinutes('early')).toBe(45);
  });

  it('returns 60 for middle', () => {
    expect(getDefaultDailyLimitMinutes('middle')).toBe(60);
  });

  it('returns 90 for tween', () => {
    expect(getDefaultDailyLimitMinutes('tween')).toBe(90);
  });

  it('returns 60 (middle fallback) for unknown', () => {
    expect(getDefaultDailyLimitMinutes('unknown')).toBe(60);
  });
});

describe('O6: External tutoring API policy', () => {
  it('disallows external tutoring APIs', () => {
    expect(EXTERNAL_TUTORING_APIS_ALLOWED).toBe(false);
  });

  it('uses the child AI gateway path', () => {
    expect(CHILD_AI_GATEWAY_PATH).toBe('/api/v1/chat/completions');
  });
});

describe('O7: Curriculum priority', () => {
  it('defaults to TEKS', () => {
    expect(DEFAULT_CURRICULUM_FRAMEWORK).toBe('TEKS');
  });

  it('lists TEKS first in available frameworks', () => {
    expect(CURRICULUM_FRAMEWORKS[0]).toBe('TEKS');
    expect(CURRICULUM_FRAMEWORKS).toContain('CCSS');
    expect(CURRICULUM_FRAMEWORKS).toContain('UK_NC');
  });

  it('keeps curriculum disabled by default', () => {
    expect(CURRICULUM_ENABLED_BY_DEFAULT).toBe(false);
  });
});
