/**
 * YouTube Channel Search - Search videos within a specific channel
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.cookies['youtube_access_token'];
  const { id, q } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!id) {
    return res.status(400).json({ error: 'Channel ID required' });
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    // Search within the specific channel - increased to 50 results for better coverage
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${id}&q=${encodeURIComponent(q)}&type=video&maxResults=50&order=relevance`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: 'YouTube API error' });
    }

    const searchData = await searchRes.json();
    const videos = (searchData.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    return res.status(200).json({ videos });
  } catch (error) {
    console.error('[YouTube] Channel search error:', error);
    return res.status(500).json({ error: 'Failed to search channel videos' });
  }
}
