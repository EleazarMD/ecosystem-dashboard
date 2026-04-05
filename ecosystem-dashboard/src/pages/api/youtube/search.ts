/**
 * YouTube Search - Search for videos
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.cookies['youtube_access_token'];
  const { q } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!q) {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q as string)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'YouTube API error' });
    }

    const data = await response.json();
    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      channel: item.snippet.channelTitle,
    }));

    return res.status(200).json({ videos });
  } catch (error) {
    console.error('[YouTube] Search error:', error);
    return res.status(500).json({ error: 'Failed to search' });
  }
}
