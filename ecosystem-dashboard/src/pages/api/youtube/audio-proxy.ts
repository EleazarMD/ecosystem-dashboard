/**
 * YouTube Audio Proxy
 * 
 * Extracts audio-only stream from YouTube videos for Tesla driving mode.
 * Tesla blocks video playback when vehicle is in Drive, but audio works.
 * 
 * Uses yt-dlp to extract audio stream URL.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { videoId } = req.query;

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({ error: 'Missing videoId parameter' });
  }

  try {
    // Use yt-dlp to extract audio stream URL
    // Format 140 = m4a audio, 128kbps (best quality audio-only)
    const { stdout } = await execAsync(
      `yt-dlp -f 140 --get-url "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 10000 }
    );

    const audioUrl = stdout.trim();

    if (!audioUrl) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    // Return the direct audio URL
    return res.status(200).json({
      videoId,
      audioUrl,
      format: 'm4a',
      quality: '128kbps',
      expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // ~6 hours
    });
  } catch (error: any) {
    console.error('[YouTube Audio] Error:', error);

    // Fallback: Return YouTube's audio-only embed URL
    // This may still be blocked by Tesla, but worth trying
    return res.status(200).json({
      videoId,
      audioUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1`,
      format: 'embed',
      quality: 'unknown',
      fallback: true,
      note: 'yt-dlp not available, using embed fallback',
    });
  }
}
