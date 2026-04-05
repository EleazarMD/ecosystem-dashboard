import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '@/lib/db/podcast-studio-db';

/**
 * API endpoint to fetch per-turn audio segments for an episode
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { episodeId } = req.query;

  if (!episodeId || typeof episodeId !== 'string') {
    return res.status(400).json({ error: 'Episode ID required' });
  }

  try {
    const result = await pool.query(
      'SELECT segments FROM podcast.audio_generations WHERE id = $1',
      [episodeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const segments = result.rows[0].segments;

    return res.status(200).json({
      episodeId,
      segments: segments || null,
    });
  } catch (error) {
    console.error('Error fetching episode segments:', error);
    return res.status(500).json({
      error: 'Failed to fetch segments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
