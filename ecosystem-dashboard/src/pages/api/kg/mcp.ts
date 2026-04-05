/**
 * Knowledge Graph MCP API Proxy
 * 
 * This endpoint proxies requests to the AI Gateway MCP endpoint,
 * handling authentication and avoiding CORS issues with API keys.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import logger from '../../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestId = req.headers['x-request-id'] || `proxy-${Date.now()}`;

    // Strict service mesh compliance: require gateway enabled and reachable.
    const aiGatewayEnabled = process.env.AI_GATEWAY_ENABLED === 'true';
    if (!aiGatewayEnabled) {
      logger.warn('[KG-MCP-Proxy] AI Gateway disabled via configuration', { requestId });
      return res.status(503).json({
        error: 'AI Gateway disabled',
        code: 'AI_GATEWAY_DISABLED',
        message: 'Enable AI Gateway (service mesh) to execute MCP commands.',
        timestamp: new Date().toISOString()
      });
    }

    const aiGatewayHost = process.env.AI_GATEWAY_HOST || 'localhost';
    const aiGatewayPort = process.env.AI_GATEWAY_PORT || '7777';
    const aiGatewayScheme = process.env.AI_GATEWAY_SCHEME || 'http';
    const aiGatewayPath = process.env.AI_GATEWAY_MCP_PATH || '/api/v1/mcp';
    const serviceApiKey = process.env.AI_GATEWAY_SERVICE_API_KEY || '';

    const gatewayUrl = `${aiGatewayScheme}://${aiGatewayHost}:${aiGatewayPort}${aiGatewayPath}`;

    logger.info('[KG-MCP-Proxy] Forwarding MCP request to AI Gateway', {
      requestId,
      gatewayUrl,
      hasApiKey: !!serviceApiKey
    });

    const DEFAULT_TIMEOUT = parseInt(process.env.KG_TIMEOUT || '60000', 10);
    const REASONING_TIMEOUT = parseInt(process.env.KG_REASONING_TIMEOUT || '120000', 10);
    const command = req.body?.command;
    let timeout = DEFAULT_TIMEOUT;
    if (command === 'kg_reasoning' || command === 'kg_reason') {
      timeout = REASONING_TIMEOUT;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (serviceApiKey) {
      headers['x-api-key'] = serviceApiKey;
    }

    // Forward JSON-RPC style body as-is
    const resp = await axios.post(gatewayUrl, req.body, {
      timeout,
      headers,
      validateStatus: (s) => s >= 200 && s < 300
    });

    return res.status(resp.status).json(resp.data);
  } catch (error: any) {
    logger.error(`[KG-MCP-Proxy] Error proxying request to AI Gateway`, { 
      error: error.message,
      statusCode: error.response?.status,
      data: error.response?.data
    });

    // Return explicit errors without mock fallbacks
    const status = error.response?.status || 503;
    const code = status === 401 ? 'AI_GATEWAY_UNAUTHORIZED' : 'AI_GATEWAY_UNAVAILABLE';
    return res.status(status).json({
      error: 'AI Gateway request failed',
      code,
      message: error.message,
      details: error.response?.data,
      timestamp: new Date().toISOString()
    });
  }
}
