/**
 * Agent Orchestrator — top-level coordinator for agent turns.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §6
 *
 * Coordinates: persona resolution, learner profile, adaptation engine,
 * agent loop, recovery, introspection, and event emission.
 *
 * This is the stateful, self-recovering, introspective entry point that
 * replaces the raw runAgentLoop call with a richer orchestration layer.
 */

import { randomUUID } from 'crypto';
import { runAgentLoop } from '../features/agent-loop';
import type { AgentLoopInput, AgentLoopResult } from '../shared/agent-loop-types';
import type { ToolTrajectoryEntry } from '../shared/agent-loop-types';
import { getEventBus } from '../shared/event-bus';
import { BudgetManager } from './budget-manager';
import { runRecovery, type RecoveryLevel, type RecoveryResult } from './recovery-strategies';
import { getIntrospectionLog, autoAssess, type IntrospectionEntry } from './introspection-log';
import { nextTurnState, isTerminal, type TurnState } from './turn-state-machine';
import { getLearnerProfileService } from '../learner/learner-profile';
import { computeAdaptation } from '../learner/adaptation-engine';
import type { AdaptationPlan, LearnerProfile } from '../learner/learner-types';
import { resolvePersona, toPersonaRef } from '../personas';
import type { PersonaRef } from '../shared/agent-transport';

export interface OrchestratorTurnInput {
  childId: string;
  sessionId?: string;
  message: string;
  contentItemId: string;
  contentPrompt: string;
  skillCode: string;
  attemptNumber: number;
  hintSet: string[];
  sessionPhase?: string;
  correct?: boolean;
  activityId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: number; toolsUsed?: string[] }>;
  mastery?: {
    skillMastery?: Record<string, number>;
    currentSkill?: string;
    sessionCorrect?: number;
    sessionAttempts?: number;
    currentStreak?: number;
  };
  pcgContext?: {
    childName?: string;
    ageGroup?: string;
    interests?: string[];
    goals?: string[];
  } | null;
  safetySystemPrompt?: string;
  childName?: string;
  ageBand?: string;
}

export interface OrchestratorTurnResult {
  message: string;
  source: 'agent_loop' | 'fallback_deterministic' | 'recovery';
  toolsUsed: string[];
  hopsExecuted: number;
  budgetExhausted: boolean;
  recoveryLevel: RecoveryLevel;
  introspection: IntrospectionEntry;
  latencyMs: number;
  adaptationPlan?: AdaptationPlan;
  personaId?: string;
  personaName?: string;
}

