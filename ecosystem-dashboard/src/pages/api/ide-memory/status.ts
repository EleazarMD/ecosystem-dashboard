import { NextApiRequest, NextApiResponse } from 'next';
import { getHealth } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const start = Date.now();
    const health = await getHealth();
    const latency = Date.now() - start;

    res.status(200).json({
      online: health.online,
      latency,
      status: health.status,
    });
  } catch (error: any) {
    console.error('[ide-memory/status] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
