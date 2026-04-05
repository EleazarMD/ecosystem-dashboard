/**
 * Access Control Engine
 * Complex access validation with policies and conditions
 * Based on Notion's relation-based access control
 */

import { query } from '../db/client';
import { permissionService } from './permission-service';
import { WorkspaceRole, PermissionLevel } from '../../types/workspace';

export type AccessAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'move'
  | 'share'
  | 'comment'
  | 'change_permissions'
  | 'export'
  | 'duplicate';

export interface AccessContext {
  user_id: string;
  workspace_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp?: Date;
}

export class AccessControlEngine {
  /**
   * Evaluate if user has access to perform action on resource
   */
  async evaluateAccess(
    resourceType: 'workspace' | 'page' | 'database' | 'block',
    resourceId: string,
    action: AccessAction,
    context: AccessContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // 1. Resolve permission level
      const permissionLevel = await permissionService.resolvePermission(
        resourceId,
        context.user_id
      );

      if (!permissionLevel) {
        return { allowed: false, reason: 'No permission granted' };
      }

      // 2. Check if permission level allows action
      const actionAllowed = this.permissionAllowsAction(permissionLevel, action);
      if (!actionAllowed) {
        return { allowed: false, reason: `Permission level '${permissionLevel}' does not allow '${action}'` };
      }

      // 3. Check workspace policies
      const block = await this.getBlock(resourceId);
      if (block) {
        const policyCheck = await this.checkWorkspacePolicies(
          block.workspace_id,
          context.user_id,
          action
        );
        if (!policyCheck.allowed) {
          return policyCheck;
        }
      }

      // 4. Check conditions (time, IP, 2FA, etc.)
      const permission = await permissionService['getExplicitPermission'](resourceId, context.user_id);
      if (permission?.conditions) {
        const conditionsCheck = await this.evaluateConditions(permission.conditions, context);
        if (!conditionsCheck.allowed) {
          return conditionsCheck;
        }
      }

      // 5. Check for expired access
      if (permission?.expires_at && new Date(permission.expires_at) < new Date()) {
        return { allowed: false, reason: 'Access expired' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Access evaluation error:', error);
      return { allowed: false, reason: 'Access evaluation failed' };
    }
  }

  /**
   * Check if user can perform action based on workspace role
   */
  async checkWorkspaceAccess(
    workspaceId: string,
    userId: string,
    action: 'manage_settings' | 'invite_members' | 'delete_workspace' | 'view_analytics'
  ): Promise<{ allowed: boolean; reason?: string }> {
    const member = await this.getWorkspaceMember(workspaceId, userId);
    if (!member) {
      return { allowed: false, reason: 'Not a workspace member' };
    }

    const rolePermissions: Record<WorkspaceRole, string[]> = {
      owner: ['manage_settings', 'invite_members', 'delete_workspace', 'view_analytics'],
      admin: ['manage_settings', 'invite_members', 'view_analytics'],
      member: [],
      guest: [],
    };

    if (rolePermissions[member.role].includes(action)) {
      return { allowed: true };
    }

    return { allowed: false, reason: `Role '${member.role}' cannot perform '${action}'` };
  }

  /**
   * Validate permission change request
   */
  async validatePermissionChange(
    blockId: string,
    targetUserId: string,
    newPermission: PermissionLevel,
    requestingUserId: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 1. Check if requesting user has permission to change permissions
    const requestingUserAccess = await permissionService.getBlockAccessInfo(blockId, requestingUserId);
    if (!requestingUserAccess || requestingUserAccess.permission_level !== 'full_access') {
      issues.push('You do not have permission to change permissions on this block');
    }

    // 2. Check workspace policies
    const block = await this.getBlock(blockId);
    if (block) {
      const policies = await this.getWorkspacePolicies(block.workspace_id);
      const memberCanShare = policies.find(p => p.policy_key === 'default_policies')?.policy_value?.member_can_share;

      if (memberCanShare === false && newPermission !== 'can_view') {
        const member = await this.getWorkspaceMember(block.workspace_id, requestingUserId);
        if (member?.role === 'member') {
          issues.push('Workspace policy prevents members from sharing with edit access');
        }
      }
    }

    // 3. Check if would violate ownership constraints
    if (newPermission === 'full_access' && block && block.created_by !== requestingUserId) {
      const requestingMember = await this.getWorkspaceMember(block.workspace_id, requestingUserId);
      if (requestingMember?.role !== 'owner' && requestingMember?.role !== 'admin') {
        issues.push('Only workspace owners and admins can grant full access');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check workspace policies
   */
  private async checkWorkspacePolicies(
    workspaceId: string,
    userId: string,
    action: AccessAction
  ): Promise<{ allowed: boolean; reason?: string }> {
    const policies = await this.getWorkspacePolicies(workspaceId);
    const defaultPolicies = policies.find(p => p.policy_key === 'default_policies')?.policy_value;

    if (!defaultPolicies) {
      return { allowed: true };
    }

    // Check action-specific policies
    if (action === 'share' && defaultPolicies.allow_public_sharing === false) {
      return { allowed: false, reason: 'Public sharing disabled by workspace policy' };
    }

    if (action === 'export' && defaultPolicies.allow_export === false) {
      return { allowed: false, reason: 'Export disabled by workspace policy' };
    }

    if (action === 'duplicate' && defaultPolicies.allow_duplicate === false) {
      return { allowed: false, reason: 'Duplication disabled by workspace policy' };
    }

    // Check if 2FA required
    if (defaultPolicies.require_2fa === true) {
      const user2FAEnabled = await this.check2FAEnabled(userId);
      if (!user2FAEnabled) {
        return { allowed: false, reason: 'Two-factor authentication required' };
      }
    }

    return { allowed: true };
  }

  /**
   * Evaluate access conditions
   */
  private async evaluateConditions(
    conditions: Record<string, any>,
    context: AccessContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Time-based access
    if (conditions.time_range) {
      const now = new Date();
      const start = new Date(conditions.time_range.start);
      const end = new Date(conditions.time_range.end);

      if (now < start || now > end) {
        return { allowed: false, reason: 'Access outside allowed time range' };
      }
    }

    // IP whitelist
    if (conditions.ip_whitelist && context.ip_address) {
      const allowedIPs = conditions.ip_whitelist as string[];
      if (!allowedIPs.includes(context.ip_address)) {
        return { allowed: false, reason: 'IP address not whitelisted' };
      }
    }

    // Device verification
    if (conditions.require_verified_device === true) {
      const isVerified = await this.checkDeviceVerified(context.user_id, context.user_agent);
      if (!isVerified) {
        return { allowed: false, reason: 'Device not verified' };
      }
    }

    return { allowed: true };
  }

  /**
   * Map permission level to allowed actions
   */
  private permissionAllowsAction(
    permissionLevel: PermissionLevel,
    action: AccessAction
  ): boolean {
    const actionMatrix: Record<PermissionLevel, AccessAction[]> = {
      full_access: ['read', 'write', 'delete', 'move', 'share', 'comment', 'change_permissions', 'export', 'duplicate'],
      can_edit: ['read', 'write', 'comment', 'export', 'duplicate'],
      can_comment: ['read', 'comment'],
      can_view: ['read'],
    };

    return actionMatrix[permissionLevel].includes(action);
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private async getBlock(blockId: string): Promise<any | null> {
    const result = await query(
      'SELECT * FROM blocks WHERE id = $1 AND archived = FALSE',
      [blockId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getWorkspaceMember(workspaceId: string, userId: string): Promise<any | null> {
    const result = await query(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = $3',
      [workspaceId, userId, 'active']
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getWorkspacePolicies(workspaceId: string): Promise<any[]> {
    const result = await query(
      'SELECT * FROM workspace_policies WHERE workspace_id = $1',
      [workspaceId]
    );
    return result.rows;
  }

  private async check2FAEnabled(userId: string): Promise<boolean> {
    // TODO: Implement actual 2FA check
    // For now, assume enabled
    return true;
  }

  private async checkDeviceVerified(userId: string, userAgent?: string): Promise<boolean> {
    // TODO: Implement device verification
    // For now, assume verified
    return true;
  }
}

// Export singleton instance
export const accessControl = new AccessControlEngine();