export class AgentOrchestrator {
  async runTurn(input: OrchestratorTurnInput): Promise<OrchestratorTurnResult> {
    const turnId = randomUUID();
    const startedAt = Date.now();
    const budget = new BudgetManager({ maxHops: 3 });

    let state: TurnState = 'perceive';
    let result: AgentLoopResult | null = null;
    let recoveryLevel: RecoveryLevel = 0;
    let recoveryResult: RecoveryResult | null = null;
    let finalMessage = '';
    let source: OrchestratorTurnResult['source'] = 'agent_loop';

    // Perceive-phase outputs
    let adaptationPlan: AdaptationPlan | undefined;
    let personaRef: PersonaRef | undefined;
    let personaId: string | undefined;
    let personaName: string | undefined;

    // State machine loop
    while (!isTerminal(state)) {
      switch (state) {
        case 'perceive': {
          // Resolve learner profile, adaptation plan, and persona.
          const profileService = getLearnerProfileService();
          const displayName = input.childName || input.pcgContext?.childName || 'Learner';
          const ageBand = input.ageBand || input.pcgContext?.ageGroup || '6-8';
          const profile = profileService.getOrCreate(input.childId, displayName, ageBand, {
            interests: input.pcgContext?.interests,
            goals: input.pcgContext?.goals,
          });

          // Sync mastery from calculator if available
          profileService.syncMastery(input.childId);

          // Compute adaptation plan from profile + mastery + session phase
          adaptationPlan = computeAdaptation(
            profile,
            input.mastery as any,
            input.sessionPhase as any,
          );

          // Resolve persona using activity + skills + learner preference
          const activityId = input.activityId || 'learn-hub';
          const persona = resolvePersona({
            activityId,
            skillCodes: input.skillCode ? [input.skillCode] : [],
            learnerPreferredPersonaId: profile.preferredPersonaId,
          });
          personaRef = toPersonaRef(persona);
          personaId = persona.id;
          personaName = persona.name;

          state = nextTurnState({
            currentState: state,
            hopCount: 0,
            maxHops: budget.getStats().maxHops,
            hasFinalMessage: false,
            recoveryAttempts: 0,
          });
          break;
        }

        case 'reason': {
          // Run the agent loop (which handles its own internal hop loop)
          try {
            const agentInput: AgentLoopInput = {
              learnerMessage: input.message,
              contentPrompt: input.contentPrompt,
              contentItemId: input.contentItemId,
              skillCode: input.skillCode,
              attemptNumber: input.attemptNumber,
              hintSet: input.hintSet,
              roster: await getRoster(),
              context: buildMinimalContext(input),
              persona: personaRef,
              safetySystemPrompt: input.safetySystemPrompt,
              pcgContext: input.pcgContext,
              childUserId: input.childId,
              maxHops: budget.getStats().maxHops,
              conversationHistory: input.conversationHistory as any,
              mastery: input.mastery as any,
              sessionPhase: input.sessionPhase as any,
              adaptationPlan,
            };

            result = await runAgentLoop(agentInput);
            finalMessage = result.message;
            source = result.source === 'fallback_deterministic' ? 'fallback_deterministic' : 'agent_loop';

            if (result.source === 'fallback_deterministic') {
              recoveryLevel = 2;
            }

            state = 'done';
          } catch (err) {
            // Enter recovery
            state = 'recover';
            recoveryLevel = 2;
          }
          break;
        }

        case 'recover': {
          recoveryResult = runRecovery({
            level: recoveryLevel,
            contentPrompt: input.contentPrompt,
            attemptNumber: input.attemptNumber,
            hintSet: input.hintSet,
            childName: input.childName,
          });

          if (recoveryResult.recovered && recoveryResult.message) {
            finalMessage = recoveryResult.message;
            source = 'recovery';
            state = 'done';
          } else {
            recoveryLevel = (recoveryLevel + 1) as RecoveryLevel;
            if (recoveryLevel > 4) {
              state = 'failed';
            } else {
              recoveryResult = runRecovery({
                level: recoveryLevel,
                contentPrompt: input.contentPrompt,
                attemptNumber: input.attemptNumber,
                hintSet: input.hintSet,
                childName: input.childName,
              });
              if (recoveryResult.message) {
                finalMessage = recoveryResult.message;
                source = 'recovery';
                state = 'done';
              } else {
                state = 'failed';
              }
            }
          }
          break;
        }

        default:
          state = 'failed';
          break;
      }
    }

    const latencyMs = Date.now() - startedAt;

    // Introspection
    const assessment = autoAssess({
      message: finalMessage,
      source,
      hopsTaken: result?.hopsExecuted ?? 0,
      maxHops: budget.getStats().maxHops,
      toolsUsed: result?.toolsUsed ?? [],
      contentPrompt: input.contentPrompt,
    });

    const introspection: IntrospectionEntry = {
      turnId,
      childId: input.childId,
      timestamp: Date.now(),
      selfAssessment: assessment,
      toolsUsed: result?.toolsUsed ?? [],
      hopsTaken: result?.hopsExecuted ?? 0,
      budgetUsed: budget.fractionUsed(),
      learnerEngagement: 'medium', // TODO: infer from response time + follow-up
      source,
    };

    getIntrospectionLog().record(introspection);

    // Emit turn.complete event
    getEventBus().emit('turn.complete', {
      childId: input.childId,
      sessionId: input.sessionId,
      toolsUsed: result?.toolsUsed ?? [],
      hopsExecuted: result?.hopsExecuted ?? 0,
      latencyMs,
      source,
      timestamp: Date.now(),
    });

    return {
      message: finalMessage,
      source,
      toolsUsed: result?.toolsUsed ?? [],
      hopsExecuted: result?.hopsExecuted ?? 0,
      budgetExhausted: result?.budgetExhausted ?? false,
      recoveryLevel,
      introspection,
      latencyMs,
      adaptationPlan,
      personaId,
      personaName,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getRoster(): Promise<AgentLoopInput['roster']> {
  // Lazy import to avoid circular dependency
  const { LEARNING_DOMAIN_ROSTER } = await import('../features/agent-loop');
  return LEARNING_DOMAIN_ROSTER;
}

function buildMinimalContext(input: OrchestratorTurnInput): AgentLoopInput['context'] {
  return {
    focus: {
      kind: 'lesson',
      activityId: input.activityId || 'learn-hub',
      title: input.contentPrompt.slice(0, 80),
      summary: input.message,
    },
    safety: {
      contentFilter: 'strict',
      user_type: 'child',
    },
    assembledAt: new Date().toISOString(),
  };
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _orchestrator: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!_orchestrator) {
    _orchestrator = new AgentOrchestrator();
  }
  return _orchestrator;
}
