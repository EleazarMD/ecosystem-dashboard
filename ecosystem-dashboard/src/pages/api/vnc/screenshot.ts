import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = '/tmp';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    // List available screenshots
    try {
      const files = fs.readdirSync(SCREENSHOTS_DIR)
        .filter(f => f.endsWith('.png') && f.includes('screenshot'))
        .map(f => ({
          name: f,
          url: `/api/vnc/screenshot?file=${f}`,
          time: fs.statSync(path.join(SCREENSHOTS_DIR, f)).mtime
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());

      return res.status(200).json({ screenshots: files });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to list screenshots' });
    }
  }

  // Serve specific screenshot
  const filePath = path.join(SCREENSHOTS_DIR, file);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(SCREENSHOTS_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Cache-Control', 'no-cache');

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}

export const config = {
  api: {
    responseLimit: false,
  },
};
