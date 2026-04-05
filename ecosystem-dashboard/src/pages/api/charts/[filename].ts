/**
 * Chart Image API Route
 * Serves chart images from the datasets/charts directory
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { filename } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename required' });
  }

  // Security: Prevent directory traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Construct path to chart file
  const chartsDir = '/Users/eleazar/Projects/AIHomelab/datasets/charts';
  const filePath = path.join(chartsDir, filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Chart not found' });
  }

  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/png';
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    } else if (ext === '.json') {
      contentType = 'application/json';
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Send file
    res.status(200).send(fileBuffer);
  } catch (error: any) {
    console.error('[Chart API] Error serving chart:', error);
    return res.status(500).json({ error: 'Failed to load chart' });
  }
}
