import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mock agent orchestration health data
    const healthData = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        platforms: 3,
        agents: 4,
        activeAgents: 4,
        healthyAgents: 4,
        totalRequests: 1247,
        avgResponseTime: 850
      },
      services: [
        {
          name: 'Agent Orchestration API',
          status: 'healthy',
          port: 8404,
          uptime: '99.8%',
          lastCheck: new Date().toISOString()
        },
        {
          name: 'Agent Registry',
          status: 'healthy',
          port: 8405,
          uptime: '99.9%',
          lastCheck: new Date().toISOString()
        },
        {
          name: 'AI Gateway',
          status: 'healthy',
          port: 7777,
          uptime: '98.5%',
          lastCheck: new Date().toISOString()
        }
      ],
      platforms: [
        {
          id: 'openclaw',
          name: 'OpenClaw Gateway',
          status: 'active',
          agents: 4,
          health: 'healthy'
        },
        {
          id: 'ai-inferencing',
          name: 'AI Inferencing',
          status: 'active',
          agents: 1,
          health: 'healthy'
        },
        {
          id: 'hermes-core',
          name: 'Hermes Core',
          status: 'active',
          agents: 1,
          health: 'healthy'
        }
      ]
    };

    res.status(200).json(healthData);
  } catch (error) {
    console.error('Error fetching agent health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent health data'
    });
  }
}
