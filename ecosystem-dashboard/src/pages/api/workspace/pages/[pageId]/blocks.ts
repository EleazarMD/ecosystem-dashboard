import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { authenticateWorkspaceRequest, verifyWorkspaceAccess } from '@/lib/workspace/workspace-auth';

/**
 * API endpoint to manage page blocks
 * GET /api/workspace/pages/[pageId]/blocks - Get all blocks
 * PUT /api/workspace/pages/[pageId]/blocks - Update/replace all blocks
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { pageId } = req.query;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  const auth = await authenticateWorkspaceRequest(req, res);
  if (!auth) return;

  // GET: Get all blocks for a page
  if (req.method === 'GET') {
    try {
      // Verify page exists and caller owns the workspace
      const page = await blockService.getBlock(pageId);
      if (!page || page.type !== 'page') {
        return res.status(404).json({ error: 'Page not found' });
      }
      const hasAccess = await verifyWorkspaceAccess(auth.userId, page.workspace_id, res);
      if (!hasAccess) return;

      const blocks = await blockService.getBlockChildren(pageId);
      return res.status(200).json({ blocks });
    } catch (error) {
      console.error('Error fetching blocks:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch blocks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT: Update/replace blocks
  if (req.method === 'PUT') {
    const { blocks } = req.body;

    if (!blocks || !Array.isArray(blocks)) {
      return res.status(400).json({ error: 'blocks array is required' });
    }

    try {
      // Get the page to verify it exists and get workspace_id
      const page = await blockService.getBlock(pageId);
      if (!page || page.type !== 'page') {
        return res.status(404).json({ error: 'Page not found' });
      }

      const hasAccess = await verifyWorkspaceAccess(auth.userId, page.workspace_id, res);
      if (!hasAccess) return;

      // Get existing child blocks
      const existingBlocks = await blockService.getBlockChildren(pageId);
      const existingIds = new Set(existingBlocks.map(b => b.id));

      // Process each block
      const results = [];
      for (const block of blocks) {
        if (block.id && existingIds.has(block.id)) {
          // Update existing block
          const updated = await blockService.updateBlock(block.id, {
            properties: block.properties || block.content,
            last_edited_by: auth.userId
          });
          results.push(updated);
          existingIds.delete(block.id);
        } else {
          // Create new block
          const created = await blockService.createBlock({
            workspace_id: page.workspace_id,
            parent_id: pageId,
            type: block.type || 'paragraph',
            properties: block.properties || block.content || {},
            created_by: auth.userId
          });
          results.push(created);
        }
      }

      // Delete blocks that were removed (no longer in the new blocks array)
      for (const removedId of existingIds) {
        await blockService.deleteBlock(removedId);
      }

      // Update the page's updated_at timestamp
      await blockService.updateBlock(pageId, {
        last_edited_by: auth.userId
      });

      console.log(`✅ [API] Saved ${results.length} blocks for page ${pageId}`);
      return res.status(200).json({ 
        success: true, 
        blocksUpdated: results.length,
        blocksDeleted: existingIds.size
      });
    } catch (error) {
      console.error('Error saving blocks:', error);
      return res.status(500).json({ 
        error: 'Failed to save blocks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
