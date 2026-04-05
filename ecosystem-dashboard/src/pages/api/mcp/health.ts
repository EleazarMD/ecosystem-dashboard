import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const KG_MCP_URL = process.env.KG_MCP_URL || 'http://localhost:8766';
const AHIS_URL = process.env.AHIS_BASE_URL || 'http://localhost:8888';
const REQUEST_TIMEOUT = 5000;

const kgMcpClient = axios.create({
  baseURL: KG_MCP_URL,
  timeout: REQUEST_TIMEOUT,
});

const ahisClient = axios.create({
  baseURL: AHIS_URL,
  timeout: REQUEST_TIMEOUT,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const [kgResponse, ahisResponse] = await Promise.allSettled([
      kgMcpClient.get('/health'),
      ahisClient.get('/health')
    ]);

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        knowledge_graph_mcp: {
          status: kgResponse.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          url: KG_MCP_URL,
          response_time: kgResponse.status === 'fulfilled' ? 'ok' : 'timeout',
          data: kgResponse.status === 'fulfilled' ? kgResponse.value.data : null
        },
        ahis_mcp: {
          status: ahisResponse.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          url: AHIS_URL,
          response_time: ahisResponse.status === 'fulfilled' ? 'ok' : 'timeout',
          data: ahisResponse.status === 'fulfilled' ? ahisResponse.value.data : null
        }
      },
      overall_health: (kgResponse.status === 'fulfilled' && ahisResponse.status === 'fulfilled') ? 1.0 : 0.5
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error('MCP Health Check Error:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'MCP services unavailable',
      services: {
        knowledge_graph_mcp: { status: 'unhealthy', url: KG_MCP_URL },
        ahis_mcp: { status: 'unhealthy', url: AHIS_URL }
      },
      overall_health: 0.0
    });
  }
}
