/**
 * Child Workspace API
 * 
 * CRUD operations for child workspaces and pages
 * Inherits Notion-like architecture from adult workspace
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import {
  ChildWorkspace,
  ChildBlock,
  ChildWorkspaceResponse,
  ChildPageResponse,
} from '@/types/child-workspace';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  
  // Get tenant_id for multi-tenant isolation
  let tenantId: string | undefined;
  try {
    const tenantResult = await pool.query(
      `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    tenantId = tenantResult.rows[0]?.tenant_id;
  } catch (e) {
    console.error('[ChildWorkspace] Failed to get tenant:', e);
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, userId, tenantId);
      case 'POST':
        return handlePost(req, res, userId, tenantId);
      case 'PUT':
        return handlePut(req, res, userId);
      case 'DELETE':
        return handleDelete(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[ChildWorkspace] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================================
// GET - Fetch workspace, pages, or specific page
// ============================================================================

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  tenantId?: string
) {
  const { action, pageId, workspaceId } = req.query;

  // Get templates
  if (action === 'templates') {
    try {
      const result = await pool.query(
        `SELECT * FROM child_page_templates ORDER BY category, name`
      );
      console.log('[ChildWorkspace] Found templates:', result.rows.length);
      return res.status(200).json({
        templates: result.rows.map(formatTemplate),
      });
    } catch (error) {
      console.error('[ChildWorkspace] Failed to fetch templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  // Populate example pages for existing workspace
  if (action === 'populate-examples') {
    let workspace = await getOrCreateWorkspace(userId, tenantId);
    
    // Check if workspace already has pages (other than welcome)
    const existingPages = await pool.query(
      `SELECT COUNT(*) as count FROM child_blocks 
       WHERE workspace_id = $1 AND type = 'page' AND parent_id IS NULL AND archived = FALSE`,
      [workspace.id]
    );
    
    const pageCount = parseInt(existingPages.rows[0].count);
    
    // Only add examples if workspace has 1 or fewer pages (just welcome page)
    if (pageCount <= 1) {
      await createExamplePages(workspace.id, userId);
      return res.status(200).json({ 
        success: true, 
        message: 'Example pages created!' 
      });
    }
    
    return res.status(200).json({ 
      success: false, 
      message: 'Workspace already has pages' 
    });
  }

  // Get or create workspace
  let workspace = await getOrCreateWorkspace(userId, tenantId);

  // Get specific page with blocks
  if (pageId) {
    const pageResult = await pool.query(
      `SELECT * FROM child_blocks WHERE id = $1 AND workspace_id = $2`,
      [pageId, workspace.id]
    );
    
    if (pageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const page = formatBlock(pageResult.rows[0]);

    // Get child blocks
    const blocksResult = await pool.query(
      `SELECT * FROM child_blocks 
       WHERE parent_id = $1 AND archived = FALSE
       ORDER BY position ASC`,
      [pageId]
    );

    return res.status(200).json({
      page,
      blocks: blocksResult.rows.map(formatBlock),
    } as ChildPageResponse);
  }

  // Get workspace with all pages
  const pagesResult = await pool.query(
    `SELECT * FROM child_blocks 
     WHERE workspace_id = $1 AND type = 'page' AND parent_id IS NULL AND archived = FALSE
     ORDER BY updated_at DESC`,
    [workspace.id]
  );

  return res.status(200).json({
    workspace,
    pages: pagesResult.rows.map(formatBlock),
    pageCount: pagesResult.rows.length,
  } as ChildWorkspaceResponse);
}

// ============================================================================
// POST - Create page or block
// ============================================================================

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  tenantId?: string
) {
  const { action, templateId } = req.query;
  const body = req.body;

  // Get or create workspace
  let workspace = await getOrCreateWorkspace(userId, tenantId);

  // Create page from Page Builder Agent
  if (action === 'from-builder') {
    const { title, icon, blocks } = body;

    // Create the page
    const pageResult = await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, properties, content, parent_id, position, 
        created_by, last_edited_by
      ) VALUES ($1, 'page', $2, '[]', NULL, 0, $3, $3)
      RETURNING *`,
      [
        workspace.id,
        JSON.stringify({ 
          title: [{ text: title || 'Untitled' }], 
          icon: icon || '📄' 
        }),
        userId,
      ]
    );

    const page = formatBlock(pageResult.rows[0]);

    // Create blocks from builder response
    if (blocks && Array.isArray(blocks)) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        await pool.query(
          `INSERT INTO child_blocks (
            workspace_id, type, properties, content, parent_id, position,
            created_by, last_edited_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
          [
            workspace.id,
            block.type,
            JSON.stringify(block.properties || {}),
            JSON.stringify([{ text: block.content || '' }]),
            page.id,
            i,
            userId,
          ]
        );
      }
    }

    // Fetch all blocks for the page
    const blocksResult = await pool.query(
      `SELECT * FROM child_blocks WHERE parent_id = $1 ORDER BY position`,
      [page.id]
    );

    return res.status(201).json({
      page,
      blocks: blocksResult.rows.map(formatBlock),
    });
  }

  // Create page from template
  if (action === 'from-template' && templateId) {
    const templateResult = await pool.query(
      `SELECT * FROM child_page_templates WHERE id = $1`,
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];
    const templateBlocks = template.template_blocks || [];

    // Create the page
    const pageResult = await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, properties, content, parent_id, position, 
        created_by, last_edited_by, template_category
      ) VALUES ($1, 'page', $2, '[]', NULL, 0, $3, $3, $4)
      RETURNING *`,
      [
        workspace.id,
        JSON.stringify({ 
          title: [{ text: template.name }], 
          icon: template.icon 
        }),
        userId,
        template.category,
      ]
    );

    const page = formatBlock(pageResult.rows[0]);

    // Create template blocks as children
    for (let i = 0; i < templateBlocks.length; i++) {
      const block = templateBlocks[i];
      await pool.query(
        `INSERT INTO child_blocks (
          workspace_id, type, properties, content, parent_id, position,
          created_by, last_edited_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          workspace.id,
          block.type,
          JSON.stringify(block.properties || {}),
          JSON.stringify(block.content || []),
          page.id,
          i,
          userId,
        ]
      );
    }

    // Fetch all blocks for the page
    const blocksResult = await pool.query(
      `SELECT * FROM child_blocks WHERE parent_id = $1 ORDER BY position`,
      [page.id]
    );

    return res.status(201).json({
      page,
      blocks: blocksResult.rows.map(formatBlock),
    });
  }

  // Create blank page
  if (action === 'page' || body.type === 'page') {
    const { title, icon, parentId } = body;

    const result = await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, properties, content, parent_id, position,
        created_by, last_edited_by
      ) VALUES ($1, 'page', $2, '[]', $3, 0, $4, $4)
      RETURNING *`,
      [
        workspace.id,
        JSON.stringify({ 
          title: [{ text: title || 'Untitled' }], 
          icon: icon || '📄' 
        }),
        parentId || null,
        userId,
      ]
    );

    // Add a default paragraph block
    await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, content, parent_id, position, created_by, last_edited_by
      ) VALUES ($1, 'paragraph', '[]', $2, 0, $3, $3)`,
      [workspace.id, result.rows[0].id, userId]
    );

    return res.status(201).json({
      page: formatBlock(result.rows[0]),
      message: 'Page created!',
    });
  }

  // Create block within a page
  const { type, content, properties, parentId, position } = body;

  if (!parentId) {
    return res.status(400).json({ error: 'parentId is required for blocks' });
  }

  // Get max position if not specified
  let blockPosition = position;
  if (blockPosition === undefined) {
    const maxPosResult = await pool.query(
      `SELECT COALESCE(MAX(position), -1) + 1 as next_pos 
       FROM child_blocks WHERE parent_id = $1`,
      [parentId]
    );
    blockPosition = maxPosResult.rows[0].next_pos;
  }

  const result = await pool.query(
    `INSERT INTO child_blocks (
      workspace_id, type, content, properties, parent_id, position,
      created_by, last_edited_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    RETURNING *`,
    [
      workspace.id,
      type || 'paragraph',
      JSON.stringify(content || []),
      JSON.stringify(properties || {}),
      parentId,
      blockPosition,
      userId,
    ]
  );

  return res.status(201).json({
    block: formatBlock(result.rows[0]),
  });
}

// ============================================================================
// PUT - Update block
// ============================================================================

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { blockId } = req.query;
  const { type, content, properties, position, archived, sharedWithParent } = req.body;

  if (!blockId) {
    return res.status(400).json({ error: 'blockId is required' });
  }

  const updates: string[] = ['last_edited_by = $2', 'updated_at = NOW()'];
  const values: any[] = [blockId, userId];
  let paramIndex = 3;

  if (type !== undefined) {
    updates.push(`type = $${paramIndex}`);
    values.push(type);
    paramIndex++;
  }

  if (content !== undefined) {
    updates.push(`content = $${paramIndex}`);
    values.push(JSON.stringify(content));
    paramIndex++;
  }

  if (properties !== undefined) {
    updates.push(`properties = $${paramIndex}`);
    values.push(JSON.stringify(properties));
    paramIndex++;
  }

  if (position !== undefined) {
    updates.push(`position = $${paramIndex}`);
    values.push(position);
    paramIndex++;
  }

  if (archived !== undefined) {
    updates.push(`archived = $${paramIndex}`);
    values.push(archived);
    paramIndex++;
  }

  if (sharedWithParent !== undefined) {
    updates.push(`shared_with_parent = $${paramIndex}`);
    values.push(sharedWithParent);
    paramIndex++;
  }

  const result = await pool.query(
    `UPDATE child_blocks SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Block not found' });
  }

  return res.status(200).json({
    block: formatBlock(result.rows[0]),
  });
}

// ============================================================================
// DELETE - Delete block (soft delete)
// ============================================================================

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { blockId, permanent } = req.query;

  if (!blockId) {
    return res.status(400).json({ error: 'blockId is required' });
  }

  if (permanent === 'true') {
    // Hard delete
    await pool.query(`DELETE FROM child_blocks WHERE id = $1`, [blockId]);
  } else {
    // Soft delete
    await pool.query(
      `UPDATE child_blocks SET archived = TRUE, updated_at = NOW() WHERE id = $1`,
      [blockId]
    );
  }

  return res.status(200).json({ success: true });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getOrCreateWorkspace(
  userId: string,
  tenantId?: string
): Promise<ChildWorkspace> {
  // Try to get existing workspace
  const existing = await pool.query(
    `SELECT * FROM child_workspaces WHERE owner_id = $1 AND archived = FALSE LIMIT 1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    return formatWorkspace(existing.rows[0]);
  }

  // Create new workspace
  const result = await pool.query(
    `INSERT INTO child_workspaces (name, owner_id, tenant_id)
     VALUES ('My Workspace', $1, $2)
     RETURNING *`,
    [userId, tenantId || null]
  );

  const workspace = formatWorkspace(result.rows[0]);

  // Create welcome page
  const welcomePageResult = await pool.query(
    `INSERT INTO child_blocks (
      workspace_id, type, properties, content, created_by, last_edited_by
    ) VALUES ($1, 'page', $2, '[]', $3, $3)
    RETURNING *`,
    [
      workspace.id,
      JSON.stringify({ 
        title: [{ text: 'Welcome to Your Workspace!' }], 
        icon: '🏠' 
      }),
      userId,
    ]
  );

  const welcomePageId = welcomePageResult.rows[0].id;

  // Add welcome content
  const welcomeBlocks = [
    { type: 'heading_1', content: [{ text: 'Welcome to Your Workspace! 🎉' }] },
    { type: 'paragraph', content: [{ text: 'This is your personal space to write, plan, and create!' }] },
    { type: 'callout', content: [{ text: 'Tip: Click the + button to add new pages!' }], properties: { icon: '💡', color: 'yellow' } },
    { type: 'divider', content: [] },
    { type: 'heading_2', content: [{ text: 'Things you can do:' }] },
    { type: 'bulleted_list', content: [{ text: '📖 Write stories and creative pieces' }] },
    { type: 'bulleted_list', content: [{ text: '📚 Work on homework assignments' }] },
    { type: 'bulleted_list', content: [{ text: '✅ Make to-do lists and checklists' }] },
    { type: 'bulleted_list', content: [{ text: '🧳 Plan trips with packing lists' }] },
    { type: 'bulleted_list', content: [{ text: '🎯 Organize projects step by step' }] },
  ];

  for (let i = 0; i < welcomeBlocks.length; i++) {
    const block = welcomeBlocks[i];
    await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, content, properties, parent_id, position, created_by, last_edited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [
        workspace.id,
        block.type,
        JSON.stringify(block.content),
        JSON.stringify(block.properties || {}),
        welcomePageId,
        i,
        userId,
      ]
    );
  }

  // Create example pages to help kids get started
  await createExamplePages(workspace.id, userId);

  return workspace;
}

// Create example pages for new workspaces
async function createExamplePages(workspaceId: string, userId: string) {
  const examplePages = [
    {
      title: 'My Summer Adventure Story',
      icon: '📖',
      category: 'story',
      blocks: [
        { type: 'heading_1', content: [{ text: 'My Summer Adventure Story' }], properties: { icon: '📖' } },
        { type: 'callout', content: [{ text: 'Characters: Me, my best friend Sam, and our dog Max' }], properties: { icon: '👥', color: 'blue' } },
        { type: 'callout', content: [{ text: 'Setting: The magical forest behind grandma\'s house' }], properties: { icon: '🗺️', color: 'green' } },
        { type: 'divider', content: [] },
        { type: 'heading_2', content: [{ text: 'The Beginning' }] },
        { type: 'paragraph', content: [{ text: 'It was the first day of summer vacation when Sam and I decided to explore the old forest behind my grandma\'s house. We packed our backpacks with snacks and a flashlight, and Max wagged his tail excitedly...' }] },
        { type: 'heading_2', content: [{ text: 'The Middle' }] },
        { type: 'paragraph', content: [{ text: 'Deep in the forest, we discovered a hidden treehouse! It looked like no one had been there for years. Inside, we found an old treasure map...' }] },
        { type: 'heading_2', content: [{ text: 'The End' }] },
        { type: 'paragraph', content: [{ text: '(Continue your story here! What did you find?)' }] },
      ]
    },
    {
      title: 'My Reading List',
      icon: '📚',
      category: 'list',
      blocks: [
        { type: 'heading_1', content: [{ text: 'My Reading List' }], properties: { icon: '📚' } },
        { type: 'callout', content: [{ text: 'Goal: Read 10 books this year!' }], properties: { icon: '🎯', color: 'purple' } },
        { type: 'divider', content: [] },
        { type: 'heading_2', content: [{ text: 'Currently Reading 📖' }] },
        { type: 'paragraph', content: [{ text: 'Add the book you\'re reading now!' }] },
        { type: 'heading_2', content: [{ text: 'Want to Read 📋' }] },
        { type: 'to_do', content: [{ text: 'Harry Potter and the Sorcerer\'s Stone' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Diary of a Wimpy Kid' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Percy Jackson' }], properties: { checked: false } },
        { type: 'heading_2', content: [{ text: 'Finished! ✅' }] },
        { type: 'to_do', content: [{ text: 'Add books you\'ve finished here!' }], properties: { checked: true } },
      ]
    },
    {
      title: 'Weekend Trip Packing',
      icon: '🧳',
      category: 'travel',
      blocks: [
        { type: 'heading_1', content: [{ text: 'Weekend Trip Packing' }], properties: { icon: '🧳' } },
        { type: 'callout', content: [{ text: 'Trip to: Grandma\'s House!' }], properties: { icon: '✈️', color: 'blue' } },
        { type: 'divider', content: [] },
        { type: 'heading_2', content: [{ text: 'Clothes 👕' }] },
        { type: 'to_do', content: [{ text: '2 t-shirts' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Pajamas' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Jacket' }], properties: { checked: false } },
        { type: 'heading_2', content: [{ text: 'Fun Stuff 🎮' }] },
        { type: 'to_do', content: [{ text: 'Favorite book' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Tablet/games' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Coloring supplies' }], properties: { checked: false } },
        { type: 'heading_2', content: [{ text: 'Important Things 🔑' }] },
        { type: 'to_do', content: [{ text: 'Toothbrush' }], properties: { checked: false } },
        { type: 'to_do', content: [{ text: 'Stuffed animal' }], properties: { checked: false } },
      ]
    },
    {
      title: 'Science Fair Project',
      icon: '🔬',
      category: 'project',
      blocks: [
        { type: 'heading_1', content: [{ text: 'Science Fair Project: Growing Plants' }], properties: { icon: '🔬' } },
        { type: 'callout', content: [{ text: 'Question: Do plants grow faster with music?' }], properties: { icon: '❓', color: 'purple' } },
        { type: 'divider', content: [] },
        { type: 'heading_2', content: [{ text: 'My Hypothesis 🤔' }] },
        { type: 'paragraph', content: [{ text: 'I think plants that listen to music will grow taller because the vibrations might help them!' }] },
        { type: 'heading_2', content: [{ text: 'Materials Needed 🧪' }] },
        { type: 'bulleted_list', content: [{ text: '2 small plants (same type)' }] },
        { type: 'bulleted_list', content: [{ text: 'Speaker for music' }] },
        { type: 'bulleted_list', content: [{ text: 'Ruler to measure' }] },
        { type: 'bulleted_list', content: [{ text: 'Notebook for recording' }] },
        { type: 'heading_2', content: [{ text: 'Steps 📋' }] },
        { type: 'numbered_list', content: [{ text: 'Put both plants in the same sunny spot' }] },
        { type: 'numbered_list', content: [{ text: 'Play music for one plant for 1 hour each day' }] },
        { type: 'numbered_list', content: [{ text: 'Measure both plants every 3 days' }] },
        { type: 'numbered_list', content: [{ text: 'Record results in notebook' }] },
        { type: 'heading_2', content: [{ text: 'Results 📊' }] },
        { type: 'paragraph', content: [{ text: '(Record your measurements here!)' }] },
      ]
    },
  ];

  for (const page of examplePages) {
    // Create the page
    const pageResult = await pool.query(
      `INSERT INTO child_blocks (
        workspace_id, type, properties, content, created_by, last_edited_by, template_category
      ) VALUES ($1, 'page', $2, '[]', $3, $3, $4)
      RETURNING *`,
      [
        workspaceId,
        JSON.stringify({ title: [{ text: page.title }], icon: page.icon }),
        userId,
        page.category,
      ]
    );

    const pageId = pageResult.rows[0].id;

    // Add blocks to the page
    for (let i = 0; i < page.blocks.length; i++) {
      const block = page.blocks[i];
      await pool.query(
        `INSERT INTO child_blocks (
          workspace_id, type, content, properties, parent_id, position, created_by, last_edited_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [
          workspaceId,
          block.type,
          JSON.stringify(block.content),
          JSON.stringify(block.properties || {}),
          pageId,
          i,
          userId,
        ]
      );
    }
  }
}

function formatWorkspace(row: any): ChildWorkspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    tenantId: row.tenant_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
    archived: row.archived,
  };
}

function formatBlock(row: any): ChildBlock {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : (row.content || []),
    properties: typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {}),
    parentId: row.parent_id,
    position: row.position || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
    lastEditedBy: row.last_edited_by,
    archived: row.archived,
    isTemplate: row.is_template || false,
    templateCategory: row.template_category,
    sharedWithParent: row.shared_with_parent || false,
  };
}

function formatTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    category: row.category,
    templateBlocks: typeof row.template_blocks === 'string' 
      ? JSON.parse(row.template_blocks) 
      : row.template_blocks,
    isSystem: row.is_system,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
