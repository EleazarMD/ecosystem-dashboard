/**
 * Microsoft/Outlook Calendar OAuth API
 * Handles OAuth flow for Microsoft 365/Outlook Calendar integration
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const MS_CLIENT_ID = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/calendar/oauth/microsoft/callback';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'Calendars.ReadWrite',
].join(' ');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Microsoft Calendar integration not configured',
      message: 'Please set MICROSOFT_CALENDAR_CLIENT_ID and MICROSOFT_CALENDAR_CLIENT_SECRET environment variables'
    });
  }

  // Generate OAuth URL
  const state = Buffer.from(JSON.stringify({
    userId: (session.user as any).id,
    returnUrl: req.query.returnUrl || '/settings/calendar',
  })).toString('base64');

  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', MS_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('state', state);

  return res.status(200).json({ authUrl: authUrl.toString() });
}
