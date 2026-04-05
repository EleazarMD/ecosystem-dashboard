/**
 * Publish Research Session to Workspace
 * 
 * POST: Converts a completed research session's report into a workspace page
 *       inside a "Research Library" database. All published research documents
 *       are indexed together with properties (model, cost, date, project, etc.)
 *       so they can be browsed as a table/board/gallery.
 * 
 * Uses a single flat transaction to avoid nested-transaction isolation issues
 * that occur when blockService.createBlock is called recursively with children.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getResearchSession, getResearchProject } from '@/lib/db/research-storage';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { markdownToBlocks, buildResearchMetadataBlock } from '@/lib/workspace/markdown-to-blocks';
import { query, transaction } from '@/lib/db/client';
import type { CreateBlockParams } from '@/types/workspace';

const DEFAULT_USER_ID = 'eleazar'; // Homelab user - matches iOS app and dashboard
const LIBRARY_TITLE = 'Research Library';

// Schema definition for the Research Library database
const LIBRARY_SCHEMA = [
  { name: 'Model', type: 'select', config: { options: [
    { id: 'opt-perplexity', name: 'perplexity', color: 'purple' },
    { id: 'opt-o3', name: 'o3-deep-research', color: 'blue' },
    { id: 'opt-o4', name: 'o4-mini-deep-research', color: 'green' },
    { id: 'opt-gpt5', name: 'gpt-5-pro', color: 'orange' },
    { id: 'opt-o1', name: 'o1-pro', color: 'red' },
  ]}},
  { name: 'Status', type: 'select', config: { options: [
    { id: 'opt-completed', name: 'completed', color: 'green' },
    { id: 'opt-failed', name: 'failed', color: 'red' },
  ]}},
  { name: 'Cost', type: 'number', config: { format: 'dollar' } },
  { name: 'Date', type: 'date', config: {} },
  { name: 'Project', type: 'text', config: {} },
  { name: 'Session ID', type: 'text', config: {} },
  { name: 'Parent Session', type: 'text', config: {} },
  { name: 'Session Type', type: 'select', config: { options: [
    { id: 'opt-original', name: 'original', color: 'blue' },
    { id: 'opt-followup', name: 'follow_up', color: 'purple' },
    { id: 'opt-qwen3', name: 'qwen3_query', color: 'green' },
    { id: 'opt-analysis', name: 'analysis', color: 'orange' },
  ]}},
];

/**
 * Find or create the Research Library database in the workspace.
 * Returns { databaseBlockId, databaseId, propertyMap }
 */
