/**
 * Approval Client — Dashboard-side bridge to the approval-service (port 8810).
 *
 * Used by the onboarding provisioning pipeline to gate cross-user and
 * privileged-tier provisioning behind a JIT zero-tolerance approval.
 *
 * Flow:
 *   1. Dashboard calls `requestProvisioningApproval(...)` before provisioning.
 *   2. If auto-approved (Tier 0/1), provisioning proceeds inline.
 *   3. If approval is required, returns { status: 'pending', approvalId }.
 *   4. Client polls `checkApproval(approvalId)` until approved/denied/expired.
 *   5. On approved, provisioning proceeds. On denied, provisioning is aborted.
 */

const APPROVAL_SERVICE_URL =
  process.env.APPROVAL_SERVICE_URL || 'http://localhost:8810';
const APPROVAL_API_KEY =
  process.env.APPROVAL_SERVICE_API_KEY || 'approval-api-key-2024';

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ApprovalResult {
  approvalId: string;
  status: ApprovalStatus;
  reason?: string;
  reviewedBy?: string;
}

/**
 * Request approval for a provisioning action.
 *
 * Tier mapping (per AGENTS.md JIT zero-tolerance):
 *   - Self-service provisioning (own account, standard tier) → Tier 0, auto-approved
 *   - Cross-user provisioning (admin provisions for another user) → Tier 3, 5-min JIT
 *   - Privileged tier grant (admin/enterprise) → Tier 3, 5-min JIT
 */
export async function requestProvisioningApproval(params: {
  action: string;
  userId: string;
  agentId: string;
  agentRole: string;
  payload: Record<string, unknown>;
  context: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}): Promise<ApprovalResult> {
  const { action, userId, agentId, agentRole, payload, context, urgency } = params;

  try {
    const res = await fetch(`${APPROVAL_SERVICE_URL}/api/approvals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': APPROVAL_API_KEY,
      },
      body: JSON.stringify({
        action_type: action,
        user_id: userId,
        agent: { id: agentId, name: agentId, type: agentRole },
        payload,
        context,
        title: `Provisioning: ${action.replace(/_/g, ' ')}`,
        ai_reasoning: context,
        urgency: urgency ?? 'medium',
        expiry_hours: 5 / 60, // 5-minute JIT expiry
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Approval service returned ${res.status}: ${body}`);
    }

    const data = await res.json() as any;
    const approvalId = data.approval?.id ?? data.approval_id ?? data.id;
    const status = (data.approval?.status ?? 'pending') as ApprovalStatus;

    return {
      approvalId,
      status,
      reason: data.approval?.policy_result?.reason,
      reviewedBy: data.approval?.reviewed_by,
    };
  } catch (err: any) {
    // If approval-service is unreachable, fail closed for privileged actions.
    // Self-service actions can proceed (the caller already passed tier/membership guards).
    throw new Error(`Approval service unavailable: ${err.message}`);
  }
}

/**
 * Poll the approval-service for a decision.
 */
export async function checkApproval(approvalId: string): Promise<ApprovalResult> {
  try {
    const res = await fetch(`${APPROVAL_SERVICE_URL}/api/approvals/${approvalId}`, {
      headers: { 'X-API-Key': APPROVAL_API_KEY },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      throw new Error(`Approval service returned ${res.status}`);
    }

    const data = await res.json() as any;
    const approval = data.approval ?? data;
    const status = (approval.status ?? 'pending') as ApprovalStatus;

    return {
      approvalId,
      status,
      reason: approval.decision_reason,
      reviewedBy: approval.reviewed_by ?? approval.resolved_by,
    };
  } catch (err: any) {
    return {
      approvalId,
      status: 'pending',
      reason: `Polling error: ${err.message}`,
    };
  }
}

/**
 * Wait for an approval decision, polling at the given interval.
 * Times out after `timeoutMs` (default 5 minutes for Tier 3 JIT).
 */
export async function waitForApproval(
  approvalId: string,
  timeoutMs = 300_000,
  pollIntervalMs = 3_000
): Promise<ApprovalResult> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await checkApproval(approvalId);
    if (result.status === 'approved' || result.status === 'denied') {
      return result;
    }
    if (result.status === 'expired') {
      return result;
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  return {
    approvalId,
    status: 'expired',
    reason: 'Polling timeout',
  };
}

/**
 * Determine whether a provisioning request needs JIT approval.
 *
 * Returns true if:
 *   - A platform admin is provisioning FOR another user (cross-user)
 *   - The target tier is privileged (admin)
 *
 * Self-service provisioning (own account, standard tier) does NOT need approval.
 */
export function needsProvisioningApproval(params: {
  callerUserId: string;
  targetUserId?: string;
  targetTier: string;
  isPlatformAdmin: boolean;
}): boolean {
  // Cross-user provisioning by an admin
  if (params.isPlatformAdmin && params.targetUserId && params.targetUserId !== params.callerUserId) {
    return true;
  }
  // Privileged tier grant
  if (params.targetTier === 'admin') {
    return true;
  }
  return false;
}
