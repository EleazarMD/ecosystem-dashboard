/**
 * Atlas IDE Device-Pairing API (P2.8)
 * ============================================================================
 *
 * Flow:
 *   1. IDE requests a pairing code: POST /api/auth/device-pairing { action: 'request' }
 *      → Returns { pairingCode: 'ABC123', expiresAt: '...' } (5-min TTL)
 *      → Pairing code stored in `device_pairing_codes` table
 *
 *   2. User approves in Dashboard: POST /api/auth/device-pairing { action: 'approve', pairingCode: 'ABC123' }
 *      → Requires NextAuth session (dashboard user)
 *      → Marks code as approved, links to user
 *
 *   3. IDE exchanges approved code for JWT: POST /api/auth/device-pairing { action: 'exchange', pairingCode: 'ABC123', clientName: 'Atlas-Desktop' }
 *      → Returns unified JWT with clientType: 'atlas'
 *      → Registers client in client_registrations
 *
 * Security:
 *   - Pairing codes are 6-char alphanumeric, 5-minute TTL, single-use
 *   - Rate-limited: max 5 requests per IP per 10 minutes
 *   - Exchange requires prior approval — no brute-force to a JWT
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';
import { Pool } from 'pg';
import { issueAccessToken, issueRefreshToken, DEFAULT_ISSUER_CONFIG } from '../../../lib/platform/unified-token';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

// In-memory rate limiter (simple, per-IP)
const pairingRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_PAIRING_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = pairingRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    pairingRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PAIRING_REQUESTS) return false;
  entry.count++;
  return true;
}

function generatePairingCode(): string {
  // 6-char alphanumeric, no ambiguous chars (no 0/O/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, pairingCode, clientName } = req.body;

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many pairing requests. Try again later.' });
  }

  // Ensure the pairing codes table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_pairing_codes (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      pairing_code  TEXT UNIQUE NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | exchanged | expired
      user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
      client_name   TEXT,
      client_id     TEXT,
      ip_address    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at    TIMESTAMPTZ NOT NULL,
      approved_at   TIMESTAMPTZ,
      exchanged_at  TIMESTAMPTZ
    )
  `);

  switch (action) {
    case 'request':
      return handleRequest(req, res, ip);
    case 'approve':
      return handleApprove(req, res);
    case 'exchange':
      return handleExchange(req, res, clientName);
    case 'status':
      return handleStatus(req, res, pairingCode);
    default:
      return res.status(400).json({ error: 'Unknown action. Use: request, approve, exchange, status.' });
  }
}

// ---------------------------------------------------------------------------
// Step 1: IDE requests a pairing code
// ---------------------------------------------------------------------------
async function handleRequest(req: NextApiRequest, res: NextApiResponse, ip: string) {
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute TTL

  await pool.query(
    `INSERT INTO device_pairing_codes (pairing_code, status, ip_address, expires_at)
     VALUES ($1, 'pending', $2, $3)`,
    [code, ip, expiresAt]
  );

  return res.status(200).json({
    pairingCode: code,
    expiresAt: expiresAt.toISOString(),
    expiresIn: 300, // seconds
  });
}

// ---------------------------------------------------------------------------
// Step 2: User approves the pairing code in the Dashboard
// ---------------------------------------------------------------------------
async function handleApprove(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Dashboard authentication required' });
  }

  const { pairingCode } = req.body;
  if (!pairingCode) {
    return res.status(400).json({ error: 'pairingCode is required' });
  }

  // Check the code is valid and not expired
  const result = await pool.query(
    `UPDATE device_pairing_codes
     SET status = 'approved', user_id = $1, approved_at = now()
     WHERE pairing_code = $2
       AND status = 'pending'
       AND expires_at > now()
     RETURNING id, pairing_code, expires_at`,
    [session.user.id, pairingCode]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Pairing code not found, already used, or expired' });
  }

  return res.status(200).json({
    status: 'approved',
    pairingCode,
    expiresAt: result.rows[0].expires_at,
  });
}

// ---------------------------------------------------------------------------
// Step 3: IDE exchanges the approved code for a JWT
// ---------------------------------------------------------------------------
async function handleExchange(req: NextApiRequest, res: NextApiResponse, clientName?: string) {
  const { pairingCode } = req.body;
  if (!pairingCode) {
    return res.status(400).json({ error: 'pairingCode is required' });
  }

  // Verify the code is approved and not expired
  const result = await pool.query(
    `SELECT * FROM device_pairing_codes
     WHERE pairing_code = $1 AND status = 'approved' AND expires_at > now()`,
    [pairingCode]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Pairing code not approved or expired' });
  }

  const pairing = result.rows[0];
  const userId = pairing.user_id;
  const clientId = `Atlas-${crypto.randomUUID().slice(0, 8)}`;
  const name = clientName || 'Atlas-IDE';

  // Register the client
  await pool.query(
    `INSERT INTO client_registrations (user_id, client_id, client_type, name, platform, is_active)
     VALUES ($1, $2, 'atlas', $3, 'desktop', true)`,
    [userId, clientId, name]
  );

  // Mark code as exchanged
  await pool.query(
    `UPDATE device_pairing_codes
     SET status = 'exchanged', exchanged_at = now(), client_id = $1, client_name = $2
     WHERE id = $3`,
    [clientId, name, pairing.id]
  );

  // Issue unified JWT tokens
  const config = { ...DEFAULT_ISSUER_CONFIG, secret: JWT_SECRET };
  const accessToken = issueAccessToken({
    userId,
    tenantId: undefined,
    clientType: 'atlas',
    clientId,
    platform: 'desktop',
  }, config);

  const refreshToken = issueRefreshToken({
    userId,
    tenantId: undefined,
    clientType: 'atlas',
    clientId,
    platform: 'desktop',
  }, config);

  return res.status(200).json({
    token: accessToken,
    refreshToken,
    expiresIn: config.accessTokenTTL,
    tokenType: 'unified',
    clientId,
  });
}

// ---------------------------------------------------------------------------
// Step 4 (optional): Poll pairing status from the IDE
// ---------------------------------------------------------------------------
async function handleStatus(req: NextApiRequest, res: NextApiResponse, pairingCode?: string) {
  if (!pairingCode) {
    return res.status(400).json({ error: 'pairingCode is required' });
  }

  const result = await pool.query(
    `SELECT status, expires_at FROM device_pairing_codes WHERE pairing_code = $1`,
    [pairingCode]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Pairing code not found' });
  }

  const row = result.rows[0];
  const expired = new Date(row.expires_at) < new Date();

  return res.status(200).json({
    status: expired ? 'expired' : row.status,
    expiresAt: row.expires_at,
  });
}
