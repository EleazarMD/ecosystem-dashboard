/**
 * AI Gateway Client for AI Truth Agent
 * 
 * Simplified client for AI Gateway integration focused on text generation
 * and multi-model consensus validation.
 */

export interface AIGatewayConfig {
  apiKey: string;
  baseUrl: string;
}

export interface AIGatewayRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'image';
      text?: string;
      image_url?: {
        url: string;
      };
    }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GenerateTextResponse {
  content: string;
  confidence?: number;
  reasoning?: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIGatewayClient {
  private config: AIGatewayConfig;
  private healthyPort: number | null = null;

  constructor(config: AIGatewayConfig) {
    this.config = config;
  }

  /**
   * Generate text using specified AI model
   */
  async generateText(request: AIGatewayRequest): Promise<GenerateTextResponse> {
    try {
      // Use k3d load balancer IP for AI Gateway inference
      const baseUrl = this.config.baseUrl || 'http://172.19.0.3:8777';
      const url = `${baseUrl}/api/v1/chat/completions`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.max_tokens || 500,
          temperature: request.temperature || 0.7
        }),
        signal: (() => {
          const controller = new AbortController();
          // Longer timeout for multimodal requests
          const hasImages = request.messages?.some(msg => 
            Array.isArray(msg.content) && 
            msg.content.some(content => content.type === 'image')
          );
          const timeout = hasImages ? 60000 : 15000; // 60s for vision, 15s for text
          setTimeout(() => controller.abort(), timeout);
          return controller.signal;
        })()
      });

      if (response.ok) {
        const result = await response.json();
        // Cache successful connection
        
        return {
          content: result.choices?.[0]?.message?.content || 'No response generated',
          confidence: 0.8, // Default confidence
          reasoning: 'AI Gateway response',
          model: request.model,
          usage: result.usage
        };
      } else {
        throw new Error(`AI Gateway request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[AI Gateway Client] Generate text failed:', error);
      throw new Error(`AI Gateway unavailable on port 8777. Error: ${(error as Error).message}`);
    }
  }

  /**
   * Check AI Gateway health
   */
  async checkHealth(): Promise<{ healthy: boolean; port?: number }> {
    // Only check port 8777 for inference health
    const port = 8777;
    try {
      const response = await fetch(`http://localhost:${port}/api/v1/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Accept': 'application/json'
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          return controller.signal;
        })()
      });

      if (response.ok) {
        this.healthyPort = port;
        return { healthy: true, port };
      }
    } catch (error) {
      // Health check failed
    }

    return { healthy: false };
  }

  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const health = await this.checkHealth();
      if (!health.healthy) {
        return ['gemma3:4b']; // Default inference model
      }

      const port = 8777; // Only use inference port
      const response = await fetch(`http://localhost:${port}/api/v1/models`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Accept': 'application/json'
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 10000);
          return controller.signal;
        })()
      });

      if (response.ok) {
        const result = await response.json();
        return result.data?.map((model: any) => model.id) || ['gemma3:4b'];
      }

      return ['gemma3:4b']; // Default inference model
    } catch (error) {
      console.error('[AI Gateway Client] Get models failed:', error);
      return ['gemma3:4b']; // Default inference model
    }
  }
}
