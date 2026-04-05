import { NextApiRequest, NextApiResponse } from 'next';

const KG_SERVICE_HOST = process.env.KG_SERVICE_HOST || 'localhost';
const KG_SERVICE_PORT = process.env.KG_SERVICE_PORT || '8765';
const KG_SERVICE_URL = `http://${KG_SERVICE_HOST}:${KG_SERVICE_PORT}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, context, format = 'json' } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const payload = {
      query,
      context: context || '',
      format
    };

    console.log(`[KG API] Searching Knowledge Graph with query: "${query}"`);

    const response = await fetch(`${KG_SERVICE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30000);
        return controller.signal;
      })() // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Knowledge Graph service responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the search results to a consistent format
    const transformedResults = {
      results: data.results || [],
      query: query,
      timestamp: new Date().toISOString(),
      success: data.success !== false
    };

    return res.status(200).json(transformedResults);

  } catch (error) {
    console.error('[KG API] Search error:', error);
    
    // Return a more informative error response
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'Knowledge Graph service is not available',
        message: 'The Knowledge Graph service is not running or not reachable'
      });
    }

    return res.status(500).json({
      error: 'Failed to search Knowledge Graph',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
