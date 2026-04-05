import { NextApiRequest, NextApiResponse } from 'next';

/**
 * System Status Query API Endpoint
 * Handles queries about service health, connectivity, system diagnostics
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, classification, context } = req.body;

  try {
    console.log('🔧 System Status Query:', query);

    // Mock system status data - replace with actual health checks
    const systemStatus = {
      services: {
        'orchestrator': { status: 'healthy', port: 41240, uptime: '2h 15m' },
        'memory-agent': { status: 'healthy', port: 41245, uptime: '45m' },
        'ai-gateway': { status: 'healthy', port: 7777, uptime: '3h 22m' },
        'dashboard': { status: 'healthy', port: 8404, uptime: '1h 8m' }
      },
      connectivity: {
        postgres: 'connected',
        neo4j: 'connected',
        kubernetes: 'connected'
      },
      system: {
        cpu_usage: '23%',
        memory_usage: '67%',
        disk_usage: '45%',
        load_average: 1.2
      }
    };

    // Generate contextual response based on query
    let response = '';
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('health') || lowerQuery.includes('status')) {
      const healthyServices = Object.entries(systemStatus.services)
        .filter(([_, info]) => info.status === 'healthy')
        .map(([name, _]) => name);
      response = `System status: All ${healthyServices.length} core services are healthy (${healthyServices.join(', ')}). Database connections active.`;
    } else if (lowerQuery.includes('service')) {
      const serviceDetails = Object.entries(systemStatus.services)
        .map(([name, info]) => `${name}:${info.port} (${info.uptime})`)
        .join(', ');
      response = `Service status: ${serviceDetails}`;
    } else if (lowerQuery.includes('database') || lowerQuery.includes('connection')) {
      response = `Database connectivity: PostgreSQL ${systemStatus.connectivity.postgres}, Neo4j ${systemStatus.connectivity.neo4j}, Kubernetes ${systemStatus.connectivity.kubernetes}`;
    } else if (lowerQuery.includes('resource') || lowerQuery.includes('cpu') || lowerQuery.includes('memory')) {
      response = `System resources: CPU ${systemStatus.system.cpu_usage}, Memory ${systemStatus.system.memory_usage}, Disk ${systemStatus.system.disk_usage}, Load ${systemStatus.system.load_average}`;
    } else {
      response = `System overview: All services healthy, databases connected, system resources normal (CPU ${systemStatus.system.cpu_usage}, Memory ${systemStatus.system.memory_usage})`;
    }

    res.json({
      success: true,
      content: response,
      data: systemStatus,
      metadata: {
        domain: 'system_status',
        query,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('System status query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'System status query failed'
    });
  }
}
