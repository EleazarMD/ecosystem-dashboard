/**
 * Simplified Agent Authentication and Authorization Utilities
 * 
 * This is a simplified version of the agentAuth utility that removes JWT verification
 * requirements for development purposes.
 */

import { NextApiRequest } from 'next';

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

// Role definitions with permissions
export const AGENT_ROLES = {
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
    permissions: Object.values(AGENT_PERMISSIONS)
  }
};

/**
 * Create mock user with all permissions for development
 */
export function createMockUser(): AgentUser {
  const role = 'admin';
  const roleConfig = AGENT_ROLES.ADMIN;
  
  return {
    id: 'mock-admin-user',
    email: 'admin@homelab.ai',
    name: 'Mock Administrator',
    roles: [roleConfig.name],
    permissions: roleConfig.permissions,
    sessionId: `mock-session-${Date.now()}`
  };
}

/**
 * Simplified middleware that always grants access with a mock admin user
 * This is for development purposes only
 */
export function withAgentAuth(requiredPermission?: string) {
  return function authMiddleware(handler: Function) {
    return async function protectedHandler(req: NextApiRequest, res: any) {
      // Always attach mock admin user
      const mockUser = createMockUser();
      (req as any).user = mockUser;
      
      // Log the operation for debugging
      console.log(`Agent operation: ${req.method} ${req.url}`);
      console.log(`Required permission: ${requiredPermission || 'none'}`);
      
      // Always allow the operation
      return handler(req, res);
    };
  };
}

/**
 * Simplified audit logging for agent operations
 */
export function logAgentOperation(
  req: NextApiRequest, 
  action: string, 
  resource: string, 
  success: boolean, 
  error?: string
) {
  const user = (req as any).user as AgentUser;
  
  const logEntry = {
    userId: user?.id || 'anonymous',
    action,
    resource,
    timestamp: new Date().toISOString(),
    success,
    error
  };
  
  // Just log to console for development
  console.log('Agent Audit Log:', JSON.stringify(logEntry, null, 2));
}
