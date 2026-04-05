import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Request Traces API
 * Provides access to request tracing data for debugging and analysis
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetTraces(req, res);
  } else if (req.method === 'POST') {
    return handleQueryTraces(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetTraces(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      limit = '100',
      offset = '0',
      status,
      provider,
      model,
      clientId,
      startDate,
      endDate,
      hasError,
    } = req.query;

    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    // Build query parameters
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (status) params.append('status', status.toString());
    if (provider) params.append('provider', provider.toString());
    if (model) params.append('model', model.toString());
    if (clientId) params.append('clientId', clientId.toString());
    if (startDate) params.append('startDate', startDate.toString());
    if (endDate) params.append('endDate', endDate.toString());
    if (hasError) params.append('hasError', hasError.toString());

    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/traces?${params.toString()}`,
      {
        headers: {
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[Traces API] AI Gateway returned ${response.status}`);
      return res.status(response.status).json({
        error: 'Failed to fetch traces',
        traces: [],
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Traces API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      traces: [],
    });
  }
}

async function handleQueryTraces(req: NextApiRequest, res: NextApiResponse) {
  try {
    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/traces/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
        body: JSON.stringify(req.body),
      }
    );

    if (!response.ok) {
      console.warn(`[Traces API] AI Gateway returned ${response.status}`);
      return res.status(response.status).json({
        error: 'Failed to query traces',
        traces: [],
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Traces API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      traces: [],
    });
  }
}
