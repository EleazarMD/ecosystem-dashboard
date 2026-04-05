import type { NextApiRequest, NextApiResponse } from 'next';

const TRAINING_HUB_URL = process.env.TRAINING_HUB_URL || 'http://localhost:8766';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${TRAINING_HUB_URL}/api/ablation-results`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(req.method === 'POST' && { body: JSON.stringify(req.body) }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Training Hub proxy error:', error);
    res.status(502).json({ error: 'Failed to connect to Training Hub', runs: [] });
  }
}
