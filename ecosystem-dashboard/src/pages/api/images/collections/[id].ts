/**
 * Single Collection API
 * 
 * Endpoints for managing a specific collection
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
  const { id } = req.query;

  // GET: Fetch collection with images
  if (req.method === 'GET') {
    try {
      // Get user's tenant_id from tenant_memberships for multi-tenant compliance
      const tenantResult = await pool.query(
        'SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 AND status = $2 LIMIT 1',
        [user.id, 'active']
      );
      const userTenantId = tenantResult.rows[0]?.tenant_id;

      // Get collection - only if owned by user OR shared within same tenant
      const collectionResult = await pool.query(`
        SELECT c.*, gi.file_path as cover_image_path, gi.filename as cover_image_filename
        FROM image_collections c
        LEFT JOIN generated_images gi ON c.cover_image_id = gi.id
        WHERE c.id = $1 
          AND (
            c.user_id = $2 
            OR (c.visibility IN ('family', 'public') AND c.tenant_id = $3)
          )
      `, [id, user.id, userTenantId]);

      if (collectionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      // Get images in collection
      const imagesResult = await pool.query(`
        SELECT gi.*, ici.sort_order, ici.added_at
        FROM generated_images gi
        JOIN image_collection_items ici ON ici.image_id = gi.id
        WHERE ici.collection_id = $1
        ORDER BY ici.sort_order ASC, ici.added_at DESC
      `, [id]);

      return res.status(200).json({
        collection: collectionResult.rows[0],
        images: imagesResult.rows,
      });
    } catch (error: any) {
      console.error('[Collection API] Error fetching:', error);
      return res.status(500).json({ error: 'Failed to fetch collection' });
    }
  }

  // PUT: Update collection
  if (req.method === 'PUT') {
    const { name, description, visibility, cover_image_id } = req.body;

    try {
      // Verify ownership
      const ownerCheck = await pool.query(
        'SELECT id FROM image_collections WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to edit this collection' });
      }

      const result = await pool.query(`
        UPDATE image_collections
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          visibility = COALESCE($3, visibility),
          cover_image_id = COALESCE($4, cover_image_id),
          updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [name, description, visibility, cover_image_id, id]);

      return res.status(200).json({
        collection: result.rows[0],
      });
    } catch (error: any) {
      console.error('[Collection API] Error updating:', error);
      return res.status(500).json({ error: 'Failed to update collection' });
    }
  }

  // DELETE: Delete collection
  if (req.method === 'DELETE') {
    try {
      // Verify ownership
      const ownerCheck = await pool.query(
        'SELECT id FROM image_collections WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to delete this collection' });
      }

      await pool.query('DELETE FROM image_collections WHERE id = $1', [id]);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[Collection API] Error deleting:', error);
      return res.status(500).json({ error: 'Failed to delete collection' });
    }
  }

  // POST: Add image to collection
  if (req.method === 'POST') {
    const { image_id } = req.body;

    if (!image_id) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    try {
      // Verify collection ownership
      const ownerCheck = await pool.query(
        'SELECT id FROM image_collections WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to modify this collection' });
      }

      // Get max sort order
      const sortResult = await pool.query(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM image_collection_items WHERE collection_id = $1',
        [id]
      );

      await pool.query(`
        INSERT INTO image_collection_items (collection_id, image_id, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (collection_id, image_id) DO NOTHING
      `, [id, image_id, sortResult.rows[0].next_order]);

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[Collection API] Error adding image:', error);
      return res.status(500).json({ error: 'Failed to add image to collection' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
