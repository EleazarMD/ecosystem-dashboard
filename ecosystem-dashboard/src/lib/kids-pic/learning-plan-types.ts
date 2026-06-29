export type LearnPlanActivityKind = 'review' | 'practice';

export type LearnPlanSource =
  | 'kids_pcg_next_objectives'
  | 'skill_progress_plus_catalog'
  | 'catalog_fallback'
  | 'learning_path';

export interface LearnPlanObjective {
  skillCode: string;
  skillName?: string;
  kind?: LearnPlanActivityKind;
  isAssignment?: boolean;
}

export interface LearnPlanActivity {
  type: string;
  kind?: LearnPlanActivityKind;
  skillCode: string;
  contentItemId: string;
  title: string;
  prompt: string;
  difficulty: number;
  isAssignment?: boolean;
  /** Analytical thinking tags from the content item (e.g. infer_evidence). */
  analyticalTags?: string[];
  /** Progressive hints from the content item (for scaffolding). */
  hintSet?: string[];
  /** Content item type: 'problem', 'question', 'writing', or 'reasoning'. */
  contentType?: 'problem' | 'question' | 'writing' | 'reasoning';
  /** Rubric criteria for writing/reasoning items. */
  rubricCriteria?: string[];
  /** When this activity comes from a learning path step, the path id. */
  pathId?: string;
  /** When this activity comes from a learning path step, the step number (1-based). */
  pathStepNumber?: number;
  /** Path emoji for UI rendering. */
  pathEmoji?: string;
}

export interface LearnPlanSpacedReview {
  /** Total skills eligible for spaced review. */
  eligibleCount: number;
  /** Skills currently overdue for review. */
  overdueCount: number;
  /** The next skill due for review (if any). */
  nextReview?: {
    skillCode: string;
    skillName: string;
    daysUntilReview: number;
    isOverdue: boolean;
  };
}

export interface LearnPlanResponse {
  childId: string;
  childName?: string;
  objectives?: LearnPlanObjective[];
  activities: LearnPlanActivity[];
  source?: LearnPlanSource;
  assignmentsApplied?: boolean;
  /** Spaced-review schedule summary for the warm-up slot. */
  spacedReview?: LearnPlanSpacedReview;
}
