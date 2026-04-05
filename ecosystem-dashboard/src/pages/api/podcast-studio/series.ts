import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint for managing podcast series
 * 
 * NOTE: Series table doesn't exist yet in the database.
 * This is a placeholder that returns empty results.
 * TODO: Create podcast_series table when needed.
 * 
 * GET: List all series (returns empty for now)
 * POST: Create a new series (not implemented)
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Return empty array - series table not yet implemented
    // This prevents 404 errors in the NotebookSelector
    return res.status(200).json([]);
  }

  if (req.method === 'POST') {
    // Series creation not yet implemented
    return res.status(501).json({ 
      error: 'Not implemented',
      message: 'Series feature coming soon',
    });
  }

  if (req.method === 'DELETE') {
    return res.status(501).json({ 
      error: 'Not implemented',
      message: 'Series feature coming soon',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
