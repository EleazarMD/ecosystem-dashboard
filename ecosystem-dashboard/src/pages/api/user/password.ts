/**
 * Password Change API
 * 
 * PUT - Change user password
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  
  try {
    // Get current password hash
    const userResult = await pool.query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [session.user.email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    if (!user.password_hash) {
      return res.status(400).json({ error: 'No password set for this account' });
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newPasswordHash, user.id]
    );
    
    // Log audit event
    await pool.query(
      `INSERT INTO audit_log (action, user_id, details, created_at)
       VALUES ('user:password_changed', $1, '{}', NOW())`,
      [user.id]
    );
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('[Password API] Error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}
