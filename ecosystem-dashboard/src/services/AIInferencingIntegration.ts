/**
 * AI Inferencing Service Integration
 * Handles dynamic API key management for Agentic Control UI
 */

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';

// Default service/project for backward compatibility
const DEFAULT_SERVICE_ID = 'agentic-control-dashboard';
const DEFAULT_PROJECT_ID = 'agentic-control-ui';

export interface ProviderAvailability {
  provider: string;
  available: boolean;
  providerDisplayName: string;
  rateLimit: number;
  costLimit: number | null;
  models: string[];
}

export interface AIInferencingStats {
  projectId: string;
  serviceId: string;
  availableProviders: ProviderAvailability[];
  totalKeys: number;
  usageToday?: {
    requests: number;
    cost: number;
    tokens: number;
  };
}

/**
 * Model to provider mapping
 */
const MODEL_PROVIDER_MAP: Record<string, string> = {
  // OpenAI
  'gpt-4': 'openai',
  'gpt-4-turbo': 'openai',
  'gpt-4o': 'openai',
  'gpt-3.5-turbo': 'openai',
  'gpt-4o-mini': 'openai',
  'o3': 'openai', // Most powerful reasoning model
  'o1-preview': 'openai', // Advanced reasoning
  'o1-mini': 'openai', // Smaller reasoning model
  'o1-pro': 'openai', // Premium reasoning
  
  // Google Gemini
  'gemini-pro': 'google',
  'gemini-1.5-pro': 'google',
  'gemini-1.5-flash': 'google',
  'gemini-2.0-flash-exp': 'google',
  'gemini-2.5-flash': 'google',
  
  // Anthropic
  'claude-3-opus': 'anthropic',
  'claude-3-sonnet': 'anthropic',
  'claude-3-haiku': 'anthropic',
  'claude-3.5-sonnet': 'anthropic',
  'claude-3-5-sonnet': 'anthropic',
  'claude-haiku-4-5': 'anthropic', // Fast initiation model
  'claude-4-sonnet': 'anthropic',
  
  // Ollama (local models)
  'llama3.2:3b': 'ollama',
  'llama3.2': 'ollama',
  'mistral': 'ollama',
  'mixtral': 'ollama',
  'codellama': 'ollama',
};

/**
 * Provider to models mapping
 */
