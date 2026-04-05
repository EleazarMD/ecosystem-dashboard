import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { authenticateWorkspaceRequest, verifyWorkspaceAccess } from '@/lib/workspace/workspace-auth';

/**
 * API endpoint to update a page
 * PUT /api/workspace/pages/[pageId]
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

  // GET: Read a page
  if (req.method === 'GET') {
    try {
      const page = await blockService.getBlock(pageId);

      if (!page || page.type !== 'page') {
        return res.status(404).json({ error: 'Page not found' });
      }

      const hasAccess = await verifyWorkspaceAccess(auth.userId, page.workspace_id, res);
      if (!hasAccess) return;

      return res.status(200).json(page);
    } catch (error) {
      console.error('Error fetching page:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch page',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PUT: Update a page
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, content, properties } = req.body;

  try {
    // Fetch the current page
    const currentPage = await blockService.getBlock(pageId);

    if (!currentPage || currentPage.type !== 'page') {
      return res.status(404).json({ error: 'Page not found' });
    }

    const hasAccess = await verifyWorkspaceAccess(auth.userId, currentPage.workspace_id, res);
    if (!hasAccess) return;

    // Build updated properties - preserve ALL existing properties
    const updatedProperties = { ...(currentPage.properties || {}) };

    if (title) {
      // Update ONLY the title, preserve everything else (cover, icon, etc.)
      updatedProperties.title = [
        {
          type: 'text',
          text: { content: title }
        }
      ];
    }

    // Merge any additional properties (don't replace, merge)
    if (properties) {
      Object.assign(updatedProperties, properties);
    }

    // Update the page
    const updatedPage = await blockService.updateBlock(pageId, {
      properties: updatedProperties,
      last_edited_by: auth.userId
    });

    // If content is provided, update or create child blocks
    if (content) {
      const children = await blockService.getBlockChildren(pageId);
      const firstParagraph = children.find(b => b.type === 'paragraph');

      if (firstParagraph) {
        // Update existing paragraph
        await blockService.updateBlock(firstParagraph.id, {
          properties: {
            rich_text: [{ type: 'text', text: { content } }]
          },
          last_edited_by: auth.userId
        });
      } else {
        // Create new paragraph block
        await blockService.createBlock({
          workspace_id: currentPage.workspace_id,
          parent_id: pageId,
          type: 'paragraph',
          properties: {
            rich_text: [{ type: 'text', text: { content } }]
          },
          created_by: auth.userId
        });
      }
    }

    return res.status(200).json(updatedPage);
  } catch (error) {
    console.error('Error updating page:', error);
    return res.status(500).json({ 
      error: 'Failed to update page',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
