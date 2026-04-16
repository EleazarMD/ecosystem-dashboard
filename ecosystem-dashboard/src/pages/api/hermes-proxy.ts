import type { NextApiRequest, NextApiResponse } from 'next';
import { HERMES_URL } from '@/lib/hermes-client';

// CIG API Key for dashboard authentication
const CIG_API_KEY = process.env.CIG_API_KEY || 'dashboard-key-2024';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path, ...queryParams } = req.query;
  
  const pathSegments = Array.isArray(path) ? path.join('/') : path || '';
  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const url = `${HERMES_URL}/${pathSegments}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CIG_API_KEY,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const contentDisposition = response.headers.get('content-disposition');
    
    // Handle binary/attachment responses (audio, files, attachments)
    const isBinary = contentType.includes('audio/') || 
                     contentType.includes('application/octet-stream') ||
                     contentType.includes('application/pdf') ||
                     contentType.includes('image/') ||
                     contentDisposition?.includes('attachment');
    
    if (isBinary || (pathSegments.includes('attachments/download'))) {
      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.byteLength.toString());
      if (contentDisposition) {
        res.setHeader('Content-Disposition', contentDisposition);
      }
      res.status(response.status).send(Buffer.from(buffer));
      return;
    }

    // Handle JSON responses
    const data = await response.json();
    // Disable caching for email data to ensure fresh results
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Hermes proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from Hermes API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
