/**
 * Knowledge Graph Agent Execute API
 * 
 * This endpoint proxies requests to the Knowledge Graph Agent execute endpoint
 * to run agent commands, workflows, and tools.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { HomelabAIAgentClient } from '../../../utils/HomelabAIAgentClient';
import { withAgentAuth, AGENT_PERMISSIONS, logAgentOperation } from '../../../utils/agentAuthSimplified';

// Define the page context type to match usePageContext
type PageContextType = {
  pageType: string;
  section: string;
  entityId?: string;
  entityType?: string;
  viewMode?: string;
  features?: string[];
};

// Agent execute endpoint
async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract command data from request body
    const { command, parameters } = req.body;
    let context = req.body.context;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    // Convert PageContextType to string context if needed
    let contextString = 'dashboard';
    if (context && typeof context === 'object' && 'pageType' in context) {
      const pageContext = context as PageContextType;
      contextString = pageContext.pageType;
      
      if (pageContext.section) {
        contextString += `:${pageContext.section}`;
      }
      
      if (pageContext.entityType) {
        contextString += `:${pageContext.entityType}`;
      }
      
      if (pageContext.entityId) {
        contextString += `:${pageContext.entityId}`;
      }
    } else if (typeof context === 'string') {
      contextString = context;
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
        pageContext: typeof context === 'object' ? context : { pageType: contextString, section: 'default' }
      }
    });

    // Initialize the client if not already done
    await agentClient.initialize();

    let response;
    
    // Route the command through the appropriate SDK method
    switch (command) {
      case 'analyzeRootCause':
      case 'checkPortCompliance':
      case 'validateMemoryConsistency':
      case 'analyzeServiceImpact':
      case 'analyzeDeploymentImpact':
      case 'purgeOutdatedMemories':
      case 'supersedeMemory':
      case 'getDashboardSummary':
        // Use the SDK's tool calling capability for agent commands
        response = await agentClient.callTool(command, {
          ...parameters,
          context: {
            contextString,
            pageContext: typeof context === 'object' ? context : { pageType: contextString, section: 'default' },
            source: 'ecosystem-dashboard',
            user: req.headers['x-user-id'] || 'dashboard-user',
            timestamp: new Date().toISOString()
          }
        });
        break;
        
      case 'queryKnowledgeGraph':
        // Use the SDK's Knowledge Graph integration
        response = await agentClient.queryKnowledgeGraph(
          parameters.cypher || parameters.query,
          parameters.parameters || {}
        );
        break;
        
      case 'searchKnowledgeGraph':
        // Use the SDK's Knowledge Graph search
        response = await agentClient.searchKnowledgeGraph(
          parameters.searchTerm || parameters.query,
          {
            limit: parameters.limit,
            threshold: parameters.threshold,
            domain: parameters.domain
          }
        );
        break;
        
      default:
        // For custom commands, use the generic tool calling method
        response = await agentClient.callTool(command, parameters);
        break;
    }

    // Log successful operation
    logAgentOperation(req, 'execute', command, true);
    
    // Return the agent's response
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error executing agent command:', error);
    
    // Log failed operation
    logAgentOperation(req, 'execute', req.body.command || 'unknown', false, error.message);
    
    // Return appropriate error response
    res.status(error.response?.status || 500).json({
      error: 'Failed to execute agent command',
      details: error.message,
      command: req.body.command
    });
  }
}

// Export with authentication middleware
export default withAgentAuth(AGENT_PERMISSIONS.AGENT_EXECUTE)(handler);
