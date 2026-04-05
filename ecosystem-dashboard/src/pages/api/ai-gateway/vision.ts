/**
 * Vision API Proxy
 * 
 * Routes ALL vision requests through the AI Gateway (security perimeter).
 * The AI Gateway handles routing to the correct backend:
 * - qwen-vision: local vLLM at localhost:8792 (RTX workstation)
 * - gemini-2-5-flash: Google Cloud via Gemini API
 * 
 * This proxy exists because the frontend needs a server-side endpoint
 * to add the AI Gateway API key and service headers.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, messages, max_tokens = 4096, temperature = 0.2 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Normalize model aliases
  const resolvedModel = (model === 'qwen-vlm' || model === 'local') ? 'qwen-vision' : (model || 'gemini-2-5-flash');

  try {
    // Route everything through AI Gateway — it handles backend routing
    const targetUrl = `${AI_GATEWAY_URL}/api/v1/chat/completions`;
    console.log(`[Vision Proxy] Routing through AI Gateway: model=${resolvedModel}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_GATEWAY_API_KEY,
        'X-Service-ID': 'research-studio',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        max_tokens,
        temperature,
        serviceId: 'research-studio',
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vision Proxy] AI Gateway error ${response.status}:`, errorText.substring(0, 500));
      return res.status(response.status).json({
        error: `Vision model returned ${response.status}`,
        detail: errorText.substring(0, 200),
        model: resolvedModel,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Vision Proxy] Error:', error.message);
    return res.status(502).json({
      error: 'Vision service unavailable',
      detail: error.message,
      model: resolvedModel,
    });
  }
}
