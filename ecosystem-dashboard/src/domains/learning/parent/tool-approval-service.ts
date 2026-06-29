/**
 * Tool Approval Service — in-process JIT approval for sensitive agent tools.
 *
 * When the agent loop selects a tool flagged `requiresApproval`, the Tool Gate
 * defers to this service before executing. The service:
 *   1. Creates a pending approval request (visible to the parent UI).
 *   2. Returns "pending" so the agent can inform the child.
 *   3. Once the parent approves (via API), subsequent turns pass the gate.
 *
 * This is the "approval-service deferral" wire from Phase 7 §5 of the
 * KIDS_DASHBOARD_HARNESS_AUDIT.md roadmap.
 */

import { getEventBus } from '../shared/event-bus';

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ToolApprovalRequest {
  id: string;
  childId: string;
  toolId: string;
  /** Human-readable summary of what the agent wants to do. */
  summary: string;
  /** The agent's reasoning for selecting this tool. */
  agentReasoning?: string;
  status: ApprovalStatus;
  createdAt: number;
  decidedAt?: number;
  decidedBy?: string;
  /** TTL in ms; expired requests are treated as denied. */
  expiresAt: number;
}

export interface ToolApprovalDecision {
  requestId: string;
  status: 'approved' | 'denied';
  decidedBy: string;
}

class ToolApprovalServiceImpl {
  private requests = new Map<string, ToolApprovalRequest>();
  private counter = 0;

  /**
   * Create a pending approval request for a sensitive tool.
   * If an identical pending request already exists for this child+tool, return it
   * instead of creating a duplicate.
   */
  requestApproval(input: {
    childId: string;
    toolId: string;
    summary: string;
    agentReasoning?: string;
    ttlMs?: number;
  }): ToolApprovalRequest {
    // Check for existing pending request for the same child+tool
    for (const req of Array.from(this.requests.values())) {
      if (
        req.childId === input.childId &&
        req.toolId === input.toolId &&
        req.status === 'pending' &&
        req.expiresAt > Date.now()
      ) {
        return req;
      }
    }

    const id = `ta-${++this.counter}`;
    const ttlMs = input.ttlMs ?? 5 * 60 * 1000; // 5 min default
    const req: ToolApprovalRequest = {
      id,
      childId: input.childId,
      toolId: input.toolId,
      summary: input.summary,
      agentReasoning: input.agentReasoning,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.requests.set(id, req);

    getEventBus().emit('tool.approval.requested', {
      requestId: id,
      childId: input.childId,
      toolId: input.toolId,
      summary: input.summary,
    });

    return req;
  }

  /**
   * Check whether a tool has been approved for a child.
   * Returns true only if there's an approved, non-expired request.
   */
  isApproved(childId: string, toolId: string): boolean {
    for (const req of Array.from(this.requests.values())) {
      if (
        req.childId === childId &&
        req.toolId === toolId &&
        req.status === 'approved' &&
        req.expiresAt > Date.now()
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there's a pending request for this child+tool.
   */
  hasPending(childId: string, toolId: string): boolean {
    for (const req of Array.from(this.requests.values())) {
      if (
        req.childId === childId &&
        req.toolId === toolId &&
        req.status === 'pending' &&
        req.expiresAt > Date.now()
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the pending request for a child+tool, if one exists.
   */
  getPending(childId: string, toolId: string): ToolApprovalRequest | undefined {
    for (const req of Array.from(this.requests.values())) {
      if (
        req.childId === childId &&
        req.toolId === toolId &&
        req.status === 'pending' &&
        req.expiresAt > Date.now()
      ) {
        return req;
      }
    }
    return undefined;
  }

  /**
   * Parent approves or denies a pending request.
   */
  decide(decision: ToolApprovalDecision): ToolApprovalRequest | undefined {
    const req = this.requests.get(decision.requestId);
    if (!req) return undefined;
    if (req.status !== 'pending') return req;

    // Check expiry
    if (req.expiresAt <= Date.now()) {
      req.status = 'expired';
      return req;
    }

    req.status = decision.status;
    req.decidedAt = Date.now();
    req.decidedBy = decision.decidedBy;

    getEventBus().emit('tool.approval.decided', {
      requestId: req.id,
      childId: req.childId,
      toolId: req.toolId,
      status: req.status,
    });

    return req;
  }

  /**
   * Get all pending requests for a child (for parent UI).
   */
  getPendingForChild(childId: string): ToolApprovalRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.childId === childId && r.status === 'pending' && r.expiresAt > Date.now(),
    );
  }

  /**
   * Get all requests for a child (any status, for history).
   */
  getAllForChild(childId: string): ToolApprovalRequest[] {
    return Array.from(this.requests.values())
      .filter((r) => r.childId === childId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Clear all requests (for testing). */
  reset(): void {
    this.requests.clear();
    this.counter = 0;
  }
}

let _instance: ToolApprovalServiceImpl | undefined;

export function getToolApprovalService(): ToolApprovalServiceImpl {
  if (!_instance) {
    _instance = new ToolApprovalServiceImpl();
  }
  return _instance;
}

export function _resetToolApprovalService(): void {
  if (_instance) {
    _instance.reset();
  }
  _instance = undefined;
}
