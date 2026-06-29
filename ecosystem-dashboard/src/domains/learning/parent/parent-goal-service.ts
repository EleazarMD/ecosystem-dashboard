/**
 * Parent Goal Service — maps parent-set learning goals to skill codes that
 * steer the planner's next-best-action.
 *
 * Phase 7 §6 of KIDS_DASHBOARD_HARNESS_AUDIT.md:
 *   "Goal-setting → planner — parent goals steer the planner's next-best-action
 *    (e.g. weight a skill/subject for N days)."
 *
 * Goals are in-process (matching the modular architecture pattern). Each goal
 * maps to one or more skill codes. The plan API reads active goals via
 * `getActiveGoalSkillCodes()` and injects them as `assignmentSkillCodes` in
 * `composePlan`, so parent-weighted skills lead the child's plan.
 */

import { getEventBus } from '../shared/event-bus';

export type GoalStatus = 'active' | 'completed' | 'expired' | 'cancelled';

export interface ParentGoal {
  id: string;
  childId: string;
  parentId: string;
  title: string;
  description?: string;
  /** Skill codes this goal weights (steers the planner toward these skills). */
  skillCodes: string[];
  /** Days the goal remains active from creation. */
  durationDays: number;
  status: GoalStatus;
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
}

export interface CreateGoalInput {
  childId: string;
  parentId: string;
  title: string;
  description?: string;
  skillCodes: string[];
  durationDays?: number;
}

class ParentGoalServiceImpl {
  private goals = new Map<string, ParentGoal>();
  private counter = 0;

  createGoal(input: CreateGoalInput): ParentGoal {
    const id = `pg-${++this.counter}`;
    const durationDays = input.durationDays ?? 7;
    const now = Date.now();
    const goal: ParentGoal = {
      id,
      childId: input.childId,
      parentId: input.parentId,
      title: input.title,
      description: input.description,
      skillCodes: input.skillCodes,
      durationDays,
      status: 'active',
      createdAt: now,
      expiresAt: now + durationDays * 24 * 60 * 60 * 1000,
    };

    this.goals.set(id, goal);

    getEventBus().emit('turn.complete', {
      childId: input.childId,
      toolsUsed: [],
      hopsExecuted: 0,
      latencyMs: 0,
      source: 'agent_loop',
      timestamp: now,
    });

    return goal;
  }

  /**
   * Get skill codes from all active, non-expired goals for a child.
   * These are injected as assignmentSkillCodes in the planner.
   */
  getActiveGoalSkillCodes(childId: string): string[] {
    const now = Date.now();
    const codes: string[] = [];
    const seen = new Set<string>();

    for (const goal of Array.from(this.goals.values())) {
      if (
        goal.childId === childId &&
        goal.status === 'active' &&
        goal.expiresAt > now
      ) {
        for (const code of goal.skillCodes) {
          if (!seen.has(code)) {
            seen.add(code);
            codes.push(code);
          }
        }
      }
    }

    return codes;
  }

  getActiveGoals(childId: string): ParentGoal[] {
    const now = Date.now();
    return Array.from(this.goals.values())
      .filter((g) => g.childId === childId && g.status === 'active' && g.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getAllGoals(childId: string): ParentGoal[] {
    return Array.from(this.goals.values())
      .filter((g) => g.childId === childId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  completeGoal(goalId: string): ParentGoal | undefined {
    const goal = this.goals.get(goalId);
    if (!goal) return undefined;
    goal.status = 'completed';
    goal.completedAt = Date.now();
    return goal;
  }

  cancelGoal(goalId: string): ParentGoal | undefined {
    const goal = this.goals.get(goalId);
    if (!goal) return undefined;
    goal.status = 'cancelled';
    return goal;
  }

  /** Clear all goals (for testing). */
  reset(): void {
    this.goals.clear();
    this.counter = 0;
  }
}

let _instance: ParentGoalServiceImpl | undefined;

export function getParentGoalService(): ParentGoalServiceImpl {
  if (!_instance) {
    _instance = new ParentGoalServiceImpl();
  }
  return _instance;
}

export function _resetParentGoalService(): void {
  if (_instance) {
    _instance.reset();
  }
  _instance = undefined;
}
