/**
 * ShareLinkManager - Manage public share links for pages
 */

export type ShareRole = 'editor' | 'commenter' | 'viewer';

export interface ShareLink {
  id: string;
  pageId: string;
  token: string;
  role: ShareRole;
  hasPassword: boolean;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  accessCount: number;
  isActive: boolean;
}

export class ShareLinkManager {
  /**
   * Create a share link for a page
   */
  static async createLink(
    pageId: string,
    role: ShareRole,
    createdBy: string,
    password?: string,
    expiresAt?: string
  ): Promise<ShareLink | null> {
    try {
      const res = await fetch(`/api/pages/${pageId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, createdBy, password, expiresAt }),
      });
      if (res.ok) return await res.json();
      return null;
    } catch (error) {
      console.error('Failed to create share link:', error);
      return null;
    }
  }

  /**
   * Get all share links for a page
   */
  static async getLinks(pageId: string): Promise<ShareLink[]> {
    try {
      const res = await fetch(`/api/pages/${pageId}/share`);
      if (res.ok) {
        const data = await res.json();
        return data.links || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get share links:', error);
      return [];
    }
  }

  /**
   * Deactivate a share link
   */
  static async deactivateLink(pageId: string, linkId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/pages/${pageId}/share/${linkId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to deactivate link:', error);
      return false;
    }
  }

  /**
   * Build the full share URL for a token
   */
  static buildShareUrl(token: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/shared/${token}`;
  }
}
