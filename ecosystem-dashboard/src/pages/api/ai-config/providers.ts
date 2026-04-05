/**
 * AI Homelab Inferencing - Provider Management API
 * Manages LLM provider configurations, health checks, and availability
 */

import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'data', 'ai-config');
const PROVIDERS_CONFIG_FILE = path.join(CONFIG_DIR, 'providers.json');

interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'ollama' | 'ai-homelab' | 'unsplash' | 'tavily' | 'custom';
  category?: 'llm' | 'image' | 'media' | 'data' | 'search';
  providerType: 'llm' | 'mcp-server'; // Distinguish between LLM providers and MCP servers
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  endpoint: string;
  apiKey?: string;
  // LLM Provider fields
  models?: ModelInfo[];
  costPerToken?: {
    input: number;
    output: number;
  };
  // MCP Server fields
  mcpServer?: MCPServerInfo;
  avgLatency: number;
  reliability: number;
  maxRequestsPerHour: number;
  maxTokensPerRequest: number;
  lastHealthCheck: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  configuration: {
    timeout: number;
    retries: number;
    enableStreaming: boolean;
    enableEmbeddings: boolean;
  };
}

interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  capabilities: string[];
}

interface MCPServerInfo {
  serverType: 'stdio' | 'sse' | 'http';
  command?: string; // For stdio servers
  args?: string[];
  url?: string; // For SSE/HTTP servers
  tools: MCPTool[];
  costPerCall: number; // Cost per API call/tool invocation
  creditsPerMonth: number; // Free tier credits
  envVars?: Record<string, string>; // Required environment variables
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: object;
  costPerInvocation?: number;
}

