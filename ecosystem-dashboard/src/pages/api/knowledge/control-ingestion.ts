import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, batch } = req.body;

  if (!action || !['start', 'pause', 'stop'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be start, pause, or stop.' });
  }

  try {
    // Try to connect to Orchestrator Agent for pipeline control
    const orchestratorUrl = 'http://localhost:41240';
    
    try {
      const response = await fetch(`${orchestratorUrl}/a2a/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'pipeline_control',
          payload: {
            action,
            batch: batch || 'ai-homelab-ecosystem',
            target: 'documentation_ingestion'
          },
          requestId: `pipeline_${Date.now()}`,
          sender: 'dashboard'
        }),
        timeout: 5000,
      });

      if (response.ok) {
        const result = await response.json();
        return res.status(200).json({
          success: true,
          message: `Pipeline ${action} command sent successfully`,
          orchestratorResponse: result
        });
      } else {
        throw new Error(`Orchestrator responded with status ${response.status}`);
      }
    } catch (orchestratorError) {
      // Fallback: simulate pipeline control
      console.warn('Orchestrator not available, simulating pipeline control:', orchestratorError);
      
      return res.status(200).json({
        success: true,
        message: `Pipeline ${action} simulated (Orchestrator Agent not available)`,
        simulation: true,
        details: {
          action,
          batch: batch || 'ai-homelab-ecosystem',
          timestamp: new Date().toISOString(),
          expectedBehavior: action === 'start' 
            ? 'Would initiate document processing across all available agents'
            : action === 'pause'
            ? 'Would pause current document processing tasks'
            : 'Would stop all processing and cleanup resources'
        }
      });
    }

  } catch (error) {
    console.error('Error controlling ingestion pipeline:', error);
    return res.status(500).json({ 
      error: 'Failed to control ecosystem documentation ingestion pipeline',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
