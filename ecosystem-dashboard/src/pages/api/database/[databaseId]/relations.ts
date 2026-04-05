/**
 * API endpoint for getting relations for a specific database
 * GET /api/database/:databaseId/relations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { databaseId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!databaseId || typeof databaseId !== 'string') {
    return res.status(400).json({ error: 'Database ID is required' });
  }

  try {
    const result = await query(
      `SELECT id, source_database_id, target_database_id, source_property_name, target_property_name, relation_type
       FROM database_relations
       WHERE source_database_id = $1 OR target_database_id = $1
       ORDER BY created_at`,
      [databaseId]
    );

    return res.status(200).json({ relations: result.rows });
  } catch (error) {
    console.error('Failed to get relations:', error);
    return res.status(500).json({ error: 'Failed to get relations' });
  }
}
