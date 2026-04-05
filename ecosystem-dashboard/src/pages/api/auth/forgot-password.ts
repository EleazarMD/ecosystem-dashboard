/**
 * Forgot Password API
 * 
 * Generates a password reset token and sends email to user.
 * Rate limited to prevent abuse.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 requests per hour per email

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

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
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting
    if (!checkRateLimit(normalizedEmail)) {
      return res.status(429).json({ 
        error: 'Too many password reset requests. Please try again later.' 
      });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, name, status FROM users WHERE email = $1',
      [normalizedEmail]
    );

    // Always return success to prevent email enumeration
    // But only send email if user exists and is active
    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
      console.log('[Forgot Password] User not found or inactive:', normalizedEmail);
      return res.status(200).json({ 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      });
    }

    const user = userResult.rows[0];

    // Invalidate any existing tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, token);
    
    if (!emailResult.success) {
      console.error('[Forgot Password] Failed to send email:', emailResult.error);
      // Don't expose email sending failures to user
    } else {
      console.log('[Forgot Password] Reset email sent to:', user.email);
    }

    return res.status(200).json({ 
      message: 'If an account exists with this email, you will receive a password reset link.' 
    });

  } catch (error) {
    console.error('[Forgot Password] Error:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
