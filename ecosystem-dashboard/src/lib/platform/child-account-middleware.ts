/**
 * Child Account Middleware
 * 
 * Middleware functions for protecting routes and enforcing
 * parental controls on child accounts.
 */

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';
import { checkChildAccess, checkServiceAccess, filterChildContent, logChildActivity } from './content-filter-service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export interface ChildAccountContext {
  isChildAccount: boolean;
  childUserId?: string;
  parentUserId?: string;
  controls?: {
    contentFilterLevel: string;
    dailyUsageLimitMinutes: number;
    remainingMinutes?: number;
    allowedServices: string[];
    blockedServices: string[];
  };
}

export interface ProtectedRequest extends NextApiRequest {
  childContext?: ChildAccountContext;
  user?: any;
}

type ProtectedHandler = (
  req: ProtectedRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Middleware that checks if the current user is a child account
 * and adds child context to the request
 */
export function withChildContext(handler: ProtectedHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user as any;
    const protectedReq = req as ProtectedRequest;
    protectedReq.user = user;

    // Check if user is a child account
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.account_type as "accountType",
        u.parent_user_id as "parentUserId",
        pc.content_filter_level as "contentFilterLevel",
        pc.daily_usage_limit_minutes as "dailyUsageLimitMinutes",
        pc.allowed_services as "allowedServices",
        pc.blocked_services as "blockedServices",
        pc.is_active as "controlsActive"
      FROM users u
      LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
      WHERE u.id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];

    if (userData.accountType === 'child') {
      // Get remaining daily minutes
      const usageResult = await pool.query(`
        SELECT COALESCE(total_minutes, 0) as used
        FROM child_daily_usage
        WHERE child_user_id = $1 AND usage_date = CURRENT_DATE
      `, [user.id]);

      const usedMinutes = usageResult.rows[0]?.used || 0;
      const remainingMinutes = Math.max(0, userData.dailyUsageLimitMinutes - usedMinutes);

      protectedReq.childContext = {
        isChildAccount: true,
        childUserId: user.id,
        parentUserId: userData.parentUserId,
        controls: {
          contentFilterLevel: userData.contentFilterLevel || 'strict',
          dailyUsageLimitMinutes: userData.dailyUsageLimitMinutes || 120,
          remainingMinutes,
          allowedServices: userData.allowedServices || [],
          blockedServices: userData.blockedServices || [],
        },
      };
    } else {
      protectedReq.childContext = {
        isChildAccount: false,
      };
    }

    return handler(protectedReq, res);
  };
}

/**
 * Middleware that blocks child accounts from accessing a route entirely
 */
export function blockChildAccounts(handler: ProtectedHandler): NextApiHandler {
  return withChildContext(async (req: ProtectedRequest, res: NextApiResponse) => {
    if (req.childContext?.isChildAccount) {
      return res.status(403).json({ 
        error: 'This feature is not available for child accounts',
        code: 'CHILD_ACCOUNT_BLOCKED'
      });
    }
    return handler(req, res);
  });
}

/**
 * Middleware that enforces service access for child accounts
 */
export function withServiceAccess(serviceId: string) {
  return function(handler: ProtectedHandler): NextApiHandler {
    return withChildContext(async (req: ProtectedRequest, res: NextApiResponse) => {
      if (req.childContext?.isChildAccount) {
        const access = await checkServiceAccess(req.childContext.childUserId!, serviceId);
        
        if (!access.allowed) {
          // Log the blocked attempt
          await logChildActivity(req.childContext.childUserId!, 'blocked_attempt', {
            serviceId,
            metadata: { reason: access.reason, requiresApproval: access.requiresApproval }
          });

          if (access.requiresApproval) {
            return res.status(403).json({
              error: 'This service requires parental approval',
              code: 'REQUIRES_APPROVAL',
              serviceId,
            });
          }

          return res.status(403).json({
            error: access.reason || 'Service not allowed',
            code: 'SERVICE_BLOCKED',
            serviceId,
          });
        }
      }
      return handler(req, res);
    });
  };
}

/**
 * Middleware that enforces time and usage limits for child accounts
 */
export function withUsageLimits(handler: ProtectedHandler): NextApiHandler {
  return withChildContext(async (req: ProtectedRequest, res: NextApiResponse) => {
    if (req.childContext?.isChildAccount) {
      const access = await checkChildAccess(req.childContext.childUserId!);
      
      if (!access.allowed) {
        // Log the blocked attempt
        await logChildActivity(req.childContext.childUserId!, 'blocked_attempt', {
          metadata: { reason: access.reason, type: 'usage_limit' }
        });

        return res.status(403).json({
          error: access.reason,
          code: 'USAGE_LIMIT_EXCEEDED',
          remainingMinutes: access.remainingMinutes,
        });
      }

      // Add remaining time to response headers for client awareness
      res.setHeader('X-Child-Remaining-Minutes', access.remainingMinutes?.toString() || '0');
    }
    return handler(req, res);
  });
}

