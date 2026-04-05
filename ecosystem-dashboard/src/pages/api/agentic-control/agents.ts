import { NextApiRequest, NextApiResponse } from 'next';
import { GooseAgentDetector } from '@/lib/agents/goose-detector';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  capabilities: string[];
  endpoint: string;
  version: string;
  description: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  platform: string;
  model?: string;
  lastHeartbeat: string;
  source?: 'adk' | 'goose' | 'self' | 'mcp';
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  health: {
    overall: number;
    components: {
      connectivity: number;
      performance: number;
      resources: number;
      dependencies: number;
      security: number;
    };
    trend: 'stable' | 'improving' | 'degrading';
    lastCheck: string;
  };
  remediation: {
    enabled: boolean;
    mode: 'automatic' | 'manual';
    lastAction: string;
    successRate: number;
    actionsToday: number;
  };
  incidents: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  dependencies: Array<{
    name: string;
    status: string;
    port?: number;
    model?: string;
  }>;
  sessions?: any;
  tools?: any;
  observability?: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API] Discovering agents from PostgreSQL database...');
    
    const agents: Agent[] = [];

    // Add Dashboard AI Coordinator (always present)
    const dashboardAgent: Agent = {
      id: 'dashboard-ai-coordinator',
      name: 'Dashboard AI Coordinator',
      status: 'active' as const,
      type: 'dashboard-ai',
      source: 'adk' as const,
      capabilities: ['dashboard-management', 'agent-coordination', 'system-monitoring', 'a2a-protocol'],
      endpoint: 'http://localhost:8404',
      version: '2.1.0',
      description: 'Central dashboard AI coordinator with enhanced monitoring and multi-agent orchestration capabilities',
      uptime: 99.9,
      memoryUsage: 45,
      cpuUsage: 12,
      platform: 'Next.js',
      model: 'UI-Orchestrator',
      lastHeartbeat: new Date().toISOString(),
      resourceUsage: {
        cpu: 12,
        memory: 45,
        network: 2.1
      },
      health: {
        overall: 98,
        components: {
          connectivity: 100,
          performance: 95,
          resources: 90,
          dependencies: 100,
          security: 100
        },
        trend: 'stable' as const,
        lastCheck: new Date().toISOString()
      },
      remediation: {
        enabled: true,
        mode: 'automatic' as const,
        lastAction: 'health_check',
        successRate: 98,
        actionsToday: 0
      },
      incidents: [],
      dependencies: [
        { name: 'AI Gateway', status: 'active', port: 8777 },
        { name: 'Vision Agent', status: 'active', model: 'llama3.2-vision:11b' },
        { name: 'Knowledge Graph Agent', status: 'active', port: 41242 }
      ]
    };
    
    agents.push(dashboardAgent);
    console.log('[API] ✅ DashboardAIAgent added successfully');

    // NEW: Detect Goose agents
    try {
      console.log('[API] Detecting Goose agents...');
      const gooseDetector = new GooseAgentDetector();
      const gooseAgents = await gooseDetector.detectGooseAgents();
      
      if (gooseAgents.length > 0) {
        agents.push(...gooseAgents);
        console.log(`[API] ✅ Added ${gooseAgents.length} Goose agent(s)`);
      } else {
        console.log('[API] ⚠️  No Goose agents detected (API server may not be running)');
      }
    } catch (gooseError: any) {
      console.warn('[API] Error detecting Goose agents:', gooseError.message);
    }

    // Try to fetch from ADK Agent Registry first (the authoritative source for ADK agents)
    try {
      console.log('[API] Fetching agents from ADK Agent Registry on port 8890...');
      
      const adkController = new AbortController();
      const adkTimeoutId = setTimeout(() => adkController.abort(), 3000);
      
      const adkResponse = await fetch('http://localhost:8890/adk/agents', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: adkController.signal
      });
      
      clearTimeout(adkTimeoutId);

      if (adkResponse.ok) {
        const adkData = await adkResponse.json();
        if (adkData.success && adkData.agents && adkData.agents.length > 0) {
          console.log(`[API] Found ${adkData.agents.length} agents from ADK Agent Registry`);
          
          // Convert ADK agents to our format
          for (const adkAgent of adkData.agents) {
            const endpoint = adkAgent.endpoint || (adkAgent.metadata?.port ? `http://localhost:${adkAgent.metadata.port}` : null);
            
            if (!endpoint) {
              console.log(`[API] Skipping agent ${adkAgent.name} - no endpoint`);
              continue;
            }
            
            // Agent is registered, so it should be active
            const isActive = adkAgent.status === 'active';

            agents.push({
              id: adkAgent.id,
              name: adkAgent.name,
              status: isActive ? 'active' : 'inactive',
              type: adkAgent.type,
              source: 'adk' as const,
              capabilities: adkAgent.capabilities || [],
              endpoint: endpoint,
              version: adkAgent.version || '1.0.0',
              description: adkAgent.description || `${adkAgent.name} - AI Homelab Knowledge Graph agent`,
              uptime: isActive ? (adkAgent.metadata?.performance?.uptime || 99.9) : 0,
              memoryUsage: isActive ? 25 : 0,
              cpuUsage: isActive ? 8 : 0,
              platform: adkAgent.metadata?.platform || 'Node.js',
              model: adkAgent.metadata?.model || adkAgent.configuration?.model || 'N/A',
              lastHeartbeat: adkAgent.metadata?.lastSeen || new Date().toISOString(),
              resourceUsage: {
                cpu: adkAgent.metadata?.performance?.responseTime ? Math.min(adkAgent.metadata.performance.responseTime / 100, 15) : 8,
                memory: 25,
                network: adkAgent.metadata?.performance?.throughput || 1.2
              },
              health: {
                overall: isActive ? (adkAgent.metadata?.performance?.uptime || 98) : 0,
                components: {
                  connectivity: isActive ? 98 : 0,
                  performance: isActive ? 95 : 0,
                  resources: isActive ? 90 : 0,
                  dependencies: isActive ? 85 : 0,
                  security: 100
                },
                trend: isActive ? 'stable' : 'degrading',
                lastCheck: adkAgent.health?.lastCheck || new Date().toISOString()
              },
              remediation: {
                enabled: true,
                mode: 'automatic' as const,
                lastAction: isActive ? 'health_check' : 'service_offline',
                successRate: isActive ? (100 - (adkAgent.metadata?.performance?.errorRate || 2)) : 0,
                actionsToday: 0
              },
              incidents: isActive ? [] : [{ 
                type: 'service_offline', 
                message: 'Agent registered but not responding', 
                timestamp: new Date().toISOString() 
              }],
              dependencies: adkAgent.dependencies || []
            });

            console.log(`[API] ✅ Added ${adkAgent.name} from ADK Registry (${isActive ? 'active' : 'inactive'})`);
          }
          
          console.log(`[API] Using ADK Agent Registry as primary source - found ${agents.length} total agents`);
        } else {
          throw new Error('ADK Agent Registry returned no agents');
        }
      } else {
        throw new Error('ADK Agent Registry unavailable');
      }
    } catch (adkError: any) {
      console.warn('[API] Failed to fetch from ADK Agent Registry, falling back to Knowledge Graph discovery:', adkError.message);
      
      // Fallback to Knowledge Graph agents discovery
      console.log('[API] Discovering Knowledge Graph agents...');
      const knowledgeGraphAgents = [
        { port: 8765, name: 'Knowledge Graph API', type: 'knowledge-graph-api' },
        { port: 41240, name: 'Orchestrator Agent', type: 'orchestrator' },
        { port: 41241, name: 'Graph Query Agent', type: 'graph-query' },
        { port: 41242, name: 'Vector Search Agent', type: 'vector-search' },
        { port: 41243, name: 'Documentation Agent', type: 'documentation' },
        { port: 41244, name: 'Reasoning Agent', type: 'reasoning' },
        { port: 41245, name: 'Enhanced Memory Agent', type: 'enhanced-memory' },
        { port: 41246, name: 'Integration Agent', type: 'integration' }
      ];

      for (const agentInfo of knowledgeGraphAgents) {
        try {
          console.log(`[API] Checking agent on port ${agentInfo.port}...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const healthResponse = await fetch(`http://localhost:${agentInfo.port}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
          });
          
          clearTimeout(timeoutId);
          
          if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log(`[API] Found healthy agent: ${healthData.name || agentInfo.name} on port ${agentInfo.port}`);
            
            agents.push({
              id: `${agentInfo.type}-${agentInfo.port}`,
              name: healthData.service ? `${healthData.service} Agent` : `Knowledge Graph Agent ${agentInfo.port}`,
              status: 'active' as const,
              type: 'knowledge-graph',
              source: 'adk' as const,
              capabilities: healthData.capabilities || ['knowledge-graph', 'a2a-protocol'],
              endpoint: `http://localhost:${agentInfo.port}`,
              version: healthData.version || '2.1.0',
              description: `${agentInfo.name} - Knowledge Graph agent with A2A protocol support`,
              uptime: healthData.uptime || 99.9,
              memoryUsage: healthData.memoryUsage || 25,
              cpuUsage: healthData.cpuUsage || 8,
              platform: healthData.configuration?.provider || 'Node.js',
              model: healthData.configuration?.model || healthData.metadata?.model || 'N/A',
              lastHeartbeat: new Date().toISOString(),
              resourceUsage: {
                cpu: healthData.cpuUsage || 8,
                memory: healthData.memoryUsage || 25,
                network: 1.2
              },
              health: {
                overall: healthData.status === 'healthy' || healthData.status === 'ok' ? 98 : 50,
                components: {
                  connectivity: 98,
                  performance: 95,
                  resources: 90,
                  dependencies: healthData.neo4j === 'connected' ? 100 : 85,
                  security: 100
                },
                trend: 'stable' as const,
                lastCheck: new Date().toISOString()
              },
              remediation: {
                enabled: true,
                mode: 'automatic' as const,
                lastAction: 'health_check',
                successRate: 98,
                actionsToday: 0
              },
              incidents: [],
              dependencies: agentInfo.port === 8765 ? [
                { name: 'Neo4j Database', status: 'active', port: 7474 }
              ] : [
                { name: 'Knowledge Graph API', status: 'active', port: 8765 }
              ]
            });
            
            console.log(`[API] ✅ Found agent: Knowledge Graph Agent ${agentInfo.port} on port ${agentInfo.port}`);
          }
        } catch (error: any) {
          console.log(`[API] ❌ Agent on port ${agentInfo.port} not available: ${error.message}`);
        }
      }
    }

    console.log(`[API] Total agents discovered: ${agents.length}`);

    res.status(200).json({
      success: true,
      agents,
      total: agents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[API] Error discovering agents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to discover agents',
      agents: []
    });
  }
}
