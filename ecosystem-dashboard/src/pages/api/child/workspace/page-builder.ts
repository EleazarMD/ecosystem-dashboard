/**
 * Child Workspace Page Builder API
 * 
 * AI-powered page structure generation for kids that:
 * 1. Connects to Kid's GooseMind Agent
 * 2. Generates age-appropriate page structures
 * 3. Provides block editing tools similar to adult workspace
 * 4. Filters content through child safety middleware
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import {
  getChildServiceContext,
  processChildAIRequest,
} from '@/lib/platform/child-service-middleware';
import { Pool } from 'pg';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Block types available for kids
const CHILD_BLOCK_TYPES = [
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list',
  'numbered_list',
  'to_do',
  'callout',
  'quote',
  'divider',
  'toggle',
] as const;

type ChildBlockType = typeof CHILD_BLOCK_TYPES[number];

interface PageBlock {
  type: ChildBlockType;
  content: string;
  properties?: {
    icon?: string;
    color?: string;
    checked?: boolean;
  };
}

interface PageBuilderResponse {
  title: string;
  icon: string;
  blocks: PageBlock[];
}

// System prompt for the Page Builder Agent
const PAGE_BUILDER_SYSTEM_PROMPT = `You are a friendly Page Builder Assistant for kids! Your job is to help children create well-structured pages for their workspace.

IMPORTANT: You MUST respond with ONLY valid JSON, no other text. The JSON must follow this exact format:
{
  "title": "Page Title Here",
  "icon": "📄",
  "blocks": [
    { "type": "heading_1", "content": "Main Title" },
    { "type": "paragraph", "content": "Some text here" },
    { "type": "to_do", "content": "A task item", "properties": { "checked": false } },
    { "type": "callout", "content": "Important note!", "properties": { "icon": "💡", "color": "blue" } }
  ]
}

AVAILABLE BLOCK TYPES:
- "paragraph" - Regular text
- "heading_1" - Big title (use for main sections)
- "heading_2" - Medium title (use for subsections)
- "heading_3" - Small title
- "bulleted_list" - Bullet point item
- "numbered_list" - Numbered list item
- "to_do" - Checkbox item (include "properties": { "checked": false })
- "callout" - Highlighted box (include "properties": { "icon": "emoji", "color": "blue/green/yellow/red/purple" })
- "quote" - Quote block
- "divider" - Horizontal line separator
- "toggle" - Collapsible section

GUIDELINES:
1. Create age-appropriate, fun page structures
2. Use emojis in titles and callouts to make it engaging
3. For stories: Include Beginning, Middle, End sections
4. For lists/checklists: Use to_do blocks with checkboxes
5. For homework: Include sections for Instructions, My Work, Questions
6. For trips/packing: Organize by category with to_do items
7. For projects: Include Hypothesis, Materials, Steps, Results
8. Keep content encouraging and positive
9. Add helpful placeholder text that guides the child

Remember: ONLY output valid JSON, nothing else!`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { prompt, action, pageId, blocks } = req.body;

  // Handle different actions
  switch (action) {
    case 'generate':
    case undefined:
      return handleGeneratePage(req, res, prompt);
    case 'edit-blocks':
      return handleEditBlocks(req, res, pageId, blocks);
    case 'add-block':
      return handleAddBlock(req, res, pageId, req.body);
    case 'transform-block':
      return handleTransformBlock(req, res, pageId, req.body);
    case 'suggest-content':
      return handleSuggestContent(req, res, prompt, req.body.context);
    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

/**
 * Generate a new page structure from a prompt
 */
