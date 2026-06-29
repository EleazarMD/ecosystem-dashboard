/**
 * Recovery Strategies — graceful degradation chain for the agent.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §6
 *
 * Chain:
 * 1. AI Gateway available → use agent loop (normal path)
 * 2. AI Gateway timeout → retry once with shorter prompt
 * 3. AI Gateway down → deterministic fallback (hint-based coaching)
 * 4. Deterministic fails → static encouragement message
 * 5. Everything fails → "I'm having trouble right now."
 */

import { buildDeterministicTutorMessage } from '../features/tutor-turn';

export type RecoveryLevel = 0 | 1 | 2 | 3 | 4;

export interface RecoveryContext {
  level: RecoveryLevel;
  error?: string;
  contentPrompt: string;
  attemptNumber: number;
  hintSet: string[];
  childName?: string;
}

export interface RecoveryResult {
  message: string;
  source: 'agent_loop' | 'retry' | 'deterministic' | 'static' | 'emergency';
  recovered: boolean;
}

export function runRecovery(ctx: RecoveryContext): RecoveryResult {
  switch (ctx.level) {
    case 0:
      // Normal path — should not reach here unless called incorrectly
      return {
        message: '',
        source: 'agent_loop',
        recovered: false,
      };

    case 1:
      // Retry with shorter prompt — caller should retry the AI call
      return {
        message: '',
        source: 'retry',
        recovered: false,
      };

    case 2:
      // Deterministic fallback
      try {
        const hintLevel = ctx.hintSet.length > 0
          ? Math.min(ctx.attemptNumber - 1, ctx.hintSet.length - 1)
          : undefined;
        const hint = hintLevel !== undefined ? ctx.hintSet[hintLevel] : undefined;
        const message = buildDeterministicTutorMessage({
          prompt: ctx.contentPrompt,
          attemptNumber: ctx.attemptNumber,
          hint,
          hintLevel,
          hintsAvailable: ctx.hintSet.length,
        });
        return { message, source: 'deterministic', recovered: true };
      } catch {
        // Fall through to static
      }
      return runRecovery({ ...ctx, level: 3 });

    case 3:
      // Static encouragement
      return {
        message: `Good effort${ctx.childName ? ', ' + ctx.childName : ''}! Let us try again. Take your time and think step by step.`,
        source: 'static',
        recovered: true,
      };

    case 4:
    default:
      // Emergency fallback
      return {
        message: 'I am having trouble right now. Try again in a moment!',
        source: 'emergency',
        recovered: false,
      };
  }
}
