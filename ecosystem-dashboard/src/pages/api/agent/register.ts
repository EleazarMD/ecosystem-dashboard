/**
 * API Endpoint: Register Dashboard UI Assistant Agent with AHIS Server
 * 
 * POST /api/agent/register
 * Initializes and registers the Dashboard UI Assistant Agent with the AHIS Server
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { initializeDashboardAgent, getDashboardAgent } from '../../../lib/agent/DashboardUIAssistantAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST.' 
    });
  }

  try {
    console.log('🎯 API: Initializing Dashboard UI Assistant Agent registration...');
    
    // Check if agent is already registered
    const agent = getDashboardAgent();
    const currentStatus = agent.getRegistrationStatus();
    
    if (currentStatus.isRegistered) {
      console.log('ℹ️ Dashboard UI Assistant Agent already registered');
      return res.status(200).json({
        success: true,
        message: 'Agent already registered',
        agentId: currentStatus.agentId,
        status: currentStatus,
        timestamp: new Date().toISOString()
      });
    }

    // Initialize and register the agent
    const registrationResponse = await initializeDashboardAgent();
    
    if (registrationResponse.success) {
      console.log('✅ API: Dashboard UI Assistant Agent registered successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Dashboard UI Assistant Agent registered successfully',
        agentId: registrationResponse.serviceId || registrationResponse.agentId,
        registrationResponse,
        status: agent.getRegistrationStatus(),
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ API: Dashboard UI Assistant Agent registration failed');
      
      return res.status(500).json({
        success: false,
        message: 'Agent registration failed',
        error: registrationResponse.message,
        registrationResponse,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ API: Agent registration error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during agent registration',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
