/**
 * Hermes End-to-End Health Monitoring API
 * 
 * Comprehensive health check for all Hermes system components:
 * - Hermes Core API
 * - Neo4j Graph Database
 * - ChromaDB Vector Store
 * - AI Gateway connectivity
 * - Email indexing status
 * - Calendar sync status
 * - PIC integration
 * 
 * GET /api/monitoring/hermes-health
 * 
 * Returns detailed health status for ExoMind/agent consumption
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://127.0.0.1:8780';
const HERMES_JWT_TOKEN = process.env.HERMES_JWT_TOKEN || '';

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HermesHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  overallLatencyMs: number;
  components: {
    hermesCore: ComponentHealth;
    neo4j: ComponentHealth;
    chromadb: ComponentHealth;
    aiGateway: ComponentHealth;
    pic: ComponentHealth;
  };
  metrics: {
    totalEmails: number;
    inboxEmails: number;
    sentEmails: number;
    vectorsIndexed: number;
    reembeddingProgress?: {
      current: number;
      total: number;
      percentComplete: number;
    };
  };
  alerts: string[];
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HermesHealthResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const alerts: string[] = [];
  
  // Initialize component health
  const components: HermesHealthResponse['components'] = {
    hermesCore: { status: 'unknown' },
    neo4j: { status: 'unknown' },
    chromadb: { status: 'unknown' },
    aiGateway: { status: 'unknown' },
    pic: { status: 'unknown' },
  };

  let metrics: HermesHealthResponse['metrics'] = {
    totalEmails: 0,
    inboxEmails: 0,
    sentEmails: 0,
    vectorsIndexed: 0,
  };

  try {
    // 1. Check Hermes Core basic health (no auth required)
    const healthStart = Date.now();
    const healthRes = await fetchWithTimeout(`${HERMES_CORE_URL}/health`);
    const healthLatency = Date.now() - healthStart;
    
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      components.hermesCore = {
        status: healthData.status === 'healthy' ? 'healthy' : 'degraded',
        latencyMs: healthLatency,
        details: {
          version: healthData.version,
          uptime: healthData.uptime_seconds,
        },
      };
      
      // Extract email counts from basic health
      if (healthData.indexed_emails) {
        metrics.totalEmails = healthData.indexed_emails.total || 0;
        metrics.inboxEmails = healthData.indexed_emails.inbox || 0;
        metrics.sentEmails = healthData.indexed_emails.sent || 0;
      }
    } else {
      components.hermesCore = {
        status: 'unhealthy',
        latencyMs: healthLatency,
        error: `HTTP ${healthRes.status}`,
      };
      alerts.push('Hermes Core API is not responding correctly');
    }

    // 2. Check detailed health (includes dependency status)
    const detailedStart = Date.now();
    const detailedRes = await fetchWithTimeout(`${HERMES_CORE_URL}/health/detailed`);
    
    if (detailedRes.ok) {
      const detailed = await detailedRes.json();
      
      // Neo4j
      if (detailed.dependencies?.neo4j) {
        const neo4j = detailed.dependencies.neo4j;
        components.neo4j = {
          status: neo4j.status === 'healthy' ? 'healthy' : 'unhealthy',
          latencyMs: neo4j.latency_ms,
          error: neo4j.error,
        };
        if (neo4j.status !== 'healthy') {
          alerts.push(`Neo4j: ${neo4j.error || 'unhealthy'}`);
        }
      }

      // ChromaDB
      if (detailed.dependencies?.chromadb) {
        const chromadb = detailed.dependencies.chromadb;
        components.chromadb = {
          status: chromadb.status === 'healthy' ? 'healthy' : 'unhealthy',
          latencyMs: chromadb.latency_ms,
          error: chromadb.error,
          details: { path: chromadb.path },
        };
        if (chromadb.status !== 'healthy') {
          alerts.push(`ChromaDB: ${chromadb.error || 'unhealthy'}`);
        }
      }

      // AI Gateway
      if (detailed.dependencies?.ai_gateway) {
        const aiGw = detailed.dependencies.ai_gateway;
        components.aiGateway = {
          status: aiGw.status === 'healthy' ? 'healthy' : 'unhealthy',
          latencyMs: aiGw.latency_ms,
          error: aiGw.error,
          details: { version: aiGw.version },
        };
        if (aiGw.status !== 'healthy') {
          alerts.push(`AI Gateway: ${aiGw.error || 'unhealthy'}`);
        }
      }

      // PIC
      if (detailed.dependencies?.pic) {
        const pic = detailed.dependencies.pic;
        components.pic = {
          status: pic.status === 'healthy' ? 'healthy' : 'degraded',
          latencyMs: pic.latency_ms,
          error: pic.error,
        };
        // PIC is optional, don't alert if unavailable
      }
    }

    // 3. Check ChromaDB vector count directly
    try {
      const chromaRes = await fetchWithTimeout('http://localhost:8101/api/v2/collections');
      if (chromaRes.ok) {
        const collections = await chromaRes.json();
        let totalVectors = 0;
        for (const col of collections) {
          if (col.name === 'sent_emails' || col.name === 'inbox_emails') {
            // Get collection count
            const countRes = await fetchWithTimeout(`http://localhost:8101/api/v2/collections/${col.id}/count`);
            if (countRes.ok) {
              const count = await countRes.json();
              totalVectors += count || 0;
            }
          }
        }
        metrics.vectorsIndexed = totalVectors;
        
        // Check if re-embedding is in progress
        if (metrics.totalEmails > 0 && metrics.vectorsIndexed < metrics.totalEmails * 0.9) {
          metrics.reembeddingProgress = {
            current: metrics.vectorsIndexed,
            total: metrics.totalEmails,
            percentComplete: Math.round((metrics.vectorsIndexed / metrics.totalEmails) * 100),
          };
          if (metrics.vectorsIndexed < metrics.totalEmails * 0.5) {
            alerts.push(`Vector re-indexing in progress: ${metrics.reembeddingProgress.percentComplete}% complete`);
          }
        }
      }
    } catch (e) {
      // ChromaDB direct check failed, use component status from Hermes
    }

  } catch (error: any) {
    components.hermesCore = {
      status: 'unhealthy',
      error: error.message || 'Connection failed',
    };
    alerts.push(`Hermes Core unreachable: ${error.message}`);
  }

  // Determine overall status
  const componentStatuses = Object.values(components).map(c => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (componentStatuses.includes('unhealthy')) {
    // Core components unhealthy = system unhealthy
    if (components.hermesCore.status === 'unhealthy' || 
        components.neo4j.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }
  } else if (componentStatuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  const response: HermesHealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    overallLatencyMs: Date.now() - startTime,
    components,
    metrics,
    alerts,
  };

  return res.status(200).json(response);
}
