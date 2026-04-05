/**
 * Markdown-to-Workspace-Blocks Converter
 * 
 * Converts markdown text (from research reports) into workspace block structures
 * compatible with the Notion-like block architecture.
 */

import type { CreateBlockParams, BlockType, RichText, BlockProperties } from '../../types/workspace';

// --- Rich text helpers ---

function textSegment(content: string, annotations?: Record<string, boolean>): RichText {
  return {
    type: 'text',
    text: { content },
    plain_text: content,
    ...(annotations ? { annotations } : {}),
  };
}

/**
 * Parse inline markdown formatting into RichText segments.
 * Supports: **bold**, *italic*, `code`, [links](url), ~~strikethrough~~
 */
function parseInlineMarkdown(text: string): RichText[] {
  const segments: RichText[] = [];
  // Regex for inline patterns — order matters (bold before italic)
  const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))|(~~(.+?)~~)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      segments.push(textSegment(text.slice(lastIndex, match.index)));
    }

    if (match[1]) {
      // **bold**
      segments.push(textSegment(match[2], { bold: true }));
    } else if (match[3]) {
      // *italic*
      segments.push(textSegment(match[4], { italic: true }));
    } else if (match[5]) {
      // `code`
      segments.push(textSegment(match[6], { code: true }));
    } else if (match[7]) {
      // [text](url)
      segments.push({
        type: 'text',
        text: { content: match[8], link: match[9] },
        plain_text: match[8],
        href: match[9],
      });
    } else if (match[10]) {
      // ~~strikethrough~~
      segments.push(textSegment(match[11], { strikethrough: true }));
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    segments.push(textSegment(text.slice(lastIndex)));
  }

  // If nothing matched, return the whole text as a single segment
  if (segments.length === 0) {
    segments.push(textSegment(text));
  }

  return segments;
}

// --- Block builders ---

function makeBlock(
  type: BlockType,
  properties: BlockProperties,
  workspaceId: string,
  userId: string,
): CreateBlockParams {
  return { workspace_id: workspaceId, type, properties, created_by: userId };
}

function paragraphBlock(text: string, wId: string, uId: string): CreateBlockParams {
  return makeBlock('paragraph', { title: parseInlineMarkdown(text) }, wId, uId);
}

function headingBlock(level: 1 | 2 | 3, text: string, wId: string, uId: string): CreateBlockParams {
  const type: BlockType = `heading_${level}` as BlockType;
  return makeBlock(type, { title: parseInlineMarkdown(text) }, wId, uId);
}

function bulletBlock(text: string, wId: string, uId: string): CreateBlockParams {
  return makeBlock('bulleted_list', { title: parseInlineMarkdown(text) }, wId, uId);
}

function numberedBlock(text: string, wId: string, uId: string): CreateBlockParams {
  return makeBlock('numbered_list', { title: parseInlineMarkdown(text) }, wId, uId);
}

function quoteBlock(text: string, wId: string, uId: string): CreateBlockParams {
  return makeBlock('quote', { title: parseInlineMarkdown(text) }, wId, uId);
}

function codeBlock(code: string, language: string, wId: string, uId: string): CreateBlockParams {
  return makeBlock('code', {
    title: [textSegment(code)],
    language: language || 'plain',
  }, wId, uId);
}

function dividerBlock(wId: string, uId: string): CreateBlockParams {
  return makeBlock('divider', {}, wId, uId);
}

function todoBlock(text: string, checked: boolean, wId: string, uId: string): CreateBlockParams {
  return makeBlock('to_do', {
    title: parseInlineMarkdown(text),
    checked,
  }, wId, uId);
}

function calloutBlock(text: string, icon: string, wId: string, uId: string): CreateBlockParams {
  return makeBlock('callout', {
    title: parseInlineMarkdown(text),
    icon: { type: 'emoji', emoji: icon },
  }, wId, uId);
}

// --- Main converter ---

/**
 * Convert a markdown string into an array of workspace CreateBlockParams.
 * Handles: headings, paragraphs, bullet/numbered lists, code blocks, blockquotes, dividers.
 */
export function markdownToBlocks(
  markdown: string,
  workspaceId: string,
  userId: string,
): CreateBlockParams[] {
  const lines = markdown.split('\n');
  const blocks: CreateBlockParams[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // --- Fenced code block ---
    const codeMatch = line.match(/^```(\w*)/);
    if (codeMatch) {
      const lang = codeMatch[1] || 'plain';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(codeBlock(codeLines.join('\n'), lang, workspaceId, userId));
      continue;
    }

    // --- Horizontal rule ---
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(dividerBlock(workspaceId, userId));
      i++;
      continue;
    }

    // --- Headings ---
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push(headingBlock(level, headingMatch[2].trim(), workspaceId, userId));
      i++;
      continue;
    }

    // --- Blockquote ---
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(quoteBlock(quoteLines.join(' '), workspaceId, userId));
      continue;
    }

    // --- Checkbox / To-do item ---
    const todoMatch = line.match(/^[\s]*[-*+]\s+\[([ xX])\]\s+(.+)/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === 'x';
      blocks.push(todoBlock(todoMatch[2].trim(), checked, workspaceId, userId));
      i++;
      continue;
    }

    // --- Unordered list ---
    const bulletMatch = line.match(/^[\s]*[-*+]\s+(.+)/);
    if (bulletMatch) {
      blocks.push(bulletBlock(bulletMatch[1].trim(), workspaceId, userId));
      i++;
      continue;
    }

    // --- Ordered list ---
    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
    if (numberedMatch) {
      blocks.push(numberedBlock(numberedMatch[1].trim(), workspaceId, userId));
      i++;
      continue;
    }

    // --- Empty line (skip) ---
    if (line.trim() === '') {
      i++;
      continue;
    }

    // --- Paragraph (may span multiple lines until blank line or block element) ---
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,3}\s/) &&
      !lines[i].match(/^[-*+]\s+\[[ xX]\]/) && // checkbox
      !lines[i].match(/^[-*+]\s/) &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('```') &&
      !(/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]))
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(paragraphBlock(paraLines.join(' '), workspaceId, userId));
  }

  return blocks;
}

/**
 * Build a metadata callout block summarizing research session info.
 */
export function buildResearchMetadataBlock(
  session: {
    session_id: string;
    question: string;
    model: string;
    status: string;
    created_at?: string;
    completed_at?: string;
    actual_cost?: number;
  },
  workspaceId: string,
  userId: string,
): CreateBlockParams {
  const parts = [
    `Model: ${session.model}`,
    session.actual_cost != null ? `Cost: $${session.actual_cost.toFixed(4)}` : null,
    session.completed_at ? `Completed: ${new Date(session.completed_at).toLocaleDateString()}` : null,
    `Session: ${session.session_id}`,
  ].filter(Boolean).join(' • ');

  return calloutBlock(parts, '🔬', workspaceId, userId);
}
