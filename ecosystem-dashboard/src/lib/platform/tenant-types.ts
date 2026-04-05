/**
 * Multi-Tenant & RBAC Types
 * 
 * Defines the data models for multi-tenant architecture:
 * - Tenants (organizations/users with isolated environments)
 * - Users (individuals within tenants)
 * - Roles (permission sets)
 * - Platform Admin (superadmin controls)
 */

// ============================================================
// Role & Permission System
// ============================================================

export type Permission =
  // Platform-level (superadmin only)
  | 'platform:manage'
  | 'platform:tenants:create'
  | 'platform:tenants:delete'
  | 'platform:tenants:manage'
  | 'platform:services:manage'
  | 'platform:llms:manage'
  | 'platform:billing:view'
  | 'platform:billing:manage'
  // Tenant-level
  | 'tenant:manage'
  | 'tenant:users:invite'
  | 'tenant:users:remove'
  | 'tenant:users:manage'
  | 'tenant:config:view'
  | 'tenant:config:edit'
  | 'tenant:agents:manage'
  | 'tenant:integrations:manage'
  // Feature-level
  | 'feature:workspace:use'
  | 'feature:agents:use'
  | 'feature:voice:use'
  | 'feature:knowledge-graph:use'
  | 'feature:approvals:manage'
  | 'feature:api:access'
  // Data-level
  | 'data:read'
  | 'data:write'
  | 'data:delete'
  | 'data:export';

export interface Role {
  id: string;
  name: string;
  description: string;
  level: 'platform' | 'tenant';
  permissions: Permission[];
  isSystem: boolean;  // System roles cannot be deleted
}

export const SYSTEM_ROLES: Role[] = [
  {
    id: 'platform-admin',
    name: 'Platform Administrator',
    description: 'Full control over the entire platform and all tenants',
    level: 'platform',
    isSystem: true,
    permissions: [
      'platform:manage',
      'platform:tenants:create',
      'platform:tenants:delete',
      'platform:tenants:manage',
      'platform:services:manage',
      'platform:llms:manage',
      'platform:billing:view',
      'platform:billing:manage',
      'tenant:manage',
      'tenant:users:invite',
      'tenant:users:remove',
      'tenant:users:manage',
      'tenant:config:view',
      'tenant:config:edit',
      'tenant:agents:manage',
      'tenant:integrations:manage',
      'feature:workspace:use',
      'feature:agents:use',
      'feature:voice:use',
      'feature:knowledge-graph:use',
      'feature:approvals:manage',
      'feature:api:access',
      'data:read',
      'data:write',
      'data:delete',
      'data:export',
    ],
  },
  {
    id: 'tenant-admin',
    name: 'Tenant Administrator',
    description: 'Full control over a specific tenant',
    level: 'tenant',
    isSystem: true,
    permissions: [
      'tenant:manage',
      'tenant:users:invite',
      'tenant:users:remove',
      'tenant:users:manage',
      'tenant:config:view',
      'tenant:config:edit',
      'tenant:agents:manage',
      'tenant:integrations:manage',
      'feature:workspace:use',
      'feature:agents:use',
      'feature:voice:use',
      'feature:knowledge-graph:use',
      'feature:approvals:manage',
      'feature:api:access',
      'data:read',
      'data:write',
      'data:delete',
      'data:export',
    ],
  },
  {
    id: 'family-organizer',
    name: 'Family Organizer',
    description: 'Primary family manager who can add/remove members and manage subscriptions',
    level: 'tenant',
    isSystem: true,
    permissions: [
      'tenant:manage',
      'tenant:users:invite',
      'tenant:users:remove',
      'tenant:users:manage',
      'tenant:config:view',
      'tenant:config:edit',
      'feature:workspace:use',
      'feature:agents:use',
      'feature:voice:use',
      'feature:knowledge-graph:use',
      'feature:approvals:manage',
      'feature:api:access',
      'data:read',
      'data:write',
      'data:delete',
      'data:export',
    ],
  },
  {
    id: 'family-adult',
    name: 'Family Adult',
    description: 'Adult family member (18+) with standard access and ability to manage children',
    level: 'tenant',
    isSystem: true,
    permissions: [
      'tenant:config:view',
      'tenant:users:manage',
      'feature:workspace:use',
      'feature:agents:use',
      'feature:voice:use',
      'feature:knowledge-graph:use',
      'feature:approvals:manage',
      'data:read',
      'data:write',
    ],
  },
  {
    id: 'tenant-member',
    name: 'Tenant Member',
    description: 'Standard user within a tenant',
    level: 'tenant',
    isSystem: true,
    permissions: [
      'tenant:config:view',
      'feature:workspace:use',
      'feature:agents:use',
      'feature:voice:use',
      'feature:knowledge-graph:use',
      'data:read',
      'data:write',
    ],
  },
  {
    id: 'tenant-viewer',
    name: 'Tenant Viewer',
    description: 'Read-only access within a tenant',
    level: 'tenant',
    isSystem: true,
    permissions: [
      'tenant:config:view',
      'feature:workspace:use',
      'data:read',
    ],
  },
];

