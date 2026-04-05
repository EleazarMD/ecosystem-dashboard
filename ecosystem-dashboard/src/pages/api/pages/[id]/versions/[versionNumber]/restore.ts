/**
 * API endpoint for restoring a page to a specific version
 * POST /api/pages/:id/versions/:versionNumber/restore
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: pageId, versionNumber } = req.query;
  const { userId } = req.body;

  if (!pageId || typeof pageId !== 'string' || !versionNumber || !userId) {
    return res.status(400).json({ error: 'Page ID, version number, and userId are required' });
  }

  const verNum = parseInt(versionNumber as string, 10);

  try {
    // Get the version to restore
    const versionResult = await query(
      `SELECT content, properties, title FROM page_versions WHERE page_id = $1 AND version_number = $2`,
      [pageId, verNum]
    );

    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const version = versionResult.rows[0];

    // Snapshot current state before restoring
    const currentResult = await query(
      `SELECT content, properties, properties->>'title' as title FROM blocks WHERE id = $1`,
      [pageId]
    );

    if (currentResult.rows.length > 0) {
      const current = currentResult.rows[0];
      await query(
        `SELECT create_page_snapshot($1, $2, $3, $4, $5, $6, $7)`,
        [
          pageId,
          current.title || 'Untitled',
          JSON.stringify(current.content || []),
          JSON.stringify(current.properties || {}),
          userId,
          `Auto-snapshot before restoring to v${verNum}`,
          'auto',
        ]
      );
    }

    // Restore the page content
    await query(
      `UPDATE blocks SET content = $1, properties = properties || $2, updated_at = NOW() WHERE id = $3`,
      [JSON.stringify(version.content), JSON.stringify(version.properties || {}), pageId]
    );

    // Create a restore snapshot
    await query(
      `SELECT create_page_snapshot($1, $2, $3, $4, $5, $6, $7)`,
      [
        pageId,
        version.title || 'Untitled',
        JSON.stringify(version.content),
        JSON.stringify(version.properties || {}),
        userId,
        `Restored to version ${verNum}`,
        'restore',
      ]
    );

    return res.status(200).json({ success: true, restoredVersion: verNum });
  } catch (error) {
    console.error('Failed to restore version:', error);
    return res.status(500).json({ error: 'Failed to restore version' });
  }
}
