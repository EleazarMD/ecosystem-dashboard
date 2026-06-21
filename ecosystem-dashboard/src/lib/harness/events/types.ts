import { randomUUID } from 'crypto';

import type { HarnessEvent } from '../types';

export const HARNESS_EVENT_TYPES = {
  SESSION_STARTED: 'session_started',
  SESSION_COMPLETED: 'session_completed',
  INCIDENT_RAISED: 'incident_raised',
  POLICY_BLOCKED: 'policy_blocked',
  AGENT_FALLBACK: 'agent_fallback',
  ATTEMPT_SUBMITTED: 'attempt_submitted',
  MASTERY_UPDATED: 'mastery_updated',
  PLAN_GENERATED: 'plan_generated',
  MISCONCEPTION_DETECTED: 'misconception_detected',
} as const;

export type HarnessEventType = (typeof HARNESS_EVENT_TYPES)[keyof typeof HARNESS_EVENT_TYPES];

export interface CreateHarnessEventInput {
  domain: string;
  type: HarnessEventType | string;
  userId: string;
  sessionId?: string;
  payload: Record<string, unknown>;
  auditRef?: string;
}

export function createHarnessEvent(input: CreateHarnessEventInput): HarnessEvent {
  return {
    id: randomUUID(),
    domain: input.domain,
    type: input.type,
    userId: input.userId,
    sessionId: input.sessionId,
    payload: input.payload,
    timestamp: new Date().toISOString(),
    auditRef: input.auditRef,
  };
}
