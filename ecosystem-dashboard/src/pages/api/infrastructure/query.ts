import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Infrastructure Query API Endpoint
 * Handles queries about Kubernetes, containers, services, deployments
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, classification, context } = req.body;

  try {
    console.log('🏗️ Infrastructure Query:', query);

    // Mock infrastructure data - replace with actual AHIS/Kubernetes calls
    const infrastructureData = {
      kubernetes: {
        status: 'healthy',
        nodes: 3,
        pods: 12,
        services: 8
      },
      containers: {
        running: 15,
        stopped: 2,
        total: 17
      },
      services: {
        'ai-gateway': 'healthy',
        'knowledge-graph': 'healthy',
        'memory-agent': 'healthy',
        'orchestrator': 'healthy'
      }
    };

    // Generate contextual response based on query
    let response = '';
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('kubernetes') || lowerQuery.includes('k8s')) {
      response = `Kubernetes cluster is ${infrastructureData.kubernetes.status} with ${infrastructureData.kubernetes.nodes} nodes, ${infrastructureData.kubernetes.pods} pods, and ${infrastructureData.kubernetes.services} services running.`;
    } else if (lowerQuery.includes('container')) {
      response = `Container status: ${infrastructureData.containers.running} running, ${infrastructureData.containers.stopped} stopped (${infrastructureData.containers.total} total).`;
    } else if (lowerQuery.includes('service') || lowerQuery.includes('health')) {
      const healthyServices = Object.entries(infrastructureData.services)
        .filter(([_, status]) => status === 'healthy')
        .map(([name, _]) => name);
      response = `All core services are healthy: ${healthyServices.join(', ')}.`;
    } else {
      response = `Infrastructure overview: Kubernetes cluster healthy with ${infrastructureData.kubernetes.pods} pods running. All core services operational.`;
    }

    res.json({
      success: true,
      content: response,
      data: infrastructureData,
      metadata: {
        domain: 'infrastructure',
        query,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Infrastructure query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Infrastructure query failed'
    });
  }
}
