/**
 * MentionParser - Extract @page and @user mentions from content
 */

import { Block, RichTextSegment } from '../editor/BlockModel';

export interface PageMention {
  sourcePageId: string;
  targetPageId: string;
  blockId: string;
  mentionText: string;
  createdAt: Date;
}

export interface UserMention {
  userId: string;
  pageId: string;
  blockId: string;
  mentionedBy: string;
  createdAt: Date;
  read: boolean;
}

export class MentionParser {
  private static PAGE_MENTION_REGEX = /@\[\[([^\]]+)\]\]\(([a-f0-9-]{36})\)/g;
  private static USER_MENTION_REGEX = /@([a-zA-Z0-9_-]+)/g;

  /**
   * Extract page mentions from block content
   */
  static extractPageMentions(
    sourcePageId: string,
    blocks: Block[]
  ): PageMention[] {
    const mentions: PageMention[] = [];
    const now = new Date();

    for (const block of blocks) {
      const contentText = this.getBlockText(block);
      
      // Find all @[[Page Name]](page-id) patterns
      const matches = contentText.matchAll(this.PAGE_MENTION_REGEX);
      
      for (const match of matches) {
        const mentionText = match[1];
        const targetPageId = match[2];
        
        mentions.push({
          sourcePageId,
          targetPageId,
          blockId: block.id,
          mentionText,
          createdAt: now,
        });
      }
    }

    return mentions;
  }

  /**
   * Extract user mentions from block content
   */
  static extractUserMentions(
    pageId: string,
    blocks: Block[],
    mentionedBy: string
  ): UserMention[] {
    const mentions: UserMention[] = [];
    const now = new Date();

    for (const block of blocks) {
      const contentText = this.getBlockText(block);
      
      // Find all @username patterns
      const matches = contentText.matchAll(this.USER_MENTION_REGEX);
      
      for (const match of matches) {
        const userId = match[1];
        
        mentions.push({
          userId,
          pageId,
          blockId: block.id,
          mentionedBy,
          createdAt: now,
          read: false,
        });
      }
    }

    return mentions;
  }

  /**
   * Convert block content to plain text
   */
  private static getBlockText(block: Block): string {
    if (!block.content || !Array.isArray(block.content)) {
      return '';
    }

    return block.content
      .map((segment: RichTextSegment) => {
        if (typeof segment === 'string') return segment;
        if (typeof segment === 'object' && segment.text) return segment.text;
        return '';
      })
      .join('');
  }

  /**
   * Format page mention for insertion into content
   */
  static formatPageMention(pageName: string, pageId: string): string {
    return `@[[${pageName}]](${pageId})`;
  }

  /**
   * Format user mention for insertion into content
   */
  static formatUserMention(username: string): string {
    return `@${username}`;
  }

  /**
   * Parse mention from text and return structured data
   */
  static parseMention(text: string): {
    type: 'page' | 'user' | null;
    name: string;
    id?: string;
  } | null {
    // Try page mention pattern
    const pageMatch = text.match(/@\[\[([^\]]+)\]\]\(([a-f0-9-]{36})\)/);
    if (pageMatch) {
      return {
        type: 'page',
        name: pageMatch[1],
        id: pageMatch[2],
      };
    }

    // Try user mention pattern
    const userMatch = text.match(/@([a-zA-Z0-9_-]+)/);
    if (userMatch) {
      return {
        type: 'user',
        name: userMatch[1],
      };
    }

    return null;
  }

  /**
   * Check if text contains any mentions
   */
  static hasMentions(text: string): boolean {
    return this.PAGE_MENTION_REGEX.test(text) || this.USER_MENTION_REGEX.test(text);
  }

  /**
   * Get all mention positions in text for highlighting
   */
  static getMentionPositions(text: string): Array<{
    start: number;
    end: number;
    type: 'page' | 'user';
    name: string;
    id?: string;
  }> {
    const positions: Array<{
      start: number;
      end: number;
      type: 'page' | 'user';
      name: string;
      id?: string;
    }> = [];

    // Find page mentions
    const pageMatches = text.matchAll(this.PAGE_MENTION_REGEX);
    for (const match of pageMatches) {
      if (match.index !== undefined) {
        positions.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'page',
          name: match[1],
          id: match[2],
        });
      }
    }

    // Find user mentions
    const userMatches = text.matchAll(this.USER_MENTION_REGEX);
    for (const match of userMatches) {
      if (match.index !== undefined) {
        positions.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'user',
          name: match[1],
        });
      }
    }

    return positions.sort((a, b) => a.start - b.start);
  }
}
