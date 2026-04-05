/**
 * PermissionManager - Manage page-level permissions
 */

export type PermissionRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface PagePermission {
  id: string;
  pageId: string;
  userId: string | null;
  role: PermissionRole;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

const ROLE_HIERARCHY: Record<PermissionRole, number> = {
  owner: 4,
  editor: 3,
  commenter: 2,
  viewer: 1,
};

export class PermissionManager {
  /**
   * Check if a user has at least the required role on a page
   */
  static hasPermission(userRole: PermissionRole, requiredRole: PermissionRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  }

  /**
   * Get permissions for a page
   */
  static async getPagePermissions(pageId: string): Promise<PagePermission[]> {
    try {
      const res = await fetch(`/api/pages/${pageId}/permissions`);
      if (res.ok) {
        const data = await res.json();
        return data.permissions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get permissions:', error);
      return [];
    }
  }

  /**
   * Get a specific user's role on a page
   */
  static async getUserRole(pageId: string, userId: string): Promise<PermissionRole | null> {
    try {
      const res = await fetch(`/api/pages/${pageId}/permissions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        return data.role || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return null;
    }
  }

  /**
   * Grant permission to a user
   */
  static async grantPermission(
    pageId: string,
    userId: string,
    role: PermissionRole,
    grantedBy: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/pages/${pageId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, grantedBy }),
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to grant permission:', error);
      return false;
    }
  }

  /**
   * Revoke a user's permission
   */
  static async revokePermission(pageId: string, permissionId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/pages/${pageId}/permissions/${permissionId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      return false;
    }
  }

  /**
   * Update a user's role
   */
  static async updateRole(pageId: string, permissionId: string, newRole: PermissionRole): Promise<boolean> {
    try {
      const res = await fetch(`/api/pages/${pageId}/permissions/${permissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to update role:', error);
      return false;
    }
  }
}
