/**
 * User Profile API
 * 
 * GET - Get current user profile
 * PUT - Update user profile (name, avatar)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const userEmail = session.user.email;
  
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT id, email, name, avatar_url, platform_role, preferences, created_at
         FROM users WHERE email = $1`,
        [userEmail]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json({ user: result.rows[0] });
    } catch (error) {
      console.error('[Profile API] Error:', error);
      return res.status(500).json({ error: 'Failed to get profile' });
    }
  }
  
  if (req.method === 'PUT') {
    const { name, avatarUrl, preferences } = req.body;
    
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      
      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }
      
      if (preferences !== undefined) {
        updates.push(`preferences = preferences || $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(preferences));
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push(`updated_at = NOW()`);
      values.push(userEmail);
      
      const result = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE email = $${paramIndex} RETURNING id, email, name, avatar_url`,
        values
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json({ user: result.rows[0] });
    } catch (error) {
      console.error('[Profile API] Error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
