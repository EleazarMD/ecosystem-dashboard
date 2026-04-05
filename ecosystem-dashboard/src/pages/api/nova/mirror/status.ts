import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_MIRROR_URL = process.env.NOVA_MIRROR_URL || 'http://localhost:18804';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = (req.query.user_id as string) || 'default';
  const includeToken = req.query.include_token === 'true';

  // Build upstream URL with optional parameters
  const params = new URLSearchParams();
  if (includeToken) params.set('include_token', 'true');
  const queryString = params.toString();
  const upstreamUrl = `${NOVA_MIRROR_URL}/mirror/${userId}/status${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(upstreamUrl);
    if (response.ok) {
      const data = await response.json();
      return res.status(200).json(data);
    }
    return res.status(response.status).json({ error: 'Mirror unavailable' });
  } catch {
    return res.status(200).json({ active: false });
  }
}
