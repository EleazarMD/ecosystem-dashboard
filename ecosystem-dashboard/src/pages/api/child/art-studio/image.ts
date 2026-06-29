/**
 * Child Art Studio — Image Asset Proxy
 *
 * Serves child-generated art images from disk. Basic auth is handled by
 * Next.js page routing, so only authenticated requests reach here.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

const ART_IMAGE_DIR = process.env.CHILD_ART_IMAGE_DIR || '/home/eleazar/Projects/AIHomelab/data/images/child-art';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file } = req.query;
  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'File parameter required' });
  }

  const filePath = path.join(ART_IMAGE_DIR, path.basename(file));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  try {
    const buffer = fs.readFileSync(filePath);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('[Art Studio Image] Error serving image:', error);
    return res.status(500).json({ error: 'Failed to serve image' });
  }
}
