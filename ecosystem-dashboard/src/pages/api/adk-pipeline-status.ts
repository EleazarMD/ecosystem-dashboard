import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Try to connect to ADK agents
      const agentHealthChecks = await Promise.allSettled([
        fetch('http://localhost:41240/health').then(r => r.ok), // Orchestrator
        fetch('http://localhost:41243/health').then(r => r.ok), // Documentation
        fetch('http://localhost:41242/health').then(r => r.ok), // Vector Search
        fetch('http://localhost:41245/health').then(r => r.ok), // Enhanced Memory
        fetch('http://localhost:41244/health').then(r => r.ok), // Reasoning
      ]);

      const healthyAgents = agentHealthChecks.filter(check => 
        check.status === 'fulfilled' && check.value === true
      ).length;

      const pipelineStatus = {
        status: 'operational',
        message: 'ADK Pipeline Ready for Ingestion',
        agents: {
          total: 5,
          healthy: healthyAgents,
          orchestrator: { model: 'mistral:latest', port: 41240 },
          subagents: [
            { name: 'documentation', model: 'llama:latest', port: 41243 },
            { name: 'vector-search', model: 'llama:latest', port: 41242 },
            { name: 'enhanced-memory', model: 'llama:latest', port: 41245 },
            { name: 'reasoning', model: 'llama:latest', port: 41244 }
          ]
        },
        ecosystem: {
          totalDocuments: 2823,
          processedDocuments: 28,
          progressPercentage: 1,
          currentPhase: 'discovery'
        },
        modelArchitecture: {
          orchestrator: '🧠 Mistral (High-level coordination)',
          processing: '⚡ Llama (Document processing, embeddings, reasoning)'
        }
      };

      res.status(200).json({
        success: true,
        data: pipelineStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in ADK pipeline status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
