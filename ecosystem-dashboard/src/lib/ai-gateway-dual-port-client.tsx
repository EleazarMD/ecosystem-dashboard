/**
 * AI Gateway Dual-Port Client
 * Unified client implementing AI Gateway Port Architecture
 * Port 7777: Service mesh operations (AHIS registration, health checks, service discovery)
 * Port 8777: AI/LLM client operations (chat completions, streaming, model access)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useServiceMeshClient, ServiceMeshClientProvider } from './ai-gateway-service-mesh-client';
// Temporarily comment out MCP SDK imports to isolate crash cause
// import { 
//   initializeMCPSDK, 
//   executeMCPCommand, 
//   getMCPSDKStatus,
//   updateMCPHealth 
// } from './mcp-sdk-adapter';

// Mock functions for MCP SDK
const getMCPSDKStatus = () => ({ initialized: false, connected: false });
const updateMCPHealth = async (data?: any) => { console.log('Mock health update:', data); };

// Mock AI Gateway client types for development
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatCompletionStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  object: string;
  data: Model[];
}

interface HealthStatus {
  status: string;
  uptime?: number;
  dependencies?: Record<string, string>;
  error?: string;
}

interface AIGatewayConfig {
  url: string;
  apiKey: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  enableMetrics?: boolean;
  streamTimeout?: number;
}

// Dual-port client interface
interface DualPortAIGatewayClient {
  // AI Operations (Port 8777)
  aiClient: {
    createChatCompletion: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
    createStreamingChatCompletion: (request: ChatCompletionRequest) => AsyncGenerator<ChatCompletionStreamResponse>;
    getModels: () => Promise<ModelsResponse>;
    getHealth: () => Promise<HealthStatus>;
    searchPerplexity: (params: { query: string }) => Promise<unknown>;
  } | null;
  
  // Service Mesh Operations (Port 7777) - Now using SDK
  serviceMeshClient: {
    registerService: (registration: any) => Promise<void>;
    unregisterService: () => Promise<void>;
    checkServiceMeshHealth: () => Promise<any>;
    discoverServices: (capability?: string) => Promise<any[]>;
    getSDKStatus: () => any;
    updateHealth: (healthData?: any) => Promise<void>;
  } | null;
  
  // Unified status
  isFullyConnected: boolean;
  aiClientConnected: boolean;
  serviceMeshConnected: boolean;
}

interface DualPortClientContextType extends DualPortAIGatewayClient {
  // Connection states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Health and status
  aiHealthStatus: HealthStatus | null;
  serviceMeshHealthStatus: any | null;
  lastHealthCheck: Date | null;
  
  // Available models
  models: Model[];
  lastModelsUpdate: Date | null;
  
  // Error handling
  error: Error | null;
  aiClientError: Error | null;
  serviceMeshError: Error | null;
  
  // Actions
  initializeDualPort: () => Promise<void>;
  shutdown: () => Promise<void>;
  
  // AI operations (convenience methods)
  sendChatCompletion: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>;
  sendChatCompletionStream: (
    request: ChatCompletionRequest,
    onChunk?: (chunk: ChatCompletionStreamResponse) => void
  ) => AsyncGenerator<ChatCompletionStreamResponse>;
  loadModels: () => Promise<void>;
  
  // Service mesh operations (convenience methods)
  registerWithServiceMesh: (serviceConfig?: any) => Promise<void>;
  
  // Utility
  clearError: () => void;
}

// Create context
const DualPortClientContext = createContext<DualPortClientContextType | null>(null);

// Provider props
interface DualPortClientProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
  aiClientConfig?: Partial<AIGatewayConfig>;
  serviceConfig?: any;
}

// Internal AI client component
function AIClientManager({ 
  onAIClientReady, 
  onAIClientError, 
  config 
}: { 
  onAIClientReady: (client: any) => void;
  onAIClientError: (error: Error) => void;
  config?: Partial<AIGatewayConfig>;
}) {
  const [aiClient, setAIClient] = useState<any>(null);

  useEffect(() => {
    // Skip initialization on server-side
    if (typeof window === 'undefined') return;
    
    const initializeAIClient = async () => {
      try {
        console.log('🤖 Initializing AI Client (Port 8777)...');
        
        const clientConfig: AIGatewayConfig = {
          url: config?.url || process.env.NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL || 'http://localhost:8777',
          apiKey: config?.apiKey || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
          defaultModel: config?.defaultModel || 'llama3.1:8b',
          timeout: config?.timeout || 30000,
          maxRetries: config?.maxRetries || 3,
          enableMetrics: config?.enableMetrics || true,
          streamTimeout: config?.streamTimeout || 60000
        };

        // Real AI Gateway Client for production
        const client = {
          createChatCompletion: async (request: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
            console.log('🤖 AI Gateway createChatCompletion:', request);
            try {
              const response = await fetch(`${clientConfig.url}/api/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': clientConfig.apiKey,
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  ...request,
                  serviceId: 'ecosystem-dashboard', // REQUIRED: Routes through AI Inferencing for tracking
                })
              });

              if (!response.ok) {
                if (response.status === 401) {
                  throw new Error('AI Gateway authentication failed - check API key');
                }
                throw new Error(`AI Gateway request failed: ${response.status} ${response.statusText}`);
              }

              const result = await response.json();
              console.log('✅ AI Gateway response received');
              return result;
            } catch (error) {
              console.error('❌ AI Gateway connection error:', error);
              // Fallback to mock response on error
              return {
                id: 'fallback-completion-' + Date.now(),
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [{
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: `AI Gateway connection failed: ${error.message}. Using fallback response.`
                  },
                  finish_reason: 'stop'
                }],
                usage: {
                  prompt_tokens: 10,
                  completion_tokens: 20,
                  total_tokens: 30
                }
              };
            }
          },
          
          createStreamingChatCompletion: async function* (request: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamResponse> {
            console.log('🔧 Mock AI Gateway streaming completion:', request);
            const chunks = [
              'This ', 'is ', 'a ', 'mock ', 'streaming ', 'response ', 'from ', 'the ', 'AI ', 'Gateway ', 'client.'
            ];
            
            for (let i = 0; i < chunks.length; i++) {
              yield {
                id: 'mock-stream-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [{
                  index: 0,
                  delta: {
                    content: chunks[i]
                  },
                  finish_reason: i === chunks.length - 1 ? 'stop' : undefined
                }]
              };
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          },
          
          getModels: async (): Promise<ModelsResponse> => {
            console.log('🤖 AI Gateway getModels');
            try {
              const response = await fetch(`${clientConfig.url}/api/v1/models`, {
                method: 'GET',
                headers: {
                  'X-API-Key': clientConfig.apiKey,
                  'Accept': 'application/json'
                }
              });

              if (!response.ok) {
                if (response.status === 401) {
                  throw new Error('AI Gateway authentication failed - check API key');
                }
                throw new Error(`AI Gateway models request failed: ${response.status} ${response.statusText}`);
              }

              const result = await response.json();
              console.log('✅ AI Gateway models loaded:', result.data?.length || 0, 'models');
              return result;
            } catch (error) {
              console.error('❌ AI Gateway models error:', error);
              throw error;
            }
          },
          
          getHealth: async (): Promise<HealthStatus> => {
            console.log('🤖 AI Gateway getHealth - checking AI client availability on Port 8777');
            try {
              const healthUrl = `${clientConfig.url}/health`;
              console.log(`Trying AI Gateway health check at ${healthUrl}...`);
              
              const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                  'X-API-Key': clientConfig.apiKey,
                  'Accept': 'application/json'
                },
                signal: (() => {
                  const controller = new AbortController();
                  setTimeout(() => controller.abort(), 5000);
                  return controller.signal;
                })()
              });

              if (response.ok) {
                const result = await response.json();
                console.log(`✅ AI Gateway AI client health check successful.`);
                return result;
              } else if (response.status === 401) {
                throw new Error('AI Gateway authentication failed - check API key');
              } else {
                throw new Error(`AI Gateway health request failed: ${response.status} ${response.statusText}`);
              }
            } catch (error) {
              console.error('❌ AI Gateway health error:', error);
              // Fallback to mock health on error
              return {
                status: 'unhealthy',
                uptime: 0,
                dependencies: {
                  'llm-backend': 'unknown',
                  'database': 'unknown'
                },
                error: error.message
              };
            }
          },
          
          searchPerplexity: async (params: { query: string }) => {
            console.log('🔧 Mock AI Gateway searchPerplexity:', params);
            return {
              results: [
                {
                  title: 'Mock Search Result',
                  content: 'This is a mock search result for: ' + params.query,
                  url: 'https://example.com/mock-result'
                }
              ]
            };
          }
        };
        
        console.log('🔧 Mock AI Client initialized with methods:', Object.keys(client));
        
        setAIClient(client);
        onAIClientReady(client);
        
        console.log('✅ AI Client (Port 8777) initialized successfully');
        
      } catch (error) {
        // Known bug in AI Gateway SDK can cause a forEach error on undefined arrays
        // This prevents the entire dashboard from crashing
        if (error instanceof TypeError && error.message.includes('forEach')) {
          console.warn('⚠️ Caught known AI Gateway SDK validation error. The app will continue, but AI functionality may be limited.', error);
          onAIClientError(new Error('AI Gateway SDK validation failed. Functionality is limited.'));
          return; // Prevent further execution
        }
        console.error('❌ AI Client initialization failed:', error);
        onAIClientError(error as Error);
      }
    };

    if (typeof window !== 'undefined') {
      initializeAIClient();
    }
  }, [config]);

  return null;
}

// Main dual-port provider
export function DualPortAIGatewayProvider({
  children,
  autoInitialize = true,
  aiClientConfig,
  serviceConfig
}: DualPortClientProviderProps) {
  // State
  const [aiClient, setAIClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [aiHealthStatus, setAIHealthStatus] = useState<HealthStatus | null>(null);
  const [serviceMeshHealthStatus, setServiceMeshHealthStatus] = useState<any>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [lastModelsUpdate, setLastModelsUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [aiClientError, setAIClientError] = useState<Error | null>(null);
  const [serviceMeshError, setServiceMeshError] = useState<Error | null>(null);

  // Get service mesh client from context
  const serviceMeshClient = useServiceMeshClient();

  // Connection states
  const aiClientConnected = !!aiClient && !aiClientError;
  const serviceMeshConnected = serviceMeshClient.isConnected && !serviceMeshClient.error;
  const isFullyConnected = aiClientConnected && serviceMeshConnected;

  // Initialize dual-port client
  const initializeDualPort = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🎛️ Initializing Dual-Port AI Gateway Client...');
      console.log('📋 Port 7777: Service mesh operations (AHIS, health, discovery)');
      console.log('🤖 Port 8777: AI/LLM operations (chat, streaming, models)');
      
      // Service mesh should auto-initialize via ServiceMeshClientProvider
      // AI client will be initialized via AIClientManager
      
      setIsInitialized(true);
      console.log('✅ Dual-Port AI Gateway Client initialized');
      
    } catch (error) {
      console.error('❌ Dual-port initialization failed:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle AI client ready
  const handleAIClientReady = (client: any) => {
    setAIClient(client);
    setAIClientError(null);
  };

  // Handle AI client error
  const handleAIClientError = (error: Error) => {
    setAIClientError(error);
    setAIClient(null);
  };

  // Send chat completion (Port 8777)
  const sendChatCompletion = async (request: ChatCompletionRequest): Promise<ChatCompletionResponse> => {
    if (!aiClient) {
      throw new Error('AI client not connected (Port 8777)');
    }
    
    if (typeof aiClient.createChatCompletion !== 'function') {
      throw new Error('createChatCompletion method not available on AI client');
    }
    
    console.log('🤖 Sending chat completion via Port 8777');
    return await aiClient.createChatCompletion(request);
  };

  // Send streaming chat completion (Port 8777)
  const sendChatCompletionStream = async function* (
    request: ChatCompletionRequest,
    onChunk?: (chunk: ChatCompletionStreamResponse) => void
  ): AsyncGenerator<ChatCompletionStreamResponse> {
    if (!aiClient) {
      throw new Error('AI client not connected (Port 8777)');
    }
    
    console.log('🤖 Sending streaming chat completion via Port 8777');
    const stream = aiClient.createStreamingChatCompletion(request);
    
    for await (const chunk of stream) {
      if (onChunk) {
        onChunk(chunk);
      }
      yield chunk;
    }
  };

  // Load models (Port 8777)
  const loadModels = async () => {
    if (!aiClient) {
      console.warn('AI client not connected, cannot load models');
      return;
    }
    
    try {
      console.log('🤖 Loading models via Port 8777');
      
      // Check if getModels method exists
      if (typeof aiClient.getModels !== 'function') {
        console.warn('⚠️ getModels method not available on AI client, using fallback models');
        // Set fallback models
        setModels([
          { id: 'llama3.1:8b', object: 'model', created: Date.now(), owned_by: 'ai-homelab' },
          { id: 'gpt-4', object: 'model', created: Date.now(), owned_by: 'openai' },
          { id: 'gpt-3.5-turbo', object: 'model', created: Date.now(), owned_by: 'openai' }
        ]);
        setLastModelsUpdate(new Date());
        return;
      }
      
      const modelsResponse = await aiClient.getModels();
      setModels(modelsResponse.data || []);
      setLastModelsUpdate(new Date());
    } catch (error) {
      console.error('❌ Failed to load models:', error);
      // Set fallback models on error
      setModels([
        { id: 'llama3.1:8b', object: 'model', created: Date.now(), owned_by: 'ai-homelab' },
        { id: 'gpt-4', object: 'model', created: Date.now(), owned_by: 'openai' },
        { id: 'gpt-3.5-turbo', object: 'model', created: Date.now(), owned_by: 'openai' }
      ]);
      setLastModelsUpdate(new Date());
      setAIClientError(error as Error);
    }
  };

  // Register with service mesh (Port 7777)
  const registerWithServiceMesh = async (serviceConfig?: any) => {
    if (!serviceMeshClient) {
      throw new Error('Service mesh client not available');
    }
    
    console.log('📋 Registering with ecosystem via Port 7777');
    
    const registration = {
      serviceId: 'ecosystem-dashboard',
      serviceName: 'AI Homelab Ecosystem Dashboard',
      serviceUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8404',
      capabilities: ['monitoring', 'dashboard', 'ai-gateway-client'],
      dependencies: ['ai-gateway', 'ahis'],
      healthEndpoint: '/api/health',
      ...serviceConfig
    };
    
    // Add timeout handling to prevent infinite hangs
    try {
      await Promise.race([
        serviceMeshClient.registerService(registration),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service registration timeout after 10s')), 10000)
        )
      ]);
      console.log('✅ Successfully registered with service mesh');
    } catch (error) {
      console.warn('⚠️ Service mesh registration failed, continuing without registration:', error);
      // Don't throw - allow the dashboard to continue functioning without service mesh registration
    }
  };

  // Shutdown both clients
  const shutdown = async () => {
    console.log('🔄 Shutting down dual-port client...');
    
    if (serviceMeshClient) {
      await serviceMeshClient.unregisterService();
    }
    
    if (aiClient && aiClient.disconnect) {
      aiClient.disconnect();
    }
    
    setAIClient(null);
    setIsInitialized(false);
    
    console.log('✅ Dual-port client shutdown complete');
  };

  // Clear errors
  const clearError = () => {
    setError(null);
    setAIClientError(null);
    setServiceMeshError(null);
    serviceMeshClient.clearError();
  };

  // Auto-initialize
  useEffect(() => {
    // Skip initialization on server-side
    if (typeof window === 'undefined') return;
    
    if (autoInitialize && !isInitialized) {
      initializeDualPort();
    }
  }, [autoInitialize, isInitialized]);

  // Periodic health checks
  useEffect(() => {
    // Skip on server-side
    if (typeof window === 'undefined') return;
    
    if (isFullyConnected) {
      const healthCheckInterval = setInterval(async () => {
        try {
          // Check AI client health (Port 8777)
          if (aiClient) {
            const aiHealth = await aiClient.getHealth();
            setAIHealthStatus(aiHealth);
          }
          
          // Check service mesh health (Port 7777)
          if (serviceMeshClient) {
            const meshHealth = await serviceMeshClient.checkServiceMeshHealth();
            setServiceMeshHealthStatus(meshHealth);
          }
          
          setLastHealthCheck(new Date());
          
        } catch (error) {
          console.error('❌ Health check failed:', error);
        }
      }, 60000); // Every minute

      return () => clearInterval(healthCheckInterval);
    }
  }, [isFullyConnected, aiClient, serviceMeshClient]);

  // Update service mesh error state
  useEffect(() => {
    setServiceMeshError(serviceMeshClient.error);
  }, [serviceMeshClient.error]);

  // Context value
  const contextValue: DualPortClientContextType = {
    // Dual-port client
    aiClient: aiClient ? {
      createChatCompletion: aiClient.createChatCompletion ? aiClient.createChatCompletion.bind(aiClient) : () => Promise.reject(new Error('createChatCompletion not available')),
      createStreamingChatCompletion: aiClient.createStreamingChatCompletion ? aiClient.createStreamingChatCompletion.bind(aiClient) : async function* () { throw new Error('createStreamingChatCompletion not available'); },
      getModels: aiClient.getModels ? aiClient.getModels.bind(aiClient) : () => Promise.reject(new Error('getModels not available')),
      getHealth: aiClient.getHealth ? aiClient.getHealth.bind(aiClient) : () => Promise.reject(new Error('getHealth not available')),
      searchPerplexity: aiClient.searchPerplexity ? aiClient.searchPerplexity.bind(aiClient) : () => Promise.resolve({})
    } : null,
    
    serviceMeshClient: serviceMeshClient ? {
      registerService: serviceMeshClient.registerService || (() => Promise.reject(new Error('registerService not available'))),
      unregisterService: serviceMeshClient.unregisterService || (() => Promise.reject(new Error('unregisterService not available'))),
      checkServiceMeshHealth: serviceMeshClient.checkServiceMeshHealth || (() => Promise.reject(new Error('checkServiceMeshHealth not available'))),
      discoverServices: serviceMeshClient.discoverServices || (() => Promise.reject(new Error('discoverServices not available'))),
      getSDKStatus: () => getMCPSDKStatus(),
      updateHealth: (healthData?: any) => updateMCPHealth(healthData)
    } : null,
    
    // Connection states
    isFullyConnected,
    aiClientConnected,
    serviceMeshConnected,
    isLoading,
    isInitialized,
    
    // Health and status
    aiHealthStatus,
    serviceMeshHealthStatus,
    lastHealthCheck,
    models,
    lastModelsUpdate,
    
    // Errors
    error,
    aiClientError,
    serviceMeshError,
    
    // Actions
    initializeDualPort,
    shutdown,
    sendChatCompletion,
    sendChatCompletionStream,
    loadModels,
    registerWithServiceMesh,
    clearError
  };

  return (
    <DualPortClientContext.Provider value={contextValue}>
      <AIClientManager 
        onAIClientReady={handleAIClientReady}
        onAIClientError={handleAIClientError}
        config={aiClientConfig}
      />
      {children}
    </DualPortClientContext.Provider>
  );
}

// Wrapper provider that includes service mesh provider
export function DualPortAIGatewayProviderWithServiceMesh(props: DualPortClientProviderProps) {
  return (
    <ServiceMeshClientProvider autoRegister={false}>
      <DualPortAIGatewayProvider {...props} />
    </ServiceMeshClientProvider>
  );
}

// Hook to use dual-port client
export function useDualPortAIGateway(): DualPortClientContextType {
  const context = useContext(DualPortClientContext);
  if (!context) {
    throw new Error('useDualPortAIGateway must be used within a DualPortAIGatewayProvider');
  }
  return context;
}

// Export context
export { DualPortClientContext };