// ============================================================
// Tenant Model
// ============================================================

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'archived';
export type TenantTier = 'free' | 'basic' | 'premium';

export interface TenantLimits {
  maxUsers: number;
  maxAgents: number;
  maxWorkspacePages: number;
  maxStorageGB: number;
  maxApiCallsPerDay: number;
  maxTokensPerMonth: number;
  allowedLLMs: string[];
  allowedFeatures: string[];
}

export const TIER_LIMITS: Record<TenantTier, TenantLimits> = {
  /**
   * Free — Personal use, single user, local AI chat only.
   * Productivity: Workspace (notes/pages), basic AI chat.
   * No family admin, no email, no calendar, no voice.
   */
  free: {
    maxUsers: 1,
    maxAgents: 2,
    maxWorkspacePages: 20,
    maxStorageGB: 2,
    maxApiCallsPerDay: 200,
    maxTokensPerMonth: 500000,
    allowedLLMs: ['minimax', 'qwen-tts'],
    allowedFeatures: ['workspace', 'ai-chat', 'local-models'],
  },
  /**
   * Basic — Family plan. Organizer gets family admin.
   * Productivity: Workspace, AI chat, email, calendar, voice, ExoMind iOS.
   * Family admin: add/remove members, parental controls, child accounts.
   * Local models + optional cloud (blocked by default).
   */
  basic: {
    maxUsers: 6,
    maxAgents: 5,
    maxWorkspacePages: 200,
    maxStorageGB: 25,
    maxApiCallsPerDay: 2000,
    maxTokensPerMonth: 5000000,
    allowedLLMs: ['minimax', 'qwen-vision', 'qwen-tts'],
    allowedFeatures: [
      'workspace', 'ai-chat', 'local-models',
      'email-sync', 'calendar-sync', 'voice',
      'exomind-ios', 'family-admin', 'parental-controls',
      'child-accounts',
    ],
  },
  /**
   * Premium — Full homelab. Everything in Basic plus advanced features.
   * Productivity: All Basic + knowledge graph, research lab, podcast studio,
   *   deep research, advanced agents, approval workflows, OpenClaw.
   * Cloud providers unblocked (still optional).
   */
  premium: {
    maxUsers: -1,  // unlimited
    maxAgents: -1,
    maxWorkspacePages: -1,
    maxStorageGB: -1,
    maxApiCallsPerDay: -1,
    maxTokensPerMonth: -1,
    allowedLLMs: ['*'],
    allowedFeatures: [
      'workspace', 'ai-chat', 'local-models',
      'email-sync', 'calendar-sync', 'voice',
      'exomind-ios', 'family-admin', 'parental-controls',
      'child-accounts',
      'knowledge-graph', 'research-lab', 'podcast-studio',
      'deep-research', 'advanced-agents', 'approval-workflows',
      'openclaw', 'cloud-providers', 'api-access',
    ],
  },
};

