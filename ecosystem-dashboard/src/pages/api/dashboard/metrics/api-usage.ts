import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to proxy API usage metrics from AI Gateway
 * GET /api/dashboard/metrics/api-usage
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const gatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:3000';
    const response = await fetch(`${gatewayUrl}/dashboard/metrics/api-usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`AI Gateway responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching API usage metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch API usage metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
