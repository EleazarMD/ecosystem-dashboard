/**
 * PCG API Proxy — routes dashboard requests to the main Personal Context
 * Graph service (:8765) with PIC auth headers + X-User-Id for per-user
 * routing.
 *
 * The dashboard calls /api/pcg/<path> and /api/kg/<path>.
 * These map to PCG's /api/pcg/<path> and /api/kg/<path> respectively.
 * For /api/pic/<path> endpoints (identity, preferences, goals, observations),
 * the dashboard should call /api/pcg/pic/<path> which maps to /api/pic/<path>.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const PCG_BASE_URL = process.env.PCG_URL || 'http://localhost:8765';
const PIC_READ_KEY = process.env.PIC_READ_KEY || 'pic-read-O-1b4i12nR9gr3kzookTYGZ7NTA_nhSF';
const PIC_ADMIN_KEY = process.env.PIC_ADMIN_KEY || 'pic-admin-nee9oPtIqFwRUaj5vm96A8LEwMkYtUFU';
const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'dfd9379f-a9cd-4241-99e7-140f5e89e3cd';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';

  // Extract user_id from header or query, fall back to default
  const userId = (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    DEFAULT_USER_ID;

  const query = { ...req.query };
  delete query.path;
  delete query.userId;
  const queryString = new URLSearchParams(query as Record<string, string>).toString();

  // The dashboard path is /api/pcg/<path> — map to PCG's /api/<path>
  // Special case: /api/pcg/pic/<path> → /api/pic/<path> (for identity/preferences/etc)
  // Special case: /api/pcg/pcg/<path> → /api/pcg/<path> (for exomind/insights/etc)
  // Special case: /api/pcg/kg/<path> → /api/kg/<path> (for graph stats)
  let pcgPath: string;
  if (pathString.startsWith('pic/')) {
    pcgPath = `/api/${pathString}`;
  } else if (pathString.startsWith('pcg/')) {
    pcgPath = `/api/${pathString}`;
  } else if (pathString.startsWith('kg/')) {
    pcgPath = `/api/${pathString}`;
  } else {
    // Default: treat as /api/pcg/<path>
    pcgPath = `/api/pcg/${pathString}`;
  }

  const targetUrl = `${PCG_BASE_URL}${pcgPath}${queryString ? `?${queryString}` : ''}`;

  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method || 'GET');
  const isKgRoute = pathString.startsWith('kg/');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!isKgRoute) {
    headers['X-PIC-Read-Key'] = PIC_READ_KEY;
    headers['X-User-Id'] = userId;
    if (isWriteOperation) {
      headers['X-PIC-Admin-Key'] = PIC_ADMIN_KEY;
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      ...(req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0 && { body: JSON.stringify(req.body) }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('PCG proxy error:', error);
    res.status(500).json({
      error: 'Failed to communicate with PCG service',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
