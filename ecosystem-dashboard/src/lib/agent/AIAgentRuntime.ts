/**
 * AI Agent Runtime
 * 
 * Central orchestrator for all AI agent capabilities including Google ADK,
 * AIHDS Client SDK, and Ollama Gemma3 integration. Provides unified interface
 * for intelligent system management, proactive monitoring, and user interaction.
 */

import { AgentConfig, validateAgentConfig } from '@/config/agent-config';
import { googleADK } from '../integrations/google-adk';
import { aihdsClient } from '../integrations/aihds-client';
import { ollamaGemma3 } from '../integrations/ollama-gemma3';
import KubernetesInfrastructurePlugin from './plugins/KubernetesInfrastructurePlugin';
import { agentRegistrationService } from './AgentRegistrationService';
import logger from '../logger';

// Temporarily disable integrations for debugging
const integrations = {};

// Agent Runtime Types
export interface AgentCapabilities {
  naturalLanguageProcessing: boolean;
  speechRecognition: boolean;
  speechSynthesis: boolean;
  systemMonitoring: boolean;
  serviceManagement: boolean;
  proactiveInsights: boolean;
  multimodalAnalysis: boolean;
  conversationalAI: boolean;
  kubernetesManagement: boolean;
  intelligentInfrastructure: boolean;
}

export interface AgentRequest {
  id: string;
  type: 'query' | 'command' | 'voice' | 'multimodal' | 'proactive';
  content: string | ArrayBuffer | Record<string, any>;
  context?: AgentContext;
  sessionId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
}

export interface AgentResponse {
  id: string;
  requestId: string;
  type: 'text' | 'voice' | 'action' | 'visualization' | 'error';
  content: string | ArrayBuffer | Record<string, any>;
  confidence: number;
  reasoning?: string;
  actions?: AgentAction[];
  followUp?: string[];
  metadata?: Record<string, any>;
  executionTime: number;
  timestamp: Date;
}

export interface AgentAction {
  id: string;
  type: 'service_action' | 'navigation' | 'notification' | 'automation';
  title: string;
  description: string;
  payload: Record<string, any>;
  confidence: number;
  estimatedImpact?: {
    performance?: number;
    reliability?: number;
    security?: number;
    cost?: number;
  };
  requiresConfirmation: boolean;
  autoExecutable: boolean;
}

export interface AgentContext {
  userId?: string;
  sessionId?: string;
  currentPage: string;
  systemState: Record<string, any>;
  recentActions: string[];
  userPreferences: Record<string, any>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
}

export interface AgentMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  averageConfidence: number;
  capabilityUsage: Record<string, number>;
  errorRate: number;
  userSatisfaction?: number;
}

export interface ProactiveInsightConfig {
  enabled: boolean;
  intervalMs: number;
  thresholds: Record<string, number>;
  autoActions: boolean;
  notificationLevel: 'all' | 'important' | 'critical';
}

