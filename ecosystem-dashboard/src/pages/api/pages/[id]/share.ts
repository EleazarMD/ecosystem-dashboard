/**
 * API endpoint for page share links
 * GET /api/pages/:id/share - List share links
 * POST /api/pages/:id/share - Create share link
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { query } from '@/lib/db';
import { randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const authUserId = getMobileOrSessionUserId(session?.user?.id, req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: pageId } = req.query;

  if (!pageId || typeof pageId !== 'string') {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT id, page_id, token, role, password_hash IS NOT NULL as has_password,
                expires_at, created_by, created_at, access_count, is_active
         FROM share_links
         WHERE page_id = $1 AND is_active = TRUE
         ORDER BY created_at DESC`,
        [pageId]
      );

      const links = result.rows.map(row => ({
        id: row.id,
        pageId: row.page_id,
        token: row.token,
        role: row.role,
        hasPassword: row.has_password,
        expiresAt: row.expires_at,
        createdBy: row.created_by,
        createdAt: row.created_at,
        accessCount: row.access_count,
        isActive: row.is_active,
      }));

      return res.status(200).json({ links });
    } catch (error) {
      console.error('Failed to get share links:', error);
      return res.status(500).json({ error: 'Failed to get share links' });
    }
  }

  if (req.method === 'POST') {
    const { role, createdBy, password, expiresAt } = req.body;

    if (!role || !createdBy) {
      return res.status(400).json({ error: 'role and createdBy are required' });
    }

    const validRoles = ['editor', 'commenter', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const token = randomBytes(24).toString('base64url');

    try {
      const result = await query(
        `INSERT INTO share_links (page_id, token, role, password_hash, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, page_id, token, role, password_hash IS NOT NULL as has_password,
                   expires_at, created_by, created_at, access_count, is_active`,
        [pageId, token, role, password || null, expiresAt || null, createdBy]
      );

      const row = result.rows[0];
      return res.status(201).json({
        id: row.id,
        pageId: row.page_id,
        token: row.token,
        role: row.role,
        hasPassword: row.has_password,
        expiresAt: row.expires_at,
        createdBy: row.created_by,
        createdAt: row.created_at,
        accessCount: row.access_count,
        isActive: row.is_active,
      });
    } catch (error) {
      console.error('Failed to create share link:', error);
      return res.status(500).json({ error: 'Failed to create share link' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
