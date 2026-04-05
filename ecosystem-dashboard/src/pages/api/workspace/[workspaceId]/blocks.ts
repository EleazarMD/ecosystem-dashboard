/**
 * API endpoint to get and create blocks for a workspace
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { databaseService } from '@/lib/workspace/database-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { authenticateWorkspaceRequest, verifyWorkspaceAccess } from '@/lib/workspace/workspace-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let { workspaceId } = req.query;

  if (!workspaceId) {
    return res.status(400).json({ error: 'Missing workspaceId' });
  }

  const auth = await authenticateWorkspaceRequest(req, res);
  if (!auth) return;

  // Resolve workspaceId if it's actually a page ID (common in nested routes)
  try {
    const workspace = await workspaceService.getWorkspace(workspaceId as string);
    if (!workspace) {
      // Try to resolve from block/page
      const block = await blockService.getBlock(workspaceId as string);
      if (block && block.workspace_id) {
        console.log(`[API] Resolved workspaceId from block ${workspaceId} to ${block.workspace_id}`);
        workspaceId = block.workspace_id;
      } else {
        return res.status(404).json({ error: 'Workspace not found' });
      }
    }
  } catch (error) {
    console.error('[API] Error resolving workspaceId:', error);
    return res.status(500).json({ error: 'Failed to resolve workspace' });
  }

  // Ensure workspaceId is a string after potential resolution
  if (typeof workspaceId !== 'string') {
    return res.status(400).json({ error: 'Invalid workspace ID after resolution' });
  }

  // Verify ownership of the resolved workspace
  const hasAccess = await verifyWorkspaceAccess(auth.userId, workspaceId, res);
  if (!hasAccess) return;

  // GET: Fetch all root-level blocks (pages and databases)
  if (req.method === 'GET') {
    try {
      console.log('[API] Fetching blocks for workspace:', workspaceId);

      // Get all blocks without parent (root level) unless ?all=true is specified
      const blocks = await blockService.getWorkspaceBlocks(workspaceId);
      const { all } = req.query;
      const returnedBlocks = all === 'true' ? blocks : blocks.filter(block => !block.parent_id);

      console.log(`[API] ✅ Found ${returnedBlocks.length} blocks (all=${all})`);

      return res.status(200).json({ blocks: returnedBlocks });
    } catch (error: any) {
      console.error('[API] ❌ Failed to fetch blocks:', error);
      return res.status(500).json({
        error: 'Failed to fetch blocks',
        details: error.message
      });
    }
  }

  // POST: Create a new block (page or database)
  if (req.method === 'POST') {
    try {
      const { type, properties, parent_id = null } = req.body;
      const created_by = auth.userId;

      if (!type) {
        return res.status(400).json({ error: 'Block type is required' });
      }

      console.log('[API] Creating block:', { workspaceId, type, parent_id });

      // Handle database/table creation via DatabaseService
      if (type === 'database_inline' || type === 'database_full_page') {
        const title = properties?.title || 'Untitled Database';
        const schema = properties?.schema || [];
        const inline = type !== 'database_full_page';

        console.log('[API] 🔍 Creating database via service:', {
          title,
          schemaCount: schema.length,
          schema: JSON.stringify(schema, null, 2),
          properties: JSON.stringify(properties, null, 2)
        });

        const database = await databaseService.createDatabase({
          workspace_id: workspaceId as string,
          parent_id,
          title,
          inline,
          schema,
          created_by
        });

        // Return the block associated with the database
        // We need to fetch the block because createDatabase returns the Database object
        const block = await blockService.getBlock(database.block_id);

        if (!block) {
          throw new Error('Failed to retrieve block after database creation');
        }

        console.log(`[API] ✅ Created database block:`, block.id);
        return res.status(200).json(block);
      }

      const block = await blockService.createBlock({
        workspace_id: workspaceId as string,
        type,
        properties: properties || {},
        created_by,
        parent_id // Accept parent_id from request, defaults to null for root-level
      });

      console.log(`[API] ✅ Created block:`, block.id);

      return res.status(200).json(block);
    } catch (error: any) {
      console.error('[API] ❌ Failed to create block:', error);
      return res.status(500).json({
        error: 'Failed to create block',
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