// Default provider configurations
const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    providerType: 'llm',
    status: 'active',
    endpoint: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextLength: 8192,
        inputCostPer1k: 0.03,
        outputCostPer1k: 0.06,
        capabilities: ['chat', 'completion', 'reasoning']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextLength: 128000,
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
        capabilities: ['chat', 'completion', 'reasoning', 'vision']
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextLength: 16384,
        inputCostPer1k: 0.0015,
        outputCostPer1k: 0.002,
        capabilities: ['chat', 'completion']
      }
    ],
    costPerToken: { input: 0.03, output: 0.06 },
    avgLatency: 1200,
    reliability: 99.9,
    maxRequestsPerHour: 3000,
    maxTokensPerRequest: 8192,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 30000,
      retries: 3,
      enableStreaming: true,
      enableEmbeddings: true
    }
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    providerType: 'llm',
    status: 'active',
    endpoint: 'https://api.anthropic.com/v1',
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        contextLength: 200000,
        inputCostPer1k: 0.015,
        outputCostPer1k: 0.075,
        capabilities: ['chat', 'reasoning', 'analysis']
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        contextLength: 200000,
        inputCostPer1k: 0.003,
        outputCostPer1k: 0.015,
        capabilities: ['chat', 'reasoning']
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        contextLength: 200000,
        inputCostPer1k: 0.00025,
        outputCostPer1k: 0.00125,
        capabilities: ['chat', 'fast-response']
      }
    ],
    costPerToken: { input: 0.015, output: 0.075 },
    avgLatency: 1500,
    reliability: 99.8,
    maxRequestsPerHour: 1000,
    maxTokensPerRequest: 200000,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 45000,
      retries: 3,
      enableStreaming: true,
      enableEmbeddings: false
    }
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'ollama',
    providerType: 'llm',
    status: 'active',
    endpoint: 'http://localhost:11434',
    models: [
      {
        id: 'llama3.1:8b',
        name: 'Llama 3.1 8B',
        contextLength: 8192,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion', 'local']
      },
      {
        id: 'llama3.1:70b',
        name: 'Llama 3.1 70B',
        contextLength: 8192,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion', 'reasoning', 'local']
      },
      {
        id: 'mistral:7b',
        name: 'Mistral 7B',
        contextLength: 8192,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion', 'local']
      }
    ],
    costPerToken: { input: 0, output: 0 },
    avgLatency: 800,
    reliability: 95.0,
    maxRequestsPerHour: 10000,
    maxTokensPerRequest: 8192,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 60000,
      retries: 2,
      enableStreaming: true,
      enableEmbeddings: true
    }
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    type: 'custom',
    providerType: 'llm',
    status: 'active',
    endpoint: 'https://api.perplexity.ai',
    models: [
      {
        id: 'llama-3.1-sonar-small-128k-online',
        name: 'Llama 3.1 Sonar Small 128K Online',
        contextLength: 127072,
        inputCostPer1k: 0.0002,
        outputCostPer1k: 0.0002,
        capabilities: ['chat', 'web-search', 'real-time']
      },
      {
        id: 'llama-3.1-sonar-large-128k-online',
        name: 'Llama 3.1 Sonar Large 128K Online',
        contextLength: 127072,
        inputCostPer1k: 0.001,
        outputCostPer1k: 0.001,
        capabilities: ['chat', 'web-search', 'real-time', 'analysis']
      },
      {
        id: 'llama-3.1-sonar-huge-128k-online',
        name: 'Llama 3.1 Sonar Huge 128K Online',
        contextLength: 127072,
        inputCostPer1k: 0.005,
        outputCostPer1k: 0.005,
        capabilities: ['chat', 'web-search', 'real-time', 'reasoning']
      }
    ],
    costPerToken: { input: 0.001, output: 0.001 },
    avgLatency: 2500,
    reliability: 98.2,
    maxRequestsPerHour: 1000,
    maxTokensPerRequest: 127072,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 30000,
      retries: 3,
      enableStreaming: true,
      enableEmbeddings: false
    }
  },
  {
    id: 'ai-homelab',
    name: 'AI Homelab',
    type: 'ai-homelab',
    providerType: 'llm',
    status: 'active',
    endpoint: 'http://localhost:8777',
    models: [
      {
        id: 'homelab-llm-v1',
        name: 'AI Homelab LLM v1',
        contextLength: 4096,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion', 'homelab-optimized']
      },
      {
        id: 'homelab-specialized',
        name: 'AI Homelab Specialized',
        contextLength: 8192,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['chat', 'completion', 'domain-specific']
      }
    ],
    costPerToken: { input: 0, output: 0 },
    avgLatency: 600,
    reliability: 98.5,
    maxRequestsPerHour: 5000,
    maxTokensPerRequest: 8192,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 30000,
      retries: 3,
      enableStreaming: true,
      enableEmbeddings: true
    }
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    type: 'unsplash',
    category: 'image',
    providerType: 'llm',
    status: 'inactive',
    endpoint: 'https://api.unsplash.com',
    models: [
      {
        id: 'unsplash-api',
        name: 'Unsplash Image Gallery',
        contextLength: 0,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        capabilities: ['image-search', 'image-download', 'collections', 'random-image']
      }
    ],
    costPerToken: { input: 0, output: 0 },
    avgLatency: 500,
    reliability: 99.5,
    maxRequestsPerHour: 50, // Free tier: 50 requests/hour
    maxTokensPerRequest: 0,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 10000,
      retries: 3,
      enableStreaming: false,
      enableEmbeddings: false
    }
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    type: 'tavily',
    category: 'search',
    providerType: 'mcp-server',
    status: 'inactive',
    endpoint: 'https://api.tavily.com',
    mcpServer: {
      serverType: 'stdio',
      command: 'npx',
      args: ['-y', '@tavily/mcp-server'],
      url: 'https://api.tavily.com',
      tools: [
        {
          name: 'tavily_search',
          description: 'Real-time web search optimized for AI agents and RAG workflows',
          costPerInvocation: 0.001
        },
        {
          name: 'tavily_extract',
          description: 'Extract and structure content from web pages',
          costPerInvocation: 0.001
        },
        {
          name: 'tavily_answer',
          description: 'Get direct answers to questions with source citations',
          costPerInvocation: 0.001
        }
      ],
      costPerCall: 0.001, // $0.001 per API call (1 credit)
      creditsPerMonth: 1000, // Free tier: 1,000 credits/month
      envVars: {
        TAVILY_API_KEY: 'Required - Get from https://app.tavily.com'
      }
    },
    avgLatency: 800,
    reliability: 99.0,
    maxRequestsPerHour: 1000, // Free tier: 1,000 credits/month
    maxTokensPerRequest: 0,
    lastHealthCheck: new Date().toISOString(),
    healthStatus: 'unknown',
    configuration: {
      timeout: 15000,
      retries: 3,
      enableStreaming: false,
      enableEmbeddings: false
    }
  }
];

