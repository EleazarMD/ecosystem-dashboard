/**
 * Permission Service
 * Hierarchical permission resolution with inheritance
 * Based on Notion's permission architecture
 */

import { query, transaction } from '../db/client';
import {
  WorkspacePermission,
  WorkspaceMember,
  BlockAccessInfo,
  PermissionLevel,
  WorkspaceRole,
  ShareScope,
  PermissionCapabilities,
} from '../../types/workspace';
import crypto from 'crypto';

export class PermissionService {
  /**
   * Resolve effective permission for a user on a block
   * Follows inheritance chain: block → parent → workspace
   */
  async resolvePermission(
    blockId: string,
    userId: string
  ): Promise<PermissionLevel | null> {
    // 1. Check cache first
    const cached = await this.getCachedPermission(userId, blockId);
    if (cached) {
      return cached;
    }

    // 2. Check explicit permission on this block
    const explicit = await this.getExplicitPermission(blockId, userId);
    if (explicit && !explicit.is_inherited) {
      await this.cachePermission(userId, blockId, explicit.permission_level);
      return explicit.permission_level;
    }

    // 3. Check inherited permission
    if (explicit && explicit.is_inherited && explicit.inherited_from) {
      const inheritedPermission = await this.resolvePermission(explicit.inherited_from, userId);
      if (inheritedPermission) {
        return inheritedPermission;
      }
    }

    // 4. Traverse up to parent block
    const block = await this.getBlock(blockId);
    if (!block) {
      return null;
    }

    if (block.parent_id) {
      const parentPermission = await this.resolvePermission(block.parent_id, userId);
      if (parentPermission) {
        await this.cachePermission(userId, blockId, parentPermission);
        return parentPermission;
      }
    }

    // 5. Fall back to workspace role
    const workspaceMember = await this.getWorkspaceMember(block.workspace_id, userId);
    if (workspaceMember) {
      const permissionFromRole = this.roleToPermissionLevel(workspaceMember.role);
      await this.cachePermission(userId, blockId, permissionFromRole);
      return permissionFromRole;
    }

    // 6. No access
    return null;
  }

  /**
   * Get detailed access information for a user on a block
   */
  async getBlockAccessInfo(
    blockId: string,
    userId: string
  ): Promise<BlockAccessInfo | null> {
    const permission = await this.resolvePermission(blockId, userId);
    if (!permission) {
      return null;
    }

    const block = await this.getBlock(blockId);
    if (!block) {
      return null;
    }

    const workspaceMember = await this.getWorkspaceMember(block.workspace_id, userId);
    const explicitPermission = await this.getExplicitPermission(blockId, userId);
    const capabilities = this.getCapabilities(permission, workspaceMember?.role);

    return {
      block_id: blockId,
      user_id: userId,
      permission_level: permission,
      share_scope: explicitPermission?.share_scope || 'workspace',
      is_owner: block.created_by === userId,
      can_share: capabilities.can_share,
      can_delete: capabilities.can_delete,
      can_move: capabilities.can_move,
      can_comment: capabilities.can_comment,
      inherited_from: explicitPermission?.inherited_from,
      workspace_role: workspaceMember?.role,
    };
  }

  /**
   * Grant permission to a user
   */
  async grantPermission(
    blockId: string,
    userEmail: string,
    permissionLevel: PermissionLevel,
    grantedBy: string,
    options: {
      message?: string;
      expiresInDays?: number;
      propagate?: boolean;
    } = {}
  ): Promise<WorkspacePermission> {
    const { message, expiresInDays, propagate = false } = options;

    return await transaction(async (client) => {
      // Calculate expiration
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Insert or update permission
      const result = await client.query(
        `INSERT INTO workspace_permissions 
         (block_id, user_email, permission_level, share_scope, granted_by, expires_at, is_inherited, inherited_from)
         VALUES ($1, $2, $3, 'specific', $4, $5, FALSE, NULL)
         ON CONFLICT (block_id, user_id) 
         DO UPDATE SET 
           permission_level = EXCLUDED.permission_level,
           granted_by = EXCLUDED.granted_by,
           expires_at = EXCLUDED.expires_at,
           is_inherited = FALSE,
           inherited_from = NULL,
           updated_at = NOW()
         RETURNING *`,
        [blockId, userEmail, permissionLevel, grantedBy, expiresAt]
      );

      const permission = this.mapRowToPermission(result.rows[0]);

      // Invalidate cache
      await this.invalidateCache(blockId);

      // Propagate to children if requested
      if (propagate) {
        await this.propagatePermission(blockId, userEmail, permissionLevel, grantedBy, client);
      }

      return permission;
    });
  }

