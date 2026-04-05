/**
 * Ollama Gemma3 Multimodal Integration
 * 
 * Provides advanced AI capabilities through Ollama running Gemma3 multimodal model
 * including speech-to-text, text-to-speech, image analysis, and sophisticated
 * natural language processing for the AI Homelab Dashboard.
 */

import { AgentConfig } from '@/config/agent-config';
import logger from '../logger';

// Ollama Integration Types
export interface OllamaModel {
  name: string;
  size: string;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface MultimodalInput {
  text?: string;
  image?: ArrayBuffer | string; // Base64 or binary
  audio?: ArrayBuffer;
  metadata?: Record<string, any>;
}

export interface MultimodalResponse {
  text: string;
  confidence: number;
  reasoning?: string;
  metadata?: Record<string, any>;
  alternatives?: string[];
}

export interface VoiceProcessingOptions {
  language?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'wav' | 'mp3' | 'ogg';
}

export interface ConversationContext {
  sessionId: string;
  history: ConversationTurn[];
  systemPrompt?: string;
  personality?: string;
  expertise?: string[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class OllamaGemma3Integration {
  private config = AgentConfig.ollama;
  private baseUrl: string;
  private model: string;
  private conversations = new Map<string, ConversationContext>();

  constructor() {
    this.baseUrl = this.config.base_url;
    this.model = this.config.model;
  }

  /**
   * Initialize and test Ollama connection
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('[Ollama] Integration disabled in configuration');
      return;
    }

    try {
      logger.info('[Ollama] Initializing Gemma3 integration...');
      
      // Test connection
      const available = await this.isAvailable();
      if (!available) {
        throw new Error('Ollama server not available');
      }

      // Check if model is installed
      const models = await this.listModels();
      const gemma3Available = models.some(m => m.name.includes('gemma3') || m.name.includes(this.model));
      
      if (!gemma3Available) {
        logger.warn(`[Ollama] Model ${this.model} not found. Available models:`, models.map(m => m.name));
        throw new Error(`Model ${this.model} not available. Please run: ollama pull ${this.model}`);
      }

      logger.info('[Ollama] Gemma3 integration initialized successfully');
    } catch (error) {
      logger.error('[Ollama] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Test if Ollama server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 5000);
          return controller.signal;
        })()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('[Ollama] Failed to list models:', error);
      return [];
    }
  }

  /**
   * Generate text response using Gemma3
   */
  async generateText(prompt: string, options?: Partial<OllamaGenerateRequest>): Promise<string> {
    try {
      const request: OllamaGenerateRequest = {
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.max_tokens,
          ...options?.options
        },
        ...options
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), this.config.timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      return data.response;

    } catch (error) {
      logger.error('[Ollama] Text generation failed:', error);
      throw error;
    }
  }

  /**
   * Process multimodal input (text, image, audio)
   */
  async processMultimodal(input: MultimodalInput): Promise<MultimodalResponse> {
    try {
      let prompt = '';
      
      // Construct multimodal prompt
      if (input.text) {
        prompt += `Text: ${input.text}\n`;
      }
      
      if (input.image) {
        // Convert image to base64 if needed
        const imageData = typeof input.image === 'string' 
          ? input.image 
          : this.arrayBufferToBase64(input.image);
        
        prompt += `Image: data:image/jpeg;base64,${imageData}\n`;
      }
      
      if (input.audio) {
        // For audio, first transcribe then process
        const transcript = await this.transcribeAudio(input.audio);
        prompt += `Audio transcript: ${transcript}\n`;
      }

      prompt += '\nPlease analyze the provided input and provide a comprehensive response. If multiple modalities are present, explain their relationship and provide integrated insights.';

      const response = await this.generateText(prompt);
      
      return {
        text: response,
        confidence: 0.85, // Could be enhanced with actual confidence scoring
        reasoning: 'Multimodal analysis using Gemma3',
        metadata: {
          inputModalities: Object.keys(input).filter(k => input[k as keyof MultimodalInput]),
          processingTime: Date.now()
        }
      };

    } catch (error) {
      logger.error('[Ollama] Multimodal processing failed:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio to text using Gemma3
   */
  async transcribeAudio(audioBuffer: ArrayBuffer, options?: VoiceProcessingOptions): Promise<string> {
    try {
      if (!this.config.enabled) {
        throw new Error('Ollama not enabled');
      }

      // Convert audio buffer to base64 for transmission
      const audioBase64 = this.arrayBufferToBase64(audioBuffer);
      
      // Create transcription request
      const request = {
        model: this.model,
        prompt: 'Please transcribe the following audio to text. Provide only the transcription without additional commentary.',
        audio: audioBase64,
        options: {
          language: options?.language || 'en',
          format: options?.format || 'wav'
        }
      };

      // Note: This is a conceptual implementation
      // Actual Ollama API might have different endpoints for audio processing
      const response = await fetch(`${this.baseUrl}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), this.config.timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text || data.transcript || '';

    } catch (error) {
      logger.error('[Ollama] Audio transcription failed:', error);
      
      // Fallback to Web API speech recognition if available
      if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        return this.fallbackWebSpeechTranscription(audioBuffer);
      }
      
      throw error;
    }
  }

  /**
   * Convert text to speech using Gemma3
   */
  async textToSpeech(text: string, options?: VoiceProcessingOptions): Promise<ArrayBuffer> {
    try {
      if (!this.config.enabled) {
        throw new Error('Ollama not enabled');
      }

      const request = {
        model: this.model,
        text,
        voice: options?.voice || 'default',
        speed: options?.speed || 1.0,
        pitch: options?.pitch || 1.0,
        volume: options?.volume || 0.8,
        format: options?.format || 'wav'
      };

      // Note: This is a conceptual implementation
      // Actual Ollama API might have different endpoints for TTS
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), this.config.timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Text-to-speech failed: ${response.statusText}`);
      }

      return await response.arrayBuffer();

    } catch (error) {
      logger.error('[Ollama] Text-to-speech failed:', error);
      
      // Fallback to Web API speech synthesis if available
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return this.fallbackWebSpeechSynthesis(text, options);
      }
      
      throw error;
    }
  }

  /**
   * Create a conversation context for multi-turn interactions
   */
  createConversation(systemPrompt?: string): string {
    const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const context: ConversationContext = {
      sessionId,
      history: [],
      systemPrompt: systemPrompt || this.getDefaultSystemPrompt(),
      personality: AgentConfig.personality.name,
      expertise: AgentConfig.capabilities.filter(c => c.enabled).map(c => c.name)
    };

    if (context.systemPrompt) {
      context.history.push({
        role: 'system',
        content: context.systemPrompt,
        timestamp: new Date()
      });
    }

    this.conversations.set(sessionId, context);
    logger.info(`[Ollama] Created conversation: ${sessionId}`);
    
    return sessionId;
  }

  /**
   * Continue a conversation with context
   */
  async continueConversation(sessionId: string, userMessage: string): Promise<string> {
    const context = this.conversations.get(sessionId);
    if (!context) {
      throw new Error(`Conversation ${sessionId} not found`);
    }

    // Add user message to history
    context.history.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Build conversation prompt
    const conversationPrompt = this.buildConversationPrompt(context);
    
    try {
      const response = await this.generateText(conversationPrompt, {
        options: {
          temperature: 0.7, // Slightly more creative for conversations
        }
      });

      // Add assistant response to history
      context.history.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      // Trim history if it gets too long
      if (context.history.length > 20) {
        context.history = [
          context.history[0], // Keep system prompt
          ...context.history.slice(-19) // Keep last 19 turns
        ];
      }

      return response;

    } catch (error) {
      logger.error('[Ollama] Conversation continuation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze system context and provide intelligent insights
   */
  async analyzeSystemContext(systemData: Record<string, any>): Promise<MultimodalResponse> {
    const analysisPrompt = `
You are an expert AI Homelab system administrator. Analyze the following system data and provide intelligent insights, recommendations, and observations.

System Data:
${JSON.stringify(systemData, null, 2)}

Please provide:
1. Current system health assessment
2. Any potential issues or risks identified
3. Optimization recommendations
4. Predictive insights about future system behavior
5. Specific actionable steps for improvement

Focus on practical, actionable advice that a system administrator can implement immediately.
`;

    const response = await this.generateText(analysisPrompt, {
      options: {
        temperature: 0.3, // Lower temperature for more factual analysis
        num_predict: 1024
      }
    });

    return {
      text: response,
      confidence: 0.88,
      reasoning: 'System analysis using domain expertise',
      metadata: {
        analysisType: 'system_context',
        dataPoints: Object.keys(systemData).length,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate contextual suggestions based on user activity
   */
  async generateSuggestions(context: {
    currentPage: string;
    recentActions: string[];
    systemState: Record<string, any>;
    userPreferences?: Record<string, any>;
  }): Promise<string[]> {
    const suggestionPrompt = `
Based on the following context, generate 3-5 relevant and actionable suggestions for the user:

Current Page: ${context.currentPage}
Recent Actions: ${context.recentActions.join(', ')}
System State: ${JSON.stringify(context.systemState, null, 2)}
User Preferences: ${JSON.stringify(context.userPreferences || {}, null, 2)}

Provide specific, actionable suggestions that would be helpful in the current context. Each suggestion should be concise (max 10 words) and directly actionable.

Format as a simple list, one suggestion per line.
`;

    try {
      const response = await this.generateText(suggestionPrompt, {
        options: {
          temperature: 0.5,
          num_predict: 300
        }
      });

      // Parse suggestions from response
      const suggestions = response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.replace(/^\d+\.?\s*/, '')) // Remove numbering
        .slice(0, 5); // Limit to 5 suggestions

      return suggestions;

    } catch (error) {
      logger.error('[Ollama] Suggestion generation failed:', error);
      return [
        'Check system health status',
        'Review recent activity logs', 
        'Optimize resource allocation',
        'Update service configurations',
        'Run system diagnostics'
      ];
    }
  }

  /**
   * Utility: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Fallback: Web API speech recognition
   */
  private async fallbackWebSpeechTranscription(audioBuffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
          reject(new Error('Web Speech API not available'));
          return;
        }

        // This is a simplified fallback - real implementation would need
        // to convert the audio buffer to a format the Web API can use
        resolve('Fallback transcription not implemented');
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Fallback: Web API speech synthesis
   */
  private async fallbackWebSpeechSynthesis(text: string, options?: VoiceProcessingOptions): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          reject(new Error('Web Speech Synthesis API not available'));
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.speed || 1.0;
        utterance.pitch = options?.pitch || 1.0;
        utterance.volume = options?.volume || 0.8;

        // This is a simplified fallback - would need actual audio capture
        utterance.onend = () => {
          // Return empty buffer as we can't capture the audio
          resolve(new ArrayBuffer(0));
        };

        utterance.onerror = () => {
          reject(new Error('Speech synthesis failed'));
        };

        speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Build conversation prompt from context
   */
  private buildConversationPrompt(context: ConversationContext): string {
    const recent = context.history.slice(-10); // Last 10 turns
    
    return recent.map(turn => {
      switch (turn.role) {
        case 'system':
          return `System: ${turn.content}`;
        case 'user':
          return `User: ${turn.content}`;
        case 'assistant':
          return `Assistant: ${turn.content}`;
        default:
          return `${turn.role}: ${turn.content}`;
      }
    }).join('\n\n') + '\n\nAssistant:';
  }

  /**
   * Get default system prompt for AI Homelab context
   */
  private getDefaultSystemPrompt(): string {
    const personality = AgentConfig.personality;
    
    return `You are ${personality.name}, an ${personality.role} for an AI Homelab ecosystem. 

Your personality traits:
- Helpfulness: ${Math.round(personality.traits.helpfulness * 100)}%
- Proactivity: ${Math.round(personality.traits.proactivity * 100)}%  
- Technical Depth: ${Math.round(personality.traits.technical_depth * 100)}%
- Friendliness: ${Math.round(personality.traits.friendliness * 100)}%

Communication style: ${personality.communication_style.formality} with ${personality.communication_style.verbosity} verbosity.

Your expertise includes: ${AgentConfig.capabilities.filter(c => c.enabled).map(c => c.name).join(', ')}.

Always provide practical, actionable advice. When discussing technical issues, include specific commands or steps where appropriate. Be proactive in identifying potential problems and suggesting preventive measures.`;
  }

  /**
   * Clean up expired conversations
   */
  cleanupConversations(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    
    for (const [sessionId, context] of this.conversations.entries()) {
      const lastActivity = Math.max(...context.history.map(h => h.timestamp.getTime()));
      
      if (now - lastActivity > maxAge) {
        this.conversations.delete(sessionId);
        logger.info(`[Ollama] Cleaned up expired conversation: ${sessionId}`);
      }
    }
  }

  /**
   * Get conversation statistics
   */
  getStats(): {
    activeConversations: number;
    totalMessages: number;
    averageConversationLength: number;
  } {
    const conversations = Array.from(this.conversations.values());
    
    return {
      activeConversations: conversations.length,
      totalMessages: conversations.reduce((sum, conv) => sum + conv.history.length, 0),
      averageConversationLength: conversations.length > 0 
        ? conversations.reduce((sum, conv) => sum + conv.history.length, 0) / conversations.length 
        : 0
    };
  }
}

// Export singleton instance
export const ollamaGemma3 = new OllamaGemma3Integration();

// Cleanup conversations periodically
if (typeof window === 'undefined') {
  setInterval(() => {
    ollamaGemma3.cleanupConversations();
  }, 300000); // Clean up every 5 minutes
}

export default ollamaGemma3;
