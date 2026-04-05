import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = process.env.OPENCLAW_TOKEN || '';
  res.status(200).json({
    hasToken: !!token,
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 10),
  });
}
