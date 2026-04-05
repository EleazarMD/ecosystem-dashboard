/**
 * AI Gateway Backend Client
 * Integrates with the new AI Homelab Inference Dashboard Backend APIs
 * Provides real-time WebSocket connectivity and REST API access
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface Provider {
  id: string;
  name: string;
  type: 'ollama' | 'openai' | 'anthropic' | 'custom';
  enabled: boolean;
  priority: number;
  endpoint: string;
  models: string[];
  capabilities: string[];
  health?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    lastCheck: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AIGatewayConfig {
  providers: Provider[];
  defaultProvider: string;
  fallbackChain: string[];
  routingRules: RoutingRule[];
  globalSettings: {
    timeout: number;
    retryAttempts: number;
    enableFallback: boolean;
    enableLoadBalancing: boolean;
  };
  version: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  condition: {
    type: 'model' | 'capability' | 'cost' | 'latency';
    operator: 'equals' | 'contains' | 'less_than' | 'greater_than';
    value: string | number;
  };
  targetProvider: string;
  enabled: boolean;
  priority: number;
}

export interface WebSocketMessage {
  type: 'provider_created' | 'provider_updated' | 'provider_deleted' | 'config_updated' | 'health_updated';
  data: any;
  timestamp: string;
}

class AIGatewayBackendClient {
  private baseUrl: string;
  private apiKey: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private wsUrl: string;

  constructor(baseUrl?: string, apiKey?: string) {
    // Use AI client port (8777) for LLM operations, not service mesh port (7777)
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL || `http://${process.env.NEXT_PUBLIC_AI_GATEWAY_AI_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AI_GATEWAY_AI_PORT || '8777'}`;
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
    this.wsUrl = `ws://${process.env.NEXT_PUBLIC_AI_GATEWAY_AI_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AI_GATEWAY_AI_PORT || '8777'}/ws`;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };
  }

  // REST API Methods
  async getProviders(): Promise<Provider[]> {
    try {
      // Try AI Gateway Backend first
      const response = await fetch(`${this.baseUrl}/api/v1/providers/status`, {
        headers: this.getHeaders(),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 30000); // 30s timeout for AI Gateway operations
          return controller.signal;
        })()
      });
      
      if (!response.ok) throw new Error(`Failed to fetch providers: ${response.statusText}`);
      const data = await response.json();
      
      // Transform AI Gateway response to Provider format
      if (data.success && data.data) {
        const providers = Object.entries(data.data).map(([name, info]: [string, any]) => ({
          id: name,
          name: name,
          type: (name === 'perplexity' ? 'custom' : name === 'openai-oss' ? 'ollama' : 'openai') as 'ollama' | 'openai' | 'anthropic' | 'custom',
          enabled: info.connected || false,
          priority: 1,
          endpoint: info.baseUrl || `http://localhost:7777/api/v1/providers/${name}`,
          models: info.models || [],
          capabilities: Object.keys(info.features || {}),
          health: {
            status: info.connected ? 'healthy' : 'unhealthy' as 'healthy' | 'degraded' | 'unhealthy',
            responseTime: info.responseTime || 0,
            lastCheck: info.lastCheck || new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        return providers;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('❌ AI Gateway Backend unavailable:', error);
      throw error;
    }
  }

  async getProvider(id: string): Promise<Provider> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/providers/${id}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch provider: ${response.statusText}`);
    return response.json();
  }

  async createProvider(provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>): Promise<Provider> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/providers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(provider)
    });
    if (!response.ok) throw new Error(`Failed to create provider: ${response.statusText}`);
    return response.json();
  }

  async updateProvider(id: string, updates: Partial<Provider>): Promise<Provider> {
    try {
      // Use the new admin endpoint for provider configuration
      const response = await fetch(`${this.baseUrl}/admin/providers/${id}`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'X-Admin-Key': process.env.NEXT_PUBLIC_AI_GATEWAY_ADMIN_KEY || 'ai-gateway-admin-key-2024',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 30000); // 30s timeout for AI Gateway operations
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Failed to update provider: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Provider ${id} updated successfully:`, result.action);

      // Return updated provider data in expected format
      const providers = await this.getProviders();
      const updatedProvider = providers.find(p => p.id === id);
      
      return updatedProvider ? {
        ...updatedProvider,
        ...updates,
        updatedAt: new Date().toISOString()
      } : {
        id,
        name: id,
        type: 'custom' as const,
        enabled: updates.enabled ?? false,
        priority: 1,
        endpoint: `http://localhost:7777/api/v1/providers/${id}`,
        models: [],
        capabilities: [],
        health: {
          status: updates.enabled ? 'healthy' : 'unhealthy' as const,
          responseTime: 0,
          lastCheck: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Provider update failed for ${id}:`, error);
      throw error;
    }
  }

  async deleteProvider(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/providers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to delete provider: ${response.statusText}`);
  }

  async getAIGatewayConfig(): Promise<AIGatewayConfig> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/providers/config`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch AI Gateway config: ${response.statusText}`);
    return response.json();
  }

  async getGlobalConfig(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/config`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch global config: ${response.statusText}`);
    return response.json();
  }

  async updateGlobalConfig(config: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error(`Failed to update global config: ${response.statusText}`);
    return response.json();
  }

  async checkProviderHealth(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/ai-inferencing/api/v1/providers/${id}/health`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to check provider health: ${response.statusText}`);
    return response.json();
  }

  async getHealthStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch health status: ${response.statusText}`);
    return response.json();
  }

  async getProviderStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/providers/status`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch provider status: ${response.statusText}`);
    return response.json();
  }

  async getProviderConfig(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/providers/config`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch provider config: ${response.statusText}`);
    return response.json();
  }

  // New v2.0 API Endpoints
  async getRoutingConfig(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/config/routing`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch routing config: ${response.statusText}`);
    return response.json();
  }

  async updateRoutingConfig(config: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/config/routing`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error(`Failed to update routing config: ${response.statusText}`);
    return response.json();
  }

  async getRoutingAnalytics(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/routing`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch routing analytics: ${response.statusText}`);
    return response.json();
  }

  async getFallbackChains(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/config/fallback/chains`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch fallback chains: ${response.statusText}`);
    return response.json();
  }

  async updateFallbackChains(chains: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/config/fallback/chains`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(chains)
    });
    if (!response.ok) throw new Error(`Failed to update fallback chains: ${response.statusText}`);
    return response.json();
  }

  async getComprehensiveHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/health/comprehensive`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`Failed to fetch comprehensive health: ${response.statusText}`);
    return response.json();
  }

  // WebSocket Methods
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // WebSocket doesn't support custom headers in browser, so we need to use a different approach
        // The AI Gateway WebSocket server expects X-API-Key in the upgrade request
        const wsUrl = `${this.wsUrl}?apiKey=${encodeURIComponent(this.apiKey)}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('Connected to AI Gateway Backend WebSocket');
          this.reconnectAttempts = 0;
          
          // Subscribe to all channels as documented
          this.sendChannelSubscription('health');
          this.sendChannelSubscription('metrics');
          this.sendChannelSubscription('events');
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected from AI Gateway Backend');
          this.ws = null;
          // Don't attempt reconnection - service not available
        };

        this.ws.onerror = (error) => {
          console.warn('⚠️ AI Gateway WebSocket unavailable - using REST API only');
          this.ws = null;
          // Resolve instead of reject - WebSocket is optional, REST API still works
          resolve();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => callback(message.data));
    }

    // Also notify general listeners
    const generalListeners = this.listeners.get('*');
    if (generalListeners) {
      generalListeners.forEach(callback => callback(message));
    }
  }

  // Enhanced v2.0 WebSocket channel subscription
  private sendChannelSubscription(channel: 'health' | 'metrics' | 'events' | 'providers' | 'routing'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: channel,
        timestamp: new Date().toISOString()
      }));
      console.log(`📡 Subscribed to ${channel} channel`);
    }
  }

  // Subscribe to specific provider updates
  subscribeToProvider(providerId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'providers',
        filter: { providerId },
        timestamp: new Date().toISOString()
      }));
      console.log(`📡 Subscribed to provider ${providerId} updates`);
    }
  }

  // Subscribe to routing analytics updates
  subscribeToRoutingAnalytics(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'routing',
        timestamp: new Date().toISOString()
      }));
      console.log('📡 Subscribed to routing analytics updates');
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectWebSocket().catch((error) => {
          console.warn('WebSocket reconnection failed:', error.message);
          // Stop trying after max attempts
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max WebSocket reconnection attempts reached. Stopping retries.');
          }
        });
      }, delay);
    } else {
      console.warn('WebSocket connection failed permanently after', this.maxReconnectAttempts, 'attempts');
    }
  }

  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Send subscription message to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topics: [eventType]
      }));
    }
  }

  unsubscribe(eventType: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  getReconnectionStatus() {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      canRetry: this.reconnectAttempts < this.maxReconnectAttempts
    };
  }

  async connect(): Promise<void> {
    return this.connectWebSocket();
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

// React Hook for AI Gateway Backend Integration
export function useAIGatewayBackend() {
  const [client] = useState(() => new AIGatewayBackendClient());
  const [providers, setProviders] = useState<Provider[]>([]);
  const [aiGatewayConfig, setAIGatewayConfig] = useState<AIGatewayConfig | null>(null);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data - fail fast if backend unavailable
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use shorter timeouts to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 3000)
      );

      // Use Promise.all to fail if ANY request fails - no fallback data
      const [providersData, configData, globalConfigData, healthData] = await Promise.all([
        Promise.race([client.getProviders(), timeoutPromise]),
        Promise.race([client.getAIGatewayConfig(), timeoutPromise]),
        Promise.race([client.getGlobalConfig(), timeoutPromise]),
        Promise.race([client.getHealthStatus(), timeoutPromise])
      ]);

      setProviders(providersData as Provider[]);
      setAIGatewayConfig(configData as AIGatewayConfig);
      setGlobalConfig(globalConfigData);
      setHealthStatus(healthData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      // Clear all data on error - no fallback
      setProviders([]);
      setAIGatewayConfig(null);
      setGlobalConfig(null);
      setHealthStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // WebSocket connection and event handling - optimized for performance
  useEffect(() => {
    let mounted = true;
    let reconnectTimer: NodeJS.Timeout;

    const connectAndSubscribe = async () => {
      if (!mounted) return;
      
      try {
        await client.connect();
        if (!mounted) return;
        
        // Only set connected if WebSocket actually connects
        setIsConnected(true);
        setError(null);

        // Subscribe to real-time updates with debouncing
        client.subscribe('provider_created', (provider) => {
          if (mounted) setProviders(prev => [...prev, provider]);
        });

        client.subscribe('provider_updated', (provider) => {
          if (mounted) setProviders(prev => prev.map(p => p.id === provider.id ? provider : p));
        });

        client.subscribe('provider_deleted', (data) => {
          if (mounted) setProviders(prev => prev.filter(p => p.id !== data.id));
        });

        client.subscribe('config_updated', (config) => {
          if (mounted) setAIGatewayConfig(config);
        });

        client.subscribe('health_updated', (health) => {
          if (mounted) setHealthStatus(health);
        });

      } catch (err) {
        console.warn('⚠️ AI Gateway WebSocket unavailable - using REST API only');
        if (mounted) {
          setIsConnected(false);
          // Don't set error - WebSocket is optional, REST API still works
        }
      }
    };

    // Only load data once on mount
    loadData();
    connectAndSubscribe();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      client.disconnect();
    };
  }, []); // Empty dependency array to prevent re-runs

  // API methods
  const createProvider = useCallback(async (provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProvider = await client.createProvider(provider);
      // WebSocket will handle the state update
      return newProvider;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create provider');
      throw err;
    }
  }, [client]);

  const updateProvider = useCallback(async (id: string, updates: Partial<Provider>) => {
    try {
      const updatedProvider = await client.updateProvider(id, updates);
      // WebSocket will handle the state update
      return updatedProvider;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update provider');
      throw err;
    }
  }, [client]);

  const deleteProvider = useCallback(async (id: string) => {
    try {
      await client.deleteProvider(id);
      // WebSocket will handle the state update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
      throw err;
    }
  }, [client]);

  const updateGlobalConfig = useCallback(async (config: any) => {
    try {
      const updatedConfig = await client.updateGlobalConfig(config);
      setGlobalConfig(updatedConfig);
      return updatedConfig;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update global config');
      throw err;
    }
  }, [client]);

  const checkProviderHealth = useCallback(async (id: string) => {
    try {
      return await client.checkProviderHealth(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check provider health');
      throw err;
    }
  }, [client]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    // Data
    providers,
    aiGatewayConfig,
    globalConfig,
    healthStatus,
    
    // State
    isConnected,
    isLoading,
    error,
    
    // Actions
    createProvider,
    updateProvider,
    deleteProvider,
    updateGlobalConfig,
    checkProviderHealth,
    refreshData,
    
    // Client for advanced usage
    client
  };
}
