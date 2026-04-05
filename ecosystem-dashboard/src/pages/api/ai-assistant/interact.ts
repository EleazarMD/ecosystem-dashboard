import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Dashboard Integration API for ADK AI Assistant Agent
 * Proxies dashboard requests to the full ADK AI Assistant Agent
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, context, options } = req.body;

  try {
    console.log('🔗 Dashboard → AI Assistant Agent proxy:', query);

    // Forward request to ADK AI Assistant Agent
    const response = await fetch('http://localhost:41247/interact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'dashboard-proxy'
      },
      body: JSON.stringify({
        query,
        context: {
          ...context,
          source: 'dashboard',
          pageType: 'ai-assistant',
          timestamp: new Date().toISOString()
        },
        options: {
          ...options,
          includeMetadata: true
        }
      }),
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30000);
        return controller.signal;
      })()
    });

    if (!response.ok) {
      throw new Error(`AI Assistant Agent responded with ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ AI Assistant Agent response received');

    // Transform response for dashboard compatibility
    const dashboardResponse = {
      success: result.success,
      content: result.result?.response?.content || 'No response received',
      confidence: result.result?.response?.confidence || 0.5,
      metadata: {
        agentId: result.result?.metadata?.agent_id,
        domain: result.result?.classification?.domain,
        intent: result.result?.classification?.intent,
        source: result.result?.response?.source,
        timestamp: result.result?.metadata?.timestamp
      },
      classification: result.result?.classification,
      routing: result.result?.routing,
      actions: [`adk_agent_${result.result?.classification?.domain || 'unknown'}`],
      agenticMeta: {
        type: 'adk_agent',
        agentId: result.result?.metadata?.agent_id,
        domain: result.result?.classification?.domain,
        confidence: result.result?.classification?.confidence,
        route: result.result?.response?.source
      }
    };

    res.json(dashboardResponse);

  } catch (error) {
    console.error('❌ AI Assistant Agent proxy error:', error);
    
    res.status(500).json({
      success: false,
      content: `AI Assistant Agent is unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0.1,
      metadata: {
        error: true,
        timestamp: new Date().toISOString()
      },
      agenticMeta: {
        type: 'error',
        route: 'failed'
      }
    });
  }
}
