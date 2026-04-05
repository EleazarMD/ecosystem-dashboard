/**
 * MarkdownExporter - Convert Block[] structure to Markdown text
 * Supports: headings, lists, code blocks, images, links, bold/italic/code
 */

import type { Block, RichTextSegment } from '@/lib/editor/BlockModel';

export class MarkdownExporter {
  /**
   * Export blocks to a markdown string
   */
  static export(title: string, blocks: Block[], metadata?: Record<string, string>): string {
    const lines: string[] = [];

    // Frontmatter
    if (metadata && Object.keys(metadata).length > 0) {
      lines.push('---');
      for (const [key, value] of Object.entries(metadata)) {
        lines.push(`${key}: "${value}"`);
      }
      lines.push('---');
      lines.push('');
    }

    // Title
    if (title) {
      lines.push(`# ${title}`);
      lines.push('');
    }

    for (const block of blocks) {
      const md = this.blockToMarkdown(block);
      if (md !== null) {
        lines.push(md);
        // Add blank line after most block types for readability
        if (!['bulleted_list', 'numbered_list', 'to_do'].includes(block.type)) {
          lines.push('');
        }
      }
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  private static blockToMarkdown(block: Block): string | null {
    const text = this.segmentsToMarkdown(block.content);

    switch (block.type) {
      case 'paragraph':
        return text || '';

      case 'heading_1':
        return `# ${text}`;

      case 'heading_2':
        return `## ${text}`;

      case 'heading_3':
        return `### ${text}`;

      case 'bulleted_list':
        return `- ${text}`;

      case 'numbered_list':
        return `1. ${text}`;

      case 'to_do':
        return `- [${block.properties?.checked ? 'x' : ' '}] ${text}`;

      case 'toggle':
        return `<details>\n<summary>${text}</summary>\n</details>`;

      case 'quote':
        return `> ${text}`;

      case 'callout':
        const icon = block.properties?.icon || 'ℹ️';
        return `> ${icon} ${text}`;

      case 'code':
        const lang = block.properties?.language || '';
        return `\`\`\`${lang}\n${text}\n\`\`\``;

      case 'divider':
        return '---';

      case 'image':
        const url = block.properties?.url || '';
        const caption = block.properties?.caption || '';
        return `![${caption}](${url})`;

      case 'video':
        const videoUrl = block.properties?.url || '';
        return `[Video](${videoUrl})`;

      case 'embed':
        const embedUrl = block.properties?.url || '';
        return `[Embed](${embedUrl})`;

      case 'file':
        const fileUrl = block.properties?.url || '';
        const fileName = block.properties?.name || 'file';
        return `[${fileName}](${fileUrl})`;

      case 'table':
        return this.tableToMarkdown(block);

      case 'spacer':
        return '';

      default:
        return text || null;
    }
  }

  /**
   * Convert RichTextSegment[] to markdown inline text
   */
  static segmentsToMarkdown(segments: RichTextSegment[]): string {
    if (!segments || segments.length === 0) return '';

    return segments.map(seg => {
      let text = seg.text || '';
      if (!text) return '';

      // Apply annotations
      if (seg.annotations?.code) text = `\`${text}\``;
      if (seg.annotations?.bold) text = `**${text}**`;
      if (seg.annotations?.italic) text = `*${text}*`;
      if (seg.annotations?.strikethrough) text = `~~${text}~~`;

      // Apply link
      if (seg.href) text = `[${text}](${seg.href})`;

      return text;
    }).join('');
  }

  private static tableToMarkdown(block: Block): string {
    const rows = block.properties?.rows;
    if (!Array.isArray(rows) || rows.length === 0) return '';

    const lines: string[] = [];
    const headerRow = rows[0];

    if (Array.isArray(headerRow)) {
      lines.push('| ' + headerRow.map((cell: any) => String(cell || '')).join(' | ') + ' |');
      lines.push('| ' + headerRow.map(() => '---').join(' | ') + ' |');

      for (let i = 1; i < rows.length; i++) {
        if (Array.isArray(rows[i])) {
          lines.push('| ' + rows[i].map((cell: any) => String(cell || '')).join(' | ') + ' |');
        }
      }
    }

    return lines.join('\n');
  }
}
