/**
 * Block Serialization Utilities for Goose Page Agent
 * Converts BlockModel blocks to text format for LLM context
 * Integrates with Gemini 2.5 Flash via AI Gateway
 */

import { Block } from '@/lib/editor/BlockModel';

export interface PageContext {
  pageId: string;
  pageTitle: string;
  pageContent: string;
  blocks: Block[];
  blockCount: number;
  wordCount: number;
}

/**
 * Serialize blocks to plain text format
 */
export function serializeBlocksToText(blocks: Block[]): string {
  return blocks.map(block => {
    const text = block.content.map(seg => seg.text).join('');
    
    switch (block.type) {
      case 'heading_1':
        return `# ${text}`;
      case 'heading_2':
        return `## ${text}`;
      case 'heading_3':
        return `### ${text}`;
      case 'bulleted_list':
        return `• ${text}`;
      case 'numbered_list':
        return `1. ${text}`;
      case 'to_do':
        return `☐ ${text}`;
      case 'code':
        return `\`\`\`\n${text}\n\`\`\``;
      case 'quote':
        return `> ${text}`;
      case 'callout':
        return `📌 ${text}`;
      case 'divider':
        return '---';
      default:
        return text;
    }
  }).join('\n');
}

/**
 * Build complete page context for Goose AI
 */
export function buildPageContext(
  pageId: string,
  pageTitle: string,
  blocks: Block[]
): PageContext {
  const pageContent = serializeBlocksToText(blocks);
  const wordCount = pageContent.split(/\s+/).filter(w => w.length > 0).length;
  
  return {
    pageId,
    pageTitle,
    pageContent,
    blocks,
    blockCount: blocks.length,
    wordCount,
  };
}

/**
 * Build system prompt for Goose with page context
 */
export function buildGooseSystemPrompt(pageContext: PageContext): string {
  return `You are Goose, an AI page editing assistant for the page "${pageContext.pageTitle}".

CURRENT PAGE CONTENT:
${pageContext.pageContent || '(Empty page)'}

PAGE STATISTICS:
- Total blocks: ${pageContext.blockCount}
- Word count: ${pageContext.wordCount}

CRITICAL INSTRUCTIONS:
When the user asks you to add content (headings, bullet points, etc.), you MUST respond with ONLY a valid JSON array of strings. Nothing else.

CORRECT RESPONSE FORMAT:
["First item text", "Second item text", "Third item text"]

INCORRECT (DO NOT DO THIS):
- Do not add explanations before or after the JSON
- Do not use markdown formatting around the JSON
- Do not say "Here's the content:" or similar phrases
- Just return the raw JSON array

EXAMPLE USER REQUEST: "add a heading with 3 points about productivity"
CORRECT RESPONSE:
["Productivity Tips", "Focus on high-impact tasks first", "Eliminate distractions during deep work", "Take regular breaks to maintain energy"]

The first item is the heading text, followed by the bullet points.

Be concise, relevant to the existing page content, and match the tone and style.`;
}
