/**
 * API route for fetching AI Gateway models
 * This proxies the request to the AI Gateway models endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// Simple middleware for API authentication
const validateToken = async (token: string | undefined): Promise<boolean> => {
  if (!token) return false;
  
  // In a production environment, you would validate the token
  // against your authentication service
  // For now, we'll accept any non-empty token
  return token.length > 0;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const models: any[] = [];
    
    // Fetch local vLLM models from OpenAI-compatible endpoint
    try {
      const vllmResponse = await axios.get('http://localhost:8010/v1/models', {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      
      if (vllmResponse.data?.data) {
        for (const model of vllmResponse.data.data) {
          models.push({
            id: model.id,
            name: model.id === 'qwen3-32b' ? 'Qwen3 32B' : 
                  model.id === 'ministral-14b' ? 'Ministral 14B' : model.id,
            provider: 'vllm',
            status: 'active',
            type: 'text',
            description: `Local - ${model.root || model.id}`,
            capabilities: ['text-generation', 'chat'],
            parameters: { maxTokens: model.max_model_len || 4096 },
            isActive: true,
            isLoading: false,
            hasError: false,
            metadata: {
              version: '1.0.0',
              contextLength: model.max_model_len || 4096,
              size: model.root || 'unknown'
            }
          });
        }
      }
    } catch (vllmErr) {
      console.warn('[Models API] vLLM fetch failed:', vllmErr);
    }
    
    // Add Anthropic models from AI Gateway config
    const anthropicModels = [
      { id: 'claude-haiku-4-5', name: 'Claude 3.5 Haiku', description: 'Fast, efficient', isDefault: true },
      { id: 'claude-sonnet-4', name: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
      { id: 'claude-opus-4', name: 'Claude 3 Opus', description: 'Most capable' },
    ];
    
    for (const model of anthropicModels) {
      models.push({
        id: model.id,
        name: model.name,
        provider: 'anthropic',
        status: 'active',
        type: 'text',
        description: model.description,
        capabilities: ['text-generation', 'chat', 'analysis'],
        parameters: { maxTokens: 4096 },
        isActive: true,
        isLoading: false,
        hasError: false,
        metadata: {
          version: '3.5.0',
          contextLength: 200000,
          size: '100B+ parameters'
        }
      });
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
      sources: ['vLLM: http://localhost:8010', 'AI Gateway Config']
    });
  } catch (error) {
    console.error('Error fetching AI Gateway models:', error);
    
    // Return a graceful error response with mock data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
    
    // Provide mock models data for development
    const mockModels = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        status: 'active',
        type: 'text',
        description: 'Advanced language model for complex reasoning tasks',
        capabilities: ['text-generation', 'code-generation', 'analysis'],
        parameters: { maxTokens: 4096, temperature: 0.7 },
        lastUsed: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        requestCount: 142,
        averageResponseTime: 1250,
        isActive: true,
        isLoading: false,
        hasError: false,
        metadata: {
          version: '1.0.0',
          created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          size: '175B parameters',
          contextLength: 8192
        }
      },
      {
        id: 'claude-3',
        name: 'Claude 3',
        provider: 'anthropic',
        status: 'active',
        type: 'text',
        description: 'Constitutional AI model with strong reasoning capabilities',
        capabilities: ['text-generation', 'analysis', 'safety'],
        parameters: { maxTokens: 4096, temperature: 0.5 },
        lastUsed: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        requestCount: 89,
        averageResponseTime: 980,
        isActive: true,
        isLoading: false,
        hasError: false,
        metadata: {
          version: '3.0.0',
          created: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          updated: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          size: '100B+ parameters',
          contextLength: 100000
        }
      },
      {
        id: 'llama-2-70b',
        name: 'Llama 2 70B',
        provider: 'meta',
        status: 'loading',
        type: 'text',
        description: 'Open-source large language model',
        capabilities: ['text-generation', 'code-generation'],
        parameters: { maxTokens: 2048, temperature: 0.8 },
        lastUsed: null,
        requestCount: 0,
        averageResponseTime: 0,
        isActive: false,
        isLoading: true,
        hasError: false,
        metadata: {
          version: '2.0.0',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          size: '70B parameters',
          contextLength: 4096
        }
      }
    ];

    const mockSummary = {
      total: mockModels.length,
      active: mockModels.filter(m => m.isActive).length,
      loading: mockModels.filter(m => m.isLoading).length,
      error: mockModels.filter(m => m.hasError).length,
      providers: Array.from(new Set(mockModels.map(m => m.provider))),
      types: Array.from(new Set(mockModels.map(m => m.type)))
    };
    
    return res.status(isConnectionError ? 503 : 500).json({
      models: mockModels,
      summary: mockSummary,
      lastUpdated: new Date().toISOString(),
      endpoint: `${process.env.AI_GATEWAY_URL || 'http://localhost:7777'}/v1/models`,
      error: 'Failed to fetch AI Gateway models',
      message: errorMessage,
      usingMockData: true,
      connectionError: isConnectionError
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
