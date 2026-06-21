/**
 * PCG API Proxy
 * 
 * Proxies requests from the dashboard to the Personal Context Graph service.
 * This avoids CORS issues and provides a consistent API surface.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const KIDS_PCG_BASE_URL = process.env.KIDS_PCG_URL || 'http://127.0.0.1:8771';
const KIDS_PCG_API_PREFIX = process.env.KIDS_PCG_API_PREFIX || '/api/pcg';
const KIDS_PCG_READ_KEY = process.env.KIDS_PCG_READ_KEY || '';
const KIDS_PCG_ADMIN_KEY = process.env.KIDS_PCG_ADMIN_KEY || '';
const KIDS_PCG_DEFAULT_OWNER_ID = process.env.KIDS_PCG_DEFAULT_OWNER_ID || '';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';

  const ownerHeader = req.headers['x-pcg-owner-id'];
  const ownerId =
    (Array.isArray(ownerHeader) ? ownerHeader[0] : ownerHeader) ||
    KIDS_PCG_DEFAULT_OWNER_ID;

  if (!ownerId) {
    return res.status(400).json({
      error: 'Missing owner id (x-pcg-owner-id) and KIDS_PCG_DEFAULT_OWNER_ID is not set',
    });
  }

  const query = { ...req.query };
  delete query.path;
  const queryString = new URLSearchParams(query as Record<string, string>).toString();
  const targetUrl = `${KIDS_PCG_BASE_URL}${KIDS_PCG_API_PREFIX}/${pathString}${queryString ? `?${queryString}` : ''}`;

  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || 'GET');
  const pcgKey = isWriteOperation ? KIDS_PCG_ADMIN_KEY : KIDS_PCG_READ_KEY;

  if (!pcgKey) {
    return res.status(500).json({
      error: `Missing ${isWriteOperation ? 'KIDS_PCG_ADMIN_KEY' : 'KIDS_PCG_READ_KEY'} in server environment`,
    });
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-PCG-Key': pcgKey,
        'X-PCG-Owner-Id': ownerId,
        ...(req.headers['user-agent'] && { 'User-Agent': req.headers['user-agent'] as string }),
      },
      ...(req.body && { body: JSON.stringify(req.body) }),
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : { raw: await response.text() };

    res.status(response.status).json(data);
  } catch (error) {
    console.error('PCG proxy error:', error);
    res.status(500).json({
      error: 'Failed to communicate with PCG service',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
