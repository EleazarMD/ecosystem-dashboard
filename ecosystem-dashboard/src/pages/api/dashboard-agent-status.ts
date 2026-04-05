/**
 * API Endpoint: Dashboard AI Agent Status Check
 * 
 * GET /api/dashboard-agent-status
 * Returns the current status of the DashboardAIAgent registration
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check localStorage simulation (server-side doesn't have localStorage)
    // This would be replaced with actual registration check in production
    
    const agentStatus = {
      id: 'dashboard_ai_coordinator',
      name: 'Dashboard AI Coordinator',
      isRegistered: true,
      registrationMethod: 'auto-registration',
      lastRegistered: new Date().toISOString(),
      capabilities: [
        'system-monitoring',
        'multi-agent-orchestration',
        'vision-analysis',
        'knowledge-graph-queries',
        'voice-interaction',
        'real-time-insights'
      ],
      intelligence_layers: {
        layer1: 'Direct Operations (fast)',
        layer2: 'Specialized Analysis (moderate)',
        layer3: 'Knowledge Graph Intelligence (complex)'
      },
      sub_agents: [
        { name: 'VisionAgent', model: 'llama3.2-vision:11b', status: 'active' },
        { name: 'KnowledgeGraphAgent', port: 41242, status: 'active' }
      ],
      tools: [
        'SystemStatusTool',
        'KnowledgeSearchTool', 
        'VoiceCapabilityTool',
        'VisionAnalysisTool'
      ],
      ai_gateway_url: 'http://localhost:8777',
      model: 'mistral:latest',
      version: '2.1.0',
      status: 'active',
      health: 'healthy'
    };

    console.log('📊 Dashboard AI Agent Status Check:', {
      registered: agentStatus.isRegistered,
      capabilities: agentStatus.capabilities.length,
      tools: agentStatus.tools.length,
      sub_agents: agentStatus.sub_agents.length
    });

    res.status(200).json({
      success: true,
      agent: agentStatus,
      timestamp: new Date().toISOString(),
      visible_in_agentic_control: true
    });

  } catch (error) {
    console.error('Error checking agent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check agent status',
      timestamp: new Date().toISOString()
    });
  }
}
