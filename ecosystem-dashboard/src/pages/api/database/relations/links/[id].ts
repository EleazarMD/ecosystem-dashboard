/**
 * API endpoint for managing individual relation links
 * DELETE /api/database/relations/links/:id - Remove a link
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Link ID is required' });
    }

    try {
      await query('DELETE FROM relation_links WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Failed to delete relation link:', error);
      return res.status(500).json({ error: 'Failed to delete link' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
