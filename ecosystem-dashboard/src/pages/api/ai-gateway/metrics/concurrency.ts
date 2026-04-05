/**
 * API endpoint for AI Gateway concurrency metrics
 * Returns per-API-key in-flight and queued request counts
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface ConcurrencySlot {
  inflight: number;
  queued: number;
}

interface ConcurrencyResponse {
  concurrency: Record<string, ConcurrencySlot>;
  defaults: {
    maxConcurrent: number;
    queueTimeoutMs: number;
  };
  timestamp: string;
}

async function fetchConcurrencyStats(): Promise<ConcurrencyResponse> {
  const aiGatewayUrl = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
  const apiKey = process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-api-key-2024';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const response = await fetch(
    `${aiGatewayUrl}/api/v1/rate-limits/concurrency`,
    {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }
  );

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const data = await fetchConcurrencyStats();

    // Calculate summary metrics
    const keys = Object.entries(data.concurrency);
    const totalInflight = keys.reduce((sum, [, s]) => sum + s.inflight, 0);
    const totalQueued = keys.reduce((sum, [, s]) => sum + s.queued, 0);

    res.status(200).json({
      ...data,
      summary: {
        activeKeys: keys.length,
        totalInflight,
        totalQueued,
        maxConcurrentPerKey: data.defaults.maxConcurrent,
        queueTimeoutMs: data.defaults.queueTimeoutMs,
      },
    });
  } catch (error: any) {
    console.error('[Concurrency API] Error:', error);
    res.status(200).json({
      concurrency: {},
      defaults: { maxConcurrent: 8, queueTimeoutMs: 30000 },
      summary: {
        activeKeys: 0,
        totalInflight: 0,
        totalQueued: 0,
        maxConcurrentPerKey: 8,
        queueTimeoutMs: 30000,
      },
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}
