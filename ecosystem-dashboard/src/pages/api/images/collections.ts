/**
 * Image Collections API
 * 
 * Endpoints for managing image collections/albums
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  console.log('[Collections API] User from session:', { id: user.id, email: user.email });

  // GET: Fetch user's collections
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          c.*,
          gi.file_path as cover_image_path,
          gi.filename as cover_image_filename,
          (SELECT COUNT(*) FROM image_collection_items ici WHERE ici.collection_id = c.id) as image_count
        FROM image_collections c
        LEFT JOIN generated_images gi ON c.cover_image_id = gi.id
        WHERE c.user_id = $1
        ORDER BY c.updated_at DESC
      `, [user.id]);

      return res.status(200).json({
        collections: result.rows,
      });
    } catch (error: any) {
      console.error('[Collections API] Error fetching:', error);
      return res.status(500).json({ error: 'Failed to fetch collections' });
    }
  }

  // POST: Create new collection
  if (req.method === 'POST') {
    const { name, description, visibility = 'private' } = req.body;
    console.log('[Collections API] POST request:', { name, description, visibility, userId: user.id });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    try {
      // Get user's tenant_id from tenant_memberships for multi-tenant compliance
      const tenantResult = await pool.query(
        'SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND status = $2 LIMIT 1',
        [user.id, 'active']
      );
      console.log('[Collections API] Tenant lookup result:', tenantResult.rows);
      
      const tenantId = tenantResult.rows[0]?.tenant_id || null;

      const result = await pool.query(`
        INSERT INTO image_collections (user_id, tenant_id, name, description, visibility)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [user.id, tenantId, name.trim(), description || null, visibility]);

      console.log('[Collections API] Created collection:', result.rows[0]);
      return res.status(201).json({
        collection: result.rows[0],
      });
    } catch (error: any) {
      console.error('[Collections API] Error creating:', error);
      return res.status(500).json({ error: 'Failed to create collection', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
