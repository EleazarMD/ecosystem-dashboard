/**
 * News Story Image Serving Endpoint
 * GET /api/news/stories/[id]/image
 * 
 * Serves news story cover images from permanent storage.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

// Permanent storage location for news images
const NEWS_IMAGE_DIR = process.env.NEWS_IMAGE_DIR || '/home/eleazar/Projects/AIHomelab/data/images/news-stories';

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

  const imageFilePath = path.join(NEWS_IMAGE_DIR, `${id}.png`);

  if (!fs.existsSync(imageFilePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  try {
    const stat = fs.statSync(imageFilePath);
    const fileSize = stat.size;

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    const stream = fs.createReadStream(imageFilePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error serving image file:', error);
    return res.status(500).json({ error: 'Failed to serve image file' });
  }
}
