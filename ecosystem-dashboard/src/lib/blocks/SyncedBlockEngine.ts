/**
 * SyncedBlockEngine - Manage synced blocks that propagate changes across pages
 */

export interface SyncedBlock {
  id: string;
  sourceBlockId: string;
  workspaceId: string;
  content: any[];
  properties: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncedBlockReference {
  id: string;
  syncedBlockId: string;
  pageId: string;
  blockId: string;
  createdAt: string;
}

export class SyncedBlockEngine {
  /**
   * Create a synced block from an existing block
   */
  static async create(
    workspaceId: string,
    sourceBlockId: string,
    content: any[],
    properties: any,
    createdBy: string
  ): Promise<SyncedBlock | null> {
    try {
      const res = await fetch('/api/synced-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, sourceBlockId, content, properties, createdBy }),
      });
      if (res.ok) return await res.json();
      return null;
    } catch (error) {
      console.error('Failed to create synced block:', error);
      return null;
    }
  }

  /**
   * Get a synced block by ID
   */
  static async get(syncedBlockId: string): Promise<SyncedBlock | null> {
    try {
      const res = await fetch(`/api/synced-blocks/${syncedBlockId}`);
      if (res.ok) return await res.json();
      return null;
    } catch (error) {
      console.error('Failed to get synced block:', error);
      return null;
    }
  }

  /**
   * Update the content of a synced block (propagates to all references)
   */
  static async update(syncedBlockId: string, content: any[], properties: any): Promise<boolean> {
    try {
      const res = await fetch(`/api/synced-blocks/${syncedBlockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, properties }),
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to update synced block:', error);
      return false;
    }
  }

  /**
   * Add a reference to a synced block in a page
   */
  static async addReference(syncedBlockId: string, pageId: string, blockId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/synced-blocks/${syncedBlockId}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, blockId }),
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to add reference:', error);
      return false;
    }
  }

  /**
   * Get all pages that reference a synced block
   */
  static async getReferences(syncedBlockId: string): Promise<SyncedBlockReference[]> {
    try {
      const res = await fetch(`/api/synced-blocks/${syncedBlockId}/references`);
      if (res.ok) {
        const data = await res.json();
        return data.references || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get references:', error);
      return [];
    }
  }

  /**
   * Unlink a synced block reference (make independent copy)
   */
  static async unlinkReference(syncedBlockId: string, referenceId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/synced-blocks/${syncedBlockId}/references/${referenceId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to unlink reference:', error);
      return false;
    }
  }
}
