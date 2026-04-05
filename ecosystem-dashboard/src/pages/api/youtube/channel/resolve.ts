/**
 * YouTube Channel Resolve - Resolve channel handle or ID to channel info
 * Supports: @handle, channel ID (UC...), or full YouTube URL
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.cookies['youtube_access_token'];
  const { q } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query required' });
  }

  try {
    let channelId: string | null = null;
    let channelData: any = null;

    // If it's already a channel ID (starts with UC)
    if (q.startsWith('UC')) {
      channelId = q;
    } else {
      // It's a handle (@username) - use forHandle parameter for exact match
      const handle = q.startsWith('@') ? q.substring(1) : q;
      
      // Use channels API with forHandle for exact handle lookup
      const handleRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(handle)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (handleRes.ok) {
        const handleData = await handleRes.json();
        if (handleData.items && handleData.items.length > 0) {
          channelId = handleData.items[0].id;
        }
      }
      
      // Fallback to search if forHandle didn't work
      if (!channelId) {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('@' + handle)}&type=channel&maxResults=1`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            channelId = searchData.items[0].snippet.channelId;
          }
        }
      }
    }

    if (!channelId) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Get full channel info
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!channelRes.ok) {
      return res.status(channelRes.status).json({ error: 'YouTube API error' });
    }

    channelData = await channelRes.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const item = channelData.items[0];
    const channel = {
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      description: item.snippet.description,
    };

    return res.status(200).json({ channel });
  } catch (error) {
    console.error('[YouTube] Channel resolve error:', error);
    return res.status(500).json({ error: 'Failed to resolve channel' });
  }
}
