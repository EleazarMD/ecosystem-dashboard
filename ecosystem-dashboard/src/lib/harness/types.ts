export type HarnessAgentRole =
  | 'tutor'
  | 'planner'
  | 'evaluator'
  | 'safety'
  | 'memory'
  | 'orchestrator';

export type HarnessPriority = 'low' | 'normal' | 'high' | 'critical';

export type HarnessAgentStatus = 'success' | 'blocked' | 'failed' | 'fallback';

export type HarnessChannel = 'ai_gateway' | 'deterministic_fallback' | 'blocked';

export type HarnessSafetyResult = 'pass' | 'block' | 'warn';

export type HarnessEvaluationMethod = 'deterministic' | 'rubric' | 'ai_analysis' | 'none';

export interface HarnessAgentRequest {
  requestId?: string;
  domain: string;
  agentId: string;
  agentRole?: HarnessAgentRole;
  sessionId?: string;
  userId: string;
  goal?: string;
  payload: Record<string, unknown>;
  priority: HarnessPriority;
  metadata?: Record<string, unknown>;
}

export interface HarnessEvaluationResult {
  correct?: boolean;
  score?: number;
  feedback?: string;
  confidence?: number;
  method: HarnessEvaluationMethod;
}

export interface HarnessAuditEnvelope {
  auditId: string;
  agentId: string;
  model: string;
  contract: string;
  latencyMs: number;
  policyDecisions: string[];
  safetyInputResult: HarnessSafetyResult;
  safetyOutputResult: HarnessSafetyResult;
  timestamp: string;
}

export interface HarnessEvent {
  id: string;
  domain: string;
  type: string;
  userId: string;
  sessionId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  auditRef?: string;
}

export interface HarnessAgentResponse {
  requestId: string;
  status: HarnessAgentStatus;
  content: string | Record<string, unknown>;
  source: string;
  channel: HarnessChannel;
  model?: string;
  contract?: string;
  evaluation?: HarnessEvaluationResult;
  audit: HarnessAuditEnvelope;
}