export class AIAgentRuntime {
  private config = AgentConfig;
  private capabilities: AgentCapabilities;
  private metrics: AgentMetrics;
  private activeRequests = new Map<string, AgentRequest>();
  private proactiveInsights: ProactiveInsightConfig;
  private kubernetesPlugin: KubernetesInfrastructurePlugin;
  private isInitialized = false;

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.metrics = this.initializeMetrics();
    this.kubernetesPlugin = new KubernetesInfrastructurePlugin();
    this.proactiveInsights = {
      enabled: this.config.proactive.enabled,
      intervalMs: this.config.proactive.scan_interval,
      thresholds: this.config.monitoring.system_health,
      autoActions: this.config.proactive.auto_resolution_enabled,
      notificationLevel: 'important'
    };
  }

  /**
   * Initialize the AI Agent Runtime
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('AI Agent Runtime already initialized');
      return;
    }
    console.log('Initializing AI Agent Runtime...');
    this.isInitialized = true;
    try {
      logger.info('[AIAgent] Initializing AI Agent Runtime...');

      // Validate configuration
      const configErrors = validateAgentConfig(this.config);
      if (configErrors.length > 0) {
        logger.warn('[AIAgent] Configuration issues found:', configErrors);
      }

      // Initialize integrations based on configuration
      const initPromises: Promise<void>[] = [];

      if (this.config.google_adk.enabled) {
        logger.info('[AIAgent] Initializing Google ADK integration...');
        // Note: googleADK.initialize() would be called here when ADK is available
      }

      if (this.config.aihds.enabled) {
        logger.info('[AIAgent] Testing AIHDS connection...');
        const aihdsTest = await aihdsClient.testConnection();
        if (aihdsTest.success) {
          logger.info('[AIAgent] AIHDS connection successful');
        } else {
          logger.warn('[AIAgent] AIHDS connection issues:', aihdsTest.services);
        }
      }

      if (this.config.ollama.enabled) {
        logger.info('[AIAgent] Initializing Ollama Gemma3 integration...');
        initPromises.push(ollamaGemma3.initialize());
      }

      // Initialize Kubernetes Infrastructure Plugin
      logger.info('[AIAgent] Initializing Kubernetes Infrastructure Plugin...');
      const initPromise: Promise<void> = this.kubernetesPlugin.initialize().then(() => {
        return;
      });
      initPromises.push(initPromise);

      // Initialize Agent Registration Service
      logger.info('[AIAgent] Initializing Agent Registration Service...');
      initPromises.push(agentRegistrationService.initialize());

      // Wait for all integrations to initialize
      await Promise.allSettled(initPromises);

      // Update capabilities after initialization
      this.capabilities = this.detectCapabilities();

      // Start proactive monitoring if enabled
      if (this.proactiveInsights.enabled) {
        this.startProactiveMonitoring();
      }

      logger.info('[AIAgent] AI Agent Runtime initialized successfully');
      logger.info('[AIAgent] Available capabilities:', this.capabilities);

    } catch (error) {
      logger.error('[AIAgent] Failed to initialize AI Agent Runtime:', error);
      throw error;
    }
  }

  /**
   * Process an agent request
   */
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      if (!this.isInitialized) {
        throw new Error('AI Agent Runtime not initialized');
      }

      logger.info(`[AIAgent] Processing ${request.type} request: ${request.id}`);
      this.activeRequests.set(request.id, request);

      // Check if this is a Kubernetes-related request
      if (this.isKubernetesRequest(request)) {
        logger.info(`[AIAgent] Routing to Kubernetes Infrastructure Plugin`);
        const response = await this.kubernetesPlugin.processRequest(request);
        this.updateMetrics(request, response);
        this.activeRequests.delete(request.id);
        return response;
      }

      let response: AgentResponse;

      switch (request.type) {
        case 'query':
          response = await this.processQuery(request);
          break;
        case 'command':
          response = await this.processCommand(request);
          break;
        case 'voice':
          response = await this.processVoice(request);
          break;
        case 'multimodal':
          response = await this.processMultimodal(request);
          break;
        case 'proactive':
          response = await this.processProactiveInsight(request);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.type}`);
      }

      // Enhance response with metadata
      response.executionTime = Date.now() - startTime;
      response.timestamp = new Date();

      // Update metrics
      this.updateMetrics(request, response);

      logger.info(`[AIAgent] Request ${request.id} processed successfully in ${response.executionTime}ms`);
      return response;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[AIAgent] Request ${request.id} failed:`, error);

      // Return error response
      const errorResponse: AgentResponse = {
        id: responseId,
        requestId: request.id,
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
        confidence: 0,
        executionTime,
        timestamp: new Date()
      };

      this.updateMetrics(request, errorResponse);
      return errorResponse;

    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  /**
   * Process natural language query
   */
  private async processQuery(request: AgentRequest): Promise<AgentResponse> {
    const query = request.content as string;
    let response: AgentResponse;

    // Try Google ADK first if available
    if (this.capabilities.naturalLanguageProcessing && this.config.google_adk.enabled) {
      try {
        const sessionId = request.sessionId || await googleADK.createSession(
          request.context?.userId || 'anonymous',
          request.context
        );

        const adkResponse = await googleADK.processMessage({
          sessionId,
          message: query,
          context: request.context
        });

        response = {
          id: `resp_${Date.now()}`,
          requestId: request.id,
          type: 'text',
          content: adkResponse.message,
          confidence: adkResponse.confidence,
          reasoning: `Processed by Google ADK with intent: ${adkResponse.intent}`,
          actions: adkResponse.actions?.map(action => ({
            id: `action_${Date.now()}`,
            type: this.mapActionType(action.type),
            title: action.description,
            description: action.description,
            payload: action.payload,
            confidence: action.confidence,
            requiresConfirmation: action.type === 'service_action',
            autoExecutable: action.confidence > 0.8
          })),
          followUp: adkResponse.followUpQuestions,
          executionTime: 0,
          timestamp: new Date()
        };

      } catch (error) {
        logger.warn('[AIAgent] Google ADK processing failed, falling back to Ollama');
        response = await this.processWithOllama(query, request.context);
      }
    } else {
      // Fallback to Ollama or AIHDS
      response = await this.processWithOllama(query, request.context);
    }

    return response;
  }

  /**
   * Process command execution
   */
  private async processCommand(request: AgentRequest): Promise<AgentResponse> {
    const command = request.content as string;
    
    // Parse command and execute through AIHDS
    if (this.capabilities.serviceManagement && this.config.aihds.enabled) {
      try {
        // Example command parsing
        const actions = this.parseCommand(command);
        const results = [];

        for (const action of actions) {
          const result = await aihdsClient.executeServiceAction(action);
          results.push(result);
        }

        return {
          id: `resp_${Date.now()}`,
          requestId: request.id,
          type: 'action',
          content: `Executed ${results.length} action(s) successfully`,
          confidence: 0.9,
          reasoning: 'Commands executed through AIHDS',
          metadata: { results },
          executionTime: 0,
          timestamp: new Date()
        };

      } catch (error) {
        throw new Error(`Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('Service management capability not available');
    }
  }

  /**
   * Process voice input
   */
  private async processVoice(request: AgentRequest): Promise<AgentResponse> {
    if (!this.capabilities.speechRecognition) {
      throw new Error('Speech recognition not available');
    }

    const audioBuffer = request.content as ArrayBuffer;
    
    try {
      // Transcribe audio using Ollama
      const transcript = await ollamaGemma3.transcribeAudio(audioBuffer);
      
      // Process the transcript as a query
      const textRequest: AgentRequest = {
        ...request,
        type: 'query',
        content: transcript
      };
      
      const textResponse = await this.processQuery(textRequest);

      // Generate voice response if speech synthesis is available
      if (this.capabilities.speechSynthesis) {
        try {
          const audioResponse = await ollamaGemma3.textToSpeech(textResponse.content as string);
          
          return {
            ...textResponse,
            type: 'voice',
            content: audioResponse,
            metadata: {
              ...textResponse.metadata,
              transcript,
              originalAudioSize: audioBuffer.byteLength
            }
          };
        } catch (ttsError) {
          logger.warn('[AIAgent] Text-to-speech failed, returning text response:', ttsError);
          return textResponse;
        }
      }

      return textResponse;

    } catch (error) {
      throw new Error(`Voice processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multimodal input
   */
  private async processMultimodal(request: AgentRequest): Promise<AgentResponse> {
    if (!this.capabilities.multimodalAnalysis) {
      throw new Error('Multimodal analysis not available');
    }

    const multimodalInput = request.content as Record<string, any>;
    
    try {
      const response = await ollamaGemma3.processMultimodal(multimodalInput);
      
      return {
        id: `resp_${Date.now()}`,
        requestId: request.id,
        type: 'text',
        content: response.text,
        confidence: response.confidence,
        reasoning: response.reasoning,
        metadata: response.metadata,
        executionTime: 0,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Multimodal processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process proactive insight generation
   */
  private async processProactiveInsight(request: AgentRequest): Promise<AgentResponse> {
    try {
      const systemData = request.content as Record<string, any>;
      
      // Get insights from AIHDS if available
      let insights = [];
      if (this.config.aihds.enabled) {
        insights = await aihdsClient.getProactiveInsights();
      }

      // Enhance with Ollama analysis if available
      if (this.config.ollama.enabled) {
        const ollamaAnalysis = await ollamaGemma3.analyzeSystemContext(systemData);
        insights.push({
          id: `ollama_${Date.now()}`,
          type: 'analysis',
          priority: 'medium',
          title: 'AI System Analysis',
          description: ollamaAnalysis.text,
          confidence: ollamaAnalysis.confidence,
          evidence: ['AI-powered system analysis'],
          suggestedActions: []
        });
      }

      return {
        id: `resp_${Date.now()}`,
        requestId: request.id,
        type: 'text',
        content: JSON.stringify(insights, null, 2),
        confidence: 0.85,
        reasoning: 'Proactive insights generated from system analysis',
        metadata: { insightCount: insights.length },
        executionTime: 0,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Proactive insight generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process query with Ollama fallback
   */
  private async processWithOllama(query: string, context?: AgentContext): Promise<AgentResponse> {
    if (!this.config.ollama.enabled) {
      throw new Error('No available AI processing capabilities');
    }

    try {
      let response: string;

      if (context?.sessionId) {
        response = await ollamaGemma3.continueConversation(context.sessionId, query);
      } else {
        // Create new conversation
        const sessionId = ollamaGemma3.createConversation();
        response = await ollamaGemma3.continueConversation(sessionId, query);
      }

      return {
        id: `resp_${Date.now()}`,
        requestId: `req_${Date.now()}`,
        type: 'text',
        content: response,
        confidence: 0.8,
        reasoning: 'Processed by Ollama Gemma3',
        executionTime: 0,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Ollama processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse command string into service actions
   */
  private parseCommand(command: string): any[] {
    const actions = [];
    const lowerCommand = command.toLowerCase();

    if (lowerCommand.includes('restart')) {
      if (lowerCommand.includes('all') || lowerCommand.includes('failed')) {
        actions.push({
          serviceId: '*',
          action: 'restart',
          parameters: { filter: 'failed' }
        });
      } else {
        // Extract service name (simplified parsing)
        const words = command.split(' ');
        const serviceIndex = words.findIndex(w => w.toLowerCase() === 'restart') + 1;
        if (serviceIndex < words.length) {
          actions.push({
            serviceId: words[serviceIndex],
            action: 'restart'
          });
        }
      }
    }

    // Add more command parsing logic as needed

    return actions;
  }

  /**
   * Check if a request is Kubernetes-related
   */
  private isKubernetesRequest(request: AgentRequest): boolean {
    const content = typeof request.content === 'string' ? request.content.toLowerCase() : '';
    
    // Kubernetes-related keywords
    const k8sKeywords = [
      'kubernetes', 'k8s', 'cluster', 'pod', 'deployment', 'service',
      'namespace', 'scale', 'kubectl', 'helm', 'ingress', 'configmap',
      'secret', 'volume', 'node', 'container', 'docker', 'minikube',
      'kind', 'eks', 'gke', 'aks', 'openshift'
    ];
    
    // Infrastructure-related keywords
    const infraKeywords = [
      'infrastructure', 'infra', 'resource', 'optimize', 'cost',
      'efficiency', 'performance', 'monitoring', 'metrics', 'health'
    ];
    
    // Check if content contains Kubernetes or infrastructure keywords
    const hasK8sKeywords = k8sKeywords.some(keyword => content.includes(keyword));
    const hasInfraKeywords = infraKeywords.some(keyword => content.includes(keyword));
    
    // Also check context for Kubernetes-related information
    const contextHasK8s = request.context?.currentPage?.includes('kubernetes') ||
                         request.context?.currentPage?.includes('infrastructure') ||
                         request.context?.systemState?.kubernetesContext;
    
    return hasK8sKeywords || (hasInfraKeywords && contextHasK8s);
  }

  /**
   * Map external action types to AgentAction types
   */
  private mapActionType(externalType: string): 'service_action' | 'navigation' | 'notification' | 'automation' {
    switch (externalType) {
      case 'service_action':
        return 'service_action';
      case 'navigation':
        return 'navigation';
      case 'notification':
        return 'notification';
      case 'automation':
        return 'automation';
      case 'information':
      case 'confirmation':
        return 'notification'; // Map information/confirmation to notification
      default:
        return 'automation'; // Default fallback
    }
  }

  /**
   * Detect available capabilities
   */
  private detectCapabilities(): AgentCapabilities {
    return {
      naturalLanguageProcessing: this.config.google_adk.enabled || this.config.ollama.enabled,
      speechRecognition: this.config.ollama.enabled || (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window),
      speechSynthesis: this.config.ollama.enabled || (typeof window !== 'undefined' && 'speechSynthesis' in window),
      systemMonitoring: this.config.aihds.enabled,
      serviceManagement: this.config.aihds.enabled,
      proactiveInsights: this.config.aihds.enabled || this.config.ollama.enabled,
      multimodalAnalysis: this.config.ollama.enabled,
      conversationalAI: this.config.google_adk.enabled || this.config.ollama.enabled,
      kubernetesManagement: true, // Always available
      intelligentInfrastructure: true // Always available
    };
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): AgentMetrics {
    return {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      averageConfidence: 0,
      capabilityUsage: {},
      errorRate: 0
    };
  }

  /**
   * Update metrics after request processing
   */
  private updateMetrics(request: AgentRequest, response: AgentResponse): void {
    this.metrics.totalRequests++;
    
    const isSuccess = response.type !== 'error';
    const successCount = Math.round(this.metrics.successRate * (this.metrics.totalRequests - 1)) + (isSuccess ? 1 : 0);
    this.metrics.successRate = successCount / this.metrics.totalRequests;

    this.metrics.errorRate = 1 - this.metrics.successRate;

    // Update average response time
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + response.executionTime;
    this.metrics.averageResponseTime = totalTime / this.metrics.totalRequests;

    // Update average confidence (only for successful responses)
    if (isSuccess && response.confidence > 0) {
      const confidenceCount = Math.round(this.metrics.averageConfidence * Math.max(1, this.metrics.totalRequests - 1));
      this.metrics.averageConfidence = (confidenceCount + response.confidence) / this.metrics.totalRequests;
    }

    // Update capability usage
    this.metrics.capabilityUsage[request.type] = (this.metrics.capabilityUsage[request.type] || 0) + 1;
  }

  /**
   * Start proactive monitoring
   */
  private startProactiveMonitoring(): void {
    if (typeof window !== 'undefined') return; // Only run on server side

    setInterval(async () => {
      try {
        if (this.config.aihds.enabled) {
          const systemOverview = await aihdsClient.getSystemOverview();
          
          // Check if proactive action is needed
          if (systemOverview.overallHealth < this.proactiveInsights.thresholds.warning) {
            const request: AgentRequest = {
              id: `proactive_${Date.now()}`,
              type: 'proactive',
              content: systemOverview,
              priority: systemOverview.overallHealth < this.proactiveInsights.thresholds.critical ? 'critical' : 'medium'
            };

            await this.processRequest(request);
          }
        }
      } catch (error) {
        logger.error('[AIAgent] Proactive monitoring failed:', error);
      }
    }, this.proactiveInsights.intervalMs);

    logger.info('[AIAgent] Proactive monitoring started');
  }

  /**
   * Get current agent status
   */
  getStatus(): {
    initialized: boolean;
    capabilities: AgentCapabilities;
    metrics: AgentMetrics;
    activeRequests: number;
    configuration: typeof AgentConfig;
    registration: {
      isRegistered: boolean;
      agentId: string;
      registryUrl: string;
      heartbeatActive: boolean;
    };
  } {
    const registrationInfo = agentRegistrationService.getRegistrationInfo();
    
    return {
      initialized: this.isInitialized,
      capabilities: this.capabilities,
      metrics: this.metrics,
      activeRequests: this.activeRequests.size,
      configuration: this.config,
      registration: {
        isRegistered: registrationInfo.isRegistered,
        agentId: registrationInfo.agentId,
        registryUrl: registrationInfo.registryUrl,
        heartbeatActive: registrationInfo.heartbeatActive
      }
    };
  }

  /**
   * Get health check information
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    capabilities: AgentCapabilities;
    lastError?: string;
  }> {
    const services: Record<string, boolean> = {};

    // Check Google ADK
    if (this.config.google_adk.enabled) {
      const adkTest = await googleADK.testConnection();
      services['google-adk'] = adkTest.success;
    }

    // Check AIHDS
    if (this.config.aihds.enabled) {
      const aihdsTest = await aihdsClient.testConnection();
      services['aihds'] = aihdsTest.success;
    }

    // Check Ollama
    if (this.config.ollama.enabled) {
      services['ollama'] = await ollamaGemma3.isAvailable();
    }

    // Check Kubernetes Infrastructure Plugin
    try {
      const k8sHealth = await this.kubernetesPlugin.getHealthCheck();
      services['kubernetes-infrastructure'] = k8sHealth.status !== 'unhealthy';
    } catch (error) {
      services['kubernetes-infrastructure'] = false;
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      capabilities: this.capabilities
    };
  }
}

// Export singleton instance
export const aiAgentRuntime = new AIAgentRuntime();
export default aiAgentRuntime;
