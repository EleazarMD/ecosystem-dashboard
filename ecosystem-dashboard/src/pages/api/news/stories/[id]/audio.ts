import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

// Permanent storage location for news audio files
const NEWS_AUDIO_DIR = process.env.NEWS_AUDIO_DIR || '/home/eleazar/Projects/AIHomelab/data/audio/news-stories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  // Validate UUID format to prevent path traversal
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid story ID format' });
  }

  const audioFilePath = path.join(NEWS_AUDIO_DIR, `${id}.wav`);

  if (!fs.existsSync(audioFilePath)) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  try {
    const stat = fs.statSync(audioFilePath);
    const fileSize = stat.size;

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      const stream = fs.createReadStream(audioFilePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      const stream = fs.createReadStream(audioFilePath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Error serving audio file:', error);
    return res.status(500).json({ error: 'Failed to serve audio file' });
  }
}
