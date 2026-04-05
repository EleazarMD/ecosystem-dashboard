/**
 * API Endpoint: Unregister Dashboard UI Assistant Agent from AHIS Server
 * 
 * POST /api/agent/unregister
 * Unregisters the Dashboard UI Assistant Agent from the AHIS Server
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getDashboardAgent } from '../../../lib/agent/DashboardUIAssistantAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use POST.' 
    });
  }

  try {
    console.log('🔄 API: Unregistering Dashboard UI Assistant Agent...');
    
    const agent = getDashboardAgent();
    const currentStatus = agent.getRegistrationStatus();
    
    if (!currentStatus.isRegistered) {
      console.log('ℹ️ Dashboard UI Assistant Agent not currently registered');
      return res.status(200).json({
        success: true,
        message: 'Agent not currently registered',
        status: currentStatus,
        timestamp: new Date().toISOString()
      });
    }

    // Unregister the agent
    const success = await agent.unregisterFromAHIS();
    
    if (success) {
      console.log('✅ API: Dashboard UI Assistant Agent unregistered successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Dashboard UI Assistant Agent unregistered successfully',
        status: agent.getRegistrationStatus(),
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ API: Dashboard UI Assistant Agent unregistration failed');
      
      return res.status(500).json({
        success: false,
        message: 'Agent unregistration failed',
        status: agent.getRegistrationStatus(),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ API: Agent unregistration error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during agent unregistration',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
