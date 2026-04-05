/**
 * Podcast Studio LLM Service
 * Integrates with AI Gateway for both open source (Ollama) and closed source models
 * Handles chat, document analysis, and script generation
 */

import { modelConfig } from '../DynamicModelConfig';

export interface LLMRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokens_used?: number;
  finish_reason?: string;
}

class PodcastStudioLLMService {
  private aiGatewayUrl: string;
  private apiKey: string;

  constructor() {
    // Use AI Gateway's AI client port (8777) for LLM operations
    this.aiGatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL || 'http://localhost:8777';
    this.apiKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
  }

  /**
   * Convert model name to AI Gateway provider format
   * Open source models route through Ollama
   * Closed source models route through their respective providers
   */
  private getProviderModel(model: string): { provider: string; model: string } {
    // Open source models (via Ollama)
    const ollamaModels: Record<string, string> = {
      'llama-3.1-70b': 'llama3.1:70b',
      'llama-3.1-8b': 'llama3.1:8b',
      'llama-3.2-90b': 'llama3.2:90b',
      'mixtral-8x7b': 'mixtral:8x7b',
      'mixtral-8x22b': 'mixtral:8x22b',
      'mistral-large': 'mistral-large',
      'qwen-2.5-72b': 'qwen2.5:72b',
      'deepseek-v2.5': 'deepseek-v2.5',
      'gemma-2-27b': 'gemma2:27b',
      'phi-3-medium': 'phi3:medium',
      'yi-34b': 'yi:34b',
      'command-r-plus': 'command-r-plus',
    };

    // Check if it's an open source model
    if (ollamaModels[model]) {
      return {
        provider: 'ollama',
        model: ollamaModels[model]
      };
    }

    // Closed source models
    if (model.startsWith('gpt-') || model.includes('openai')) {
      return {
        provider: 'openai',
        model: model.replace('openai/', '')
      };
    }

    if (model.startsWith('claude-') || model.includes('anthropic')) {
      return {
        provider: 'anthropic',
        model: model.replace('anthropic/', '')
      };
    }

    if (model.startsWith('gemini-') || model.includes('google')) {
      return {
        provider: 'google',
        model: model.replace('google/', '')
      };
    }

    // Default to current model config
    return {
      provider: 'ollama',
      model: modelConfig.getCurrentModel()
    };
  }

