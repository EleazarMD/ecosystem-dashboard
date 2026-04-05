/**
 * YouTube OAuth Login - Redirect to Google OAuth consent screen
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'https://nexus.hyperspaceanalytics.com/api/youtube/auth/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',  // Full access (read + write subscriptions)
].join(' ');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  res.redirect(authUrl.toString());
}
