/**
 * YouTube History - Get user's recently watched/liked videos
 * 
 * Note: YouTube deprecated the watch history API in 2016 for privacy reasons.
 * We combine liked videos + Watch Later playlist as the best available proxy.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = req.cookies['youtube_access_token'];
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const allVideos: any[] = [];

    // 1. Get liked videos
    const likedRes = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&myRating=like&maxResults=15',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (likedRes.ok) {
      const likedData = await likedRes.json();
      for (const item of likedData.items || []) {
        allVideos.push({
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.medium?.url || '',
          channel: item.snippet.channelTitle,
          source: 'liked',
        });
      }
    }

    // 2. Get Watch Later playlist (WL is the special playlist ID)
    // First get the user's channel to find their playlists
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (channelRes.ok) {
      const channelData = await channelRes.json();
      const watchLaterPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.watchLater;
      
      if (watchLaterPlaylistId) {
        const wlRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${watchLaterPlaylistId}&maxResults=15`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (wlRes.ok) {
          const wlData = await wlRes.json();
          for (const item of wlData.items || []) {
            // Avoid duplicates
            if (!allVideos.some(v => v.id === item.snippet.resourceId?.videoId)) {
              allVideos.push({
                id: item.snippet.resourceId?.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails?.medium?.url || '',
                channel: item.snippet.channelTitle || item.snippet.videoOwnerChannelTitle,
                source: 'watch_later',
              });
            }
          }
        }
      }
    }

    // Limit to 20 total
    const videos = allVideos.slice(0, 20);

    return res.status(200).json({ 
      videos,
      note: 'YouTube deprecated watch history API in 2016. Showing liked videos + Watch Later instead.'
    });
  } catch (error) {
    console.error('[YouTube] History error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
}
