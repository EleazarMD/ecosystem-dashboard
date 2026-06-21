/**
 * API proxy to the pokedex-graph GraphQL service.
 *
 * The pokedex-graph service runs on POKEDEX_PORT (default 8795) and exposes
 * a Strawberry GraphQL endpoint. This route forwards authenticated child
 * requests to that service so the frontend never touches the backend directly.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const POKEDEX_URL =
  process.env.POKEDEX_GRAPH_URL ||
  `http://localhost:${process.env.POKEDEX_PORT || 8795}`;
const POKEDEX_API_KEY = process.env.POKEDEX_API_KEY || 'pokedex-local-key-2026';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  if (user.accountType !== 'child' && user.accountType !== 'parent' && user.accountType !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, variables } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing GraphQL query' });
  }

  try {
    const upstream = await fetch(`${POKEDEX_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${POKEDEX_API_KEY}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await upstream.text();
      return res.status(502).json({
        error: 'Pokedex service returned non-JSON response',
        detail: text.slice(0, 200),
      });
    }

    const data = await upstream.json();
    return res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (err) {
    return res.status(503).json({
      error: 'Pokedex service unavailable',
      detail: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