  /**
   * Revoke permission from a user
   */
  async revokePermission(blockId: string, userId: string): Promise<void> {
    await transaction(async (client) => {
      // Delete permission
      await client.query(
        'DELETE FROM workspace_permissions WHERE block_id = $1 AND user_id = $2',
        [blockId, userId]
      );

      // Invalidate cache
      await this.invalidateCache(blockId, userId);
    });
  }

  /**
   * Create shareable link
   */
  async createShareLink(
    blockId: string,
    permissionLevel: PermissionLevel,
    grantedBy: string,
    expiresInDays?: number
  ): Promise<{ link_url: string; link_token: string }> {
    const linkToken = this.generateLinkToken();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO workspace_permissions 
       (block_id, link_token, permission_level, share_scope, granted_by, expires_at)
       VALUES ($1, $2, $3, 'link', $4, $5)`,
      [blockId, linkToken, permissionLevel, grantedBy, expiresAt]
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8404';
    const linkUrl = `${baseUrl}/shared/${linkToken}`;

    return { link_url: linkUrl, link_token: linkToken };
  }

  /**
   * Get all collaborators for a block
   */
  async getCollaborators(blockId: string): Promise<Array<{
    user_id: string;
    user_email: string;
    user_name?: string;
    permission_level: PermissionLevel;
    granted_at: Date;
    is_inherited: boolean;
  }>> {
    const result = await query(
      `SELECT p.*, wm.user_name
       FROM workspace_permissions p
       LEFT JOIN workspace_members wm ON wm.user_id = p.user_id
       WHERE p.block_id = $1 
         AND p.user_id IS NOT NULL
         AND (p.expires_at IS NULL OR p.expires_at > NOW())
       ORDER BY p.granted_at DESC`,
      [blockId]
    );

    return result.rows.map(row => ({
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
      permission_level: row.permission_level,
      granted_at: row.granted_at,
      is_inherited: row.is_inherited,
    }));
  }

  /**
   * Propagate permission down the tree
   */
  private async propagatePermission(
    blockId: string,
    userEmail: string,
    permissionLevel: PermissionLevel,
    grantedBy: string,
    client: any
  ): Promise<void> {
    // Get all descendant blocks
    const descendants = await this.getDescendantBlocks(blockId, client);

    for (const descendant of descendants) {
      // Check if descendant has explicit permission
      const hasExplicit = await this.hasExplicitPermission(descendant.id, userEmail, client);

      if (!hasExplicit) {
        // Create inherited permission
        await client.query(
          `INSERT INTO workspace_permissions 
           (block_id, user_email, permission_level, share_scope, granted_by, is_inherited, inherited_from)
           VALUES ($1, $2, $3, 'specific', $4, TRUE, $5)
           ON CONFLICT (block_id, user_id) 
           DO UPDATE SET 
             permission_level = EXCLUDED.permission_level,
             inherited_from = EXCLUDED.inherited_from,
             is_inherited = TRUE`,
          [descendant.id, userEmail, permissionLevel, grantedBy, blockId]
        );
      }
    }
  }

  /**
   * Get permission capabilities based on level and role
   */
  getCapabilities(
    permissionLevel: PermissionLevel,
    workspaceRole?: WorkspaceRole
  ): PermissionCapabilities {
    const baseCapabilities: Record<PermissionLevel, Partial<PermissionCapabilities>> = {
      full_access: {
        can_read: true,
        can_write: true,
        can_delete: true,
        can_move: true,
        can_duplicate: true,
        can_comment: true,
        can_share: true,
        can_invite: true,
        can_change_permissions: true,
        can_transfer_ownership: false, // Only owners
        can_view_history: true,
        can_restore_versions: true,
      },
      can_edit: {
        can_read: true,
        can_write: true,
        can_delete: false,
        can_move: false,
        can_duplicate: true,
        can_comment: true,
        can_share: false,
        can_invite: false,
        can_change_permissions: false,
        can_transfer_ownership: false,
        can_view_history: true,
        can_restore_versions: true,
      },
      can_comment: {
        can_read: true,
        can_write: false,
        can_delete: false,
        can_move: false,
        can_duplicate: false,
        can_comment: true,
        can_share: false,
        can_invite: false,
        can_change_permissions: false,
        can_transfer_ownership: false,
        can_view_history: true,
        can_restore_versions: false,
      },
      can_view: {
        can_read: true,
        can_write: false,
        can_delete: false,
        can_move: false,
        can_duplicate: false,
        can_comment: false,
        can_share: false,
        can_invite: false,
        can_change_permissions: false,
        can_transfer_ownership: false,
        can_view_history: true,
        can_restore_versions: false,
      },
    };

    const capabilities = baseCapabilities[permissionLevel] as PermissionCapabilities;

    // Enhance based on workspace role
    if (workspaceRole === 'owner') {
      capabilities.can_transfer_ownership = true;
      capabilities.can_delete = true;
    } else if (workspaceRole === 'admin') {
      capabilities.can_share = true;
      capabilities.can_invite = true;
    }

    return capabilities;
  }

  /**
   * Convert workspace role to default permission level
   */
  private roleToPermissionLevel(role: WorkspaceRole): PermissionLevel {
    const roleMapping: Record<WorkspaceRole, PermissionLevel> = {
      owner: 'full_access',
      admin: 'full_access',
      member: 'can_edit',
      guest: 'can_view',
    };
    return roleMapping[role];
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private async getExplicitPermission(
    blockId: string,
    userId: string
  ): Promise<WorkspacePermission | null> {
    const result = await query(
      `SELECT * FROM workspace_permissions 
       WHERE block_id = $1 AND user_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [blockId, userId]
    );

