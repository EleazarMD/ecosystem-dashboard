import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Platforms data for AI Homelab ecosystem
    const platforms = [
      {
        id: 'openclaw',
        name: 'OpenClaw Gateway',
        type: 'orchestrator',
        status: 'active',
        agents: 4,
        description: 'Primary orchestrator with security gating and telemetry'
      },
      {
        id: 'ai-inferencing',
        name: 'AI Inferencing Service',
        type: 'infrastructure',
        status: 'active',
        agents: 1,
        description: 'LLM provider routing and inference management'
      },
      {
        id: 'hermes-core',
        name: 'Hermes Core',
        type: 'communication',
        status: 'active',
        agents: 1,
        description: 'Email and calendar intelligence service'
      }
    ];

    res.status(200).json({
      success: true,
      platforms,
      total: platforms.length
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platforms'
    });
  }
}
