import { NextApiRequest, NextApiResponse } from 'next';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Updated to use comprehensive Knowledge Graph service
const KNOWLEDGE_GRAPH_URL = 'http://localhost:8765';

if (!KNOWLEDGE_GRAPH_URL) {
  throw new Error('KNOWLEDGE_GRAPH_URL environment variable is not set.');
}

// Create proxy middleware
const proxy = createProxyMiddleware({
  target: KNOWLEDGE_GRAPH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/knowledge-graph/stats': '/graph/statistics',
  },
});

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// Helper function to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log(`[KG Stats API] Received request. Forwarding to: ${KNOWLEDGE_GRAPH_URL}/graph/statistics`);
  
  try {
    // Use the proxy middleware
    await runMiddleware(req, res, proxy);
  } catch (error) {
    console.error('[KG Stats API] Proxy error:', error);
    if (!res.headersSent) {
      // Return mock data instead of error when KG service is unavailable
      const mockStats = {
        status: 'disconnected',
        nodes: 0,
        relationships: 0,
        documents: 0,
        entities: 0,
        health: {
          status: 'offline',
          uptime: 0,
          memory_usage: 0,
          cpu_usage: 0
        },
        recent_activity: [],
        top_entities: []
      };
      
      res.status(503).json(mockStats);
    }
  }
}
