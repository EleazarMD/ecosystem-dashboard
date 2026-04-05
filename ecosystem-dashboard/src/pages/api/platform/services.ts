/**
 * Platform Services API
 * 
 * GET - List all services with health status
 * PUT - Update service configuration
 * POST - Toggle service enabled state
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { ServiceConfig, DEFAULT_SERVICES } from '@/lib/platform/types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await getServices(req, res);
      case 'PUT':
        return await updateService(req, res);
      case 'POST':
        return await toggleService(req, res);
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Platform Services API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function getServices(req: NextApiRequest, res: NextApiResponse) {
  const includeHealth = req.query.health === 'true';
  
  let services = [...DEFAULT_SERVICES];
  
  // Try to get config from database
  try {
    const result = await pool.query(
      `SELECT config FROM platform_config WHERE environment = 'development'`
    );
    if (result.rows.length > 0 && result.rows[0].config?.services) {
      services = result.rows[0].config.services;
    }
  } catch (e) {
    // Use defaults
  }
  
  // Check health if requested
  if (includeHealth) {
    services = await Promise.all(
      services.map(async (service) => {
        const health = await checkServiceHealth(service);
        return { ...service, health };
      })
    );
  }
  
  return res.status(200).json({
    success: true,
    services,
    count: services.length,
  });
}

async function checkServiceHealth(service: ServiceConfig): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency?: number;
  message?: string;
}> {
  if (!service.endpoint || !service.enabled) {
    return { status: 'unknown', message: 'No endpoint or disabled' };
  }
  
  const healthUrl = service.healthCheck
    ? `${service.endpoint}${service.healthCheck}`
    : service.endpoint;
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return { status: 'healthy', latency };
    } else {
      return { status: 'degraded', latency, message: `HTTP ${response.status}` };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

async function updateService(req: NextApiRequest, res: NextApiResponse) {
  const { serviceId, updates } = req.body;
  
  if (!serviceId || !updates) {
    return res.status(400).json({
      success: false,
      error: 'serviceId and updates required',
    });
  }
  
  try {
    // Get current config
    const result = await pool.query(
      `SELECT config FROM platform_config WHERE environment = 'development'`
    );
    
    let config = result.rows[0]?.config || { services: DEFAULT_SERVICES };
    
    // Update service
    config.services = config.services.map((s: ServiceConfig) =>
      s.id === serviceId ? { ...s, ...updates } : s
    );
    
    // Save
    await pool.query(
      `INSERT INTO platform_config (environment, config, last_updated, updated_by)
       VALUES ('development', $1, NOW(), 'api')
       ON CONFLICT (environment) DO UPDATE SET config = $1, last_updated = NOW()`,
      [JSON.stringify(config)]
    );
    
    return res.status(200).json({
      success: true,
      message: `Service ${serviceId} updated`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update service',
    });
  }
}

async function toggleService(req: NextApiRequest, res: NextApiResponse) {
  const { serviceId, enabled } = req.body;
  
  if (!serviceId || typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'serviceId and enabled (boolean) required',
    });
  }
  
  // Delegate to updateService
  req.body = { serviceId, updates: { enabled } };
  return updateService(req, res);
}
