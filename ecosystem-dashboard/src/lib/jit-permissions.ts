/**
 * JIT (Just-In-Time) Permission Verification
 * 
 * Zero-tolerance security framework for approval actions.
 * Verifies permissions at action time, not just authentication time.
 * 
 * @module lib/jit-permissions
 */

import type { NextApiRequest } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

// Risk level hierarchy
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
type RiskLevel = typeof RISK_LEVELS[number];

// Permission requirements by risk level
const RISK_PERMISSIONS: Record<RiskLevel, string[]> = {
  low: ['approval:low'],
  medium: ['approval:low', 'approval:medium'],
  high: ['approval:low', 'approval:medium', 'approval:high'],
  critical: ['approval:low', 'approval:medium', 'approval:high', 'approval:critical'],
};

// Action type risk categories
const ACTION_RISK_OVERRIDES: Record<string, RiskLevel> = {
  // Critical actions always require explicit approval
  'system_setting_change': 'critical',
  'file_delete': 'critical',
  'external_api_call': 'high',
  
  // Financial/privacy sensitive
  'email_send': 'medium',
  'calendar_invite_send': 'medium',
  
  // Child account actions require parent approval
  'child_conversation_access': 'high',
  'child_service_access': 'high',
  'child_extended_time': 'medium',
  'child_content_unlock': 'medium',
  'child_feature_request': 'low',
  
  // PIC memory injection is sensitive
  'pic_memory_injection': 'high',
  'pic_identity_update': 'critical',
  'pic_preference_update': 'medium',
  'pic_goal_update': 'low',
  'pic_relationship_update': 'medium',
  
  // Cloud/API calls
  'cloud_api_call': 'medium',
  'llm_inference_request': 'low',
  'deep_research_request': 'medium',
  'news_story_generation': 'low',
  'podcast_generation': 'low',
};

export interface JITVerificationResult {
  allowed: boolean;
  reason?: string;
  riskLevel: RiskLevel;
  requiredPermissions: string[];
  auditId?: string;
}

/**
 * Verify JIT permissions for an approval action
 */
export async function verifyApprovalPermission(
  userId: string,
  approvalId: string,
  action: 'approve' | 'reject',
  req: NextApiRequest
): Promise<JITVerificationResult> {
  try {
    // 1. Get approval details
    const approvalResult = await pool.query(`
      SELECT id, user_id, action_type, status, risk_level, priority
      FROM approval_requests
      WHERE id = $1
    `, [approvalId]);
    
    if (approvalResult.rows.length === 0) {
      return {
        allowed: false,
        reason: 'Approval not found',
        riskLevel: 'low',
        requiredPermissions: [],
      };
    }
    
    const approval = approvalResult.rows[0];
    
    // 2. Verify ownership
    if (approval.user_id !== userId) {
      await auditSecurityEvent(userId, 'approval_access_denied', approvalId, 'User does not own this approval');
      return {
        allowed: false,
        reason: 'You do not have permission to access this approval',
        riskLevel: approval.risk_level || 'low',
        requiredPermissions: [],
      };
    }
    
    // 3. Verify status is pending
    if (approval.status !== 'pending') {
      return {
        allowed: false,
        reason: `Approval already ${approval.status}`,
        riskLevel: approval.risk_level || 'low',
        requiredPermissions: [],
      };
    }
    
    // 4. Determine effective risk level
    const actionType = approval.action_type;
    const baseRisk = (approval.risk_level || 'low') as RiskLevel;
    const overrideRisk = ACTION_RISK_OVERRIDES[actionType];
    const effectiveRisk: RiskLevel = overrideRisk || baseRisk;
    
    // 5. Get user permissions from session/roles
    const userPermissions = await getUserPermissions(userId);
    
    // 6. Check if user has required permissions for risk level
    const requiredPermissions = RISK_PERMISSIONS[effectiveRisk];
    const hasAllPermissions = requiredPermissions.every(p => 
      userPermissions.includes(p) || userPermissions.includes('*') || userPermissions.includes('admin')
    );
    
    if (!hasAllPermissions && effectiveRisk === 'critical') {
      await auditSecurityEvent(userId, 'approval_permission_denied', approvalId, 
        `Missing permissions for critical action: ${actionType}`);
      return {
        allowed: false,
        reason: 'This action requires additional verification. Please use the dashboard.',
        riskLevel: effectiveRisk,
        requiredPermissions,
      };
    }
    
    // 7. Verify client trust level for critical actions
    if (effectiveRisk === 'critical' || effectiveRisk === 'high') {
      const clientTrusted = isTrustedClient(req);
      if (!clientTrusted) {
        await auditSecurityEvent(userId, 'approval_untrusted_client', approvalId, 
          `High-risk action from untrusted client: ${req.headers['x-client'] || 'unknown'}`);
        return {
          allowed: false,
          reason: 'This action must be performed from a trusted device',
          riskLevel: effectiveRisk,
          requiredPermissions,
        };
      }
    }
    
    // 8. Audit successful verification
    const auditId = await auditSecurityEvent(userId, `approval_${action}_verified`, approvalId, 
      `JIT verification passed for ${actionType}`);
    
    return {
      allowed: true,
      riskLevel: effectiveRisk,
      requiredPermissions,
      auditId,
    };
    
  } catch (error) {
    console.error('[JIT-Permissions] Verification error:', error);
    return {
      allowed: false,
      reason: 'Verification failed',
      riskLevel: 'critical',
      requiredPermissions: ['approval:critical'],
    };
  }
}

