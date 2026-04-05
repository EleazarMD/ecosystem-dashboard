/**
 * Proxy for AI Gateway OpenClaw endpoints
 * Routes /api/gateway/openclaw/* → AI Gateway :8777/api/openclaw/*
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathSegments = req.query.path;
  const subPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '';
  const targetUrl = `${AI_GATEWAY_URL}/api/openclaw/${subPath}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_GATEWAY_API_KEY,
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD'
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    const isOffline =
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('fetch failed');
    return res.status(isOffline ? 503 : 500).json({
      ok: false,
      error: err.message ?? 'AI Gateway proxy failed',
      offline: isOffline,
    });
  }
}
