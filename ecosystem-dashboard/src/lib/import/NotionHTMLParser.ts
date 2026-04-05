/**
 * NotionHTMLParser - Parse Notion HTML exports into Block[] structure
 * Handles Notion's specific HTML export format with nested blocks
 */

import { nanoid } from 'nanoid';
import type { Block, RichTextSegment, BlockType } from '@/lib/editor/BlockModel';

export interface NotionImportResult {
  title: string;
  blocks: Block[];
  images: { originalUrl: string; blockId: string }[];
}

export class NotionHTMLParser {
  /**
   * Parse Notion HTML export string into blocks
   */
  static parse(html: string): NotionImportResult {
    const blocks: Block[] = [];
    const images: { originalUrl: string; blockId: string }[] = [];

    // Extract title from <header> or first <h1>
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? this.stripHTML(titleMatch[1]) : 'Imported Page';

    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : html;

    // Parse block-level elements
    const blockRegex = /<(h[1-3]|p|ul|ol|blockquote|pre|hr|figure|div|table)[^>]*>([\s\S]*?)<\/\1>|<(hr)\s*\/?>/gi;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(body)) !== null) {
      const tag = (match[1] || match[3] || '').toLowerCase();
      const content = match[2] || '';

      switch (tag) {
        case 'h1':
          blocks.push(this.createBlock('heading_1', this.parseInlineHTML(content)));
          break;

        case 'h2':
          blocks.push(this.createBlock('heading_2', this.parseInlineHTML(content)));
          break;

        case 'h3':
          blocks.push(this.createBlock('heading_3', this.parseInlineHTML(content)));
          break;

        case 'p':
          // Check for image inside paragraph
          const imgMatch = content.match(/<img[^>]+src="([^"]*)"[^>]*(?:alt="([^"]*)")?/i);
          if (imgMatch) {
            const block = this.createBlock('image', [], {
              url: imgMatch[1],
              caption: imgMatch[2] || '',
            });
            images.push({ originalUrl: imgMatch[1], blockId: block.id });
            blocks.push(block);
          } else {
            const segments = this.parseInlineHTML(content);
            if (segments.length > 0 && segments.some(s => s.text.trim())) {
              blocks.push(this.createBlock('paragraph', segments));
            }
          }
          break;

        case 'ul':
          this.parseList(content, 'bulleted_list', blocks);
          break;

        case 'ol':
          this.parseList(content, 'numbered_list', blocks);
          break;

        case 'blockquote':
          blocks.push(this.createBlock('quote', this.parseInlineHTML(content)));
          break;

        case 'pre':
          const codeContent = content.match(/<code[^>]*(?:class="language-(\w+)")?[^>]*>([\s\S]*?)<\/code>/i);
          if (codeContent) {
            blocks.push(this.createBlock('code', [{ text: this.stripHTML(codeContent[2]) }], {
              language: codeContent[1] || '',
            }));
          } else {
            blocks.push(this.createBlock('code', [{ text: this.stripHTML(content) }]));
          }
          break;

        case 'hr':
          blocks.push(this.createBlock('divider', []));
          break;

        case 'figure':
          const figImg = content.match(/<img[^>]+src="([^"]*)"[^>]*/i);
          const figCaption = content.match(/<figcaption>(.*?)<\/figcaption>/i);
          if (figImg) {
            const block = this.createBlock('image', [], {
              url: figImg[1],
              caption: figCaption ? this.stripHTML(figCaption[1]) : '',
            });
            images.push({ originalUrl: figImg[1], blockId: block.id });
            blocks.push(block);
          }
          break;

        case 'table':
          blocks.push(this.parseTable(content));
          break;

        case 'div':
          // Notion uses divs for callouts, toggles, etc.
          if (content.includes('callout') || content.includes('icon')) {
            blocks.push(this.createBlock('callout', this.parseInlineHTML(content)));
          } else if (content.includes('toggle')) {
            const summaryMatch = content.match(/<summary>(.*?)<\/summary>/i);
            blocks.push(this.createBlock('toggle', this.parseInlineHTML(summaryMatch?.[1] || content)));
          } else {
            // Nested divs → parse inner content as paragraphs
            const innerText = this.stripHTML(content).trim();
            if (innerText) {
              blocks.push(this.createBlock('paragraph', this.parseInlineHTML(content)));
            }
          }
          break;
      }
    }

    return { title, blocks, images };
  }

  /**
   * Parse inline HTML into RichTextSegment[]
   */
  private static parseInlineHTML(html: string): RichTextSegment[] {
    if (!html) return [{ text: '' }];

    const segments: RichTextSegment[] = [];
    // Process inline elements: <strong>, <em>, <code>, <s>, <a>, <span>
    const pattern = /<(strong|b|em|i|code|s|del|a|span)[^>]*>(.*?)<\/\1>|([^<]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      const tag = (match[1] || '').toLowerCase();
      const innerContent = match[2] || '';
      const plainText = match[3] || '';

      if (plainText) {
        const decoded = this.decodeHTML(plainText);
        if (decoded.trim()) {
          segments.push({ text: decoded });
        }
      } else if (tag) {
        const text = this.stripHTML(innerContent);
        if (!text.trim()) continue;

        const segment: RichTextSegment = { text };

        switch (tag) {
          case 'strong': case 'b':
            segment.annotations = { bold: true };
            break;
          case 'em': case 'i':
            segment.annotations = { italic: true };
            break;
          case 'code':
            segment.annotations = { code: true };
            break;
          case 's': case 'del':
            segment.annotations = { strikethrough: true };
            break;
          case 'a':
            const hrefMatch = match[0].match(/href="([^"]*)"/);
            if (hrefMatch) segment.href = hrefMatch[1];
            break;
        }

        segments.push(segment);
      }
    }

    if (segments.length === 0) {
      const text = this.stripHTML(html).trim();
      if (text) segments.push({ text });
    }

    return segments;
  }

  private static parseList(html: string, type: 'bulleted_list' | 'numbered_list', blocks: Block[]) {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match: RegExpExecArray | null;

    while ((match = liRegex.exec(html)) !== null) {
      const content = match[1];
      // Check for to_do (Notion checkbox lists)
      const checkMatch = content.match(/<input[^>]*type="checkbox"[^>]*(checked)?/i);
      if (checkMatch) {
        const text = this.stripHTML(content.replace(/<input[^>]*>/i, '')).trim();
        blocks.push(this.createBlock('to_do', [{ text }], { checked: !!checkMatch[1] }));
      } else {
        blocks.push(this.createBlock(type, this.parseInlineHTML(content)));
      }
    }
  }

  private static parseTable(html: string): Block {
    const rows: string[][] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trRegex.exec(html)) !== null) {
      const cells: string[] = [];
      const tdRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let tdMatch: RegExpExecArray | null;

      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        cells.push(this.stripHTML(tdMatch[1]).trim());
      }
      if (cells.length > 0) rows.push(cells);
    }

    return this.createBlock('table', [], { rows });
  }

  private static stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  private static decodeHTML(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
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