  /**
   * Chat completion via AI Gateway
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const { provider, model } = this.getProviderModel(request.model);
    
    try {
      const response = await fetch(`${this.aiGatewayUrl}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-Provider': provider, // Route to specific provider
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 2000,
          stream: false, // Non-streaming for now
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI Gateway error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices?.[0]?.message?.content || '',
        model: `${provider}/${model}`,
        tokens_used: data.usage?.total_tokens,
        finish_reason: data.choices?.[0]?.finish_reason,
      };
    } catch (error) {
      console.error('❌ LLM chat error:', error);
      throw error;
    }
  }

  /**
   * Analyze PDF/document content
   * Uses configured analysis model
   */
  async analyzeDocument(content: string, prompt: string, analysisModel?: string): Promise<LLMResponse> {
    const model = analysisModel || process.env.PODCAST_ANALYSIS_MODEL || 'llama-3.1-70b';
    
    return this.chat({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant specialized in analyzing documents and extracting key insights, themes, and actionable information for podcast content creation.',
        },
        {
          role: 'user',
          content: `${prompt}\n\nDocument content:\n${content}`,
        },
      ],
      temperature: 0.3, // Lower temperature for analysis
      max_tokens: 4000,
    });
  }

  /**
   * Extract insights from document
   */
  async extractInsights(content: string): Promise<string[]> {
    const response = await this.analyzeDocument(
      content,
      'Extract the top 5 most important insights, findings, or key points from this document. Return as a JSON array of strings.'
    );

    try {
      const insights = JSON.parse(response.content);
      return Array.isArray(insights) ? insights : [];
    } catch {
      // Fallback: split by newlines
      return response.content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5);
    }
  }

  /**
   * Summarize document
   */
  async summarizeDocument(content: string, maxLength: number = 500): Promise<string> {
    const response = await this.analyzeDocument(
      content,
      `Provide a concise summary of this document in approximately ${maxLength} characters. Focus on the main arguments, findings, and conclusions.`
    );

    return response.content;
  }

  /**
   * Generate podcast script
   */
  async generateScript(params: {
    sources: Array<{ title: string; content: string }>;
    length: 'executive' | 'essential' | 'comprehensive' | 'deep-dive';
    tone: string;
    audience: string;
    style: string;
    emphasis?: string;
    includeStories: boolean;
    includeExamples: boolean;
  }): Promise<string> {
    const scriptModel = process.env.PODCAST_SCRIPT_MODEL || 'claude-3.5-sonnet';

    // Define strict length constraints (Content-Focused naming)
    const lengthConstraints = {
      'executive': {
        duration: '3-5 minutes',
        wordCount: '450-750 words',
        description: 'Key insights only',
        instructions: 'Keep it EXTREMELY concise. Focus ONLY on the 3 most critical insights. Each host should speak no more than 2-3 times. NO introductions, NO transitions - dive straight into key points. End with one actionable takeaway.',
        maxTokens: 1200
      },
      'essential': {
        duration: '5-7 minutes', 
        wordCount: '750-1050 words',
        description: 'Essential information',
        instructions: 'Concise but conversational. Cover 4-5 key points with brief context. Minimal storytelling. Focus on essential information only.',
        maxTokens: 1800
      },
      'comprehensive': {
        duration: '10-15 minutes',
        wordCount: '1500-2250 words',
        description: 'Full coverage',
        instructions: 'Balanced depth and engagement. Cover all major points with context and examples. Comprehensive treatment of the topic.',
        maxTokens: 3500
      },
      'deep-dive': {
        duration: '20-30 minutes',
        wordCount: '3000-4500 words',
        description: 'In-depth exploration',
        instructions: 'Comprehensive coverage with detailed examples, stories, and analysis. Deep exploration of all aspects.',
        maxTokens: 6000
      }
    };

    const constraint = lengthConstraints[params.length];

    // Build sources context
    const sourcesText = params.sources
      .map((s, i) => `Source ${i + 1}: ${s.title}\n${s.content.substring(0, 2000)}...`)
      .join('\n\n');

    // Build generation prompt with strict constraints
    const systemPrompt = `You are an expert podcast script writer specializing in ${constraint.description} format.

CRITICAL LENGTH CONSTRAINT:
- Target Duration: ${constraint.duration}
- Word Count: ${constraint.wordCount} (STRICT LIMIT - do not exceed!)
- ${constraint.instructions}

${params.length === 'executive' ? `
EXECUTIVE FORMAT RULES (MANDATORY):
1. NO opening pleasantries or introductions
2. Start immediately with "The key insight is..."
3. Present exactly 3 main points
4. Each point: 1-2 sentences maximum
5. End with ONE actionable takeaway
6. Total script must be under 750 words
7. If for executives: assume they have limited time and want bottom-line insights ONLY
` : ''}

Style Guidelines:
- Tone: ${params.tone}
- Audience: ${params.audience}
- Format: ${params.style}
${params.emphasis ? `- Special Focus: ${params.emphasis}` : ''}
${params.includeStories ? '- Include personal stories and anecdotes (NPR style)' : ''}
${params.includeExamples ? '- Include real-world examples' : ''}

Output the script in this format:
Host 1: [dialogue]
Host 2: [dialogue]

Do NOT include timestamps, stage directions, or metadata.`;

    const userPrompt = `Generate a ${constraint.duration} podcast script (${constraint.wordCount}) in ${params.style} format.

Research Sources:
${sourcesText}

${params.length === 'executive' ? `
Remember: This is for EXECUTIVES with LIMITED TIME. They need:
- The 3 most important insights ONLY
- NO fluff, NO introductions
- Actionable conclusions
- Under 750 words total
` : `Create natural, engaging dialogue that brings these research materials to life for a ${params.audience} audience with a ${params.tone} tone.`}`;

    const response = await this.chat({
      model: scriptModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: params.length === 'executive' ? 0.5 : 0.8, // Lower temp for executive = more focused
      max_tokens: constraint.maxTokens,
    });

    return response.content;
  }

  /**
   * Check if AI Gateway is healthy and models are available
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    availableModels: string[];
    providers: string[];
  }> {
    try {
      const response = await fetch(`${this.aiGatewayUrl}/api/v1/health/comprehensive`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        return { healthy: false, availableModels: [], providers: [] };
      }

      const data = await response.json();
      
      return {
        healthy: data.status === 'healthy',
        availableModels: data.models || [],
        providers: Object.keys(data.providers || {}),
      };
    } catch (error) {
      console.error('❌ AI Gateway health check failed:', error);
      return { healthy: false, availableModels: [], providers: [] };
    }
  }

  /**
   * Get available models from AI Gateway
   */
  async getAvailableModels(): Promise<Array<{ id: string; provider: string; name: string }>> {
    try {
      const response = await fetch(`${this.aiGatewayUrl}/api/v1/models`, {
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('❌ Failed to fetch available models:', error);
      return [];
    }
  }
}

// Singleton instance
export const podcastLLMService = new PodcastStudioLLMService();

// Export types
export type { PodcastStudioLLMService };