/**
 * Get user permissions from database
 */
async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT roles, permissions, platform_role
      FROM users
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    const user = result.rows[0];
    const permissions = new Set<string>();
    
    // Add role-based permissions
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role === 'admin') {
          permissions.add('*');
          permissions.add('admin');
        }
        if (role === 'parent') {
          permissions.add('approval:low');
          permissions.add('approval:medium');
          permissions.add('approval:high');
          permissions.add('approval:critical');
          permissions.add('child:approve');
        }
      }
    }
    
    // Add explicit permissions
    if (user.permissions && Array.isArray(user.permissions)) {
      user.permissions.forEach((p: string) => permissions.add(p));
    }
    
    // Platform role grants
    if (user.platform_role === 'admin') {
      permissions.add('*');
    }
    
    return Array.from(permissions);
    
  } catch (error) {
    console.error('[JIT-Permissions] Error fetching user permissions:', error);
    return [];
  }
}

/**
 * Check if client is trusted (iOS app, known device)
 */
function isTrustedClient(req: NextApiRequest): boolean {
  const client = req.headers['x-client'] as string;
  const trustedClients = ['Hyperspace-iOS', 'Hyperspace-iPadOS', 'Hyperspace-macOS'];
  
  if (client && trustedClients.includes(client)) {
    return true;
  }
  
  // Session-based auth is trusted
  if (req.headers['cookie']?.includes('next-auth')) {
    return true;
  }
  
  return false;
}

/**
 * Audit security event
 */
async function auditSecurityEvent(
  userId: string,
  eventType: string,
  approvalId: string,
  details: string
): Promise<string> {
  const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await pool.query(`
      INSERT INTO security_audit_log 
        (id, event_type, severity, user_id, resource_type, resource_id, action, outcome, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      auditId,
      eventType,
      eventType.includes('denied') ? 'warning' : 'info',
      userId,
      'approval',
      approvalId,
      eventType.split('_').pop() || 'unknown',
      eventType.includes('denied') ? 'denied' : 'success',
      JSON.stringify({ details, timestamp: new Date().toISOString() })
    ]);
  } catch (error) {
    console.error('[JIT-Permissions] Audit log error:', error);
  }
  
  return auditId;
}

/**
 * Export for use in API routes
 */
export const JITPermissions = {
  verify: verifyApprovalPermission,
  RISK_LEVELS,
  ACTION_RISK_OVERRIDES,
};
