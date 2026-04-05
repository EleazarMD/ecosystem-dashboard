/**
 * API endpoint for a specific page version
 * GET /api/pages/:id/versions/:versionNumber - Get specific version content
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: pageId, versionNumber } = req.query;

  if (!pageId || typeof pageId !== 'string' || !versionNumber) {
    return res.status(400).json({ error: 'Page ID and version number are required' });
  }

  const verNum = parseInt(versionNumber as string, 10);

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, page_id, version_number, title, content, properties, created_by, created_at, change_summary, snapshot_type
         FROM page_versions
         WHERE page_id = $1 AND version_number = $2`,
        [pageId, verNum]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Version not found' });
      }

      const row = result.rows[0];
      return res.status(200).json({
        id: row.id,
        pageId: row.page_id,
        versionNumber: row.version_number,
        title: row.title,
        content: row.content,
        properties: row.properties,
        createdBy: row.created_by,
        createdAt: row.created_at,
        changeSummary: row.change_summary,
        snapshotType: row.snapshot_type,
      });
    } catch (error) {
      console.error('Failed to get version:', error);
      return res.status(500).json({ error: 'Failed to get version' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
