/**
 * Path generation feature — adaptive path generation, preset templates,
 * and parent-assigned path creation.
 *
 * Re-exports the service singleton and generation logic from
 * LearningPathService.ts, plus adds age-based preset templates.
 */
export {
  LearningPathService,
  getLearningPathService,
} from '@/lib/learning/LearningPathService';

export {
  generatePresetPath,
  getPresetTemplatesForAge,
  PRESET_PATH_TEMPLATES,
} from '@/domains/learning/shared/path-templates';
