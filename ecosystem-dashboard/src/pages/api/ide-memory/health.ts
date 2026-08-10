import { NextApiRequest, NextApiResponse } from 'next';
import { getHealth, getGraphStats } from '../../../lib/pcg-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const [health, graphStats] = await Promise.all([
      getHealth(),
      getGraphStats(),
    ]);

    const pcgOnline = health.online;

    res.status(200).json({
      status: pcgOnline ? 'healthy' : 'unhealthy',
      pcg_online: pcgOnline,
      graph_stats: graphStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('IDE Memory Health Error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message,
      pcg_online: false,
      graph_stats: null,
    });
  }
}