async function getOrCreateLibrary(workspaceId: string, userId: string) {
  // Look for existing Research Library database block
  const existing = await query(
    `SELECT b.id AS block_id, d.id AS database_id
     FROM blocks b
     JOIN databases d ON d.block_id = b.id
     WHERE b.workspace_id = $1
       AND b.type IN ('database_inline', 'database_full_page')
       AND b.archived = FALSE
       AND b.properties->>'source_type' = 'research_library'
     LIMIT 1`,
    [workspaceId]
  );

  if (existing.rows.length > 0) {
    const { block_id, database_id } = existing.rows[0];
    // Load property map
    const props = await query(
      `SELECT id, name FROM database_properties WHERE database_id = $1 ORDER BY position`,
      [database_id]
    );
    const propertyMap: Record<string, string> = {};
    for (const row of props.rows) {
      propertyMap[row.name] = row.id;
    }
    return { databaseBlockId: block_id, databaseId: database_id, propertyMap };
  }

  // Create Research Library — flat SQL in one transaction
  const result = await transaction(async (client) => {
    // Create database block
    const blockResult = await client.query(
      `INSERT INTO blocks (workspace_id, type, properties, parent_id, created_by, last_edited_by)
       VALUES ($1, 'database_full_page', $2, NULL, $3, $3)
       RETURNING id`,
      [
        workspaceId,
        JSON.stringify({
          title: [{ type: 'text', text: { content: LIBRARY_TITLE } }],
          source_type: 'research_library',
          icon: { type: 'emoji', emoji: '📚' },
        }),
        userId,
      ]
    );
    const databaseBlockId = blockResult.rows[0].id;

    // Create database record
    const dbResult = await client.query(
      `INSERT INTO databases (block_id, title, schema, views)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        databaseBlockId,
        JSON.stringify([{ type: 'text', text: { content: LIBRARY_TITLE } }]),
        JSON.stringify([]),
        JSON.stringify([
          { id: 'default-table', type: 'table', name: 'All Research', properties: [] },
        ]),
      ]
    );
    const databaseId = dbResult.rows[0].id;

    // Create schema properties
    const propertyMap: Record<string, string> = {};
    for (let i = 0; i < LIBRARY_SCHEMA.length; i++) {
      const prop = LIBRARY_SCHEMA[i];
      const propResult = await client.query(
        `INSERT INTO database_properties (database_id, name, type, config, position)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [databaseId, prop.name, prop.type, JSON.stringify(prop.config), i]
      );
      propertyMap[prop.name] = propResult.rows[0].id;
    }

    return { databaseBlockId, databaseId, propertyMap };
  });

  console.log(`[Publish] Created Research Library database: block=${result.databaseBlockId} db=${result.databaseId}`);
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  try {
    // 1. Fetch the research session
    const session = await getResearchSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.report) {
      return res.status(400).json({ error: 'Session has no report to publish' });
    }

    // 2. Check for duplicate publish
    const dupeCheck = await query(
      `SELECT id FROM blocks
       WHERE archived = FALSE
         AND properties->>'source_session_id' = $1
         AND type = 'page'
       LIMIT 1`,
      [session.session_id]
    );
    if (dupeCheck.rows.length > 0) {
      return res.status(200).json({
        success: true,
        page_id: dupeCheck.rows[0].id,
        already_published: true,
        title: session.question.substring(0, 80),
      });
    }

    // 3. Get or create the user's workspace
    const userId = req.body?.userId || DEFAULT_USER_ID;
    let workspaces = await workspaceService.getUserWorkspaces(userId);

    if (workspaces.length === 0) {
      const ws = await workspaceService.createDefaultWorkspace(userId);
      workspaces = [ws];
    }

    const workspace = workspaces[0];
    const workspaceId = workspace.id;

    // 4. Get or create Research Library database
    const library = await getOrCreateLibrary(workspaceId, userId);

    // 5. Build title
    const maxTitleLength = 80;
    const pageTitle = session.question.length > maxTitleLength
      ? session.question.substring(0, maxTitleLength) + '…'
      : session.question;

    // 6. Convert markdown report into workspace blocks
    const contentBlocks = markdownToBlocks(session.report, workspaceId, userId);

    // 7. Build the metadata callout block
    const metadataBlock = buildResearchMetadataBlock(
      {
        session_id: session.session_id,
        question: session.question,
        model: session.model,
        status: session.status,
        created_at: session.created_at ? String(session.created_at) : undefined,
        completed_at: session.completed_at ? String(session.completed_at) : undefined,
        actual_cost: session.actual_cost,
      },
      workspaceId,
      userId,
    );

    // 8. Resolve project name if session has a project
    let projectName: string | undefined;
    if (session.project_id) {
      try {
        const project = await getResearchProject(session.project_id);
        projectName = project?.name;
      } catch { /* ignore */ }
    }

    // 9. Create page inside library database + all content blocks in SINGLE transaction
    const allChildren: CreateBlockParams[] = [metadataBlock, ...contentBlocks];

    const result = await transaction(async (client) => {
      // 9a. Create the page block as child of the database block
      const pageResult = await client.query(
        `INSERT INTO blocks (workspace_id, type, properties, parent_id, created_by, last_edited_by)
         VALUES ($1, 'page', $2, $3, $4, $4)
         RETURNING id`,
        [
          workspaceId,
          JSON.stringify({
            title: [{ type: 'text', text: { content: pageTitle }, plain_text: pageTitle }],
            source_type: 'research',
            source_session_id: session.session_id,
            source_model: session.model,
            source_question: session.question,
            icon: { type: 'emoji', emoji: '🔬' },
          }),
          library.databaseBlockId,
          userId,
        ]
      );
      const pageId = pageResult.rows[0].id;

      // 9b. Link page to database via block_content
      const posResult = await client.query(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
         FROM block_content WHERE parent_block_id = $1`,
        [library.databaseBlockId]
      );
      await client.query(
        `INSERT INTO block_content (parent_block_id, child_block_id, position)
         VALUES ($1, $2, $3)`,
        [library.databaseBlockId, pageId, posResult.rows[0].next_pos]
      );

      // 9c. Set database property values
      const propValues: Array<[string, any]> = [
        ['Model', session.model],
        ['Status', session.status],
        ['Cost', session.actual_cost ?? session.estimated_cost ?? null],
        ['Date', session.completed_at ? new Date(String(session.completed_at)).toISOString() : (session.created_at ? new Date(String(session.created_at)).toISOString() : null)],
        ['Project', projectName || null],
        ['Session ID', session.session_id],
        ['Parent Session', session.parent_session_id || null],
        ['Session Type', session.session_type || 'original'],
      ];

      for (const [propName, value] of propValues) {
        const propId = library.propertyMap[propName];
        if (propId && value != null) {
          await client.query(
            `INSERT INTO database_property_values (page_block_id, property_id, value)
             VALUES ($1, $2, $3)`,
            [pageId, propId, JSON.stringify(value)]
          );
        }
      }

      // 9d. Create content blocks as children of the page
      let blockCount = 0;
      for (let i = 0; i < allChildren.length; i++) {
        const child = allChildren[i];
        const childResult = await client.query(
          `INSERT INTO blocks (workspace_id, type, properties, parent_id, created_by, last_edited_by)
           VALUES ($1, $2, $3, $4, $5, $5)
           RETURNING id`,
          [workspaceId, child.type, JSON.stringify(child.properties || {}), pageId, userId]
        );
        await client.query(
          `INSERT INTO block_content (parent_block_id, child_block_id, position)
           VALUES ($1, $2, $3)`,
          [pageId, childResult.rows[0].id, i]
        );
        blockCount++;
      }

      return { pageId, blockCount };
    });

    console.log(`[Publish] Session ${id} → page ${result.pageId} in Research Library (${result.blockCount} blocks)`);

    return res.status(200).json({
      success: true,
      page_id: result.pageId,
      workspace_id: workspaceId,
      database_id: library.databaseId,
      block_count: result.blockCount,
      title: pageTitle,
    });
  } catch (error: any) {
    console.error('[Publish] Error publishing session to workspace:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish to workspace' });
  }
}
