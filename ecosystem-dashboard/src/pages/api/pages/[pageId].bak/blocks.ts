/**
 * API endpoint to fetch blocks for a page
 * Used by WorkspacePageView to refresh after Goose makes changes
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { pageId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Invalid page ID' });
  }

  try {
    // Fetch blocks from Goose API (which has MCP access to workspace database)
    const gooseApiUrl = process.env.GOOSE_API_URL || 'http://localhost:9001';
    const response = await fetch(`${gooseApiUrl}/api/workspace/pages/${pageId}/blocks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Goose API error: ${response.status}`);
    }

    const blocks = await response.json();
    
    console.log(`[API] ✅ Fetched ${blocks.length} blocks for page ${pageId}`);
    
    return res.status(200).json(blocks);
  } catch (error: any) {
    console.error('[API] ❌ Failed to fetch blocks:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch blocks',
      details: error.message 
    });
  }
}
