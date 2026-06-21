import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const PI_WORKSPACE_URL = process.env.PI_WORKSPACE_URL || 'http://127.0.0.1:8762';
  const PI_WORKSPACE_API_KEY = process.env.PI_WORKSPACE_API_KEY || 'dashboard-workspace-key-2026';
  
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : (path || '');
  
  // Reconstruct the full URL
  const url = new URL(`/api/${pathString}`, PI_WORKSPACE_URL);
  
  // Append query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'path' && value) {
      url.searchParams.append(key, Array.isArray(value) ? value[0] : value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'x-api-key': PI_WORKSPACE_API_KEY,
        ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
        ...(req.headers['accept'] ? { 'accept': req.headers['accept'] } : {}),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
      // @ts-ignore
      duplex: 'half',
    });

    // Copy status code
    res.status(response.status);

    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Pipe response body
    if (response.body) {
      // @ts-ignore
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error('[PiWorkspace Proxy] Error:', error);
    res.status(500).json({ error: 'Proxy error', details: error.message });
  }
}
