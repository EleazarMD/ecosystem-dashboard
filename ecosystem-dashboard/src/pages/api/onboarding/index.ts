/**
 * Unified Onboarding API
 * ============================================================================
 * POST /api/onboarding/provision
 *   Starts a provisioning pipeline for a user. Works from any client
 *   (iOS, Dashboard, Atlas, CLI). Requires NextAuth session or API key.
 *
 * GET  /api/onboarding/status?jobId=...
 *   Returns the status of an onboarding job.
 *
 * GET  /api/onboarding/jobs
 *   Lists onboarding jobs for the authenticated user.
 *
 * GET  /api/onboarding/services
 *   Returns the service catalog (for the wizard to display available services).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { getOnboardingService, OnboardingRequest } from '../../../lib/platform/onboarding-service';
import { verifyToken, verifyTokenWithRevocation, TokenRevokedError } from '../../../lib/platform/unified-token';
import { resolveGrantableTier } from '../../../lib/subscription-tiers';
import {
  needsProvisioningApproval,
  requestProvisioningApproval,
} from '../../../lib/platform/approval-client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth: NextAuth session, unified JWT, API key, or trusted mobile client
  let userId: string | null = null;
  let clientType = 'dashboard';
  let platform = 'web';
  let clientId: string | undefined;

  // 1. Try NextAuth session (dashboard web)
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    // 2. Try unified JWT Bearer token (iOS, mobile, CLI)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = await verifyTokenWithRevocation(token, JWT_SECRET, async (jti: string) => {
          const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1 LIMIT 1', [jti]);
          return r.rows.length > 0;
        });
        if (payload.type === 'access' && payload.userId) {
          userId = payload.userId;
          clientType = payload.clientType || clientType;
          platform = payload.platform || platform;
          clientId = payload.clientId;
        }
      } catch { /* invalid or revoked token, fall through */ }
    }

    // 3. API key fallback (service-to-service)
    if (!userId) {
      const apiKey = req.headers['x-api-key'] as string;
      const expectedKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
      if (apiKey === expectedKey) {
        const userIdHeader = (req.headers['x-user-id'] as string) || '';
        if (userIdHeader) {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE id::text = $1 OR email ILIKE $1 LIMIT 1',
            [userIdHeader]
          );
          userId = userResult.rows[0]?.id ?? null;
        }
      }
    }

    // 4. Trusted mobile client headers (legacy fallback)
    if (!userId) {
      const xClient = req.headers['x-client'] as string;
      const trustedClients = ['Hyperspace-iOS', 'Hyperspace-iPadOS', 'Hyperspace-macOS', 'CompanionAI-iOS'];
      if (xClient && trustedClients.includes(xClient)) {
        clientType = xClient.includes('iOS') ? 'ios' : 'macos';
        platform = xClient.includes('macOS') ? 'macos' : 'ios';
        clientId = xClient;
        const userIdHeader = (req.headers['x-user-id'] as string) || '';
        if (userIdHeader) {
          const userResult = await pool.query(
            'SELECT id FROM users WHERE id::text = $1 OR email ILIKE $1 LIMIT 1',
            [userIdHeader]
          );
          userId = userResult.rows[0]?.id ?? null;
        }
      }
    }
  }

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Route by method
  switch (req.method) {
    case 'POST':
      return handleProvision(req, res, userId!, clientType, platform, clientId);
    case 'GET':
      const action = req.query.action as string;
      if (action === 'services') return handleGetServices(req, res);
      if (action === 'jobs') return handleListJobs(req, res, userId!);
      if (action === 'approval') return handleCheckApproval(req, res);
      return handleGetStatus(req, res, userId!);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ============================================================================
// POST /api/onboarding/provision
// ============================================================================

async function handleProvision(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  clientType: string,
  platform: string,
  clientId?: string
) {
  const body = req.body;

  if (!body.formData) {
    return res.status(400).json({ error: 'formData is required' });
  }

  // Resolve the caller's platform role from the DB (never trust a token claim
  // for an authority decision).
  const roleResult = await pool.query(
    'SELECT platform_role FROM users WHERE id = $1',
    [userId]
  );
  const callerIsPlatformAdmin = roleResult.rows[0]?.platform_role === 'platform-admin';

  // Tenant-spoofing guard: if a tenantId is supplied, the caller must be an
  // active member of it (or a platform admin). Otherwise a user could attach
  // provisioning to another tenant's ID.
  if (body.tenantId) {
    if (!callerIsPlatformAdmin) {
      const membership = await pool.query(
        `SELECT 1 FROM tenant_memberships tm
         JOIN tenants t ON tm.tenant_id = t.id
         WHERE tm.user_id = $1 AND tm.tenant_id = $2
           AND tm.status = 'active' AND t.status = 'active'
         LIMIT 1`,
        [userId, body.tenantId]
      );
      if (membership.rows.length === 0) {
        return res.status(403).json({ error: 'Not a member of the requested tenant' });
      }
    }
  }

  // Privilege-escalation guard: privileged tiers (e.g. `admin`) require
  // platform-admin authority. A non-admin requesting one is rejected.
  const requestedTier = body.targetTier || body.formData?.targetTier || 'free';
  const tierDecision = resolveGrantableTier(requestedTier, callerIsPlatformAdmin);
  if (!tierDecision.allowed) {
    return res.status(403).json({ error: 'Insufficient authority for tier', detail: tierDecision.reason });
  }

  // JIT zero-tolerance approval gate (P1.3):
  // Cross-user provisioning (admin provisions for another user) and
  // privileged-tier grants require a JIT approval before proceeding.
  // Self-service provisioning (own account, standard tier) is inline.
  const targetUserId = body.targetUserId || userId;
  const requiresApproval = needsProvisioningApproval({
    callerUserId: userId,
    targetUserId,
    targetTier: tierDecision.tier,
    isPlatformAdmin: callerIsPlatformAdmin,
  });

  if (requiresApproval) {
    const action = targetUserId !== userId
      ? 'provision_cross_user'
      : 'grant_privileged_tier';
    try {
      const approval = await requestProvisioningApproval({
        action,
        userId,
        agentId: clientId || 'dashboard',
        agentRole: callerIsPlatformAdmin ? 'platform-admin' : 'user',
        payload: {
          targetUserId,
          targetTier: tierDecision.tier,
          tenantId: body.tenantId || null,
          triggeredBy: body.triggeredBy || 'dashboard',
        },
        context: `Provisioning ${tierDecision.tier} tier for user ${targetUserId}`,
        urgency: 'high',
      });

      if (approval.status === 'pending') {
        // Return 202 with approval ID so the client can poll
        return res.status(202).json({
          status: 'approval_pending',
          approvalId: approval.approvalId,
          message: 'Provisioning requires JIT approval. Poll GET /api/onboarding?action=approval&approvalId=...',
        });
      }

      if (approval.status === 'denied') {
        return res.status(403).json({
          error: 'Provisioning approval denied',
          detail: approval.reason || 'Denied by approver',
        });
      }

      // approved — fall through to provisioning
    } catch (err: any) {
      return res.status(503).json({
        error: 'Approval service unavailable',
        detail: err.message,
      });
    }
  }

  // Determine triggered_by from client type. Only a platform admin may
  // override it (e.g. to 'admin'/'system'); untrusted clients cannot spoof it.
  const derivedTriggeredBy = clientType === 'ios' ? 'ios'
    : clientType === 'macos' ? 'ios'
    : clientType === 'dashboard' ? 'dashboard'
    : 'system';
  const triggeredBy = callerIsPlatformAdmin && body.triggeredBy ? body.triggeredBy : derivedTriggeredBy;

  const onboardingReq: OnboardingRequest = {
    userId,
    tenantId: body.tenantId || undefined,
    triggeredBy,
    clientType,
    platform,
    clientId,
    formData: body.formData,
    targetTier: tierDecision.tier,
  };

  try {
    const service = getOnboardingService();
    const result = await service.provision(onboardingReq);

    // Register the client in client_registrations
    if (clientId) {
      await pool.query(
        `INSERT INTO client_registrations
           (user_id, tenant_id, client_type, client_id, client_name, platform,
            auth_method, capabilities, is_active, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'jwt', '[]'::jsonb, true, now())
         ON CONFLICT (user_id, client_id) WHERE is_active = true DO UPDATE SET
           last_seen_at = now(),
           is_active = true`,
        [userId, result.tenantId || null, clientType, clientId,
         body.formData?.exomindPairing?.deviceName || clientId, platform]
      );
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Onboarding] Provisioning error:', err);
    return res.status(500).json({ error: 'Provisioning failed', detail: err.message });
  }
}

// ============================================================================
// GET /api/onboarding/status?jobId=...
// ============================================================================

async function handleGetStatus(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const jobId = req.query.jobId as string;
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }

  const service = getOnboardingService();
  // Scope to the caller so one user can never read another user's job.
  const result = await service.getJobStatus(jobId, userId);
  if (!result) {
    return res.status(404).json({ error: 'Job not found' });
  }
  return res.status(200).json(result);
}

