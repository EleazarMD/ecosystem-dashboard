/**
 * YouTube Channel Videos - Get videos from a specific channel
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.cookies['youtube_access_token'];
  const { id } = req.query;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!id) {
    return res.status(400).json({ error: 'Channel ID required' });
  }

  try {
    // Get channel's uploads playlist
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!channelRes.ok) {
      return res.status(channelRes.status).json({ error: 'YouTube API error' });
    }

    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return res.status(404).json({ error: 'Channel uploads not found' });
    }

    // Get videos from uploads playlist - increased to 50 for better coverage
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!videosRes.ok) {
      return res.status(videosRes.status).json({ error: 'YouTube API error' });
    }

    const videosData = await videosRes.json();
    const videos = (videosData.items || [])
      .map((item: any) => ({
        id: item.contentDetails.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      }))
      .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return res.status(200).json({ videos });
  } catch (error) {
    console.error('[YouTube] Channel videos error:', error);
    return res.status(500).json({ error: 'Failed to fetch channel videos' });
  }
}
