/**
 * Goal Scorecard Service — Phase 10.
 *
 * Maintains an explicit per-child goal scorecard with age-based targets
 * that the planner is graded against. Goals are derived from the child's
 * age band and cover key learning domains.
 *
 * The scorecard is surfaced to parents so they can see whether the planner
 * is on track to meet age-appropriate outcomes.
 *
 * Contract: docs/LEARNING_PLATFORM_ROADMAP.md Phase 10
 */

import { getEventBus } from '../shared/event-bus';

export interface GoalMetric {
  id: string;
  label: string;
  description: string;
  target: number;       // e.g. 0.7 for 70% mastery
  current: number;      // 0-1 progress toward target
  unit: 'mastery' | 'count' | 'streak' | 'minutes';
  skillCodes?: string[]; // which skills this goal tracks
  status: 'on-track' | 'behind' | 'ahead' | 'not-started';
}

export interface GoalScorecard {
  childId: string;
  ageBand: string;
  goals: GoalMetric[];
  overallProgress: number;  // 0-1 average across goals
  updatedAt: number;
}

interface AgeBandGoals {
  ageBand: string;
  goals: Array<{
    id: string;
    label: string;
    description: string;
    target: number;
    unit: GoalMetric['unit'];
    skillCodes?: string[];
  }>;
}

// ─── Age-based goal templates ───────────────────────────────────────────────

const AGE_BAND_GOALS: AgeBandGoals[] = [
  {
    ageBand: 'early',
    goals: [
      {
        id: 'math-counting',
        label: 'Counting & Numbers',
        description: 'Recognize numbers and count to 20',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['math.counting'],
      },
      {
        id: 'reading-letters',
        label: 'Letter Recognition',
        description: 'Know all letters and their sounds',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['reading.phonics'],
      },
      {
        id: 'analytical-sort',
        label: 'Sorting & Matching',
        description: 'Sort objects by color, shape, and size',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['analytical.compare_classify'],
      },
      {
        id: 'engagement-daily',
        label: 'Daily Practice',
        description: 'Complete at least 1 learning activity per day',
        target: 5,
        unit: 'streak',
      },
    ],
  },
  {
    ageBand: 'middle',
    goals: [
      {
        id: 'math-arithmetic',
        label: 'Arithmetic Foundations',
        description: 'Add and subtract within 20 with confidence',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['math.arithmetic'],
      },
      {
        id: 'reading-comprehension',
        label: 'Reading Comprehension',
        description: 'Understand literal and inferential questions about stories',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['reading.comp.literal', 'reading.comp.inferential'],
      },
      {
        id: 'analytical-patterns',
        label: 'Pattern Recognition',
        description: 'Identify and extend patterns in data',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['analytical.patterns', 'analytical.compare_classify'],
      },
      {
        id: 'writing-sentences',
        label: 'Sentence Writing',
        description: 'Write complete sentences with correct capitalization',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['writing.grammar', 'writing.creativity'],
      },
      {
        id: 'engagement-weekly',
        label: 'Weekly Consistency',
        description: 'Complete at least 3 learning sessions per week',
        target: 3,
        unit: 'count',
      },
    ],
  },
  {
    ageBand: 'tween',
    goals: [
      {
        id: 'math-fractions',
        label: 'Fractions & Decimals',
        description: 'Understand fractions and decimal operations',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['math.fractions', 'math.decimals'],
      },
      {
        id: 'reading-analysis',
        label: 'Literary Analysis',
        description: 'Analyze themes, character motives, and plot structure',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['reading.comp.inferential', 'reading.comp.thematic'],
      },
      {
        id: 'analytical-evidence',
        label: 'Evidence-Based Reasoning',
        description: 'Support claims with evidence from text or data',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['analytical.infer_evidence', 'analytical.evaluate'],
      },
      {
        id: 'writing-paragraphs',
        label: 'Paragraph Writing',
        description: 'Write organized paragraphs with topic sentences',
        target: 0.7,
        unit: 'mastery',
        skillCodes: ['writing.grammar', 'writing.creativity'],
      },
      {
        id: 'engagement-streak',
        label: 'Learning Streak',
        description: 'Maintain a 7-day learning streak',
        target: 7,
        unit: 'streak',
      },
    ],
  },
];

