/**
 * Ollama Client for AI Truth Agent
 * 
 * Direct integration with local Ollama instance for LLM inference
 * Optimized for fact-checking and medical domain analysis
 */

export interface OllamaConfig {
  baseUrl: string;
  timeout?: number;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OllamaGenerateResponse {
  content: string;
  confidence?: number;
  reasoning?: string;
  model: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export class OllamaClient {
  private config: OllamaConfig;
  private availableModels: OllamaModel[] = [];

  constructor(config: OllamaConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      timeout: config.timeout || 30000
    };
  }

  /**
   * Generate text using specified Ollama model
   */
  async generateText(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    try {
      const url = `${this.config.baseUrl}/api/generate`;
      
      const payload = {
        model: request.model,
        prompt: request.prompt,
        system: request.system,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.max_tokens || 500
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), this.config.timeout!);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        content: result.response || 'No response generated',
        confidence: this.calculateConfidence(result),
        reasoning: `Ollama ${request.model} analysis`,
        model: request.model,
        done: result.done,
        total_duration: result.total_duration,
        load_duration: result.load_duration,
        prompt_eval_count: result.prompt_eval_count,
        eval_count: result.eval_count
      };

    } catch (error) {
      console.error(`[Ollama Client] Generation failed for model ${request.model}:`, error);
      
      // Return fallback response
      return {
        content: `Ollama analysis unavailable for: ${request.prompt.substring(0, 100)}...`,
        confidence: 0.3,
        reasoning: `Ollama ${request.model} unavailable - fallback response`,
        model: request.model,
        done: true
      };
    }
  }

  /**
   * Get available models from Ollama
   */
  async getModels(): Promise<OllamaModel[]> {
    try {
      const url = `${this.config.baseUrl}/api/tags`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          return controller.signal;
        })()
      });

      if (response.ok) {
        const result = await response.json();
        this.availableModels = result.models || [];
        return this.availableModels;
      }

      return [];
    } catch (error) {
      console.error('[Ollama Client] Get models failed:', error);
      return [];
    }
  }

  /**
   * Check Ollama health and connectivity
   */
  async checkHealth(): Promise<{ healthy: boolean; models: string[] }> {
    try {
      const models = await this.getModels();
      return {
        healthy: models.length > 0,
        models: models.map(m => m.name)
      };
    } catch (error) {
      return { healthy: false, models: [] };
    }
  }

  /**
   * Get recommended models for AI Truth Agent fact-checking
   */
  getRecommendedModels(): string[] {
    const recommended = [
      'llama3.1:8b',        // General reasoning and fact-checking
      'gemma3:4b',          // Fast inference for simple claims
      'alibayram/medgemma:latest'  // Medical domain expertise
    ];

    // Filter to only available models
    const available = this.availableModels.map(m => m.name);
    return recommended.filter(model => available.includes(model));
  }

  /**
   * Calculate confidence based on Ollama response metadata
   */
  private calculateConfidence(result: any): number {
    // Base confidence on response completeness and timing
    let confidence = 0.7; // Base confidence for Ollama
    
    if (result.done) confidence += 0.1;
    if (result.response && result.response.length > 50) confidence += 0.1;
    if (result.eval_count && result.eval_count > 10) confidence += 0.05;
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Generate multi-model consensus using available Ollama models
   */
  async getMultiModelConsensus(prompt: string, systemPrompt?: string): Promise<{
    models_queried: string[];
    agreement_score: number;
    consensus_response: string;
    individual_responses: any[];
    confidence: number;
  }> {
    const models = this.getRecommendedModels();
    const responses = [];

    console.log(`[Ollama Client] Querying ${models.length} models for consensus...`);

    for (const model of models) {
      try {
        const response = await this.generateText({
          model,
          prompt,
          system: systemPrompt,
          temperature: 0.3, // Lower temperature for more consistent fact-checking
          max_tokens: 300
        });

        responses.push({
          model,
          response: response.content,
          confidence: response.confidence || 0.7,
          reasoning: response.reasoning || 'Ollama analysis'
        });

        console.log(`[Ollama Client] ${model}: ${response.content.substring(0, 100)}...`);
      } catch (error) {
        console.warn(`[Ollama Client] Model ${model} failed:`, error);
      }
    }

    // Calculate agreement score
    const agreementScore = this.calculateModelAgreement(responses);
    
    return {
      models_queried: models,
      agreement_score: agreementScore,
      consensus_response: responses[0]?.response || 'No consensus available',
      individual_responses: responses,
      confidence: agreementScore
    };
  }

  /**
   * Calculate agreement between model responses
   */
  private calculateModelAgreement(responses: any[]): number {
    if (responses.length < 2) return 0.5;
    
    // Simple agreement calculation based on response similarity
    let agreementSum = 0;
    let comparisons = 0;
    
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateTextSimilarity(
          responses[i].response,
          responses[j].response
        );
        agreementSum += similarity;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? agreementSum / comparisons : 0.5;
  }

  /**
   * Calculate text similarity between responses
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = Array.from(new Set([...words1, ...words2]));
    
    return intersection.length / union.length;
  }
}
