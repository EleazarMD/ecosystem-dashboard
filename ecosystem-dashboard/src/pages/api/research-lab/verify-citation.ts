/**
 * Citation Verification Proxy
 * POST /api/research-lab/verify-citation
 *
 * Performs a HEAD request to a URL to check if it's reachable.
 * Used by the client-side citation verifier to avoid CORS issues.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, timeoutMs = 5000 } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'AIHomelab-CitationVerifier/1.0',
      },
    });

    clearTimeout(timeout);

    return res.status(200).json({
      reachable: response.ok || response.status === 403 || response.status === 405,
      httpStatus: response.status,
      url,
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(200).json({ reachable: false, httpStatus: 0, url, reason: 'timeout' });
    }
    return res.status(200).json({ reachable: false, httpStatus: 0, url, reason: error.message });
  }
}
