/**
 * Ecosystem End-to-End Health Monitoring API
 * 
 * Comprehensive health check for all AI Homelab components:
 * - Core Infrastructure (AI Gateway, AI Inferencing, LLM servers)
 * - Hermes System (Core, Neo4j, ChromaDB)
 * - Agent Services (Nova, OpenClaw, Tesla Relay)
 * - Support Services (Approval Engine, Dashboard)
 * - Docker containers
 * 
 * GET /api/monitoring/ecosystem-health
 * 
 * Returns detailed health status for ExoMind heartbeat consumption
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  error?: string;
  details?: Record<string, any>;
}

interface EcosystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checkDurationMs: number;
  services: {
    infrastructure: ServiceHealth[];
    hermes: ServiceHealth[];
    agents: ServiceHealth[];
    support: ServiceHealth[];
  };
  containers: {
    total: number;
    up: number;
    down: number;
    unhealthy: number;
  };
  systemMetrics: {
    cpuUsage?: number;
    memoryUsagePercent?: number;
    diskUsagePercent?: number;
  };
  alerts: string[];
  summary: string;
}

async function checkService(name: string, url: string, timeoutMs = 5000): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    // For HTTPS URLs with self-signed certs, we need to handle differently
    const isHttps = url.startsWith('https://');
    const fetchOptions: RequestInit = { signal: controller.signal };
    
    // Node.js fetch doesn't support rejectUnauthorized, so for HTTPS we use a TCP check fallback
    if (isHttps) {
      // For OpenClaw, just check if the port is listening
      const urlObj = new URL(url);
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync(`bash -c '</dev/tcp/${urlObj.hostname}/${urlObj.port}'`, { timeout: timeoutMs });
        clearTimeout(timeout);
        return {
          name,
          status: 'healthy',
          latencyMs: Date.now() - start,
          details: { note: 'TCP port check (HTTPS)' },
        };
      } catch {
        clearTimeout(timeout);
        return {
          name,
          status: 'unhealthy',
          latencyMs: Date.now() - start,
          error: 'Port not responding',
        };
      }
    }
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeout);
    
    const latencyMs = Date.now() - start;
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name,
        status: data.status === 'healthy' || response.ok ? 'healthy' : 'degraded',
        latencyMs,
        details: data,
      };
    } else {
      return {
        name,
        status: 'unhealthy',
        latencyMs,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      name,
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error.name === 'AbortError' ? 'Timeout' : error.message,
    };
  }
}

async function getDockerStats(): Promise<{ total: number; up: number; down: number; unhealthy: number }> {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --format '{{.Status}}' 2>/dev/null`,
      { timeout: 10000 }
    );
    
    const lines = stdout.trim().split('\n').filter(Boolean);
    const total = lines.length;
    const up = lines.filter(l => l.toLowerCase().startsWith('up')).length;
    const down = total - up;
    const unhealthy = lines.filter(l => l.includes('(unhealthy)')).length;
    
    return { total, up, down, unhealthy };
  } catch {
    return { total: 0, up: 0, down: 0, unhealthy: 0 };
  }
}

async function getSystemMetrics(): Promise<{ cpuUsage?: number; memoryUsagePercent?: number; diskUsagePercent?: number }> {
  try {
    // CPU usage
    const { stdout: cpuOut } = await execAsync(
      `top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1`,
      { timeout: 5000 }
    );
    const cpuUsage = parseFloat(cpuOut.trim()) || undefined;

    // Memory usage
    const { stdout: memOut } = await execAsync(
      `free | grep Mem | awk '{print ($3/$2) * 100}'`,
      { timeout: 5000 }
    );
    const memoryUsagePercent = parseFloat(memOut.trim()) || undefined;

    // Disk usage
    const { stdout: diskOut } = await execAsync(
      `df / | tail -1 | awk '{print $5}' | tr -d '%'`,
      { timeout: 5000 }
    );
    const diskUsagePercent = parseFloat(diskOut.trim()) || undefined;

    return { cpuUsage, memoryUsagePercent, diskUsagePercent };
  } catch {
    return {};
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EcosystemHealthResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const alerts: string[] = [];

  // Check all services in parallel
  const [
    // Infrastructure
    aiGateway,
    aiInferencing,
    llamaMinimax,
    
    // Hermes
    hermesCore,
    hermesDetailed,
    chromadb,
    
    // Agents
    novaAgent,
    openclawGateway,
    teslaRelay,
    
    // Support
    approvalService,
    dashboard,
    
    // System
    containers,
    systemMetrics,
  ] = await Promise.all([
    // Infrastructure
    checkService('AI Gateway', 'http://localhost:8777/health'),
    checkService('AI Inferencing', 'http://localhost:9000/health'),
    checkService('LLM Server (MiniMax)', 'http://localhost:8010/health'),
    
    // Hermes
    checkService('Hermes Core', 'http://localhost:8780/health'),
    checkService('Hermes Detailed', 'http://localhost:8780/health/detailed'),
    checkService('ChromaDB', 'http://localhost:8101/api/v2/heartbeat'),
    
    // Agents
    checkService('Nova Agent', 'http://localhost:18800/health'),
    checkService('OpenClaw Gateway', 'https://100.108.41.22:18789/health'),
    checkService('Tesla Relay', 'http://localhost:18810/health'),
    
    // Support
    checkService('Approval Service', 'http://localhost:8407/health'),
    checkService('Dashboard', 'http://localhost:8404/api/health'),
    
    // System
    getDockerStats(),
    getSystemMetrics(),
  ]);

  // Parse Hermes detailed for Neo4j status
  let neo4jHealth: ServiceHealth = { name: 'Neo4j', status: 'unknown' };
  if (hermesDetailed.status === 'healthy' && hermesDetailed.details?.dependencies?.neo4j) {
    const neo4j = hermesDetailed.details.dependencies.neo4j;
    neo4jHealth = {
      name: 'Neo4j',
      status: neo4j.status === 'healthy' ? 'healthy' : 'unhealthy',
      latencyMs: neo4j.latency_ms,
      error: neo4j.error,
    };
  }

  // Build service groups
  const services: EcosystemHealthResponse['services'] = {
    infrastructure: [aiGateway, aiInferencing, llamaMinimax],
    hermes: [hermesCore, neo4jHealth, chromadb],
    agents: [novaAgent, openclawGateway, teslaRelay],
    support: [approvalService, dashboard],
  };

  // Generate alerts
  const allServices = [...services.infrastructure, ...services.hermes, ...services.agents, ...services.support];
  
  for (const svc of allServices) {
    if (svc.status === 'unhealthy') {
      alerts.push(`${svc.name}: ${svc.error || 'unhealthy'}`);
    }
  }

  if (containers.unhealthy > 0) {
    alerts.push(`${containers.unhealthy} Docker container(s) unhealthy`);
  }
  if (containers.down > 2) {
    alerts.push(`${containers.down} Docker container(s) stopped`);
  }

  if (systemMetrics.memoryUsagePercent && systemMetrics.memoryUsagePercent > 90) {
    alerts.push(`High memory usage: ${systemMetrics.memoryUsagePercent.toFixed(1)}%`);
  }
  if (systemMetrics.diskUsagePercent && systemMetrics.diskUsagePercent > 85) {
    alerts.push(`High disk usage: ${systemMetrics.diskUsagePercent.toFixed(1)}%`);
  }

  // Determine overall status
  const criticalServices = ['AI Gateway', 'Hermes Core', 'Neo4j', 'Nova Agent'];
  const criticalUnhealthy = allServices
    .filter(s => criticalServices.includes(s.name) && s.status === 'unhealthy')
    .map(s => s.name);

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (criticalUnhealthy.length > 0) {
    overallStatus = 'unhealthy';
  } else if (alerts.length > 0) {
    overallStatus = 'degraded';
  }

  // Generate summary
  const healthyCount = allServices.filter(s => s.status === 'healthy').length;
  const totalCount = allServices.length;
  let summary = `${healthyCount}/${totalCount} services healthy`;
  
  if (criticalUnhealthy.length > 0) {
    summary += `. CRITICAL: ${criticalUnhealthy.join(', ')} down`;
  } else if (alerts.length > 0) {
    summary += `. ${alerts.length} alert(s)`;
  }

  const response: EcosystemHealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checkDurationMs: Date.now() - startTime,
    services,
    containers,
    systemMetrics,
    alerts,
    summary,
  };

  return res.status(200).json(response);
}
