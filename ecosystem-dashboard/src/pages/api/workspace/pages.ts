import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { authenticateWorkspaceRequest, verifyWorkspaceAccess } from '@/lib/workspace/workspace-auth';

/**
 * API endpoint for page operations
 * POST /api/workspace/pages - Create a new page
 * GET /api/workspace/pages?search=query&limit=10 - Search pages
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // POST: Create a new page
  if (req.method === 'POST') {
    const auth = await authenticateWorkspaceRequest(req, res);
    if (!auth) return;

    const { workspaceId, title, content, parentId, icon } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    const hasAccess = await verifyWorkspaceAccess(auth.userId, workspaceId, res);
    if (!hasAccess) return;

    try {
      // Create the page block
      const pageProperties: any = {
        title: [
          {
            type: 'text',
            text: { content: title || 'Untitled' }
          }
        ]
      };

      // Add icon if provided
      if (icon) {
        pageProperties.icon = {
          type: 'emoji',
          emoji: icon
        };
      }

      const page = await blockService.createBlock({
        workspace_id: workspaceId,
        parent_id: parentId || null,
        type: 'page',
        properties: pageProperties,
        created_by: auth.userId
      });

      // If content is provided, create a paragraph block as child
      if (content) {
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: page.id,
          type: 'paragraph',
          properties: {
            rich_text: [
              {
                type: 'text',
                text: { content }
              }
            ]
          },
          created_by: auth.userId
        });
      }

      return res.status(201).json(page);
    } catch (error) {
      console.error('Error creating page:', error);
      return res.status(500).json({
        error: 'Failed to create page',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET: Search pages
  if (req.method === 'GET') {
    const auth = await authenticateWorkspaceRequest(req, res);
    if (!auth) return;

    const { search, limit = '10', workspace_id } = req.query;

    try {
      let pages: any[] = [];

      if (workspace_id && typeof workspace_id === 'string') {
        const hasAccess = await verifyWorkspaceAccess(auth.userId, workspace_id, res);
        if (!hasAccess) return;

        // Get pages from specific workspace
        const allBlocks = await blockService.getWorkspaceBlocks(workspace_id);
        pages = allBlocks.filter(block => block.type === 'page');
      } else {
        return res.status(400).json({ 
          error: 'workspace_id parameter is required',
          hint: 'Add ?workspace_id=xxx to the query string'
        });
      }

      // Apply search filter if provided
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        pages = pages.filter(page => {
          const title = page.properties?.title?.[0]?.text?.content || '';
          return title.toLowerCase().includes(searchLower);
        });
      }

      // Apply limit
      const limitNum = parseInt(limit as string, 10);
      const limitedPages = pages.slice(0, limitNum);

      return res.status(200).json({
        pages: limitedPages,
        total: pages.length,
        returned: limitedPages.length
      });
    } catch (error) {
      console.error('Error searching pages:', error);
      return res.status(500).json({
        error: 'Failed to search pages',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