const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['o3', 'o1-preview', 'o1-mini', 'o1-pro', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
  anthropic: ['claude-4-sonnet', 'claude-haiku-4-5', 'claude-3.5-sonnet', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  ollama: ['llama3.2:3b', 'llama3.2', 'mistral', 'mixtral', 'codellama'],
};

/**
 * Get provider from model name
 */
export function getProviderFromModel(model: string): string {
  const provider = MODEL_PROVIDER_MAP[model];
  if (provider) return provider;
  
  // Try to infer from model name
  const modelLower = model.toLowerCase();
  if (modelLower.includes('gpt')) return 'openai';
  if (modelLower.includes('gemini')) return 'google';
  if (modelLower.includes('claude')) return 'anthropic';
  if (modelLower.includes('llama') || modelLower.includes('mistral')) return 'ollama';
  
  return 'openai'; // Default fallback
}

/**
 * Get available models for a provider
 */
export function getModelsForProvider(provider: string): string[] {
  return PROVIDER_MODELS[provider] || [];
}

/**
 * Check which providers have API keys configured
 */
export async function getAvailableProviders(
  serviceId: string = DEFAULT_SERVICE_ID,
  projectId: string = DEFAULT_PROJECT_ID
): Promise<ProviderAvailability[]> {
  try {
    const response = await fetch(
      `${AI_INFERENCING_URL}/api/v1/admin/keys/services/${serviceId}/keys`,
      {
        headers: {
          'X-Admin-Key': 'ai-inferencing-admin-key-2024'
        }
      }
    );
    
    if (!response.ok) {
      console.warn('Failed to fetch provider keys, using defaults');
      return getDefaultProviders();
    }
    
    const data = await response.json();
    
    // Map keys to provider availability
    const providers: ProviderAvailability[] = data.keys.map((key: any) => ({
      provider: key.provider,
      available: key.is_active && key.validation_status !== 'invalid',
      providerDisplayName: key.provider_display_name || key.provider,
      rateLimit: key.rate_limit_per_minute || 0,
      costLimit: key.cost_limit_daily ? parseFloat(key.cost_limit_daily) : null,
      models: getModelsForProvider(key.provider)
    }));
    
    return providers;
    
  } catch (error) {
    console.error('Error fetching available providers:', error);
    return getDefaultProviders();
  }
}

/**
 * Get default providers (fallback)
 */
function getDefaultProviders(): ProviderAvailability[] {
  return [
    {
      provider: 'openai',
      available: true,
      providerDisplayName: 'OpenAI',
      rateLimit: 100,
      costLimit: 100,
      models: PROVIDER_MODELS.openai
    },
    {
      provider: 'ollama',
      available: true,
      providerDisplayName: 'Ollama (Local)',
      rateLimit: 200,
      costLimit: null,
      models: PROVIDER_MODELS.ollama
    }
  ];
}

/**
 * Get service statistics
 */
export async function getServiceStats(
  serviceId: string = DEFAULT_SERVICE_ID,
  projectId: string = DEFAULT_PROJECT_ID
): Promise<AIInferencingStats> {
  try {
    const providers = await getAvailableProviders(serviceId, projectId);
    
    // Try to fetch usage stats
    let usageToday;
    try {
      const usageResponse = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/services/${serviceId}/usage?days=1`,
        {
          headers: {
            'X-Admin-Key': 'ai-inferencing-admin-key-2024'
          }
        }
      );
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        if (usageData.usage && usageData.usage.length > 0) {
          const totals = usageData.usage.reduce((acc: any, curr: any) => ({
            requests: acc.requests + (curr.total_requests || 0),
            cost: acc.cost + parseFloat(curr.total_cost || '0'),
            tokens: acc.tokens + (curr.total_tokens || 0)
          }), { requests: 0, cost: 0, tokens: 0 });
          
          usageToday = totals;
        }
      }
    } catch (error) {
      console.warn('Could not fetch usage stats:', error);
    }
    
    return {
      projectId: projectId,
      serviceId: serviceId,
      availableProviders: providers,
      totalKeys: providers.length,
      usageToday
    };
    
  } catch (error) {
    console.error('Error fetching service stats:', error);
    throw error;
  }
}

/**
 * Get headers to include in AI Gateway requests
 */
export function getAIGatewayHeaders(
  model?: string,
  serviceId: string = DEFAULT_SERVICE_ID,
  projectId: string = DEFAULT_PROJECT_ID
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Service-ID': serviceId,
    'X-Project-ID': projectId,
    'Content-Type': 'application/json'
  };
  
  // Include provider hint if model is specified
  if (model) {
    const provider = getProviderFromModel(model);
    headers['X-Provider-Hint'] = provider;
  }
  
  return headers;
}

/**
 * Check if a specific provider is available
 */
export async function isProviderAvailable(
  provider: string,
  serviceId: string = DEFAULT_SERVICE_ID,
  projectId: string = DEFAULT_PROJECT_ID
): Promise<boolean> {
  const providers = await getAvailableProviders(serviceId, projectId);
  const providerInfo = providers.find(p => p.provider === provider);
  return providerInfo ? providerInfo.available : false;
}

/**
 * Get all available models (from all available providers)
 */
export async function getAvailableModels(
  serviceId: string = DEFAULT_SERVICE_ID,
  projectId: string = DEFAULT_PROJECT_ID
): Promise<string[]> {
  const providers = await getAvailableProviders(serviceId, projectId);
  const models: string[] = [];
  
  for (const provider of providers) {
    if (provider.available) {
      models.push(...provider.models);
    }
  }
  
  return models;
}

const AIInferencingIntegration = {
  getAvailableProviders,
  getServiceStats,
  getAIGatewayHeaders,
  getProviderFromModel,
  getModelsForProvider,
  isProviderAvailable,
  getAvailableModels
};

export default AIInferencingIntegration;
