/**
 * VersionHistory - Track and manage page version snapshots
 */

export interface PageVersion {
  id: string;
  pageId: string;
  versionNumber: number;
  title: string;
  content: any[];
  properties: any;
  createdBy: string;
  createdAt: Date;
  changeSummary?: string;
  snapshotType: 'auto' | 'manual' | 'restore';
}

export interface VersionDiff {
  blocksAdded: number;
  blocksRemoved: number;
  blocksModified: number;
  titleChanged: boolean;
  summary: string;
}

export class VersionHistory {
  /**
   * Create a version snapshot of a page
   */
  static async createSnapshot(
    pageId: string,
    title: string,
    content: any[],
    properties: any,
    userId: string,
    changeSummary?: string,
    snapshotType: 'auto' | 'manual' | 'restore' = 'auto'
  ): Promise<number | null> {
    try {
      const response = await fetch(`/api/pages/${pageId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          properties,
          createdBy: userId,
          changeSummary,
          snapshotType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.versionNumber;
      }
      return null;
    } catch (error) {
      console.error('Failed to create version snapshot:', error);
      return null;
    }
  }

  /**
   * Get all versions for a page
   */
  static async getVersions(pageId: string): Promise<PageVersion[]> {
    try {
      const response = await fetch(`/api/pages/${pageId}/versions`);
      if (response.ok) {
        const data = await response.json();
        return data.versions || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get versions:', error);
      return [];
    }
  }

  /**
   * Get a specific version
   */
  static async getVersion(pageId: string, versionNumber: number): Promise<PageVersion | null> {
    try {
      const response = await fetch(`/api/pages/${pageId}/versions/${versionNumber}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get version:', error);
      return null;
    }
  }

  /**
   * Restore a page to a specific version
   */
  static async restoreVersion(
    pageId: string,
    versionNumber: number,
    userId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/pages/${pageId}/versions/${versionNumber}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to restore version:', error);
      return false;
    }
  }

  /**
   * Compare two versions and return a diff summary
   */
  static computeDiff(versionA: PageVersion, versionB: PageVersion): VersionDiff {
    const contentA = versionA.content || [];
    const contentB = versionB.content || [];

    const idsA = new Set(contentA.map((b: any) => b.id));
    const idsB = new Set(contentB.map((b: any) => b.id));

    let blocksAdded = 0;
    let blocksRemoved = 0;
    let blocksModified = 0;

    // Count added blocks
    for (const block of contentB) {
      if (!idsA.has(block.id)) blocksAdded++;
    }

    // Count removed blocks
    for (const block of contentA) {
      if (!idsB.has(block.id)) blocksRemoved++;
    }

    // Count modified blocks
    for (const blockB of contentB) {
      if (idsA.has(blockB.id)) {
        const blockA = contentA.find((b: any) => b.id === blockB.id);
        if (blockA && JSON.stringify(blockA) !== JSON.stringify(blockB)) {
          blocksModified++;
        }
      }
    }

    const titleChanged = versionA.title !== versionB.title;

    const parts: string[] = [];
    if (titleChanged) parts.push('Title changed');
    if (blocksAdded > 0) parts.push(`${blocksAdded} block${blocksAdded > 1 ? 's' : ''} added`);
    if (blocksRemoved > 0) parts.push(`${blocksRemoved} block${blocksRemoved > 1 ? 's' : ''} removed`);
    if (blocksModified > 0) parts.push(`${blocksModified} block${blocksModified > 1 ? 's' : ''} modified`);
    const summary = parts.length > 0 ? parts.join(', ') : 'No changes';

    return { blocksAdded, blocksRemoved, blocksModified, titleChanged, summary };
  }
}
