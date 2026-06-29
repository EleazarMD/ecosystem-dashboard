/**
 * Analytics barrel — exports all analytics types and services.
 */

export type {
  LearningSnapshot,
  AnalyticsPeriod,
  LearningPattern,
  PatternType,
  DreamInsight,
} from './analytics-types';
export { createSnapshot } from './analytics-types';
export { getAnalyticsCollector, _resetAnalyticsCollector } from './analytics-collector';
export { getPatternDetector, _resetPatternDetector } from './pattern-detector';
export { getDreamEngine, _resetDreamEngine } from './dream-engine';
