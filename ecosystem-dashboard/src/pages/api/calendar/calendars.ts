/**
 * Calendars API
 * GET /api/calendar/calendars - List all calendars
 * POST /api/calendar/calendars - Create a new calendar
 * 
 * Multi-tenant routing:
 * - Admin users: Proxies to Hermes Core (Mac Studio sync)
 * - Other users: Uses their connected OAuth calendar accounts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { hermesFetch } from '@/lib/hermes-client';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://localhost:8780';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID; // Set this to your admin user ID

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const isAdmin = userId === ADMIN_USER_ID || (session.user as any).role === 'admin';

  try {
    if (req.method === 'GET') {
      // Admin: Use Hermes Core (Mac Studio sync)
      if (isAdmin) {
        const response = await hermesFetch('/v1/calendar/list');
        
        if (response.ok) {
          const data = await response.json();
          const calendars = (data.calendars || []).map((cal: any) => ({
            id: cal.id,
            name: cal.name,
            color: cal.color || '#3B82F6',
            calendar_type: cal.account_type || 'local',
            sync_enabled: true,
            last_synced_at: data.last_sync || new Date().toISOString(),
            source: 'hermes_core',
          }));
          return res.status(200).json({ calendars });
        }
      }

      // Other users: Fetch from their connected OAuth accounts
      const calendars = await getUserCalendars(userId);
      return res.status(200).json({ calendars });
    }

    if (req.method === 'POST') {
      // Admin: Create via Hermes Core
      if (isAdmin) {
        const response = await hermesFetch('/v1/calendar/events', {
          method: 'POST',
          body: JSON.stringify(req.body),
        });
        
        if (response.ok) {
          const data = await response.json();
          return res.status(201).json(data);
        } else {
          const error = await response.json();
          return res.status(response.status).json(error);
        }
      }

      // Other users: Create in their connected calendar
      // TODO: Implement OAuth calendar event creation
      return res.status(501).json({ error: 'Event creation for OAuth calendars not yet implemented' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Calendars API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

/**
 * Get calendars from user's connected OAuth accounts
 */
async function getUserCalendars(userId: string) {
  try {
    // Get user's sync accounts and their calendars
    const result = await pool.query(`
      SELECT 
        sc.id,
        sc.external_id,
        sc.name,
        sc.color,
        sc.sync_enabled,
        sc.last_sync_at,
        sa.provider,
        sa.account_email
      FROM calendar_sync_calendars sc
      JOIN calendar_sync_accounts sa ON sc.sync_account_id = sa.id
      WHERE sa.user_id = $1 AND sa.sync_enabled = true AND sc.sync_enabled = true
      ORDER BY sa.provider, sc.name
    `, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      external_id: row.external_id,
      name: row.name,
      color: row.color || '#3B82F6',
      calendar_type: row.provider,
      sync_enabled: row.sync_enabled,
      last_synced_at: row.last_sync_at,
      source: row.provider,
      account_email: row.account_email,
    }));
  } catch (error: any) {
    // Table might not exist yet
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }
}
