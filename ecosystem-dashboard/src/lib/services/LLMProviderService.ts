/**
 * AI Homelab Inferencing - LLM Provider Service
 * Real integration with LLM providers for actual API calls and usage tracking
 */

import { ServiceConfig, UsageRecord } from '@/pages/api/ai-config/services';
import { ProviderConfig } from '@/pages/api/ai-config/providers';

interface LLMRequest {
  serviceId: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface LLMResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  responseTime: number;
  cost: number;
}

interface AccessControlResult {
  allowed: boolean;
  reason?: string;
  quotaRemaining?: number;
  rateLimitRemaining?: number;
}

class LLMProviderService {
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();
  private quotaTracker: Map<string, { used: number; resetTime: number }> = new Map();

  constructor() {
    this.loadConfigurations();
  }

  /**
   * Load service and provider configurations
   */
  private async loadConfigurations() {
    try {
      // Load service configurations
      const servicesResponse = await fetch('/api/ai-config/services');
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        servicesData.services.forEach((service: ServiceConfig) => {
          this.serviceConfigs.set(service.id, service);
        });
      }

      // Load provider configurations
      const providersResponse = await fetch('/api/ai-config/providers');
      if (providersResponse.ok) {
        const providersData = await providersResponse.json();
        providersData.providers.forEach((provider: ProviderConfig) => {
          this.providerConfigs.set(provider.id, provider);
        });
      }
    } catch (error) {
      console.error('Failed to load configurations:', error);
    }
  }

  /**
   * Check access control for a service request
   */
  private checkAccessControl(serviceId: string, providerId: string): AccessControlResult {
    const service = this.serviceConfigs.get(serviceId);
    if (!service) {
      return { allowed: false, reason: 'Service not found' };
    }

    const provider = this.providerConfigs.get(providerId);
    if (!provider) {
      return { allowed: false, reason: 'Provider not found' };
    }

    // Check if provider is allowed for this service
    if (!service.accessControl.allowedProviders.includes(providerId)) {
      return { allowed: false, reason: 'Provider not allowed for this service' };
    }

    // Check provider status
    if (provider.status !== 'active') {
      return { allowed: false, reason: 'Provider is not active' };
    }

    // Check rate limiting
    const rateLimitKey = `${serviceId}-${providerId}`;
    const now = Date.now();
    const hourStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);
    
    let rateLimitData = this.rateLimitTracker.get(rateLimitKey);
    if (!rateLimitData || rateLimitData.resetTime !== hourStart) {
      rateLimitData = { count: 0, resetTime: hourStart };
      this.rateLimitTracker.set(rateLimitKey, rateLimitData);
    }

    if (rateLimitData.count >= service.accessControl.rateLimit) {
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded',
        rateLimitRemaining: 0
      };
    }

    // Check daily quota
    const dayStart = Math.floor(now / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    let quotaData = this.quotaTracker.get(rateLimitKey);
    if (!quotaData || quotaData.resetTime !== dayStart) {
      quotaData = { used: 0, resetTime: dayStart };
      this.quotaTracker.set(rateLimitKey, quotaData);
    }

    if (quotaData.used >= service.accessControl.quotaLimit) {
      return { 
        allowed: false, 
        reason: 'Daily quota exceeded',
        quotaRemaining: 0
      };
    }

    return { 
      allowed: true,
      rateLimitRemaining: service.accessControl.rateLimit - rateLimitData.count,
      quotaRemaining: service.accessControl.quotaLimit - quotaData.used
    };
  }

  /**
   * Update rate limiting and quota tracking
   */
  private updateUsageTracking(serviceId: string, providerId: string, tokensUsed: number) {
    const rateLimitKey = `${serviceId}-${providerId}`;
    
    // Update rate limiting
    const rateLimitData = this.rateLimitTracker.get(rateLimitKey);
    if (rateLimitData) {
      rateLimitData.count++;
    }

    // Update quota tracking
    const quotaData = this.quotaTracker.get(rateLimitKey);
    if (quotaData) {
      quotaData.used += tokensUsed;
    }
  }

  /**
   * Make request to OpenAI
   */
  private async callOpenAI(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey || process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || 'gpt-3.5-turbo',
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Calculate cost based on model
    const model = request.model || 'gpt-3.5-turbo';
    const modelConfig = provider.models.find(m => m.id === model);
    const inputCost = modelConfig ? (data.usage.prompt_tokens / 1000) * modelConfig.inputCostPer1k : 0;
    const outputCost = modelConfig ? (data.usage.completion_tokens / 1000) * modelConfig.outputCostPer1k : 0;
    const totalCost = inputCost + outputCost;

    return {
      id: data.id,
      model: data.model,
      choices: data.choices.map((choice: any) => ({
        message: choice.message,
        finishReason: choice.finish_reason
      })),
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      responseTime,
      cost: totalCost
    };
  }

  /**
   * Make request to Anthropic
   */
  private async callAnthropic(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${provider.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey || process.env.ANTHROPIC_API_KEY || '',
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model || 'claude-3-haiku-20240307',
        max_tokens: request.maxTokens || 1000,
        messages: request.messages.filter(m => m.role !== 'system'),
        system: request.messages.find(m => m.role === 'system')?.content || undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Calculate cost based on model
    const model = request.model || 'claude-3-haiku-20240307';
    const modelConfig = provider.models.find(m => m.id === model);
    const inputCost = modelConfig ? (data.usage.input_tokens / 1000) * modelConfig.inputCostPer1k : 0;
    const outputCost = modelConfig ? (data.usage.output_tokens / 1000) * modelConfig.outputCostPer1k : 0;
    const totalCost = inputCost + outputCost;

    return {
      id: data.id,
      model: data.model,
      choices: [{
        message: {
          role: 'assistant',
          content: data.content[0].text
        },
        finishReason: data.stop_reason
      }],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      responseTime,
      cost: totalCost
    };
  }

  /**
   * Make request to Ollama
   */
  private async callOllama(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${provider.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || 'llama3.1:8b',
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Estimate token usage for Ollama (no built-in usage tracking)
    const estimatedPromptTokens = request.messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);
    const estimatedCompletionTokens = Math.ceil(data.message.content.length / 4);

    return {
      id: `ollama-${Date.now()}`,
      model: data.model,
      choices: [{
        message: data.message,
        finishReason: 'stop'
      }],
      usage: {
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedPromptTokens + estimatedCompletionTokens
      },
      responseTime,
      cost: 0 // Ollama is free
    };
  }

  /**
   * Make request to Google AI
   */
  private async callGoogle(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = request.model || 'gemini-2.5-flash';
    
    const response = await fetch(`${provider.endpoint}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': provider.apiKey || process.env.GOOGLE_API_KEY || ''
      },
      body: JSON.stringify({
        contents: request.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google AI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Calculate cost based on model
    const modelConfig = provider.models.find(m => m.id === model);
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    const inputCost = modelConfig ? (inputTokens / 1000) * modelConfig.inputCostPer1k : 0;
    const outputCost = modelConfig ? (outputTokens / 1000) * modelConfig.outputCostPer1k : 0;
    const totalCost = inputCost + outputCost;

    return {
      id: `google-${Date.now()}`,
      model: model,
      choices: [{
        message: {
          role: 'assistant',
          content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
        },
        finishReason: data.candidates?.[0]?.finishReason || 'stop'
      }],
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens
      },
      responseTime,
      cost: totalCost
    };
  }

  /**
   * Make request to AI Gateway
   */
  private async callAIGateway(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    const response = await fetch(`${provider.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey || process.env.AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || 'homelab-llm-v1',
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000
      })
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      id: data.id,
      model: data.model,
      choices: data.choices,
      usage: data.usage,
      responseTime,
      cost: 0 // AI Gateway is free
    };
  }

  /**
   * Make request to Tavily Search API
   */
  private async callTavily(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // Extract search query from messages
    const searchQuery = request.messages[request.messages.length - 1]?.content || '';
    
    const response = await fetch(`${provider.endpoint}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: provider.apiKey || process.env.TAVILY_API_KEY || '',
        query: searchQuery,
        search_depth: 'basic', // or 'advanced' for deeper search
        include_answer: true,
        include_raw_content: false,
        max_results: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Format Tavily response as LLM response
    const searchResults = data.results || [];
    const answer = data.answer || 'No answer found';
    const formattedContent = `${answer}\n\nSources:\n${searchResults.map((r: any, i: number) => 
      `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content}`
    ).join('\n\n')}`;

    // Estimate token usage (approximate)
    const estimatedTokens = Math.ceil(formattedContent.length / 4);

    return {
      id: `tavily-${Date.now()}`,
      model: 'tavily-search',
      choices: [{
        message: {
          role: 'assistant',
          content: formattedContent
        },
        finishReason: 'stop'
      }],
      usage: {
        promptTokens: Math.ceil(searchQuery.length / 4),
        completionTokens: estimatedTokens,
        totalTokens: estimatedTokens + Math.ceil(searchQuery.length / 4)
      },
      responseTime,
      cost: 0.001 // $0.001 per search (1 credit)
    };
  }

  /**
   * Record usage metrics
   */
  private async recordUsage(serviceId: string, providerId: string, model: string, response: LLMResponse, success: boolean) {
    try {
      await fetch('/api/ai-config/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId,
          provider: providerId,
          model,
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
          responseTime: response.responseTime,
          success,
          requestType: 'completion',
          metadata: {
            cost: response.cost,
            finishReason: response.choices[0]?.finishReason
          }
        })
      });
    } catch (error) {
      console.error('Failed to record usage:', error);
    }
  }

  /**
   * Main method to process LLM requests with access control
   */
  async processRequest(request: LLMRequest): Promise<LLMResponse> {
    await this.loadConfigurations(); // Refresh configurations
    
    const service = this.serviceConfigs.get(request.serviceId);
    if (!service) {
      throw new Error(`Service ${request.serviceId} not found`);
    }

    const providerId = service.currentProvider;
    const provider = this.providerConfigs.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Check access control
    const accessCheck = this.checkAccessControl(request.serviceId, providerId);
    if (!accessCheck.allowed) {
      throw new Error(`Access denied: ${accessCheck.reason}`);
    }

    let response: LLMResponse;
    let success = true;

    try {
      // Route to appropriate provider
      switch (provider.type) {
        case 'openai':
          response = await this.callOpenAI(provider, request);
          break;
        case 'anthropic':
          response = await this.callAnthropic(provider, request);
          break;
        case 'ollama':
          response = await this.callOllama(provider, request);
          break;
        case 'ai-homelab':
          response = await this.callAIGateway(provider, request);
          break;
        case 'tavily':
          response = await this.callTavily(provider, request);
          break;
        case 'custom':
          // Handle custom providers (Google, Perplexity, etc.)
          if (provider.id === 'google') {
            response = await this.callGoogle(provider, request);
          } else if (provider.id === 'perplexity') {
            // Perplexity uses OpenAI-compatible API
            response = await this.callOpenAI(provider, request);
          } else {
            throw new Error(`Unsupported custom provider: ${provider.id}`);
          }
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      // Update usage tracking
      this.updateUsageTracking(request.serviceId, providerId, response.usage.totalTokens);

    } catch (error) {
      success = false;
      // Create error response
      response = {
        id: `error-${Date.now()}`,
        model: request.model || 'unknown',
        choices: [{
          message: {
            role: 'assistant',
            content: `Error: ${error.message}`
          },
          finishReason: 'error'
        }],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        },
        responseTime: 0,
        cost: 0
      };
      
      throw error;
    } finally {
      // Record usage metrics
      await this.recordUsage(request.serviceId, providerId, request.model || 'unknown', response, success);
    }

    return response;
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceId: string): ServiceConfig | undefined {
    return this.serviceConfigs.get(serviceId);
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerId: string): ProviderConfig | undefined {
    return this.providerConfigs.get(providerId);
  }

  /**
   * Check if service can use provider
   */
  canServiceUseProvider(serviceId: string, providerId: string): boolean {
    const accessCheck = this.checkAccessControl(serviceId, providerId);
    return accessCheck.allowed;
  }
}

// Export singleton instance
export const llmProviderService = new LLMProviderService();
export type { LLMRequest, LLMResponse, AccessControlResult };
