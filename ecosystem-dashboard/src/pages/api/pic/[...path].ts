/**
 * PIC API Proxy
 * 
 * Proxies requests from the dashboard to the Personal Identity Core service.
 * This avoids CORS issues and provides a consistent API surface.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const PIC_BASE_URL = 'http://localhost:8765/api/pic';
const PIC_READ_KEY = 'dev-read-key-change-in-prod';
const PIC_ADMIN_KEY = 'dev-admin-key-change-in-prod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  // Build target URL
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const targetUrl = `${PIC_BASE_URL}/${pathString}${queryString ? `?${queryString}` : ''}`;
  
  // Determine which key to use based on method
  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || 'GET');
  const picKey = isWriteOperation ? PIC_ADMIN_KEY : PIC_READ_KEY;
  
  try {
    // Forward request to PIC service
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        [isWriteOperation ? 'X-PIC-Admin-Key' : 'X-PIC-Read-Key']: picKey,
        ...(req.headers['user-agent'] && { 'User-Agent': req.headers['user-agent'] as string }),
      },
      ...(req.body && { body: JSON.stringify(req.body) }),
    });
    
    // Get response data
    const data = await response.json();
    
    // Forward status and data
    res.status(response.status).json(data);
  } catch (error) {
    console.error('PIC proxy error:', error);
    res.status(500).json({
      error: 'Failed to communicate with PIC service',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