// Ensure config directory exists
async function ensureConfigDirectory() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// Load provider configurations
async function loadProviderConfigs(): Promise<ProviderConfig[]> {
  try {
    await ensureConfigDirectory();
    const data = await fs.readFile(PROVIDERS_CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('Loading default provider configurations');
    await saveProviderConfigs(DEFAULT_PROVIDERS);
    return DEFAULT_PROVIDERS;
  }
}

// Save provider configurations
async function saveProviderConfigs(providers: ProviderConfig[]) {
  try {
    await ensureConfigDirectory();
    await fs.writeFile(PROVIDERS_CONFIG_FILE, JSON.stringify(providers, null, 2));
  } catch (error) {
    console.error('Failed to save provider configurations:', error);
    throw error;
  }
}

// Perform health check on a provider
async function performHealthCheck(provider: ProviderConfig): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    let healthEndpoint = '';
    let headers: Record<string, string> = {};
    
    switch (provider.type) {
      case 'openai':
        healthEndpoint = `${provider.endpoint}/models`;
        headers = {
          'Authorization': `Bearer ${provider.apiKey || process.env.OPENAI_API_KEY || ''}`,
          'Content-Type': 'application/json'
        };
        break;
      case 'anthropic':
        healthEndpoint = `${provider.endpoint}/messages`;
        headers = {
          'x-api-key': provider.apiKey || process.env.ANTHROPIC_API_KEY || '',
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        break;
      case 'ollama':
        healthEndpoint = `${provider.endpoint}/api/tags`;
        break;
      case 'ai-homelab':
        healthEndpoint = `${provider.endpoint}/api/v1/health`;
        headers = {
          'Authorization': `Bearer ${provider.apiKey || process.env.AI_GATEWAY_API_KEY || ''}`,
          'Content-Type': 'application/json'
        };
        break;
      case 'unsplash':
        healthEndpoint = `${provider.endpoint}/photos/random?count=1`;
        headers = {
          'Authorization': `Client-ID ${provider.apiKey || process.env.UNSPLASH_ACCESS_KEY || ''}`,
          'Accept-Version': 'v1'
        };
        break;
      case 'tavily':
        // Tavily doesn't have a dedicated health endpoint, use search with minimal query
        healthEndpoint = `${provider.endpoint}/search`;
        headers = {
          'Content-Type': 'application/json'
        };
        break;
      case 'custom':
        if (provider.id === 'perplexity') {
          healthEndpoint = `${provider.endpoint}/chat/completions`;
          headers = {
            'Authorization': `Bearer ${provider.apiKey || process.env.PERPLEXITY_API_KEY || ''}`,
            'Content-Type': 'application/json'
          };
        }
        break;
    }

    const response = await fetch(healthEndpoint, {
      method: 'GET',
      headers,
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), provider.configuration.timeout);
        return controller.signal;
      })()
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: responseTime < 2000 ? 'healthy' : 'degraded',
        responseTime
      };
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      responseTime,
      error: error.message
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { providerId, healthCheck } = req.query;

        if (healthCheck === 'true') {
          // Perform health checks on all providers
          const providers = await loadProviderConfigs();
          const healthCheckPromises = providers.map(async (provider) => {
            const health = await performHealthCheck(provider);
            return {
              ...provider,
              healthStatus: health.status,
              lastHealthCheck: new Date().toISOString(),
              lastResponseTime: health.responseTime,
              lastError: health.error
            };
          });

          const updatedProviders = await Promise.all(healthCheckPromises);
          await saveProviderConfigs(updatedProviders);

          return res.status(200).json({
            success: true,
            providers: updatedProviders,
            timestamp: new Date().toISOString()
          });
        }

        if (providerId) {
          // Get specific provider
          const providers = await loadProviderConfigs();
          const provider = providers.find(p => p.id === providerId);
          
          if (!provider) {
            return res.status(404).json({
              success: false,
              error: 'Provider not found'
            });
          }

          return res.status(200).json({
            success: true,
            provider
          });
        }

        // Get all providers
        const providers = await loadProviderConfigs();
        res.status(200).json({
          success: true,
          providers,
          timestamp: new Date().toISOString()
        });
        break;

      case 'POST':
        // Create or update provider configuration
        const { provider } = req.body;
        
        if (!provider || !provider.id) {
          return res.status(400).json({
            success: false,
            error: 'Provider configuration with ID is required'
          });
        }

        const currentProviders = await loadProviderConfigs();
        const existingIndex = currentProviders.findIndex(p => p.id === provider.id);
        
        const updatedProvider = {
          ...provider,
          lastHealthCheck: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          currentProviders[existingIndex] = updatedProvider;
        } else {
          currentProviders.push(updatedProvider);
        }

        await saveProviderConfigs(currentProviders);

        res.status(200).json({
          success: true,
          provider: updatedProvider,
          message: existingIndex >= 0 ? 'Provider updated' : 'Provider created'
        });
        break;

      case 'PUT':
        // Update provider status or configuration
        const { providerId: putProviderId, status, configuration } = req.body;
        
        if (!putProviderId) {
          return res.status(400).json({
            success: false,
            error: 'Provider ID is required'
          });
        }

        const providersForUpdate = await loadProviderConfigs();
        const providerIndex = providersForUpdate.findIndex(p => p.id === putProviderId);
        
        if (providerIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Provider not found'
          });
        }

        if (status) {
          providersForUpdate[providerIndex].status = status;
        }

        if (configuration) {
          providersForUpdate[providerIndex].configuration = {
            ...providersForUpdate[providerIndex].configuration,
            ...configuration
          };
        }

        await saveProviderConfigs(providersForUpdate);

        res.status(200).json({
          success: true,
          provider: providersForUpdate[providerIndex],
          message: 'Provider updated successfully'
        });
        break;

      case 'DELETE':
        // Delete provider configuration
        const { providerId: deleteProviderId } = req.query;
        
        if (!deleteProviderId) {
          return res.status(400).json({
            success: false,
            error: 'Provider ID is required'
          });
        }

        const providersForDeletion = await loadProviderConfigs();
        const filteredProviders = providersForDeletion.filter(p => p.id !== deleteProviderId);

        if (filteredProviders.length === providersForDeletion.length) {
          return res.status(404).json({
            success: false,
            error: 'Provider not found'
          });
        }

        await saveProviderConfigs(filteredProviders);

        res.status(200).json({
          success: true,
          message: 'Provider deleted successfully'
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    console.error('Provider API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

export type { ProviderConfig, ModelInfo };