export interface Tenant {
  id: string;
  slug: string;  // URL-friendly identifier
  name: string;
  description?: string;
  status: TenantStatus;
  tier: TenantTier;
  
  // Owner
  ownerId: string;
  ownerEmail: string;
  
  // Limits (can override tier defaults)
  limits: TenantLimits;
  
  // Usage tracking
  usage: {
    currentUsers: number;
    currentAgents: number;
    currentPages: number;
    storageUsedGB: number;
    apiCallsToday: number;
    tokensThisMonth: number;
  };
  
  // Tenant-specific configuration
  config: {
    enabledServices: string[];
    enabledAgents: string[];
    enabledLLMs: string[];
    enabledFeatures: string[];
    customSettings: Record<string, any>;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

// ============================================================
// User Model
// ============================================================

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status: UserStatus;
  
  // Platform-level role (null for non-platform admins)
  platformRole?: string;
  
  // Tenant memberships
  tenants: TenantMembership[];
  
  // Preferences
  preferences: {
    defaultTenantId?: string;
    theme?: 'light' | 'dark' | 'system';
    defaultLLM?: string;
    defaultAgent?: string;
  };
  
  // Auth
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  roleId: string;
  roleName: string;
  joinedAt: string;
  invitedBy?: string;
}

// ============================================================
// Platform Admin Context
// ============================================================

export interface PlatformAdminContext {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalApiCalls: number;
  totalTokensUsed: number;
  
  // Global service status
  services: {
    id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'down';
  }[];
  
  // Recent activity
  recentActivity: {
    type: string;
    message: string;
    tenantId?: string;
    userId?: string;
    timestamp: string;
  }[];
}

// ============================================================
// API Types
// ============================================================

export interface CreateTenantRequest {
  name: string;
  slug: string;
  ownerEmail: string;
  tier: TenantTier;
  description?: string;
}

export interface InviteUserRequest {
  tenantId: string;
  email: string;
  roleId: string;
  message?: string;
}

export interface UpdateTenantConfigRequest {
  tenantId: string;
  enabledServices?: string[];
  enabledAgents?: string[];
  enabledLLMs?: string[];
  enabledFeatures?: string[];
  customSettings?: Record<string, any>;
}

// ============================================================
// Helper Functions
// ============================================================

export function hasPermission(user: User, permission: Permission, tenantId?: string): boolean {
  // Platform admins have all permissions
  if (user.platformRole === 'platform-admin') {
    return true;
  }
  
  // Check tenant-level permissions
  if (tenantId) {
    const membership = user.tenants.find(t => t.tenantId === tenantId);
    if (membership) {
      const role = SYSTEM_ROLES.find(r => r.id === membership.roleId);
      if (role?.permissions.includes(permission)) {
        return true;
      }
    }
  }
  
  return false;
}

export function getTenantLimits(tier: TenantTier, overrides?: Partial<TenantLimits>): TenantLimits {
  const baseLimits = TIER_LIMITS[tier];
  return { ...baseLimits, ...overrides };
}

export function isWithinLimits(tenant: Tenant, resource: keyof TenantLimits, newValue: number): boolean {
  const limit = tenant.limits[resource];
  if (typeof limit !== 'number') return true;
  if (limit === -1) return true;  // unlimited
  return newValue <= limit;
}

export function createDefaultTenant(ownerEmail: string): Omit<Tenant, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> {
  return {
    slug: 'homelab',
    name: 'AI Homelab',
    description: 'Primary homelab tenant',
    status: 'active',
    tier: 'premium',
    ownerEmail,
    limits: TIER_LIMITS.premium,
    usage: {
      currentUsers: 1,
      currentAgents: 0,
      currentPages: 0,
      storageUsedGB: 0,
      apiCallsToday: 0,
      tokensThisMonth: 0,
    },
    config: {
      enabledServices: ['*'],
      enabledAgents: ['*'],
      enabledLLMs: ['*'],
      enabledFeatures: ['*'],
      customSettings: {},
    },
  };
}