/**
 * Middleware that filters content for child accounts
 * Use this for AI chat endpoints
 */
export function withContentFilter(handler: ProtectedHandler): NextApiHandler {
  return withChildContext(async (req: ProtectedRequest, res: NextApiResponse) => {
    if (req.childContext?.isChildAccount && req.method === 'POST') {
      // Filter user input
      const body = req.body;
      const contentToFilter = body.message || body.content || body.prompt;
      
      if (contentToFilter) {
        const filterResult = await filterChildContent(
          req.childContext.childUserId!,
          contentToFilter,
          'input'
        );

        if (!filterResult.passed) {
          // Log the blocked content
          if (filterResult.shouldLog) {
            await logChildActivity(req.childContext.childUserId!, 'blocked_attempt', {
              userMessage: contentToFilter.substring(0, 500),
              wasFiltered: true,
              filterReason: filterResult.violations.map(v => v.ruleName).join(', '),
              metadata: { violations: filterResult.violations }
            });
          }

          return res.status(400).json({
            error: 'Your message contains content that is not allowed',
            code: 'CONTENT_FILTERED',
            warnings: filterResult.warnings,
          });
        }

        // Replace content with filtered version if modified
        if (filterResult.filteredContent && filterResult.filteredContent !== contentToFilter) {
          if (body.message) body.message = filterResult.filteredContent;
          if (body.content) body.content = filterResult.filteredContent;
          if (body.prompt) body.prompt = filterResult.filteredContent;
        }
      }
    }
    return handler(req, res);
  });
}

/**
 * Combined middleware for AI chat endpoints with full child protection
 */
export function withChildSafeChat(serviceId: string) {
  return function(handler: ProtectedHandler): NextApiHandler {
    return withChildContext(async (req: ProtectedRequest, res: NextApiResponse) => {
      if (req.childContext?.isChildAccount) {
        const childUserId = req.childContext.childUserId!;

        // 1. Check service access
        const serviceAccess = await checkServiceAccess(childUserId, serviceId);
        if (!serviceAccess.allowed) {
          await logChildActivity(childUserId, 'blocked_attempt', {
            serviceId,
            metadata: { reason: serviceAccess.reason }
          });
          return res.status(403).json({
            error: serviceAccess.reason,
            code: serviceAccess.requiresApproval ? 'REQUIRES_APPROVAL' : 'SERVICE_BLOCKED',
          });
        }

        // 2. Check usage limits
        const usageAccess = await checkChildAccess(childUserId);
        if (!usageAccess.allowed) {
          await logChildActivity(childUserId, 'blocked_attempt', {
            metadata: { reason: usageAccess.reason, type: 'usage_limit' }
          });
          return res.status(403).json({
            error: usageAccess.reason,
            code: 'USAGE_LIMIT_EXCEEDED',
          });
        }

        // 3. Filter content if POST request
        if (req.method === 'POST') {
          const body = req.body;
          const contentToFilter = body.message || body.content || body.prompt;
          
          if (contentToFilter) {
            const filterResult = await filterChildContent(childUserId, contentToFilter, 'input');
            
            if (!filterResult.passed) {
              await logChildActivity(childUserId, 'blocked_attempt', {
                userMessage: contentToFilter.substring(0, 500),
                wasFiltered: true,
                filterReason: filterResult.violations.map(v => v.ruleName).join(', '),
              });
              return res.status(400).json({
                error: 'Your message contains content that is not allowed',
                code: 'CONTENT_FILTERED',
              });
            }
          }
        }

        // Add headers for client
        res.setHeader('X-Child-Account', 'true');
        res.setHeader('X-Child-Remaining-Minutes', usageAccess.remainingMinutes?.toString() || '0');
      }

      return handler(req, res);
    });
  };
}

/**
 * Helper to check if current user is a parent of a specific child
 */
export async function isParentOfChild(parentId: string, childId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM users WHERE id = $1 AND parent_user_id = $2 AND account_type = 'child'`,
    [childId, parentId]
  );
  return result.rows.length > 0;
}

/**
 * Helper to get all children of a parent
 */
export async function getChildrenOfParent(parentId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT id FROM users WHERE parent_user_id = $1 AND account_type = 'child'`,
    [parentId]
  );
  return result.rows.map(r => r.id);
}
