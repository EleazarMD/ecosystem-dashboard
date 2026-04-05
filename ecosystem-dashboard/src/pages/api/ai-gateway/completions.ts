import { NextApiRequest, NextApiResponse } from 'next';

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

    // Forward request directly to Ollama (AI Gateway not running)
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'dashboard-completions-proxy'
      },
      body: JSON.stringify({
        model: model || 'llama3.2:3b',
        messages: messages || [{ role: 'user', content: 'Hello' }],
        stream: false
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`AI Gateway responded with ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ AI Gateway completions response received');

    // Transform Ollama response to OpenAI API format
    const transformedResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.model || model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: result.message?.content || 'No response received'
        },
        finish_reason: result.done ? 'stop' : 'length'
      }],
      usage: {
        prompt_tokens: result.prompt_eval_count || 0,
        completion_tokens: result.eval_count || 0,
        total_tokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
      }
    };

    res.json(transformedResponse);

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
