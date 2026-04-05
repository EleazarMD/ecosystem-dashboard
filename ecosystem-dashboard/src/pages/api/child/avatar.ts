/**
 * Child Avatar API
 * 
 * Update child's avatar emoji
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const ALLOWED_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐶', '🐱', '🐰', '🐻', '🦖'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { avatarEmoji } = req.body;

    if (!avatarEmoji || !ALLOWED_EMOJIS.includes(avatarEmoji)) {
      return res.status(400).json({ error: 'Invalid avatar emoji' });
    }

    await pool.query(`
      UPDATE users SET avatar_emoji = $1 WHERE id = $2
    `, [avatarEmoji, user.id]);

    return res.status(200).json({ success: true, avatarEmoji });
  } catch (error) {
    console.error('[Child Avatar API] Error:', error);
    return res.status(500).json({ error: 'Failed to update avatar' });
  }
}