// ============================================================================
// GET /api/onboarding/jobs
// ============================================================================

async function handleListJobs(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const service = getOnboardingService();
  const jobs = await service.listJobsForUser(userId);
  return res.status(200).json({ jobs });
}

// ============================================================================
// GET /api/onboarding/services — Service catalog
// ============================================================================

async function handleGetServices(req: NextApiRequest, res: NextApiResponse) {
  const result = await pool.query(
    `SELECT service_name, display_name, description, port, service_type,
            feature_flags, dependencies, auth_methods, provisioning_enabled,
            provisioning_order, status
     FROM service_catalog
     WHERE status IN ('active', 'registered')
     ORDER BY provisioning_order, service_name`
  );
  return res.status(200).json({ services: result.rows });
}

// ============================================================================
// GET /api/onboarding?action=approval&approvalId=... — Poll approval status
// ============================================================================

async function handleCheckApproval(req: NextApiRequest, res: NextApiResponse) {
  const approvalId = req.query.approvalId as string;
  if (!approvalId) {
    return res.status(400).json({ error: 'approvalId is required' });
  }

  const { checkApproval } = await import('../../../lib/platform/approval-client');
  const result = await checkApproval(approvalId);

  if (result.status === 'approved') {
    return res.status(200).json({ status: 'approved', approvalId: result.approvalId });
  }
  if (result.status === 'denied') {
    return res.status(200).json({ status: 'denied', approvalId: result.approvalId, reason: result.reason });
  }
  if (result.status === 'expired') {
    return res.status(200).json({ status: 'expired', approvalId: result.approvalId, reason: result.reason });
  }
  return res.status(200).json({ status: 'pending', approvalId: result.approvalId });
}
