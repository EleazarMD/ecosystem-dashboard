import { randomUUID } from 'crypto';

import { harnessEventBus } from '../events/bus';
import { createHarnessEvent, type CreateHarnessEventInput, type HarnessEventType } from '../events/types';
import type {
  HarnessAgentRequest,
  HarnessAgentResponse,
  HarnessAuditEnvelope,
  HarnessChannel,
  HarnessEvaluationResult,
  HarnessSafetyResult,
} from '../types';

export interface BuildHarnessAuditEnvelopeInput {
  agentId: string;
  model: string;
  contract: string;
  startedAt: number;
  policyDecisions: string[];
  safetyInputResult: HarnessSafetyResult;
  safetyOutputResult: HarnessSafetyResult;
}

export interface HarnessPipelineEventInput {
  type: HarnessEventType | string;
  payload: Record<string, unknown>;
  domain?: string;
  userId?: string;
  sessionId?: string;
}

export interface RunHarnessPipelineInput {
  request: HarnessAgentRequest;
  startedAt: number;
  policyDecisions: string[];
  safetyInputResult: HarnessSafetyResult;
  safetyOutputResult: HarnessSafetyResult;
  status: HarnessAgentResponse['status'];
  content: HarnessAgentResponse['content'];
  source: string;
  model?: string;
  contract?: string;
  evaluation?: HarnessEvaluationResult;
  events?: HarnessPipelineEventInput[];
  eventWarnPrefix?: string;
}

export function resolveHarnessChannel(source: string): HarnessChannel {
  if (source === 'blocked') {
    return 'blocked';
  }

  if (source.includes('fallback') || source.includes('deterministic')) {
    return 'deterministic_fallback';
  }

  return 'ai_gateway';
}

export function buildHarnessAuditEnvelope(input: BuildHarnessAuditEnvelopeInput): HarnessAuditEnvelope {
  return {
    auditId: randomUUID(),
    agentId: input.agentId,
    model: input.model,
    contract: input.contract,
    latencyMs: Date.now() - input.startedAt,
    policyDecisions: input.policyDecisions,
    safetyInputResult: input.safetyInputResult,
    safetyOutputResult: input.safetyOutputResult,
    timestamp: new Date().toISOString(),
  };
}

export async function emitHarnessEventSafe(
  input: CreateHarnessEventInput,
  warnPrefix = '[harness-runtime] harness event emission failed:',
): Promise<void> {
  try {
    await harnessEventBus.emit(createHarnessEvent(input));
  } catch (error) {
    console.warn(warnPrefix, error);
  }
}

export async function runHarnessPipeline(input: RunHarnessPipelineInput): Promise<{
  audit: HarnessAuditEnvelope;
  response: HarnessAgentResponse;
}> {
  const audit = buildHarnessAuditEnvelope({
    agentId: input.request.agentId,
    model: input.model || 'unspecified',
    contract: input.contract || 'unspecified',
    startedAt: input.startedAt,
    policyDecisions: input.policyDecisions,
    safetyInputResult: input.safetyInputResult,
    safetyOutputResult: input.safetyOutputResult,
  });

  const response = buildHarnessAgentResponse({
    request: input.request,
    status: input.status,
    content: input.content,
    source: input.source,
    model: input.model,
    contract: input.contract,
    evaluation: input.evaluation,
    audit,
  });

  for (const event of input.events || []) {
    await emitHarnessEventSafe(
      {
        domain: event.domain || input.request.domain,
        type: event.type,
        userId: event.userId || input.request.userId,
        sessionId: event.sessionId === undefined ? input.request.sessionId : event.sessionId,
        payload: event.payload,
        auditRef: audit.auditId,
      },
      input.eventWarnPrefix,
    );
  }

  return {
    audit,
    response,
  };
}

export function buildHarnessAgentResponse(input: {
  request: HarnessAgentRequest;
  status: HarnessAgentResponse['status'];
  content: HarnessAgentResponse['content'];
  source: string;
  model?: string;
  contract?: string;
  evaluation?: HarnessEvaluationResult;
  audit: HarnessAuditEnvelope;
}): HarnessAgentResponse {
  return {
    requestId: input.request.requestId || randomUUID(),
    status: input.status,
    content: input.content,
    source: input.source,
    channel: resolveHarnessChannel(input.source),
    model: input.model,
    contract: input.contract,
    evaluation: input.evaluation,
    audit: input.audit,
  };
}

export function toApiHarnessMetadata(
  response: HarnessAgentResponse,
): Pick<HarnessAgentResponse, 'requestId' | 'status' | 'source' | 'channel' | 'audit'> {
  return {
    requestId: response.requestId,
    status: response.status,
    source: response.source,
    channel: response.channel,
    audit: response.audit,
  };
}
