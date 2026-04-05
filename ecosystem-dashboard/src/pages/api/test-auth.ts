import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Headers received:', JSON.stringify(req.headers, null, 2));
  console.log('X-API-Key:', req.headers['x-api-key']);
  console.log('Body:', req.body);
  
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
  
  console.log('Expected key:', expectedKey);
  console.log('Received key:', apiKey);
  console.log('Match:', apiKey === expectedKey);
  
  return res.status(200).json({ 
    hasApiKey: !!apiKey,
    match: apiKey === expectedKey,
    expectedKey: expectedKey.substring(0, 10) + '...'
  });
}
