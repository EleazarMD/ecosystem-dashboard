/**
 * Agent Authentication and Authorization Utilities
 * 
 * Provides authentication and authorization helpers for agent API endpoints
 * with role-based access control and session management.
 */

import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';

export interface AgentUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

export interface AgentAuthResult {
  success: boolean;
  user?: AgentUser;
  error?: string;
  statusCode?: number;
}

// Agent permissions
export const AGENT_PERMISSIONS = {
  // Basic agent interactions
  AGENT_CHAT: 'agent:chat',
  AGENT_EXECUTE: 'agent:execute',
  AGENT_VIEW_CARD: 'agent:view_card',
  
  // Workflow management
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_EXECUTE: 'workflow:execute',
  WORKFLOW_SCHEDULE: 'workflow:schedule',
  WORKFLOW_DELETE: 'workflow:delete',
  
  // System operations
  SYSTEM_ANALYZE: 'system:analyze',
  SYSTEM_MODIFY: 'system:modify',
  PORT_COMPLIANCE: 'system:port_compliance',
  
  // Memory operations
  MEMORY_READ: 'memory:read',
  MEMORY_WRITE: 'memory:write',
  MEMORY_GOVERNANCE: 'memory:governance',
  
  // Administrative
  ADMIN_FULL: 'admin:full',
  ADMIN_USERS: 'admin:users',
  ADMIN_AUDIT: 'admin:audit'
} as const;

// Role definitions
export const AGENT_ROLES = {
  VIEWER: {
    name: 'viewer',
    permissions: [
      AGENT_PERMISSIONS.AGENT_CHAT,
      AGENT_PERMISSIONS.AGENT_VIEW_CARD,
      AGENT_PERMISSIONS.MEMORY_READ
    ]
  },
  OPERATOR: {
    name: 'operator',
    permissions: [
      AGENT_PERMISSIONS.AGENT_CHAT,
      AGENT_PERMISSIONS.AGENT_EXECUTE,
      AGENT_PERMISSIONS.AGENT_VIEW_CARD,
      AGENT_PERMISSIONS.WORKFLOW_EXECUTE,
      AGENT_PERMISSIONS.SYSTEM_ANALYZE,
      AGENT_PERMISSIONS.MEMORY_READ,
      AGENT_PERMISSIONS.PORT_COMPLIANCE
    ]
  },
  DEVELOPER: {
    name: 'developer',
    permissions: [
      AGENT_PERMISSIONS.AGENT_CHAT,
      AGENT_PERMISSIONS.AGENT_EXECUTE,
      AGENT_PERMISSIONS.AGENT_VIEW_CARD,
      AGENT_PERMISSIONS.WORKFLOW_CREATE,
      AGENT_PERMISSIONS.WORKFLOW_EXECUTE,
      AGENT_PERMISSIONS.WORKFLOW_SCHEDULE,
      AGENT_PERMISSIONS.SYSTEM_ANALYZE,
      AGENT_PERMISSIONS.SYSTEM_MODIFY,
      AGENT_PERMISSIONS.MEMORY_READ,
      AGENT_PERMISSIONS.MEMORY_WRITE,
      AGENT_PERMISSIONS.PORT_COMPLIANCE
    ]
  },
  ADMIN: {
    name: 'admin',
    permissions: [
      AGENT_PERMISSIONS.ADMIN_FULL,
      AGENT_PERMISSIONS.ADMIN_USERS,
      AGENT_PERMISSIONS.ADMIN_AUDIT,
      ...Object.values(AGENT_PERMISSIONS)
    ]
  }
} as const;

/**
 * Extract and validate JWT token from request
 */
export function extractToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check for token in cookies as fallback
  const cookieToken = req.headers.cookie
    ?.split(';')
    .find(c => c.trim().startsWith('agent_token='))
    ?.split('=')[1];
    
  return cookieToken || null;
}

