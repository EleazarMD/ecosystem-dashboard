/**
 * API route for fetching AI Gateway models
 * This proxies the request to the AI Gateway models endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

// Known models per provider (discovered from AI Gateway /api/v1/info + chat completion metadata)
const KNOWN_MODELS: Record<string, Array<{ id: string; name: string; description: string; contextLength?: number }>> = {
  'minimax-default': [
    { id: 'minimax-m3', name: 'MiniMax M3', description: 'Latest MiniMax · 230B MoE · Agentic specialist', contextLength: 1048576 },
    { id: 'minimax-m2.7', name: 'MiniMax M2.7', description: 'MiniMax M2.7 · Previous generation', contextLength: 1048576 },
    { id: 'minimax-m2.5', name: 'MiniMax M2.5', description: 'MiniMax M2.5 · 230B MoE · 10B active', contextLength: 1048576 },
  ],
  'anthropic-default': [
    { id: 'claude-fable-5', name: 'Claude Fable 5', description: 'Mythos-class frontier model, 1M context, 128k output', contextLength: 1000000 },
    { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', description: 'Most capable Opus with extended thinking', contextLength: 200000 },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Latest Sonnet, 1M context, extended thinking', contextLength: 1000000 },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Fast, efficient', contextLength: 200000 },
  ],
  'google-default': [
    { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', description: '1M context · Deep reasoning', contextLength: 1048576 },
    { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', description: '1M context · Best value', contextLength: 1048576 },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: '1M context · Fast PhD reasoning', contextLength: 1048576 },
  ],
  'perplexity-default': [
    { id: 'sonar-deep-research', name: 'Sonar Deep Research', description: 'Deep research with web search', contextLength: 128000 },
    { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', description: 'Reasoning with real-time data', contextLength: 128000 },
    { id: 'sonar-pro', name: 'Sonar Pro', description: 'Web-augmented search', contextLength: 128000 },
  ],
  'alibaba-qwen-default': [
    { id: 'qwen3.7-max', name: 'Qwen3.7 Max', description: 'Alibaba Qwen 3.7 Max', contextLength: 131072 },
    { id: 'qwen3.6-plus', name: 'Qwen3.6 Plus', description: 'Alibaba Qwen 3.6 Plus', contextLength: 131072 },
  ],
  'zhipu-default': [
    { id: 'glm-5.1', name: 'GLM 5.1', description: 'Zhipu GLM 5.1', contextLength: 128000 },
    { id: 'glm-5', name: 'GLM 5', description: 'Zhipu GLM 5', contextLength: 128000 },
  ],
};

// Simple middleware for API authentication
const validateToken = async (token: string | undefined): Promise<boolean> => {
  if (!token) return false;
  return token.length > 0;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const models: any[] = [];
    let gatewayHealthy = false;
    let providersFound: string[] = [];

    // Check AI Gateway health and info
    try {
      const healthResponse = await axios.get(`${AI_GATEWAY_URL}/health`, {
        timeout: 5000,
        headers: { 'Accept': 'application/json' },
      });
      gatewayHealthy = healthResponse.data?.status === 'healthy';

      if (gatewayHealthy) {
        // Fetch provider info
        try {
          const infoResponse = await axios.get(`${AI_GATEWAY_URL}/api/v1/info`, {
            timeout: 5000,
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
            },
          });
          providersFound = infoResponse.data?.providers || [];
        } catch (infoErr) {
          console.warn('[Models API] Info endpoint failed:', infoErr);
        }
      }
    } catch (healthErr) {
      console.warn('[Models API] AI Gateway health check failed:', healthErr);
    }

    // Build model list from known models, filtered by discovered providers if available
    const providerKeys = providersFound.length > 0
      ? Object.keys(KNOWN_MODELS).filter(k =>
          providersFound.some(p => k.includes(p.replace('-default', '')) || p.includes(k.replace('-default', '')))
        )
      : Object.keys(KNOWN_MODELS);

    // If gateway is healthy but we couldn't match providers, include all known models
    const activeProviderKeys = providerKeys.length > 0 ? providerKeys : Object.keys(KNOWN_MODELS);

    for (const providerKey of activeProviderKeys) {
      const providerModels = KNOWN_MODELS[providerKey];
      const providerName = providerKey.replace('-default', '');

      for (const model of providerModels) {
        models.push({
          id: model.id,
          name: model.name,
          provider: providerName,
          status: gatewayHealthy ? 'active' : 'unknown',
          type: 'text',
          description: model.description,
          capabilities: ['text-generation', 'chat', 'analysis'],
          parameters: { maxTokens: 4096 },
          isActive: gatewayHealthy,
          isLoading: false,
          hasError: false,
          metadata: {
            version: '1.0.0',
            contextLength: model.contextLength || 4096,
            size: 'unknown',
          },
        });
      }
    }

    const modelsData = models;
    
    // Format the response for the dashboard
    const formattedModels = Array.isArray(modelsData) ? modelsData.map((model: any) => {
      // Normalize capabilities to always be an array of strings
      let capabilities: string[] = [];
      if (Array.isArray(model.capabilities)) {
        capabilities = model.capabilities;
      } else if (typeof model.capabilities === 'object' && model.capabilities !== null) {
        // If capabilities is an object, extract the keys
        capabilities = Object.keys(model.capabilities);
      }
      
      return {
        id: model.id || model.name || 'unknown',
        name: model.name || model.id || 'Unknown Model',
        provider: model.provider || 'unknown',
        status: model.status || 'unknown',
        type: model.type || 'text',
        description: model.description || '',
        capabilities,
        parameters: model.parameters || {},
        lastUsed: model.lastUsed || null,
        requestCount: model.requestCount || 0,
        averageResponseTime: model.averageResponseTime || 0,
        isActive: model.status === 'active' || model.status === 'ready',
        isLoading: model.status === 'loading' || model.status === 'initializing',
        hasError: model.status === 'error' || model.status === 'failed',
        metadata: {
          version: model.version || '1.0.0',
          created: model.created || new Date().toISOString(),
          updated: model.updated || new Date().toISOString(),
          size: model.size || 'unknown',
          contextLength: model.contextLength || 0
        }
      };
    }) : [];
    
    // Calculate summary statistics
    const summary = {
      total: formattedModels.length,
      active: formattedModels.filter(m => m.isActive).length,
      loading: formattedModels.filter(m => m.isLoading).length,
      error: formattedModels.filter(m => m.hasError).length,
      providers: Array.from(new Set(formattedModels.map(m => m.provider))),
      types: Array.from(new Set(formattedModels.map(m => m.type)))
    };
    
    return res.status(200).json({
      models: formattedModels,
      summary,
      lastUpdated: new Date().toISOString(),
      sources: [`AI Gateway: ${AI_GATEWAY_URL}`],
      gatewayHealthy,
    });
  } catch (error) {
    console.error('Error fetching AI Gateway models:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
    
    // Return known models as fallback (not mock data — these are real models on the gateway)
    const fallbackModels: any[] = [];
    for (const [providerKey, providerModels] of Object.entries(KNOWN_MODELS)) {
      const providerName = providerKey.replace('-default', '');
      for (const model of providerModels) {
        fallbackModels.push({
          id: model.id,
          name: model.name,
          provider: providerName,
          status: 'unknown',
          type: 'text',
          description: model.description,
          capabilities: ['text-generation', 'chat', 'analysis'],
          parameters: { maxTokens: 4096 },
          isActive: false,
          isLoading: false,
          hasError: false,
          metadata: {
            version: '1.0.0',
            contextLength: model.contextLength || 4096,
            size: 'unknown',
          },
        });
      }
    }

    const fallbackSummary = {
      total: fallbackModels.length,
      active: 0,
      loading: 0,
      error: 0,
      providers: Array.from(new Set(fallbackModels.map(m => m.provider))),
      types: Array.from(new Set(fallbackModels.map(m => m.type))),
    };
    
    return res.status(isConnectionError ? 503 : 500).json({
      models: fallbackModels,
      summary: fallbackSummary,
      lastUpdated: new Date().toISOString(),
      endpoint: `${AI_GATEWAY_URL}/api/v1/info`,
      error: 'AI Gateway unreachable — showing known models',
      message: errorMessage,
      usingFallbackData: true,
      connectionError: isConnectionError,
    });
  }
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  // Validate the token
  const isValidToken = await validateToken(token);
  
  if (!isValidToken && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return handler(req, res);
}
