import { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Metrics Query API Endpoint
 * Handles queries about AI Gateway usage, model performance, inference stats
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, classification, context } = req.body;

  try {
    console.log('🤖 AI Metrics Query:', query);

    // Mock AI metrics data - replace with actual AI Gateway metrics calls
    const aiMetrics = {
      gateway: {
        status: 'healthy',
        port: 7777,
        requests_today: 247,
        avg_response_time: '1.2s',
        models_available: ['llama3.1:8b', 'llama3.2:3b']
      },
      inference: {
        total_requests: 1543,
        successful_requests: 1521,
        failed_requests: 22,
        success_rate: '98.6%'
      },
      models: {
        'llama3.1:8b': {
          requests: 892,
          avg_tokens: 156,
          avg_latency: '1.1s'
        },
        'llama3.2:3b': {
          requests: 651,
          avg_tokens: 98,
          avg_latency: '0.8s'
        }
      }
    };

    // Generate contextual response based on query
    let response = '';
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('gateway') && lowerQuery.includes('status')) {
      response = `AI Gateway is ${aiMetrics.gateway.status} on port ${aiMetrics.gateway.port}. Processed ${aiMetrics.gateway.requests_today} requests today with ${aiMetrics.gateway.avg_response_time} average response time.`;
    } else if (lowerQuery.includes('model') || lowerQuery.includes('llama')) {
      response = `Available models: ${aiMetrics.gateway.models_available.join(', ')}. Llama3.1:8b has processed ${aiMetrics.models['llama3.1:8b'].requests} requests (${aiMetrics.models['llama3.1:8b'].avg_latency} avg), Llama3.2:3b has ${aiMetrics.models['llama3.2:3b'].requests} requests (${aiMetrics.models['llama3.2:3b'].avg_latency} avg).`;
    } else if (lowerQuery.includes('performance') || lowerQuery.includes('stats')) {
      response = `AI system performance: ${aiMetrics.inference.success_rate} success rate (${aiMetrics.inference.successful_requests}/${aiMetrics.inference.total_requests} requests). Average response time: ${aiMetrics.gateway.avg_response_time}.`;
    } else {
      response = `AI Gateway metrics: ${aiMetrics.gateway.requests_today} requests today, ${aiMetrics.inference.success_rate} success rate, ${aiMetrics.gateway.models_available.length} models available.`;
    }

    res.json({
      success: true,
      content: response,
      data: aiMetrics,
      metadata: {
        domain: 'ai_metrics',
        query,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI metrics query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI metrics query failed'
    });
  }
}
