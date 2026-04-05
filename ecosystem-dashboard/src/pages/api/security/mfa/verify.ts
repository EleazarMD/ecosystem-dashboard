/**
 * API endpoint for MFA verification
 * 
 * POST /api/security/mfa/verify
 * 
 * Verifies a TOTP code for critical approval actions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = session.user.id;

  try {
    const { code, approvalId, action } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'MFA code is required' });
    }

    // Get user's MFA secret
    const userResult = await pool.query(
      `SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.mfa_enabled || !user.mfa_secret) {
      // MFA not enabled - allow action but log warning
      await pool.query(
        `INSERT INTO security_audit_log 
         (event_type, severity, user_id, action, outcome, reason, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'mfa_verification',
          'warning',
          userId,
          action || 'mfa:verify',
          'success',
          'MFA not enabled for user',
          JSON.stringify({ approvalId }),
        ]
      );

      return res.json({
        verified: true,
        mfaEnabled: false,
        message: 'MFA not enabled, action allowed',
      });
    }

    // Verify TOTP code
    const isValid = verifyTOTP(user.mfa_secret, code);

    // Log the verification attempt
    await pool.query(
      `INSERT INTO security_audit_log 
       (event_type, severity, user_id, action, outcome, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'mfa_verification',
        isValid ? 'info' : 'warning',
        userId,
        action || 'mfa:verify',
        isValid ? 'success' : 'failure',
        JSON.stringify({ approvalId, verified: isValid }),
      ]
    );

    if (!isValid) {
      return res.status(401).json({
        verified: false,
        error: 'Invalid MFA code',
      });
    }

    // Generate a short-lived MFA token for the specific action
    const mfaToken = generateMfaToken(userId, approvalId);

    return res.json({
      verified: true,
      mfaEnabled: true,
      mfaToken,
      expiresIn: 300, // 5 minutes
    });

  } catch (error) {
    console.error('[MFA] Error verifying code:', error);
    return res.status(500).json({ error: 'Failed to verify MFA code' });
  }
}

/**
 * Verify a TOTP code
 * 
 * Implements RFC 6238 TOTP with 30-second time step
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeStep = 30;

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now + i * timeStep) / timeStep);
    const expectedCode = generateTOTP(secret, counter);
    
    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a TOTP code for a given counter
 */
function generateTOTP(secret: string, counter: number): string {
  // Decode base32 secret
  const key = base32Decode(secret);
  
  // Convert counter to 8-byte buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = 
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate 6-digit code
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Decode a base32 string
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanedInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  
  let bits = '';
  for (const char of cleanedInput) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate a short-lived MFA verification token
 */
function generateMfaToken(userId: string, approvalId?: string): string {
  const payload = {
    userId,
    approvalId,
    exp: Date.now() + 5 * 60 * 1000, // 5 minutes
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
  const data = JSON.stringify(payload);
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('base64url');

  return `${Buffer.from(data).toString('base64url')}.${signature}`;
}