    return result.rows.length > 0 ? this.mapRowToPermission(result.rows[0]) : null;
  }

  private async getBlock(blockId: string): Promise<any | null> {
    const result = await query(
      'SELECT * FROM blocks WHERE id = $1 AND archived = FALSE',
      [blockId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  private async getWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMember | null> {
    const result = await query(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = $3',
      [workspaceId, userId, 'active']
    );
    return result.rows.length > 0 ? this.mapRowToMember(result.rows[0]) : null;
  }

  private async getDescendantBlocks(blockId: string, client?: any): Promise<any[]> {
    const db = client || { query };
    const result = await db.query(
      `WITH RECURSIVE descendants AS (
        SELECT id, parent_id, workspace_id FROM blocks WHERE parent_id = $1
        UNION ALL
        SELECT b.id, b.parent_id, b.workspace_id
        FROM blocks b
        INNER JOIN descendants d ON b.parent_id = d.id
      )
      SELECT * FROM descendants`,
      [blockId]
    );
    return result.rows;
  }

  private async hasExplicitPermission(
    blockId: string,
    userEmail: string,
    client?: any
  ): Promise<boolean> {
    const db = client || { query };
    const result = await db.query(
      'SELECT 1 FROM workspace_permissions WHERE block_id = $1 AND user_email = $2 AND is_inherited = FALSE',
      [blockId, userEmail]
    );
    return result.rows.length > 0;
  }

  // Cache operations
  private async getCachedPermission(
    userId: string,
    blockId: string
  ): Promise<PermissionLevel | null> {
    const cacheKey = `perm:${userId}:${blockId}`;
    const result = await query(
      'SELECT effective_permission FROM permission_cache WHERE cache_key = $1 AND expires_at > NOW()',
      [cacheKey]
    );
    return result.rows.length > 0 ? result.rows[0].effective_permission : null;
  }

  private async cachePermission(
    userId: string,
    blockId: string,
    permission: PermissionLevel
  ): Promise<void> {
    const cacheKey = `perm:${userId}:${blockId}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    await query(
      `INSERT INTO permission_cache (cache_key, user_id, block_id, effective_permission, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (cache_key) 
       DO UPDATE SET 
         effective_permission = EXCLUDED.effective_permission,
         computed_at = NOW(),
         expires_at = EXCLUDED.expires_at`,
      [cacheKey, userId, blockId, permission, expiresAt]
    );
  }

  private async invalidateCache(blockId: string, userId?: string): Promise<void> {
    if (userId) {
      const cacheKey = `perm:${userId}:${blockId}`;
      await query('DELETE FROM permission_cache WHERE cache_key = $1', [cacheKey]);
    } else {
      await query('DELETE FROM permission_cache WHERE block_id = $1', [blockId]);
    }
  }

  private generateLinkToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private mapRowToPermission(row: any): WorkspacePermission {
    return {
      id: row.id,
      block_id: row.block_id,
      user_id: row.user_id,
      user_email: row.user_email,
      link_token: row.link_token,
      permission_level: row.permission_level,
      share_scope: row.share_scope,
      granted_by: row.granted_by,
      granted_at: row.granted_at,
      expires_at: row.expires_at,
      last_accessed_at: row.last_accessed_at,
      access_count: row.access_count,
      is_inherited: row.is_inherited,
      inherited_from: row.inherited_from,
      conditions: row.conditions,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapRowToMember(row: any): WorkspaceMember {
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      user_id: row.user_id,
      user_email: row.user_email,
      user_name: row.user_name,
      user_avatar: row.user_avatar,
      role: row.role,
      invited_by: row.invited_by,
      joined_at: row.joined_at,
      last_active_at: row.last_active_at,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