/**
 * Verify JWT token and extract user information
 */
export function verifyToken(token: string): AgentUser | null {
  try {
    const secret = process.env.AGENT_JWT_SECRET || 'default-secret-change-in-production';
    const decoded = jwt.verify(token, secret) as any;
    
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: AgentUser, permission: string): boolean {
  // Admin role has all permissions
  if (user.roles.includes('admin')) {
    return true;
  }
  
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(user: AgentUser, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Authenticate request and return user information
 */
export function authenticateRequest(req: NextApiRequest): AgentAuthResult {
  const token = extractToken(req);
  
  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided',
      statusCode: 401
    };
  }
  
  const user = verifyToken(token);
  
  if (!user) {
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401
    };
  }
  
  return {
    success: true,
    user
  };
}

/**
 * Authorize request for specific permission
 */
export function authorizeRequest(req: NextApiRequest, requiredPermission: string): AgentAuthResult {
  const authResult = authenticateRequest(req);
  
  if (!authResult.success) {
    return authResult;
  }
  
  const user = authResult.user!;
  
  if (!hasPermission(user, requiredPermission)) {
    return {
      success: false,
      error: `Insufficient permissions. Required: ${requiredPermission}`,
      statusCode: 403
    };
  }
  
  return {
    success: true,
    user
  };
}

/**
 * Create mock user for development/testing
 */
export function createMockUser(role: 'viewer' | 'operator' | 'developer' | 'admin' = 'developer'): AgentUser {
  const roleConfig = AGENT_ROLES[role.toUpperCase() as keyof typeof AGENT_ROLES];
  
  return {
    id: 'mock-user-' + role,
    email: `${role}@homelab.ai`,
    name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    roles: [roleConfig.name],
    permissions: roleConfig.permissions,
    sessionId: 'mock-session-' + Date.now()
  };
}

/**
 * Generate JWT token for user (for testing/development)
 */
export function generateToken(user: AgentUser): string {
  const secret = process.env.AGENT_JWT_SECRET || 'default-secret-change-in-production';
  
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
      sessionId: user.sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    secret
  );
}

/**
 * Middleware for protecting agent API routes
 */
export function withAgentAuth(requiredPermission?: string) {
  return function authMiddleware(handler: Function) {
    return async function protectedHandler(req: NextApiRequest, res: any) {
      // Skip auth in development if AGENT_SKIP_AUTH is set
      if (process.env.NODE_ENV === 'development' && process.env.AGENT_SKIP_AUTH === 'true') {
        // Attach mock user for development
        req.user = createMockUser('developer');
        return handler(req, res);
      }
      
      let authResult: AgentAuthResult;
      
      if (requiredPermission) {
        authResult = authorizeRequest(req, requiredPermission);
      } else {
        authResult = authenticateRequest(req);
      }
      
      if (!authResult.success) {
        return res.status(authResult.statusCode || 401).json({
          error: authResult.error,
          code: 'AUTHENTICATION_FAILED'
        });
      }
      
      // Attach user to request
      req.user = authResult.user;
      
      return handler(req, res);
    };
  };
}

/**
 * Rate limiting for agent operations
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string, config: RateLimitConfig): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const key = userId;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { allowed: true };
  }
  
  if (current.count >= config.maxRequests) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true };
}

/**
 * Audit logging for agent operations
 */
export interface AgentAuditLog {
  userId: string;
  action: string;
  resource: string;
  context: any;
  timestamp: string;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
}

export function logAgentOperation(req: NextApiRequest, action: string, resource: string, success: boolean, error?: string) {
  const user = (req as any).user as AgentUser;
  
  const auditLog: AgentAuditLog = {
    userId: user?.id || 'anonymous',
    action,
    resource,
    context: {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query
    },
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    success,
    error
  };
  
  // In production, this would be sent to a logging service
  console.log('Agent Audit Log:', JSON.stringify(auditLog, null, 2));
}
