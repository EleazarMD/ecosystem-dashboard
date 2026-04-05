/**
 * PDFExporter - Generate PDF from Block[] structure
 * Uses browser print-to-PDF via a styled HTML intermediate
 */

import type { Block, RichTextSegment } from '@/lib/editor/BlockModel';
import { MarkdownExporter } from './MarkdownExporter';

export class PDFExporter {
  /**
   * Generate a styled HTML string suitable for print-to-PDF
   */
  static generatePrintHTML(title: string, blocks: Block[]): string {
    const bodyHTML = blocks.map(block => this.blockToHTML(block)).filter(Boolean).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${this.escapeHTML(title)}</title>
  <style>
    @page { margin: 1in; size: letter; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; font-weight: 600; margin: 0.8em 0 0.4em; }
    h3 { font-size: 1.2em; font-weight: 600; margin: 0.6em 0 0.3em; }
    p { margin: 0.5em 0; }
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    li { margin: 0.2em 0; }
    blockquote { border-left: 3px solid #ddd; padding-left: 1em; margin: 0.5em 0; color: #555; }
    pre { background: #f6f8fa; border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 13px; }
    code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1em 0; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    .callout { background: #f8f9fa; border-left: 4px solid #4299e1; padding: 12px 16px; border-radius: 4px; margin: 0.5em 0; }
    .todo { list-style: none; padding-left: 0; }
    .todo li::before { content: '☐ '; }
    .todo li.checked::before { content: '☑ '; }
    table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    @media print {
      body { max-width: none; padding: 0; }
      pre { white-space: pre-wrap; }
    }
  </style>
</head>
<body>
  <h1>${this.escapeHTML(title)}</h1>
  ${bodyHTML}
</body>
</html>`;
  }

  /**
   * Trigger browser print dialog (print-to-PDF)
   */
  static printToPDF(title: string, blocks: Block[]) {
    const html = this.generatePrintHTML(title, blocks);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  /**
   * Generate HTML blob for download
   */
  static generateHTMLBlob(title: string, blocks: Block[]): Blob {
    const html = this.generatePrintHTML(title, blocks);
    return new Blob([html], { type: 'text/html' });
  }

  private static blockToHTML(block: Block): string {
    const content = this.segmentsToHTML(block.content);

    switch (block.type) {
      case 'paragraph':
        return `<p>${content}</p>`;
      case 'heading_1':
        return `<h1>${content}</h1>`;
      case 'heading_2':
        return `<h2>${content}</h2>`;
      case 'heading_3':
        return `<h3>${content}</h3>`;
      case 'bulleted_list':
        return `<ul><li>${content}</li></ul>`;
      case 'numbered_list':
        return `<ol><li>${content}</li></ol>`;
      case 'to_do':
        const checked = block.properties?.checked ? ' checked' : '';
        return `<ul class="todo"><li class="${checked ? 'checked' : ''}">${content}</li></ul>`;
      case 'quote':
        return `<blockquote>${content}</blockquote>`;
      case 'callout':
        const icon = block.properties?.icon || '';
        return `<div class="callout">${icon ? icon + ' ' : ''}${content}</div>`;
      case 'code':
        const lang = block.properties?.language || '';
        return `<pre><code class="language-${lang}">${this.escapeHTML(block.content?.[0]?.text || '')}</code></pre>`;
      case 'divider':
        return '<hr>';
      case 'image':
        const url = block.properties?.url || '';
        const caption = block.properties?.caption || '';
        return `<figure><img src="${this.escapeHTML(url)}" alt="${this.escapeHTML(caption)}"><figcaption>${this.escapeHTML(caption)}</figcaption></figure>`;
      case 'toggle':
        return `<details><summary>${content}</summary></details>`;
      case 'table':
        return this.tableToHTML(block);
      default:
        return content ? `<p>${content}</p>` : '';
    }
  }

  private static segmentsToHTML(segments: RichTextSegment[]): string {
    if (!segments || segments.length === 0) return '';

    return segments.map(seg => {
      let text = this.escapeHTML(seg.text || '');
      if (!text) return '';

      if (seg.annotations?.code) text = `<code>${text}</code>`;
      if (seg.annotations?.bold) text = `<strong>${text}</strong>`;
      if (seg.annotations?.italic) text = `<em>${text}</em>`;
      if (seg.annotations?.strikethrough) text = `<s>${text}</s>`;
      if (seg.annotations?.underline) text = `<u>${text}</u>`;
      if (seg.href) text = `<a href="${this.escapeHTML(seg.href)}">${text}</a>`;

      return text;
    }).join('');
  }

  private static tableToHTML(block: Block): string {
    const rows = block.properties?.rows;
    if (!Array.isArray(rows) || rows.length === 0) return '';

    let html = '<table>';
    rows.forEach((row: any[], idx: number) => {
      html += '<tr>';
      if (Array.isArray(row)) {
        row.forEach(cell => {
          const tag = idx === 0 ? 'th' : 'td';
          html += `<${tag}>${this.escapeHTML(String(cell || ''))}</${tag}>`;
        });
      }
      html += '</tr>';
    });
    html += '</table>';
    return html;
  }

  private static escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