class GoalScorecardServiceImpl {
  private scorecards = new Map<string, GoalScorecard>();

  /**
   * Get or create a scorecard for a child.
   * @param childId    The child's user ID
   * @param ageBand    'early' | 'middle' | 'tween'
   * @param mastery    Current mastery scores by skill code
   * @param streak     Current day streak
   * @param sessionsThisWeek  Sessions completed this week
   */
  getOrCreate(
    childId: string,
    ageBand: string,
    mastery?: Record<string, number>,
    streak?: number,
    sessionsThisWeek?: number,
  ): GoalScorecard {
    const template = AGE_BAND_GOALS.find((g) => g.ageBand === ageBand)
      || AGE_BAND_GOALS[1]; // default to middle

    const existing = this.scorecards.get(childId);
    if (existing && existing.ageBand === ageBand) {
      // Update with latest data
      return this.updateProgress(childId, mastery, streak, sessionsThisWeek);
    }

    // Create fresh scorecard
    const goals: GoalMetric[] = template.goals.map((g) => {
      let current = 0;
      if (g.unit === 'mastery' && mastery && g.skillCodes) {
        const scores = g.skillCodes
          .map((sc) => mastery[sc])
          .filter((v) => v !== undefined);
        current = scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;
      } else if (g.unit === 'streak') {
        current = streak ?? 0;
      } else if (g.unit === 'count') {
        current = sessionsThisWeek ?? 0;
      }

      return {
        ...g,
        current,
        status: this.computeStatus(current, g.target, g.unit),
      };
    });

    const overallProgress = goals.length > 0
      ? goals.reduce((sum, g) => {
        const ratio = g.unit === 'mastery'
          ? g.current / g.target
          : Math.min(1, g.current / g.target);
        return sum + Math.min(1, ratio);
      }, 0) / goals.length
      : 0;

    const scorecard: GoalScorecard = {
      childId,
      ageBand,
      goals,
      overallProgress,
      updatedAt: Date.now(),
    };

    this.scorecards.set(childId, scorecard);
    return scorecard;
  }

  /** Update progress with latest mastery/streak/session data. */
  updateProgress(
    childId: string,
    mastery?: Record<string, number>,
    streak?: number,
    sessionsThisWeek?: number,
  ): GoalScorecard {
    const existing = this.scorecards.get(childId);
    if (!existing) {
      // Need ageBand to create — caller should use getOrCreate first
      return existing as unknown as GoalScorecard;
    }

    const goals = existing.goals.map((g) => {
      let current = g.current;
      if (g.unit === 'mastery' && mastery && g.skillCodes) {
        const scores = g.skillCodes
          .map((sc) => mastery[sc])
          .filter((v) => v !== undefined);
        if (scores.length > 0) {
          current = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      } else if (g.unit === 'streak' && streak !== undefined) {
        current = streak;
      } else if (g.unit === 'count' && sessionsThisWeek !== undefined) {
        current = sessionsThisWeek;
      }

      return {
        ...g,
        current,
        status: this.computeStatus(current, g.target, g.unit),
      };
    });

    const overallProgress = goals.length > 0
      ? goals.reduce((sum, g) => {
        const ratio = g.unit === 'mastery'
          ? g.current / g.target
          : Math.min(1, g.current / g.target);
        return sum + Math.min(1, ratio);
      }, 0) / goals.length
      : 0;

    const updated: GoalScorecard = {
      ...existing,
      goals,
      overallProgress,
      updatedAt: Date.now(),
    };

    this.scorecards.set(childId, updated);
    return updated;
  }

  get(childId: string): GoalScorecard | undefined {
    return this.scorecards.get(childId);
  }

  private computeStatus(
    current: number,
    target: number,
    unit: GoalMetric['unit'],
  ): GoalMetric['status'] {
    if (current <= 0) return 'not-started';
    const ratio = current / target;
    if (ratio >= 1) return 'ahead';
    if (ratio >= 0.6) return 'on-track';
    return 'behind';
  }

  reset(): void {
    this.scorecards.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: GoalScorecardServiceImpl | null = null;

export function getGoalScorecardService(): GoalScorecardServiceImpl {
  if (!_instance) {
    _instance = new GoalScorecardServiceImpl();
  }
  return _instance;
}

export function _resetGoalScorecardService(): void {
  _instance?.reset();
  _instance = null;
}
