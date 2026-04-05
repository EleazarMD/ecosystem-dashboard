/**
 * Service Access Control
 * 
 * Enforces service restrictions for child accounts based on parent settings
 */

import { query } from '@/lib/db';

export interface ServiceAccessResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}

/**
 * Check if a child user can access a specific service
 */
export async function checkServiceAccess(
  userId: string,
  servicePath: string
): Promise<ServiceAccessResult> {
  try {
    // Get user's account type and parental controls
    const userResult = await query(
      `SELECT 
        u.account_type,
        u.parent_user_id,
        pc.allowed_services,
        pc.blocked_services,
        pc.controls_active
      FROM users u
      LEFT JOIN parental_controls pc ON u.id = pc.child_id
      WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { allowed: false, reason: 'User not found' };
    }

    const user = userResult.rows[0];

    // Non-child accounts have full access
    if (user.account_type !== 'child') {
      return { allowed: true };
    }

    // If controls are not active, allow access
    if (!user.controls_active) {
      return { allowed: true };
    }

    // Extract service name from path
    const serviceName = extractServiceName(servicePath);

    // Check blocked services first
    const blockedServices = user.blocked_services || [];
    if (blockedServices.includes(serviceName)) {
      return {
        allowed: false,
        reason: 'This service is blocked by your parent',
        requiresApproval: true,
      };
    }

    // Check allowed services (if list exists, it's a whitelist)
    const allowedServices = user.allowed_services || [];
    if (allowedServices.length > 0 && !allowedServices.includes(serviceName)) {
      return {
        allowed: false,
        reason: 'This service is not in your allowed list',
        requiresApproval: true,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[ServiceAccess] Error checking access:', error);
    // Fail open for non-child accounts, fail closed for children
    return { allowed: false, reason: 'Error checking access' };
  }
}

/**
 * Extract service name from path
 */
function extractServiceName(path: string): string {
  // Remove leading slash and query params
  const cleanPath = path.split('?')[0].replace(/^\//, '');
  
  // Map paths to service names
  const serviceMap: Record<string, string> = {
    'workspace': 'workspace',
    'email-agent': 'email',
    'calendar': 'calendar',
    'chat': 'chat',
    'image-studio': 'image-studio',
    'podcast-studio': 'podcast-studio',
    'ai-research': 'ai-research',
    'knowledge': 'knowledge-base',
    'ide-memory': 'ide-memory',
    'agentic-workflows': 'agentic-workflows',
    'settings': 'settings',
  };

  // Get first path segment
  const firstSegment = cleanPath.split('/')[0];
  
  return serviceMap[firstSegment] || firstSegment;
}

/**
 * Log blocked access attempt
 */
export async function logBlockedAttempt(
  childId: string,
  serviceName: string,
  path: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO child_activities (
        child_id,
        activity_type,
        activity_data,
        service,
        flagged
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        childId,
        'blocked_attempt',
        JSON.stringify({ path, serviceName }),
        serviceName,
        true, // Flag blocked attempts for parent review
      ]
    );
  } catch (error) {
    console.error('[ServiceAccess] Error logging blocked attempt:', error);
  }
}

/**
 * Get list of blocked services for a child
 */
export async function getBlockedServices(childId: string): Promise<string[]> {
  try {
    const result = await query(
      `SELECT blocked_services 
       FROM parental_controls 
       WHERE child_id = $1`,
      [childId]
    );

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows[0].blocked_services || [];
  } catch (error) {
    console.error('[ServiceAccess] Error getting blocked services:', error);
    return [];
  }
}

/**
 * Check if service requires parent approval
 */
export async function checkPendingApproval(
  childId: string,
  serviceName: string
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT id FROM service_requests
       WHERE child_id = $1 
       AND service_name = $2 
       AND status = 'approved'
       AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [childId, serviceName]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('[ServiceAccess] Error checking approval:', error);
    return false;
  }
}
