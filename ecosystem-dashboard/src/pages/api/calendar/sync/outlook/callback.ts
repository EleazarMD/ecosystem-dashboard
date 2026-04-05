/**
 * Outlook OAuth Callback Handler
 * 
 * Handles the OAuth callback from Microsoft after user authorization
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { outlookCalendarSync } from '@/lib/calendar/outlook-calendar-sync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.redirect(`/calendar?error=${encodeURIComponent(error_description as string || error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/calendar?error=Missing authorization code or state');
    }

    // Decode state to get user ID
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.redirect('/calendar?error=Invalid state parameter');
    }

    // Verify state is not too old (15 minutes max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return res.redirect('/calendar?error=Authorization request expired');
    }

    // Complete OAuth flow and connect account
    const account = await outlookCalendarSync.connectAccount({
      owner_id: stateData.userId,
      code: code as string,
    });

    // Trigger initial sync
    await outlookCalendarSync.syncFromOutlook(account.id);

    // Redirect to calendar with success message
    return res.redirect('/calendar?success=outlook_connected');

  } catch (error) {
    console.error('Outlook OAuth callback error:', error);
    return res.redirect(`/calendar?error=${encodeURIComponent((error as Error).message)}`);
  }
}
