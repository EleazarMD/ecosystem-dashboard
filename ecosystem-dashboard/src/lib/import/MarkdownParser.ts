/**
 * MarkdownParser - Convert Markdown text into Block[] structure
 * Supports: headings, lists, code blocks, images, links, bold/italic/code
 */

import { nanoid } from 'nanoid';
import type { Block, RichTextSegment, BlockType } from '@/lib/editor/BlockModel';

export interface MarkdownImportResult {
  title: string;
  blocks: Block[];
  metadata?: Record<string, string>;
}

export class MarkdownParser {
  /**
   * Parse a full markdown document into blocks
   */
  static parse(markdown: string): MarkdownImportResult {
    const { frontmatter, body } = this.extractFrontmatter(markdown);
    const lines = body.split('\n');
    const blocks: Block[] = [];
    let title = frontmatter['title'] || '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines
      if (line.trim() === '') { i++; continue; }

      // Headings
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length as 1 | 2 | 3;
        const text = headingMatch[2];
        if (!title && level === 1) title = text;
        blocks.push(this.createBlock(`heading_${level}` as BlockType, this.parseInlineFormatting(text)));
        i++; continue;
      }

      // Code blocks
      if (line.trim().startsWith('```')) {
        const langMatch = line.trim().match(/^```(\w*)/);
        const language = langMatch?.[1] || '';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push(this.createBlock('code', [{ text: codeLines.join('\n') }], { language }));
        continue;
      }

      // Horizontal rule / divider
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        blocks.push(this.createBlock('divider', []));
        i++; continue;
      }

      // Unordered list
      if (/^\s*[-*+]\s/.test(line)) {
        const listMatch = line.match(/^\s*[-*+]\s+(.+)/);
        if (listMatch) {
          // Check for checkbox syntax
          const checkMatch = listMatch[1].match(/^\[([xX ])\]\s*(.*)/);
          if (checkMatch) {
            const checked = checkMatch[1].toLowerCase() === 'x';
            blocks.push(this.createBlock('to_do', this.parseInlineFormatting(checkMatch[2]), { checked }));
          } else {
            blocks.push(this.createBlock('bulleted_list', this.parseInlineFormatting(listMatch[1])));
          }
        }
        i++; continue;
      }

      // Ordered list
      const olMatch = line.match(/^\s*\d+[.)]\s+(.+)/);
      if (olMatch) {
        blocks.push(this.createBlock('numbered_list', this.parseInlineFormatting(olMatch[1])));
        i++; continue;
      }

      // Blockquote
      if (line.trim().startsWith('>')) {
        const quoteText = line.replace(/^>\s*/, '');
        blocks.push(this.createBlock('quote', this.parseInlineFormatting(quoteText)));
        i++; continue;
      }

      // Image
      const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        blocks.push(this.createBlock('image', [], {
          url: imgMatch[2],
          caption: imgMatch[1] || undefined,
        }));
        i++; continue;
      }

      // Default: paragraph
      blocks.push(this.createBlock('paragraph', this.parseInlineFormatting(line)));
      i++;
    }

    return { title: title || 'Imported Document', blocks, metadata: frontmatter };
  }

  /**
   * Extract YAML frontmatter from markdown
   */
  private static extractFrontmatter(md: string): { frontmatter: Record<string, string>; body: string } {
    const fmMatch = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!fmMatch) return { frontmatter: {}, body: md };

    const frontmatter: Record<string, string> = {};
    fmMatch[1].split('\n').forEach(line => {
      const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
      if (kv) frontmatter[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    });

    return { frontmatter, body: fmMatch[2] };
  }

  /**
   * Parse inline formatting: **bold**, *italic*, `code`, [links](url), ~~strikethrough~~
   */
  static parseInlineFormatting(text: string): RichTextSegment[] {
    const segments: RichTextSegment[] = [];
    // Regex for inline patterns: bold, italic, code, strikethrough, links
    const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\~\~(.+?)\~\~)|(\[([^\]]+)\]\(([^)]+)\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      // Add plain text before this match
      if (match.index > lastIndex) {
        segments.push({ text: text.substring(lastIndex, match.index) });
      }

      if (match[1]) {
        // Bold: **text**
        segments.push({ text: match[2], annotations: { bold: true } });
      } else if (match[3]) {
        // Italic: *text*
        segments.push({ text: match[4], annotations: { italic: true } });
      } else if (match[5]) {
        // Code: `text`
        segments.push({ text: match[6], annotations: { code: true } });
      } else if (match[7]) {
        // Strikethrough: ~~text~~
        segments.push({ text: match[8], annotations: { strikethrough: true } });
      } else if (match[9]) {
        // Link: [text](url)
        segments.push({ text: match[10], href: match[11] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({ text: text.substring(lastIndex) });
    }

    if (segments.length === 0) {
      segments.push({ text });
    }

    return segments;
  }

  private static createBlock(type: BlockType, content: RichTextSegment[], properties: Record<string, any> = {}): Block {
    return {
      id: nanoid(),
      type,
      content,
      properties,
      parentId: null,
      children: [],
      createdTime: Date.now(),
      lastEditedTime: Date.now(),
      createdBy: 'import',
      lastEditedBy: 'import',
    };
  }
}
