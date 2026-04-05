/**
 * API endpoint for page version history
 * GET /api/pages/:id/versions - List all versions
 * POST /api/pages/:id/versions - Create a new version snapshot
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: pageId } = req.query;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, page_id, version_number, title, created_by, created_at, change_summary, snapshot_type
         FROM page_versions
         WHERE page_id = $1
         ORDER BY version_number DESC
         LIMIT 50`,
        [pageId]
      );

      const versions = result.rows.map(row => ({
        id: row.id,
        pageId: row.page_id,
        versionNumber: row.version_number,
        title: row.title,
        createdBy: row.created_by,
        createdAt: row.created_at,
        changeSummary: row.change_summary,
        snapshotType: row.snapshot_type,
      }));

      return res.status(200).json({ versions });
    } catch (error) {
      console.error('Failed to get versions:', error);
      return res.status(500).json({ error: 'Failed to get versions' });
    }
  }

  if (req.method === 'POST') {
    const { title, content, properties, createdBy, changeSummary, snapshotType } = req.body;

    if (!content || !createdBy) {
      return res.status(400).json({ error: 'content and createdBy are required' });
    }

    try {
      const result = await query(
        `SELECT create_page_snapshot($1, $2, $3, $4, $5, $6, $7) as version_number`,
        [
          pageId,
          title || 'Untitled',
          JSON.stringify(content),
          properties ? JSON.stringify(properties) : '{}',
          createdBy,
          changeSummary || null,
          snapshotType || 'auto',
        ]
      );

      return res.status(201).json({ versionNumber: result.rows[0].version_number });
    } catch (error) {
      console.error('Failed to create version:', error);
      return res.status(500).json({ error: 'Failed to create version' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
