/**
 * Calendar Sync Accounts API
 * Multi-tenant calendar account management
 * 
 * GET - List user's connected calendar accounts
 * POST - Add new calendar account (initiate OAuth or CalDAV)
 * DELETE - Disconnect a calendar account
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export interface SyncAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft' | 'apple' | 'caldav';
  account_email: string;
  account_name?: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  calendars_count: number;
  created_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(userId, res);
      case 'POST':
        return handlePost(userId, req.body, res);
      case 'DELETE':
        return handleDelete(userId, req.query.id as string, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Sync accounts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(userId: string, res: NextApiResponse) {
  await ensureTableExists();

  const result = await pool.query(
    `SELECT 
      sa.id,
      sa.user_id,
      sa.provider,
      sa.account_email,
      sa.account_name,
      sa.sync_enabled,
      sa.last_sync_at,
      sa.last_sync_status,
      sa.created_at,
      (SELECT COUNT(*) FROM calendar_sync_calendars WHERE sync_account_id = sa.id) as calendars_count
    FROM calendar_sync_accounts sa
    WHERE sa.user_id = $1
    ORDER BY sa.created_at DESC`,
    [userId]
  );

  return res.status(200).json({ accounts: result.rows });
}

async function handlePost(userId: string, body: any, res: NextApiResponse) {
  const { provider, account_email, account_name, access_token, refresh_token, caldav_url, caldav_username, caldav_password } = body;

  if (!provider || !account_email) {
    return res.status(400).json({ error: 'provider and account_email are required' });
  }

  await ensureTableExists();

  // Check if account already exists
  const existing = await pool.query(
    `SELECT id FROM calendar_sync_accounts WHERE user_id = $1 AND provider = $2 AND account_email = $3`,
    [userId, provider, account_email]
  );

  if (existing.rows.length > 0) {
    // Update existing account
    const result = await pool.query(
      `UPDATE calendar_sync_accounts 
       SET access_token = COALESCE($4, access_token),
           refresh_token = COALESCE($5, refresh_token),
           caldav_url = COALESCE($6, caldav_url),
           caldav_username = COALESCE($7, caldav_username),
           caldav_password = COALESCE($8, caldav_password),
           account_name = COALESCE($9, account_name),
           sync_enabled = true,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [existing.rows[0].id, userId, provider, access_token, refresh_token, caldav_url, caldav_username, caldav_password, account_name]
    );
    return res.status(200).json({ account: result.rows[0], updated: true });
  }

  // Create new account
  const result = await pool.query(
    `INSERT INTO calendar_sync_accounts (
      user_id, provider, account_email, account_name, 
      access_token, refresh_token, caldav_url, caldav_username, caldav_password,
      sync_enabled
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
    RETURNING *`,
    [userId, provider, account_email, account_name, access_token, refresh_token, caldav_url, caldav_username, caldav_password]
  );

  return res.status(201).json({ account: result.rows[0] });
}

async function handleDelete(userId: string, accountId: string, res: NextApiResponse) {
  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  // Delete associated calendars first
  await pool.query(
    `DELETE FROM calendar_sync_calendars WHERE sync_account_id = $1`,
    [accountId]
  );

  // Delete the account
  await pool.query(
    `DELETE FROM calendar_sync_accounts WHERE id = $1 AND user_id = $2`,
    [accountId, userId]
  );

  return res.status(200).json({ success: true });
}

async function ensureTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calendar_sync_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      account_email VARCHAR(255) NOT NULL,
      account_name VARCHAR(255),
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      caldav_url TEXT,
      caldav_username VARCHAR(255),
      caldav_password TEXT,
      sync_enabled BOOLEAN DEFAULT true,
      sync_interval_minutes INTEGER DEFAULT 60,
      last_sync_at TIMESTAMP WITH TIME ZONE,
      last_sync_status VARCHAR(50),
      last_sync_error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, provider, account_email)
    );

    CREATE TABLE IF NOT EXISTS calendar_sync_calendars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sync_account_id UUID NOT NULL REFERENCES calendar_sync_accounts(id) ON DELETE CASCADE,
      external_id VARCHAR(500) NOT NULL,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(20),
      sync_enabled BOOLEAN DEFAULT true,
      last_sync_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sync_accounts_user ON calendar_sync_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_sync_calendars_account ON calendar_sync_calendars(sync_account_id);
  `);
}
