import { NextApiRequest, NextApiResponse } from 'next';

interface ADKAgent {
  name: string;
  model: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'busy';
  capabilities: string[];
  currentTask?: string;
}

interface IngestionPipeline {
  status: 'idle' | 'running' | 'paused' | 'error';
  orchestrator: {
    model: 'mistral:latest';
    agent: 'orchestrator';
    port: 41240;
    status: string;
    activeWorkflows: number;
  };
  subagents: ADKAgent[];
  progress: {
    totalDocuments: number;
    processedDocuments: number;
    currentBatch: string;
    currentPhase: string;
    estimatedTimeRemaining: number;
  };
  modelAssignments: {
    orchestrator: 'mistral:latest';
    documentation: 'llama:latest';
    vectorSearch: 'llama:latest';
    enhancedMemory: 'llama:latest';
    reasoning: 'llama:latest';
  };
  realtimeActivity: Array<{
    timestamp: string;
    agent: string;
    model: string;
    document: string;
    status: 'processing' | 'completed' | 'error';
    entities?: number;
    processingTime?: number;
    error?: string;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Try to connect to real ADK agents first
      const agentHealthChecks = await Promise.allSettled([
        fetch('http://localhost:41240/health'), // Orchestrator
        fetch('http://localhost:41241/health'), // Graph Query  
        fetch('http://localhost:41242/health'), // Vector Search
        fetch('http://localhost:41243/health'), // Documentation
        fetch('http://localhost:41244/health'), // Reasoning
        fetch('http://localhost:41245/health'), // Enhanced Memory
        fetch('http://localhost:41246/health'), // Integration
      ]);

      // Check Knowledge Graph API for current ingestion status
      let realIngestionData = null;
      try {
        const kgResponse = await fetch('http://localhost:8765/api/ingestion-status');
        if (kgResponse.ok) {
          realIngestionData = await kgResponse.json();
        }
      } catch (error) {
        console.log('KG API not available, using mock data');
      }

      // Create comprehensive pipeline status
      const pipeline: IngestionPipeline = {
        status: realIngestionData ? 'running' : 'idle',
        orchestrator: {
          model: 'mistral:latest',
          agent: 'orchestrator',
          port: 41240,
          status: agentHealthChecks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
          activeWorkflows: realIngestionData?.activeWorkflows || 0
        },
        subagents: [
          {
            name: 'documentation-agent',
            model: 'llama:latest',
            port: 41243,
            status: agentHealthChecks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            capabilities: ['markdown_ingestion', 'document_discovery', 'frontmatter_processing', 'entity_extraction'],
            currentTask: realIngestionData ? 'processing AIHomelab docs' : undefined
          },
          {
            name: 'vector-search-agent', 
            model: 'llama:latest',
            port: 41242,
            status: agentHealthChecks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            capabilities: ['semantic_search', 'embedding_generation', 'vector_operations'],
            currentTask: realIngestionData ? 'generating embeddings' : undefined
          },
          {
            name: 'enhanced-memory-agent',
            model: 'llama:latest', 
            port: 41245,
            status: agentHealthChecks[5].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            capabilities: ['ide_memory_processing', 'memory_synchronization', 'cross_referencing'],
            currentTask: realIngestionData ? 'IDE memory sync' : undefined
          },
          {
            name: 'reasoning-agent',
            model: 'llama:latest',
            port: 41244, 
            status: agentHealthChecks[4].status === 'fulfilled' ? 'healthy' : 'unhealthy',
            capabilities: ['multi_hop_reasoning', 'pattern_detection', 'validation'],
            currentTask: realIngestionData ? 'consistency validation' : undefined
          }
        ],
        progress: {
          totalDocuments: 2823, // Real AIHomelab ecosystem count
          processedDocuments: realIngestionData?.processedDocuments || 28,
          currentBatch: 'ai-homelab-ecosystem',
          currentPhase: realIngestionData?.currentPhase || 'discovery',
          estimatedTimeRemaining: realIngestionData?.estimatedTimeRemaining || 18.5
        },
        modelAssignments: {
          orchestrator: 'mistral:latest',
          documentation: 'llama:latest',
          vectorSearch: 'llama:latest', 
          enhancedMemory: 'llama:latest',
          reasoning: 'llama:latest'
        },
        realtimeActivity: realIngestionData?.recentActivity || [
          {
            timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
            agent: 'orchestrator-agent',
            model: 'mistral:latest',
            document: 'Planning batch ingestion workflow',
            status: 'completed'
          },
          {
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            agent: 'documentation-agent',
            model: 'llama:latest', 
            document: 'core/knowledge-graph/README.md',
            status: 'completed',
            entities: 12,
            processingTime: 3.2
          },
          {
            timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
            agent: 'vector-search-agent',
            model: 'llama:latest',
            document: 'embedding generation for README.md',
            status: 'completed',
            processingTime: 1.8
          },
          {
            timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
            agent: 'reasoning-agent', 
            model: 'llama:latest',
            document: 'validating port compliance patterns',
            status: 'completed',
            processingTime: 2.1
          }
        ]
      };

      res.status(200).json({
        success: true,
        data: {
          pipeline,
          isLiveData: !!realIngestionData,
          agentConnectivity: {
            total: 7,
            healthy: agentHealthChecks.filter(check => check.status === 'fulfilled').length,
            unhealthy: agentHealthChecks.filter(check => check.status === 'rejected').length
          }
        }
      });

    } catch (error) {
      console.error('Error fetching ingestion pipeline status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pipeline status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'POST') {
    const { action, batch } = req.body;

    try {
      if (action === 'start') {
        // Start ingestion via orchestrator
        const orchestratorResponse = await fetch('http://localhost:41240/a2a/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'orchestrate_workflow',
            payload: {
              workflow: 'bulk_document_ingestion',
              parameters: {
                source: '/Users/eleazar/Projects/AIHomelab',
                batch: batch || 'ai-homelab-ecosystem',
                totalDocuments: 2823,
                modelAssignments: {
                  orchestrator: 'mistral:latest',
                  subagents: 'llama:latest'
                }
              }
            }
          })
        });

        if (orchestratorResponse.ok) {
          res.status(200).json({
            success: true,
            message: 'Ingestion pipeline started',
            workflowId: 'bulk-ingestion-' + Date.now()
          });
        } else {
          throw new Error('Failed to start orchestrator workflow');
        }
      } else if (action === 'pause') {
        // Pause ingestion via orchestrator
        const pauseResponse = await fetch('http://localhost:41240/workflows/pause', {
          method: 'POST'
        });

        if (pauseResponse.ok) {
          res.status(200).json({
            success: true,
            message: 'Ingestion pipeline paused'
          });
        } else {
          throw new Error('Failed to pause workflow');
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: 'Action must be "start" or "pause"'
        });
      }
    } catch (error) {
      console.error('Error controlling ingestion pipeline:', error);
      res.status(500).json({
        success: false,
        error: 'Pipeline control failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
