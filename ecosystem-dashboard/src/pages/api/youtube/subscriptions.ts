/**
 * YouTube Subscriptions - Get user's subscribed channels
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.cookies['youtube_access_token'];
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'YouTube API error' });
    }

    const data = await response.json();
    const channels = (data.items || []).map((item: any) => ({
      id: item.snippet.resourceId.channelId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.default?.url || '',
    }));

    return res.status(200).json({ channels });
  } catch (error) {
    console.error('[YouTube] Subscriptions error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
}
