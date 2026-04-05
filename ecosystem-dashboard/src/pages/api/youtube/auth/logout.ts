/**
 * YouTube OAuth Logout - Clear tokens to allow re-authentication with new scopes
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear YouTube cookies
  const secure = process.env.NODE_ENV === 'production';
  
  res.setHeader('Set-Cookie', [
    `youtube_access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`,
    `youtube_refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`,
  ]);

  return res.status(200).json({ success: true, message: 'Logged out. Please sign in again.' });
}
