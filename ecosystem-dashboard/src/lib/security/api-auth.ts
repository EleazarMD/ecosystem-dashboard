/**
 * PIC/Context API Authentication
 * 
 * Adds authentication layer to Knowledge Graph and PIC APIs
 * to ensure per-user data isolation.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import crypto from 'crypto';

export interface APIAuthContext {
  userId: string;
  userEmail: string;
  tenantId?: string;
  isAdmin: boolean;
  requestId: string;
  timestamp: number;
}

export interface APIAuthResult {
  authenticated: boolean;
  context?: APIAuthContext;
  error?: string;
}

/**
 * Validate API request authentication
 * Supports both session-based auth and API key auth
 */
export async function validateAPIAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<APIAuthResult> {
  const requestId = generateRequestId();
  
  // Try session-based auth first (for browser requests)
  const session = await getServerSession(req, res, authOptions);
  
  if (session?.user) {
    return {
      authenticated: true,
      context: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        tenantId: req.headers['x-tenant-id'] as string | undefined,
        isAdmin: session.user.role === 'platform-admin',
        requestId,
        timestamp: Date.now(),
      },
    };
  }
  
  // Try API key auth (for service-to-service)
  let apiKey = req.headers['x-api-key'] as string;
  let userId = req.headers['x-user-id'] as string;
  
  if (!apiKey && req.headers.authorization?.startsWith('Bearer ')) {
    apiKey = req.headers.authorization.substring(7);
  }
  
  if (apiKey) {
    const expectedKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
    // Fallback for iOS apps uploading without X-User-Id
    if (apiKey === expectedKey && !userId) {
      userId = 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd'; // Default owner UUID
    }

    if (userId) {
      const isValid = await validateAPIKey(apiKey, userId) || (apiKey === expectedKey);
      if (isValid) {
        return {
          authenticated: true,
          context: {
            userId,
            userEmail: req.headers['x-user-email'] as string || '',
            tenantId: req.headers['x-tenant-id'] as string | undefined,
            isAdmin: false,  // API key auth is never admin
            requestId,
            timestamp: Date.now(),
          },
        };
      }
    }
  }
  
  // Try internal service auth (for homelab services)
  const internalKey = req.headers['x-internal-service-key'] as string;
  if (internalKey && validateInternalServiceKey(internalKey)) {
    // Internal services must provide user context
    if (!userId) {
      return {
        authenticated: false,
        error: 'Internal service must provide X-User-Id header',
      };
    }
    
    return {
      authenticated: true,
      context: {
        userId,
        userEmail: req.headers['x-user-email'] as string || '',
        tenantId: req.headers['x-tenant-id'] as string | undefined,
        isAdmin: false,
        requestId,
        timestamp: Date.now(),
      },
    };
  }
  
  return {
    authenticated: false,
    error: 'Authentication required',
  };
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Validate API key against stored keys
 */
async function validateAPIKey(apiKey: string, userId: string): Promise<boolean> {
  // Hash the API key for comparison
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // TODO: Check against database of valid API keys
  // For now, validate format and check environment variable
  const validKeyHash = process.env.PIC_API_KEY_HASH;
  
  if (validKeyHash && hashedKey === validKeyHash) {
    return true;
  }
  
  // Check if it's a user-specific key
  const userKeyHash = process.env[`PIC_API_KEY_${userId.toUpperCase()}_HASH`];
  if (userKeyHash && hashedKey === userKeyHash) {
    return true;
  }
  
  return false;
}

/**
 * Validate internal service key
 */
function validateInternalServiceKey(key: string): boolean {
  const internalKey = process.env.INTERNAL_SERVICE_KEY;
  if (!internalKey) {
    console.warn('INTERNAL_SERVICE_KEY not configured');
    return false;
  }
  
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(key),
      Buffer.from(internalKey)
    );
  } catch {
    return false;
  }
}

/**
 * Middleware to enforce authentication on API routes
 */
export function withAPIAuth(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: APIAuthContext
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authResult = await validateAPIAuth(req, res);
    
    if (!authResult.authenticated || !authResult.context) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }
    
    // Add auth context to response headers for debugging
    res.setHeader('X-Request-Id', authResult.context.requestId);
    
    return handler(req, res, authResult.context);
  };
}

/**
 * Middleware to enforce user-scoped data access
 */
export function withUserScope(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: APIAuthContext
  ) => Promise<void>
) {
  return withAPIAuth(async (req, res, context) => {
    // Ensure user can only access their own data
    const requestedUserId = req.query.userId as string || req.body?.userId;
    
    if (requestedUserId && requestedUserId !== context.userId && !context.isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access data for another user',
      });
    }
    
    return handler(req, res, context);
  });
}

/**
 * Generate headers for internal service calls
 */
export function getInternalServiceHeaders(
  userId: string,
  userEmail?: string,
  tenantId?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Internal-Service-Key': process.env.INTERNAL_SERVICE_KEY || '',
    'X-User-Id': userId,
  };
  
  if (userEmail) {
    headers['X-User-Email'] = userEmail;
  }
  
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }
  
  return headers;
}

/**
 * Rate limiting for API endpoints
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || record.resetAt < now) {
    // New window
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

/**
 * Middleware to enforce rate limiting
 */
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  limit: number = 100,
  windowMs: number = 60000
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Use IP + user ID as identifier
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const identifier = `${ip}:${userId}`;
    
    const rateLimit = checkRateLimit(identifier, limit, windowMs);
    
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      });
    }
    
    return handler(req, res);
  };
}
