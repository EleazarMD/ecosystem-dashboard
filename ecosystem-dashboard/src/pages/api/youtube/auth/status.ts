/**
 * YouTube Auth Status - Check if user has valid YouTube OAuth tokens
 * Automatically refreshes expired access tokens using refresh token
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) return null;
    return await tokenRes.json();
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = req.cookies['youtube_access_token'];
  const refreshToken = req.cookies['youtube_refresh_token'];
  
  // If we have a valid access token, we're authenticated
  if (accessToken) {
    return res.status(200).json({ authenticated: true });
  }
  
  // If no access token but we have a refresh token, try to refresh
  if (refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    
    if (newTokens?.access_token) {
      // Set new access token cookie
      const secure = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', 
        `youtube_access_token=${newTokens.access_token}; HttpOnly; Path=/; Max-Age=${newTokens.expires_in}; SameSite=Lax${secure ? '; Secure' : ''}`
      );
      return res.status(200).json({ authenticated: true, refreshed: true });
    }
  }
  
  return res.status(200).json({ authenticated: false });
}
