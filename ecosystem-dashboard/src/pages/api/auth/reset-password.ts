/**
 * Reset Password API
 * 
 * Validates reset token and updates user password.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const MIN_PASSWORD_LENGTH = 8;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, password } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ 
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` 
      });
    }

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.email, u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    const resetToken = tokenResult.rows[0];

    // Check if token was already used
    if (resetToken.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and mark token as used (in transaction)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, resetToken.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [resetToken.id]
      );

      // Invalidate all other tokens for this user
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND id != $2 AND used_at IS NULL',
        [resetToken.user_id, resetToken.id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    console.log('[Reset Password] Password updated for user:', resetToken.email);

    return res.status(200).json({ 
      message: 'Password has been reset successfully. You can now sign in with your new password.',
      email: resetToken.email
    });

  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
