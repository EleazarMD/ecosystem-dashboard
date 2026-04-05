/**
 * Outlook Calendar Sync API
 * 
 * GET - Get Outlook sync accounts and initiate OAuth
 * POST - Start OAuth flow (returns authorization URL)
 * PUT - Trigger sync for an account
 * DELETE - Disconnect an Outlook account
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { outlookCalendarSync } from '@/lib/calendar/outlook-calendar-sync';
import { pool } from '@/lib/calendar/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = 'default-user'; // TODO: Get from session

  try {
    switch (req.method) {
      case 'GET': {
        // Get all Outlook sync accounts for user
        const result = await pool.query(
          `SELECT id, provider, account_email, account_name, 
                  sync_enabled, last_sync_at, last_sync_status, last_sync_error,
                  discovered_calendars, created_at
           FROM calendar.sync_accounts 
           WHERE owner_id = $1 AND provider = 'outlook'
           ORDER BY created_at DESC`,
          [userId]
        );

        return res.status(200).json({
          accounts: result.rows,
        });
      }

      case 'POST': {
        // Start OAuth flow - return authorization URL
        const authUrl = outlookCalendarSync.getAuthorizationUrl(userId);
        
        return res.status(200).json({
          authorizationUrl: authUrl,
          message: 'Redirect user to authorization URL to connect Outlook',
        });
      }

      case 'PUT': {
        // Trigger sync for an account
        const { account_id } = req.body;

        if (!account_id) {
          return res.status(400).json({ error: 'account_id is required' });
        }

        // Verify account belongs to user
        const accountCheck = await pool.query(
          `SELECT id FROM calendar.sync_accounts 
           WHERE id = $1 AND owner_id = $2 AND provider = 'outlook'`,
          [account_id, userId]
        );

        if (!accountCheck.rows[0]) {
          return res.status(404).json({ error: 'Account not found' });
        }

        // Trigger sync
        const syncResult = await outlookCalendarSync.syncFromOutlook(account_id);

        return res.status(200).json({
          success: syncResult.success,
          result: syncResult,
        });
      }

      case 'DELETE': {
        // Disconnect an Outlook account
        const { account_id } = req.body;

        if (!account_id) {
          return res.status(400).json({ error: 'account_id is required' });
        }

        // Verify account belongs to user
        const accountCheck = await pool.query(
          `SELECT id FROM calendar.sync_accounts 
           WHERE id = $1 AND owner_id = $2 AND provider = 'outlook'`,
          [account_id, userId]
        );

        if (!accountCheck.rows[0]) {
          return res.status(404).json({ error: 'Account not found' });
        }

        // Archive calendars linked to this account
        await pool.query(
          `UPDATE calendar.calendars SET sync_enabled = false 
           WHERE sync_account_id = $1`,
          [account_id]
        );

        // Delete sync account
        await pool.query(
          `DELETE FROM calendar.sync_accounts WHERE id = $1`,
          [account_id]
        );

        return res.status(200).json({
          success: true,
          message: 'Outlook account disconnected',
        });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Outlook sync API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
