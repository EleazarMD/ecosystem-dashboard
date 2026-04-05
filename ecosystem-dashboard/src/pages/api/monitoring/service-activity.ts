/**
 * Service Activity API
 * Fetches per-service telemetry with trends from AI Inferencing
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface ServiceActivity {
  serviceId: string;
  serviceName: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorCount: number;
  lastRequest: string;
  trend: number[]; // 8 hourly buckets for sparkline
  isLocal: boolean;
  gpuId?: number;
}

interface ServiceActivityResponse {
  success: boolean;
  timestamp: string;
  timeRange: string;
  overview: {
    totalRequests: number;
    localRequests: number;
    cloudRequests: number;
    totalCost: number;
    avgLatency: number;
  };
  services: ServiceActivity[];
  error?: string;
}

// Service name mappings
const SERVICE_NAMES: Record<string, string> = {
  'hermes-core': 'Hermes Core',
  'hermes_core': 'Hermes Core',
  'pic': 'PIC Agent',
  'pic-agent': 'PIC Agent',
  'openclaw': 'OpenClaw',
  'openclaw-agent': 'OpenClaw Agent',
  'research-agent': 'Research Agent',
  'knowledge-graph': 'Knowledge Graph',
  'kg-ingestion': 'KG Ingestion',
  'podcast-studio': 'Podcast Studio',
  'dashboard': 'Dashboard',
  'ai-gateway': 'AI Gateway',
};

// Local providers (RTX GPU inference)
const LOCAL_PROVIDERS = ['vllm', 'local', 'ollama', 'triton', 'tgi', 'openai-oss'];

function isLocalProvider(provider: string): boolean {
  return LOCAL_PROVIDERS.some(p => provider.toLowerCase().includes(p));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServiceActivityResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      timestamp: new Date().toISOString(),
      timeRange: '24h',
      overview: { totalRequests: 0, localRequests: 0, cloudRequests: 0, totalCost: 0, avgLatency: 0 },
      services: [],
      error: 'Method not allowed',
    });
  }

  const timeRange = (req.query.timeRange as string) || '24h';
  const aiInferencingUrl = process.env.AI_INFERENCING_URL || 'http://localhost:9000';
  const adminKey = process.env.AI_INFERENCING_API_KEY || 'ai-inferencing-admin-key-2024';

  try {
    // Fetch service activity from AI Inferencing
    const [servicesRes, overviewRes] = await Promise.all([
      fetch(`${aiInferencingUrl}/api/v1/telemetry/services?timeRange=${timeRange}`, {
        headers: {
          'X-Admin-Key': adminKey,
          'X-Service-ID': 'dashboard',
        },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
      fetch(`${aiInferencingUrl}/api/v1/telemetry/overview?timeRange=${timeRange}`, {
        headers: {
          'X-Admin-Key': adminKey,
          'X-Service-ID': 'dashboard',
        },
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
    ]);

    const servicesData = servicesRes?.ok ? await servicesRes.json() : null;
    const overviewData = overviewRes?.ok ? await overviewRes.json() : null;

    if (!servicesData?.services) {
      // Return empty response if no data
      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        timeRange,
        overview: {
          totalRequests: overviewData?.stats?.totalRequests || 0,
          localRequests: 0,
          cloudRequests: 0,
          totalCost: overviewData?.stats?.totalCost || 0,
          avgLatency: overviewData?.stats?.avgLatency || 0,
        },
        services: [],
      });
    }

    // Transform services data
    const services: ServiceActivity[] = servicesData.services.map((s: any) => {
      const isLocal = isLocalProvider(s.provider);
      return {
        serviceId: s.serviceId,
        serviceName: SERVICE_NAMES[s.serviceId] || s.serviceId,
        provider: s.provider,
        requestCount: s.requestCount || 0,
        totalTokens: s.totalTokens || 0,
        totalCost: s.totalCost || 0,
        avgLatency: s.avgLatency || 0,
        errorCount: s.errorCount || 0,
        lastRequest: s.lastRequest,
        trend: s.trend || [0, 0, 0, 0, 0, 0, 0, 0],
        isLocal,
        gpuId: isLocal ? 0 : undefined, // TODO: Get actual GPU assignment
      };
    });

    // Calculate overview
    const localRequests = services.filter(s => s.isLocal).reduce((sum, s) => sum + s.requestCount, 0);
    const cloudRequests = services.filter(s => !s.isLocal).reduce((sum, s) => sum + s.requestCount, 0);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      timeRange,
      overview: {
        totalRequests: overviewData?.stats?.totalRequests || services.reduce((sum, s) => sum + s.requestCount, 0),
        localRequests,
        cloudRequests,
        totalCost: overviewData?.stats?.totalCost || services.reduce((sum, s) => sum + s.totalCost, 0),
        avgLatency: overviewData?.stats?.avgLatency || 0,
      },
      services,
    });
  } catch (error) {
    console.error('Failed to fetch service activity:', error);
    return res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      timeRange,
      overview: { totalRequests: 0, localRequests: 0, cloudRequests: 0, totalCost: 0, avgLatency: 0 },
      services: [],
      error: 'Failed to fetch service activity',
    });
  }
}
