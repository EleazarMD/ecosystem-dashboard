/**
 * Turn State Machine — per-turn lifecycle for the agent orchestrator.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §6
 *
 * States: perceive → reason → plan → act → observe → reflect → (loop or done)
 * Recovery states: recover (from any state on error)
 */

export type TurnState =
  | 'perceive'
  | 'reason'
  | 'plan'
  | 'act'
  | 'observe'
  | 'reflect'
  | 'recover'
  | 'done'
  | 'failed';

export interface TurnStateContext {
  currentState: TurnState;
  hopCount: number;
  maxHops: number;
  hasFinalMessage: boolean;
  lastError?: string;
  recoveryAttempts: number;
}

export function nextTurnState(ctx: TurnStateContext): TurnState {
  switch (ctx.currentState) {
    case 'perceive':
      return 'reason';

    case 'reason':
      return 'plan';

    case 'plan':
      return 'act';

    case 'act':
      return 'observe';

    case 'observe':
      return 'reflect';

    case 'reflect':
      if (ctx.hasFinalMessage) return 'done';
      if (ctx.hopCount >= ctx.maxHops) return 'done';
      return 'reason'; // loop for another hop

    case 'recover':
      if (ctx.recoveryAttempts >= 3) return 'failed';
      if (ctx.hasFinalMessage) return 'done';
      return 'reason'; // retry reasoning after recovery

    case 'done':
    case 'failed':
      return ctx.currentState; // terminal

    default:
      return 'failed';
  }
}

export function isTerminal(state: TurnState): boolean {
  return state === 'done' || state === 'failed';
}
