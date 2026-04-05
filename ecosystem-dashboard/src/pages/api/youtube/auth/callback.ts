/**
 * YouTube OAuth Callback - Exchange code for tokens
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'https://nexus.hyperspaceanalytics.com/api/youtube/auth/callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/tesla/learn?error=auth_denied');
  }

  if (!code || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect('/tesla/learn?error=missing_config');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return res.redirect('/tesla/learn?error=token_exchange');
    }

    const tokens = await tokenRes.json();

    // Set cookies for tokens (httpOnly for security)
    const secure = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', [
      `youtube_access_token=${tokens.access_token}; HttpOnly; Path=/; Max-Age=${tokens.expires_in}; SameSite=Lax${secure ? '; Secure' : ''}`,
      `youtube_refresh_token=${tokens.refresh_token || ''}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure ? '; Secure' : ''}`,
    ]);

    res.redirect('/tesla/learn');
  } catch (error) {
    console.error('[YouTube] OAuth callback error:', error);
    res.redirect('/tesla/learn?error=callback_failed');
  }
}
