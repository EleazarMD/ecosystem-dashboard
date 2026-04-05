/**
 * Apple Calendar Sync API
 * POST /api/calendar/sync/apple - Connect Apple Calendar account
 * GET /api/calendar/sync/apple - Get sync status
 * PUT /api/calendar/sync/apple - Trigger manual sync
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { appleCalendarSync, getSyncAccounts } from '@/lib/calendar';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const owner_id = req.headers['x-user-id'] as string || 'default-user';

  try {
    if (req.method === 'GET') {
      // Get Apple Calendar sync accounts
      const accounts = await getSyncAccounts(owner_id);
      const appleAccounts = accounts.filter(a => a.provider === 'apple_calendar');

      return res.status(200).json({ 
        accounts: appleAccounts,
        connected: appleAccounts.length > 0,
      });
    }

    if (req.method === 'POST') {
      // Connect new Apple Calendar account
      const { username, password } = req.body;

      console.log('[Apple Calendar API] POST request received:', { username, hasPassword: !!password });

      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Apple ID username and app-specific password are required' 
        });
      }

      try {
        const account = await appleCalendarSync.connectAccount({
          owner_id,
          username,
          password,
        });

        return res.status(201).json({ 
          message: 'Apple Calendar connected successfully',
          account: {
            id: account.id,
            account_email: account.account_email,
            account_name: account.account_name,
            discovered_calendars: account.discovered_calendars,
          },
        });
      } catch (connectError) {
        console.error('[Apple Calendar API] Connection error:', connectError);
        const errorMessage = (connectError as Error).message;
        
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          return res.status(401).json({
            error: 'Invalid credentials',
            message: 'Please check your Apple ID and app-specific password. Make sure you\'re using an app-specific password, not your regular Apple ID password.',
          });
        }
        
        if (errorMessage.includes('CalDAV') || errorMessage.includes('principal')) {
          return res.status(502).json({
            error: 'Could not connect to Apple Calendar',
            message: 'Unable to reach Apple\'s calendar servers. Please try again later.',
          });
        }

        throw connectError;
      }
    }

    if (req.method === 'PUT') {
      // Trigger manual sync
      const { account_id, force_full } = req.body;

      if (!account_id) {
        return res.status(400).json({ error: 'account_id is required' });
      }

      // Use force_full to clear etags and re-process all events (fixes timezone issues)
      const result = force_full 
        ? await appleCalendarSync.forceFullResync(account_id)
        : await appleCalendarSync.syncFromApple(account_id);

      return res.status(200).json({ 
        message: result.success ? 'Sync completed' : 'Sync completed with errors',
        result,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Apple Calendar sync API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}
