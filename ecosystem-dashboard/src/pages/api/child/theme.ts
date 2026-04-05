/**
 * Child Theme API
 * 
 * GET: Retrieve the child's current theme preference
 * PUT: Update the child's theme preference
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { ChildThemeId, childThemes } from '@/lib/child-themes';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  try {
    // Verify this is a child account
    const userResult = await pool.query(`
      SELECT id, account_type, settings FROM users WHERE id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];

    if (userData.account_type !== 'child') {
      return res.status(403).json({ error: 'This endpoint is for child accounts only' });
    }

    if (req.method === 'GET') {
      const settings = userData.settings || {};
      const themeId = settings.theme || 'child-default';
      
      return res.status(200).json({
        themeId,
        theme: childThemes[themeId as ChildThemeId] || childThemes['child-default'],
      });
    }

    if (req.method === 'PUT') {
      const { themeId } = req.body;

      if (!themeId) {
        return res.status(400).json({ error: 'Theme ID is required' });
      }

      // Validate theme ID
      if (!(themeId in childThemes)) {
        return res.status(400).json({ 
          error: 'Invalid theme ID',
          validThemes: Object.keys(childThemes),
        });
      }

      // Update user settings with new theme
      await pool.query(`
        UPDATE users 
        SET settings = jsonb_set(COALESCE(settings, '{}'), '{theme}', $1::jsonb)
        WHERE id = $2
      `, [JSON.stringify(themeId), user.id]);

      return res.status(200).json({
        success: true,
        themeId,
        theme: childThemes[themeId as ChildThemeId],
        message: 'Theme updated successfully!',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Child Theme API] Error:', error);
    return res.status(500).json({ error: 'Failed to process theme request' });
  }
}
