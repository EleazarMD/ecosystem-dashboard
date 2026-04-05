/**
 * API endpoint for removing a favorite
 * DELETE /api/favorites/:id
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Favorite ID is required' });
  }

  try {
    await query('DELETE FROM page_favorites WHERE id = $1', [id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
}
