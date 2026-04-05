/**
 * Knowledge Graph Orchestrator API Endpoint
 * 
 * Routes queries from the Dashboard AI Assistant directly to the 
 * Knowledge Graph System's Intelligent Orchestrator Agent.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { 
  OrchestrationRequest, 
  OrchestrationResponse, 
  RawOrchestratorResponse,
  OrchestrationResponseNormalizer,
  isValidOrchestrationRequest 
} from '@/types/kg-orchestration';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrchestrationResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const requestBody = req.body;

    // Validate request using type guard
    if (!isValidOrchestrationRequest(requestBody)) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string' });
    }

    const { query, context, options }: OrchestrationRequest = requestBody;

    // Knowledge Graph Orchestrator endpoint (port 41240)
    const orchestratorUrl = process.env.KG_ORCHESTRATOR_URL || 'http://localhost:41240';
    
    console.log(`🎯 Dashboard: Routing query to KG Orchestrator at ${orchestratorUrl}`);
    console.log(`📝 Query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);

    // Prepare orchestration request
    const orchestrationPayload = {
      query: query.trim(),
      context: {
        source: 'ai-homelab-dashboard',
        user: context?.user || req.headers['x-user-id'] || 'dashboard-user',
        sessionId: req.headers['x-session-id'] || `dashboard-${Date.now()}`,
        pageContext: context || {},
        timestamp: new Date().toISOString(),
        requestId: `dash-${Date.now()}-${Math.random().toString(36).substring(7)}`
      },
      options: {
        mode: options?.mode || 'comprehensive',
        maxAgents: options?.maxAgents || 5,
        timeout: options?.timeout || 30000,
        includeEvidence: options?.includeEvidence !== false,
        includeRecommendations: options?.includeRecommendations !== false,
        responseFormat: 'dashboard'
      }
    };

    // Send request to Knowledge Graph Orchestrator
    const response = await axios.post(
      `${orchestratorUrl}/orchestrate`,
      orchestrationPayload,
      {
        timeout: (options?.timeout || 30000) + 5000, // Add 5s buffer
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0',
          'X-Source': 'dashboard',
          'X-Request-ID': orchestrationPayload.context.requestId
        }
      }
    );

    const executionTime = Date.now() - startTime;

    if (response.status === 200 && response.data) {
      const rawOrchestratorResult: RawOrchestratorResponse = response.data;
      const executionId = rawOrchestratorResult.executionId || orchestrationPayload.context.requestId;
      
      // Use normalizer to transform orchestrator response to dashboard format
      const normalizedResult = OrchestrationResponseNormalizer.normalize(
        rawOrchestratorResult, 
        query.trim(), 
        executionId
      );
      
      const dashboardResponse: OrchestrationResponse = {
        success: true,
        executionId,
        query: query.trim(),
        result: normalizedResult,
        metadata: {
          executionTime,
          agentsInvolved: normalizedResult.agentsUsed.length,
          mode: options?.mode || 'comprehensive',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`✅ Dashboard: Successfully orchestrated query in ${executionTime}ms`);
      console.log(`🤖 Agents used: ${normalizedResult.agentsUsed.join(', ')}`);
      console.log(`📊 Response summary: ${normalizedResult.summary.substring(0, 100)}${normalizedResult.summary.length > 100 ? '...' : ''}`);

      return res.status(200).json(dashboardResponse);
    } else {
      throw new Error(`Orchestrator returned status ${response.status}: ${response.statusText}`);
    }

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    console.error('❌ Dashboard: Knowledge Graph orchestration failed:', error.message);
    
    let errorMessage = 'Failed to orchestrate query';
    let statusCode = 500;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Knowledge Graph Orchestrator is not available. Please ensure the KG system is running on port 41240.';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Query timed out. The orchestrator may be processing a complex request.';
      statusCode = 408;
    } else if (error.response) {
      errorMessage = `Orchestrator error: ${error.response.data?.error || error.response.statusText}`;
      statusCode = error.response.status;
    }

    const errorResponse: OrchestrationResponse = {
      success: false,
      executionId: `error-${Date.now()}`,
      query: req.body.query || '',
      result: {
        answer: `I apologize, but I'm unable to process your request right now. ${errorMessage}`,
        summary: `Error: ${errorMessage}`,
        confidence: 0,
        sources: [],
        data: [],
        evidence: [],
        recommendations: [{
          type: 'troubleshooting',
          title: 'Check Knowledge Graph System',
          description: 'Ensure the Knowledge Graph Orchestrator is running and accessible.',
          action: 'Verify service status and port 41240 availability',
          priority: 'high'
        }],
        agentsUsed: []
      },
      metadata: {
        executionTime,
        agentsInvolved: 0,
        mode: req.body.options?.mode || 'comprehensive',
        timestamp: new Date().toISOString()
      },
      error: errorMessage
    };

    return res.status(statusCode).json(errorResponse);
  }
}
