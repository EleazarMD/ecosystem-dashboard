/**
 * Image Proxy API
 * Proxies images from AI Gateway to avoid CORS/SSL issues
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || process.env.AI_GATEWAY_AI_URL || 'http://localhost:8777';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, subfolder = '', type = 'output' } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename is required' });
  }

  try {
    const imageUrl = `${AI_GATEWAY_URL}/api/v1/images/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder as string)}&type=${encodeURIComponent(type as string)}`;
    
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error('[Image Proxy] Failed to fetch image:', response.status, response.statusText);
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(imageBuffer));
    
  } catch (error: any) {
    console.error('[Image Proxy] Error:', error.message);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}
