import { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Chat API Endpoint
 * Proxies chat requests to the AI Gateway service
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, max_tokens, temperature } = req.body;

  let endpoint = 'http://localhost:8777/api/v1/chat/completions'; // Default AI Gateway (fixed path)
  let transformedModel = model || 'llama3.2:3b';
  let isNIMModel = false;

  try {
    console.log('🤖 AI Gateway Chat API:', { model, messageCount: messages?.length });

    // Detect NVIDIA NIM models (from XRT Workstation)
    isNIMModel = model?.startsWith('xrt-');

    if (isNIMModel) {
      // Map XRT models to their specific ports and actual NIM model names
      const nimConfig: Record<string, { port: number; modelName: string }> = {
        'xrt-llama-3.3-70b': { port: 8002, modelName: 'meta/llama-3.3-70b-instruct' },
        'xrt-llama-3.1-70b': { port: 8001, modelName: 'meta/llama-3.1-70b-instruct' },
        'xrt-mistral-7b': { port: 8003, modelName: 'nim/mistralai/mistral-7b-instruct-v03' },
      };

      const config = nimConfig[model];
      if (config) {
        endpoint = `http://100.108.41.22:${config.port}/v1/chat/completions`;
        transformedModel = config.modelName;
        console.log('🚀 Using NVIDIA NIM:', {
          model,
          port: config.port,
          transformedModel,
          endpoint
        });
      } else {
        console.warn(`⚠️ Unknown NIM model: ${model}, falling back to AI Gateway`);
      }
    }

    // Forward request to appropriate endpoint
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'dashboard-ai-gateway-proxy',
        'Authorization': isNIMModel ? 'Bearer nim' : `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: transformedModel,
        messages: messages || [{ role: 'user', content: 'Hello' }],
        max_tokens: max_tokens || 500,
        temperature: temperature || 0.7,
        stream: false
      }),
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 120000);
        return controller.signal;
      })()
    });

    if (!response.ok) {
      throw new Error(`AI Gateway responded with ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ AI Gateway response received');

    // Handle both OpenAI-compatible format (from AI gateway) and Ollama format
    const isOpenAIFormat = result.choices && Array.isArray(result.choices);

    const transformedResponse = isOpenAIFormat ? {
      choices: result.choices,
      usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      model: result.model || model,
      id: result.id || `chatcmpl-${Date.now()}`,
      object: result.object || 'chat.completion',
      created: result.created || Math.floor(Date.now() / 1000),
    } : {
      choices: [{
        message: {
          role: 'assistant',
          content: result.message?.content || result.response || 'No response received'
        },
        finish_reason: result.done_reason || 'stop'
      }],
      usage: {
        prompt_tokens: result.prompt_eval_count || 0,
        completion_tokens: result.eval_count || 0,
        total_tokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
      },
      model: result.model || model,
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000)
    };

    res.json(transformedResponse);

  } catch (error: any) {
    console.error('❌ AI Gateway chat error:', error);

    // Return specific error message to help debugging
    const errorMessage = error.message || 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed');

    res.status(isConnectionError ? 503 : 500).json({
      error: isConnectionError
        ? `Cannot connect to AI model endpoint. Please check if the service is running. (${errorMessage})`
        : `AI Gateway Error: ${errorMessage}`,
      debug: {
        requestedModel: model,
        resolvedEndpoint: endpoint,
        isNIM: isNIMModel,
        transformedModel
      },
      choices: [{
        message: {
          content: 'I apologize, but I cannot process your request at the moment. The AI service is unavailable.'
        }
      }],
      message: {
        content: 'I apologize, but I cannot process your request at the moment. The AI service is unavailable.'
      }
    });
  }
}
