import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[test-sync] Endpoint called!');
  res.status(200).json({ success: true, message: 'Test endpoint works!' });
}
