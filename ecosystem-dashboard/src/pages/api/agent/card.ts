/**
 * Knowledge Graph Agent Card API
 * 
 * This endpoint proxies requests to the Knowledge Graph Agent card endpoint
 * and provides information about the agent's capabilities, configuration, and UI details.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import { HomelabAIAgentClient } from '../../../utils/HomelabAIAgentClient'
import { withAgentAuth, AGENT_PERMISSIONS, logAgentOperation } from '../../../utils/agentAuthSimplified'

// Define the page context type
type PageContextType = {
  pageType: string;
  section: string;
  entityId?: string;
  entityType?: string;
  viewMode?: string;
  features?: string[];
};

type AgentCardResponse = {
  error?: string;
  actions?: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    type: string;
  }>
  evidence?: Array<any>;
  capabilities?: Array<string>;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Allow both GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    
    // Get context - either from POST body (rich) or query param (simple string)
    let pageContext: PageContextType | null = null;
    let contextString = 'dashboard';
    
    if (req.method === 'POST' && req.body && req.body.context) {
      // Extract rich context from POST body
      pageContext = req.body.context as PageContextType;
      contextString = `${pageContext.pageType}`;
      
      if (pageContext.section) {
        contextString += `:${pageContext.section}`;
      }
      
      if (pageContext.entityType) {
        contextString += `:${pageContext.entityType}`;
      }
      
      if (pageContext.entityId) {
        contextString += `:${pageContext.entityId}`;
      }
    } else if (req.query.context) {
      // Fallback to simple string context from query parameter
      contextString = req.query.context as string;
    }
    
    // Initialize the HomelabAIAgentClient
    const agentClient = new HomelabAIAgentClient({
      agentId: 'dashboard-kg-agent',
      agentName: 'Knowledge Graph Agent',
      kgUrl: process.env.KNOWLEDGE_GRAPH_URL || 'http://localhost:8765',
      ahisUrl: process.env.A2A_AGENT_URL || 'http://localhost:8888',
      authToken: req.headers.authorization?.replace('Bearer ', ''),
      metadata: {
        source: 'ecosystem-dashboard',
        user: req.headers['x-user-id'] || 'dashboard-user',
        contextString,
        pageContext: pageContext || { pageType: contextString, section: 'default' }
      }
    });

    let cardData: AgentCardResponse;
    
    try {
      // Initialize the client
      await agentClient.initialize();
      
      // Get agent status and capabilities
      const agentStatus = agentClient.getStatus();
      
      // Try to fetch real agent card data using the SDK
      const response = await agentClient.callTool('getAgentCard', {
        context: pageContext || { pageType: contextString, section: 'default' },
        requestId: `card-${Date.now()}`,
        source: 'ecosystem-dashboard'
      });
      
      cardData = response;
    } catch (error: any) {
      console.warn('Backend agent unavailable via SDK, using fallback data:', error.message);
      
      // Fallback to context-aware mock data when backend is unavailable
      cardData = {
        actions: [
          {
            id: 'analyze-infra',
            title: 'Analyze Infrastructure',
            description: `Analyze the current ${contextString} infrastructure components`,
            status: 'ready',
            priority: 'medium',
            type: 'analysis'
          },
          {
            id: 'port-compliance',
            title: 'Port Compliance Check',
            description: 'Verify port registry compliance for all services',
            status: 'ready',
            priority: 'high',
            type: 'compliance'
          },
          {
            id: 'memory-governance',
            title: 'Memory Governance',
            description: 'Analyze and manage IDE memory consistency',
            status: 'ready',
            priority: 'medium',
            type: 'governance'
          }
        ],
        evidence: [
          {
            id: 'e1',
            title: 'Port Registry',
            description: 'Current port assignments for all services',
            type: 'registry',
            content: 'PORT_REGISTRY.yml defines all service port assignments'
          },
          {
            id: 'e2',
            title: 'Architecture Overview',
            description: 'Current ecosystem architecture state',
            type: 'architecture',
            content: 'The AI Homelab ecosystem consists of interconnected services'
          }
        ],
        capabilities: [
          'InfrastructureAnalysis', 
          'PortCompliance', 
          'MemoryConsistency',
          'KnowledgeGraphSync', 
          'ApprovalTriage', 
          'MemoryGovernance'
        ]
      };
    }

    // Add dashboard-specific UI configuration
    const enhancedData = {
      ...cardData,
      uiConfig: {
        theme: 'dashboard',
        showEvidence: true,
        expandedByDefault: false,
      },
      context: contextString,
      contextDetails: pageContext || { pageType: contextString, section: 'default' },
    };
    
    // Log successful operation
    logAgentOperation(req, 'card', 'agent_card', true);
    
    // Return response with 200ms delay to simulate network
    setTimeout(() => {
      res.status(200).json(enhancedData);
    }, 200);
  } catch (error: any) {
    console.error('Error fetching agent card:', error);
    
    // Log failed operation
    logAgentOperation(req, 'card', 'agent_card', false, error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch agent card',
      details: error.message 
    });
  }
}

// Export with authentication middleware
export default withAgentAuth(AGENT_PERMISSIONS.AGENT_VIEW_CARD)(handler);
