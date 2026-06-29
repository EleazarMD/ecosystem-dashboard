import { NextApiRequest, NextApiResponse } from 'next';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

/**
 * AI Gateway Chat Completions API Endpoint
 * Proxies chat completion requests to the AI Gateway service
 * Matches OpenAI API format for compatibility
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, max_tokens, temperature, stream } = req.body;

  try {
    console.log('🤖 AI Gateway Completions API:', { model, messageCount: messages?.length });

    // Forward request to AI Gateway (OpenAI-compatible format)
    const response = await fetch(`${AI_GATEWAY_URL}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'X-Source': 'dashboard-completions-proxy',
      },
      body: JSON.stringify({
        model: model || 'minimax-m3',
        messages: messages || [{ role: 'user', content: 'Hello' }],
        max_tokens: max_tokens || 500,
        temperature: temperature ?? 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ AI Gateway completions response received');

    // AI Gateway already returns OpenAI-compatible format — pass through
    res.json(result);

  } catch (error) {
    console.error('❌ AI Gateway completions error:', error);
    
    res.status(500).json({
      error: {
        message: `AI Gateway is unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'api_error',
        code: 'service_unavailable'
      },
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'I apologize, but I cannot process your request at the moment. The AI service is unavailable.'
        },
        finish_reason: 'error'
      }]
    });
  }
}
