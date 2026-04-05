/**
 * API endpoint for database relations
 * POST /api/database/relations - Create a new relation
 * GET /api/database/relations - List all relations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { sourceDatabaseId, targetDatabaseId, sourcePropertyName, targetPropertyName, relationType } = req.body;

    if (!sourceDatabaseId || !targetDatabaseId || !sourcePropertyName) {
      return res.status(400).json({ error: 'sourceDatabaseId, targetDatabaseId, and sourcePropertyName are required' });
    }

    try {
      const result = await query(
        `INSERT INTO database_relations (source_database_id, target_database_id, source_property_name, target_property_name, relation_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, source_database_id, target_database_id, source_property_name, target_property_name, relation_type`,
        [sourceDatabaseId, targetDatabaseId, sourcePropertyName, targetPropertyName || null, relationType || 'single']
      );

      return res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Relation already exists for this property' });
      }
      console.error('Failed to create relation:', error);
      return res.status(500).json({ error: 'Failed to create relation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