async function handleGeneratePage(
  req: NextApiRequest,
  res: NextApiResponse,
  prompt: string
) {
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const context = await getChildServiceContext(req, res);
  if (!context) return;

  try {
    // Process through child safety middleware
    const result = await processChildAIRequest(
      context,
      {
        message: prompt,
        serviceId: 'page-builder',
      },
      async (filteredPrompt, safetyPrompt) => {
        // Build the full system prompt with safety guidelines
        const systemPrompt = context.accountType === 'child'
          ? `${safetyPrompt}\n\n${PAGE_BUILDER_SYSTEM_PROMPT}`
          : PAGE_BUILDER_SYSTEM_PROMPT;

        // Call AI Gateway
        const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
          },
          body: JSON.stringify({
            model: process.env.CHILD_AI_MODEL || 'llama3.2:3b',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Create a page structure for: ${filteredPrompt}` },
            ],
            temperature: 0.7,
            max_tokens: 1500,
            metadata: {
              user_type: context.accountType,
              content_filter: 'strict',
              service: 'page-builder',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('AI service unavailable');
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }
    );

    if (result.success && result.response) {
      // Try to parse the AI response as JSON
      try {
        // Clean up the response - remove any markdown code blocks
        let jsonStr = result.response.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const pageStructure: PageBuilderResponse = JSON.parse(jsonStr);
        
        // Validate the structure
        if (!pageStructure.title || !pageStructure.blocks || !Array.isArray(pageStructure.blocks)) {
          throw new Error('Invalid page structure');
        }

        return res.status(200).json(pageStructure);
      } catch (parseError) {
        console.error('[PageBuilder] Failed to parse AI response:', parseError);
        // Fall back to local generation
        const fallback = generateLocalPageStructure(prompt);
        return res.status(200).json(fallback);
      }
    } else if (result.blocked) {
      return res.status(200).json({
        blocked: true,
        message: result.blockReason,
      });
    } else {
      // Fall back to local generation
      const fallback = generateLocalPageStructure(prompt);
      return res.status(200).json(fallback);
    }
  } catch (error) {
    console.error('[PageBuilder] Error:', error);
    // Fall back to local generation
    const fallback = generateLocalPageStructure(prompt);
    return res.status(200).json(fallback);
  }
}

/**
 * Edit existing blocks on a page
 */
async function handleEditBlocks(
  req: NextApiRequest,
  res: NextApiResponse,
  pageId: string,
  blocks: any[]
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!pageId || !blocks || !Array.isArray(blocks)) {
    return res.status(400).json({ error: 'pageId and blocks are required' });
  }

  try {
    // Update each block
    for (const block of blocks) {
      if (block.id) {
        await pool.query(
          `UPDATE child_blocks 
           SET content = $1, properties = $2, type = $3, updated_at = NOW(), last_edited_by = $4
           WHERE id = $5`,
          [
            JSON.stringify(block.content || []),
            JSON.stringify(block.properties || {}),
            block.type,
            session.user.id,
            block.id,
          ]
        );
      }
    }

    return res.status(200).json({ success: true, message: 'Blocks updated' });
  } catch (error) {
    console.error('[PageBuilder] Error updating blocks:', error);
    return res.status(500).json({ error: 'Failed to update blocks' });
  }
}

/**
 * Add a new block to a page
 */
async function handleAddBlock(
  req: NextApiRequest,
  res: NextApiResponse,
  pageId: string,
  body: any
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { afterBlockId, blockType, content } = body;

  if (!pageId) {
    return res.status(400).json({ error: 'pageId is required' });
  }

  try {
    // Get workspace ID from page
    const pageResult = await pool.query(
      `SELECT workspace_id FROM child_blocks WHERE id = $1`,
      [pageId]
    );

    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const workspaceId = pageResult.rows[0].workspace_id;

    // Get position for new block
    let position = 0;
    if (afterBlockId) {
      const afterResult = await pool.query(
        `SELECT position FROM child_blocks WHERE id = $1`,
        [afterBlockId]
      );
      if (afterResult.rows.length > 0) {
        position = afterResult.rows[0].position + 1;
      }
    } else {
      const maxResult = await pool.query(
        `SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM child_blocks WHERE parent_id = $1`,
        [pageId]
      );
      position = maxResult.rows[0].next_pos;
    }

    // Insert new block
    const result = await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, content, properties, parent_id, position, created_by, last_edited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      RETURNING *`,
      [
        workspaceId,
        blockType || 'paragraph',
        JSON.stringify(content ? [{ text: content }] : []),
        JSON.stringify({}),
        pageId,
        position,
        session.user.id,
      ]
    );

    return res.status(201).json({
      success: true,
      block: formatBlock(result.rows[0]),
    });
  } catch (error) {
    console.error('[PageBuilder] Error adding block:', error);
    return res.status(500).json({ error: 'Failed to add block' });
  }
}

/**
 * Transform a block to a different type
 */
async function handleTransformBlock(
  req: NextApiRequest,
  res: NextApiResponse,
  pageId: string,
  body: any
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { blockId, newType } = body;

  if (!blockId || !newType) {
    return res.status(400).json({ error: 'blockId and newType are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE child_blocks 
       SET type = $1, updated_at = NOW(), last_edited_by = $2
       WHERE id = $3
       RETURNING *`,
      [newType, session.user.id, blockId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

    return res.status(200).json({
      success: true,
      block: formatBlock(result.rows[0]),
    });
  } catch (error) {
    console.error('[PageBuilder] Error transforming block:', error);
    return res.status(500).json({ error: 'Failed to transform block' });
  }
}

/**
 * Suggest content for a block based on context
 */
async function handleSuggestContent(
  req: NextApiRequest,
  res: NextApiResponse,
  prompt: string,
  context: any
) {
  const serviceContext = await getChildServiceContext(req, res);
  if (!serviceContext) return;

  try {
    const result = await processChildAIRequest(
      serviceContext,
      {
        message: prompt,
        serviceId: 'page-builder',
      },
      async (filteredPrompt, safetyPrompt) => {
        const response = await fetch(`${AI_GATEWAY_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CHILD_SAFETY_API_KEY || 'child-safety-key'}`,
          },
          body: JSON.stringify({
            model: process.env.CHILD_AI_MODEL || 'llama3.2:3b',
            messages: [
              {
                role: 'system',
                content: `${safetyPrompt}\n\nYou are a helpful writing assistant for kids. Suggest brief, age-appropriate content based on the context. Keep suggestions short (1-2 sentences) and encouraging.`,
              },
              {
                role: 'user',
                content: `Context: ${JSON.stringify(context)}\n\nSuggest content for: ${filteredPrompt}`,
              },
            ],
            temperature: 0.8,
            max_tokens: 200,
          }),
        });

        if (!response.ok) {
          throw new Error('AI service unavailable');
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      }
    );

    if (result.success) {
      return res.status(200).json({ suggestion: result.response });
    } else {
      return res.status(200).json({ suggestion: 'Start writing here...' });
    }
  } catch (error) {
    console.error('[PageBuilder] Error suggesting content:', error);
    return res.status(200).json({ suggestion: 'Start writing here...' });
  }
}

/**
 * Format a database block row to the API response format
 */
function formatBlock(row: any) {
  return {
    id: row.id,
    type: row.type,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
    properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties,
    parentId: row.parent_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Local fallback for page structure generation when AI is unavailable
 */
function generateLocalPageStructure(prompt: string): PageBuilderResponse {
  const lowerPrompt = prompt.toLowerCase();

  // Story template
  if (lowerPrompt.includes('story') || lowerPrompt.includes('adventure') || lowerPrompt.includes('tale')) {
    return {
      title: prompt.split(' ').slice(0, 5).join(' '),
      icon: '📖',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'callout', content: 'Characters: (Add your characters here)', properties: { icon: '👥', color: 'blue' } },
        { type: 'callout', content: 'Setting: (Where does your story take place?)', properties: { icon: '🗺️', color: 'green' } },
        { type: 'divider', content: '' },
        { type: 'heading_2', content: '✨ The Beginning' },
        { type: 'paragraph', content: 'Once upon a time...' },
        { type: 'heading_2', content: '🌟 The Middle' },
        { type: 'paragraph', content: 'Then something exciting happened...' },
        { type: 'heading_2', content: '🎉 The End' },
        { type: 'paragraph', content: 'And they all lived happily ever after!' },
      ],
    };
  }

  // List/checklist template
  if (lowerPrompt.includes('list') || lowerPrompt.includes('shopping') || lowerPrompt.includes('todo') || lowerPrompt.includes('checklist')) {
    return {
      title: prompt.split(' ').slice(0, 5).join(' '),
      icon: '📋',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'callout', content: 'Check off items as you complete them!', properties: { icon: '✅', color: 'green' } },
        { type: 'divider', content: '' },
        { type: 'to_do', content: 'First item', properties: { checked: false } },
        { type: 'to_do', content: 'Second item', properties: { checked: false } },
        { type: 'to_do', content: 'Third item', properties: { checked: false } },
        { type: 'to_do', content: 'Add more items...', properties: { checked: false } },
      ],
    };
  }

  // Trip/packing template
  if (lowerPrompt.includes('trip') || lowerPrompt.includes('travel') || lowerPrompt.includes('vacation') || lowerPrompt.includes('packing')) {
    return {
      title: prompt.split(' ').slice(0, 5).join(' '),
      icon: '🧳',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'callout', content: 'Destination: (Where are you going?)', properties: { icon: '✈️', color: 'blue' } },
        { type: 'divider', content: '' },
        { type: 'heading_2', content: 'Clothes 👕' },
        { type: 'to_do', content: 'Shirts', properties: { checked: false } },
        { type: 'to_do', content: 'Pants/Shorts', properties: { checked: false } },
        { type: 'to_do', content: 'Pajamas', properties: { checked: false } },
        { type: 'heading_2', content: 'Fun Stuff 🎮' },
        { type: 'to_do', content: 'Books/Games', properties: { checked: false } },
        { type: 'to_do', content: 'Tablet/Electronics', properties: { checked: false } },
        { type: 'heading_2', content: 'Important Things 🔑' },
        { type: 'to_do', content: 'Toothbrush', properties: { checked: false } },
        { type: 'to_do', content: 'Chargers', properties: { checked: false } },
      ],
    };
  }

  // Project/science template
  if (lowerPrompt.includes('project') || lowerPrompt.includes('science') || lowerPrompt.includes('experiment')) {
    return {
      title: prompt.split(' ').slice(0, 5).join(' '),
      icon: '🔬',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'callout', content: 'Question: What are you trying to find out?', properties: { icon: '❓', color: 'purple' } },
        { type: 'divider', content: '' },
        { type: 'heading_2', content: 'My Hypothesis 🤔' },
        { type: 'paragraph', content: 'I think... (what do you predict will happen?)' },
        { type: 'heading_2', content: 'Materials Needed 🧪' },
        { type: 'bulleted_list', content: 'Item 1' },
        { type: 'bulleted_list', content: 'Item 2' },
        { type: 'heading_2', content: 'Steps 📋' },
        { type: 'numbered_list', content: 'First step' },
        { type: 'numbered_list', content: 'Second step' },
        { type: 'heading_2', content: 'Results 📊' },
        { type: 'paragraph', content: '(Record what happened here)' },
      ],
    };
  }

  // Homework template
  if (lowerPrompt.includes('homework') || lowerPrompt.includes('assignment') || lowerPrompt.includes('report')) {
    return {
      title: prompt.split(' ').slice(0, 5).join(' '),
      icon: '📚',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'callout', content: 'Due Date: (When is this due?)', properties: { icon: '📅', color: 'red' } },
        { type: 'divider', content: '' },
        { type: 'heading_2', content: 'Instructions' },
        { type: 'paragraph', content: 'What do you need to do?' },
        { type: 'heading_2', content: 'My Work' },
        { type: 'paragraph', content: 'Start writing here...' },
        { type: 'heading_2', content: 'Questions I Have' },
        { type: 'bulleted_list', content: 'Any questions about the assignment?' },
      ],
    };
  }

  // Goals template
  if (lowerPrompt.includes('goal') || lowerPrompt.includes('dream') || lowerPrompt.includes('wish')) {
    return {
      title: prompt.split(' ').slice(0, 5).join(' '),
      icon: '🎯',
      blocks: [
        { type: 'heading_1', content: prompt },
        { type: 'callout', content: 'Dream big! You can do it! 🌟', properties: { icon: '💪', color: 'yellow' } },
        { type: 'divider', content: '' },
        { type: 'heading_2', content: 'My Goal' },
        { type: 'paragraph', content: 'I want to...' },
        { type: 'heading_2', content: 'Why This Matters' },
        { type: 'paragraph', content: 'This is important to me because...' },
        { type: 'heading_2', content: 'Steps to Get There' },
        { type: 'to_do', content: 'Step 1', properties: { checked: false } },
        { type: 'to_do', content: 'Step 2', properties: { checked: false } },
        { type: 'to_do', content: 'Step 3', properties: { checked: false } },
      ],
    };
  }

  // Default generic template
  return {
    title: prompt.split(' ').slice(0, 5).join(' '),
    icon: '📄',
    blocks: [
      { type: 'heading_1', content: prompt },
      { type: 'paragraph', content: 'Start writing here...' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Section 1' },
      { type: 'paragraph', content: 'Add your content...' },
      { type: 'heading_2', content: 'Section 2' },
      { type: 'paragraph', content: 'Add more content...' },
    ],
  };
}
