/**
 * BacklinkTracker - Track and query page backlinks
 */

import { Block } from '../editor/BlockModel';
import { MentionParser, PageMention } from './MentionParser';

export interface Backlink {
  sourcePageId: string;
  sourcePageTitle: string;
  blockId: string;
  blockContent: string;
  mentionText: string;
  createdAt: Date;
}

export interface BacklinkStats {
  totalBacklinks: number;
  uniquePages: number;
  recentBacklinks: Backlink[];
}

export class BacklinkTracker {
  /**
   * Get all backlinks for a page
   */
  static async getBacklinks(
    pageId: string,
    workspaceId: string
  ): Promise<Backlink[]> {
    try {
      const response = await fetch(
        `/api/pages/${pageId}/backlinks?workspaceId=${workspaceId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch backlinks: ${response.status}`);
      }

      const data = await response.json();
      return data.backlinks || [];
    } catch (error) {
      console.error('Error fetching backlinks:', error);
      return [];
    }
  }

  /**
   * Track mentions when page is saved
   */
  static async trackMentions(
    sourcePageId: string,
    workspaceId: string,
    blocks: Block[]
  ): Promise<void> {
    try {
      const mentions = MentionParser.extractPageMentions(sourcePageId, blocks);

      if (mentions.length === 0) {
        return;
      }

      const response = await fetch(`/api/pages/${sourcePageId}/mentions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          mentions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to track mentions: ${response.status}`);
      }
    } catch (error) {
      console.error('Error tracking mentions:', error);
    }
  }

  /**
   * Get backlink statistics for a page
   */
  static async getBacklinkStats(
    pageId: string,
    workspaceId: string
  ): Promise<BacklinkStats> {
    const backlinks = await this.getBacklinks(pageId, workspaceId);

    const uniquePages = new Set(backlinks.map(b => b.sourcePageId)).size;
    const recentBacklinks = backlinks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      totalBacklinks: backlinks.length,
      uniquePages,
      recentBacklinks,
    };
  }

  /**
   * Find broken links (mentions to deleted pages)
   */
  static async findBrokenLinks(
    pageId: string,
    workspaceId: string,
    blocks: Block[]
  ): Promise<Array<{ blockId: string; targetPageId: string; mentionText: string }>> {
    const mentions = MentionParser.extractPageMentions(pageId, blocks);
    const brokenLinks: Array<{ blockId: string; targetPageId: string; mentionText: string }> = [];

    for (const mention of mentions) {
      try {
        const response = await fetch(
          `/api/blocks/${mention.targetPageId}?workspaceId=${workspaceId}`
        );

        if (!response.ok) {
          brokenLinks.push({
            blockId: mention.blockId,
            targetPageId: mention.targetPageId,
            mentionText: mention.mentionText,
          });
        }
      } catch (error) {
        brokenLinks.push({
          blockId: mention.blockId,
          targetPageId: mention.targetPageId,
          mentionText: mention.mentionText,
        });
      }
    }

    return brokenLinks;
  }

  /**
   * Get related pages based on shared backlinks
   */
  static async getRelatedPages(
    pageId: string,
    workspaceId: string
  ): Promise<Array<{ pageId: string; title: string; sharedBacklinks: number }>> {
    try {
      const response = await fetch(
        `/api/pages/${pageId}/related?workspaceId=${workspaceId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch related pages: ${response.status}`);
      }

      const data = await response.json();
      return data.relatedPages || [];
    } catch (error) {
      console.error('Error fetching related pages:', error);
      return [];
    }
  }

  /**
   * Update backlinks when a page is deleted
   */
  static async handlePageDeletion(
    pageId: string,
    workspaceId: string
  ): Promise<void> {
    try {
      await fetch(`/api/pages/${pageId}/mentions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId }),
      });
    } catch (error) {
      console.error('Error cleaning up mentions:', error);
    }
  }

  /**
   * Get pages that this page mentions (outbound links)
   */
  static async getOutboundLinks(
    pageId: string,
    workspaceId: string
  ): Promise<Array<{ targetPageId: string; title: string; mentionCount: number }>> {
    try {
      const response = await fetch(
        `/api/pages/${pageId}/outbound-links?workspaceId=${workspaceId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch outbound links: ${response.status}`);
      }

      const data = await response.json();
      return data.outboundLinks || [];
    } catch (error) {
      console.error('Error fetching outbound links:', error);
      return [];
    }
  }
}
