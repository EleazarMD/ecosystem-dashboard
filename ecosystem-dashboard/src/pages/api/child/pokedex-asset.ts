/**
 * Pokedex Asset Proxy
 *
 * Serves locally-cached Pokemon assets from the pokedex-graph service's /assets
 * directory. Supports Dream World SVGs, shiny sprites, and cries (audio).
 *
 * Usage: /api/child/pokedex-asset?path=dream-world/25.svg
 *        /api/child/pokedex-asset?path=shiny/25.png
 *        /api/child/pokedex-asset?path=cries/25.ogg
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'Missing path parameter' });
    return;
  }

  // Prevent path traversal
  if (path.includes('..') || path.startsWith('/')) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }

  try {
    const upstream = await fetch(`${POKEDEX_URL}/assets/${path}`);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Asset not found: ${path}` });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/svg+xml';
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.status(200).send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
