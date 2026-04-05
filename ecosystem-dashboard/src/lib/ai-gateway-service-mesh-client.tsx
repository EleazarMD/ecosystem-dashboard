/**
 * AI Gateway Service Mesh Client
 * Handles Port 7777 operations: service registration, health checks, service discovery
 * Compliant with AI Gateway Port Architecture dual-port design
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAIGatewayEndpoints, testAIGatewayConnectivity, type AIGatewayEndpoints } from './ai-gateway-k3d-config';

// Service mesh specific interfaces
interface ServiceMeshConfig {
  url: string;
  apiKey: string;
  timeout: number;
  serviceId: string;
  serviceName: string;
}

interface ServiceRegistration {
  serviceId: string;
  serviceName: string;
  serviceUrl: string;
  capabilities: string[];
  dependencies: string[];
  healthEndpoint?: string;
}

interface ServiceMeshHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  services: {
    [serviceId: string]: {
      status: string;
      lastSeen: number;
    };
  };
}

interface ServiceMeshClientContextType {
  // Connection state
  isConnected: boolean;
  isRegistered: boolean;
  isLoading: boolean;
  
  // Service mesh operations
  registerService: (registration: ServiceRegistration) => Promise<void>;
  unregisterService: () => Promise<void>;
  checkServiceMeshHealth: () => Promise<ServiceMeshHealthStatus>;
  discoverServices: (capability?: string) => Promise<any[]>;
  
  // Status
  registrationStatus: 'unregistered' | 'connecting' | 'registering' | 'registered' | 'failed';
  lastHealthCheck: Date | null;
  error: Error | null;
  
  // Actions
  clearError: () => void;
}

// Create context
const ServiceMeshClientContext = createContext<ServiceMeshClientContextType | null>(null);

// Provider props
interface ServiceMeshClientProviderProps {
  children: ReactNode;
  autoRegister?: boolean;
  serviceConfig?: Partial<ServiceRegistration>;
}

// Service mesh client provider
export function ServiceMeshClientProvider({
  children,
  autoRegister = true,
  serviceConfig
}: ServiceMeshClientProviderProps) {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'unregistered' | 'connecting' | 'registering' | 'registered' | 'failed'>('unregistered');
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [endpoints, setEndpoints] = useState<AIGatewayEndpoints | null>(null);

  // Configuration (will be dynamically resolved)
  const [config, setConfig] = useState<ServiceMeshConfig>({
    url: 'http://localhost:7777',
    apiKey: 'ai-gateway-api-key-2024',
    timeout: 15000,
    serviceId: 'ecosystem-dashboard',
    serviceName: 'AI Homelab Ecosystem Dashboard'
  });

  // Initialize AI Gateway endpoints
  useEffect(() => {
    // Skip initialization on server-side
    if (typeof window === 'undefined') return;
    
    const initializeEndpoints = async () => {
      try {
        console.log('🔍 Resolving AI Gateway endpoints (k3d/localhost)...');
        const resolvedEndpoints = await getAIGatewayEndpoints();
        setEndpoints(resolvedEndpoints);
        
        // Update config with resolved endpoints
        setConfig(prev => ({
          ...prev,
          url: resolvedEndpoints.serviceMeshUrl,
          apiKey: resolvedEndpoints.apiKey
        }));
        
        console.log('✅ AI Gateway endpoints resolved:', resolvedEndpoints);
        
        // Test connectivity before attempting registration
        const connectivity = await testAIGatewayConnectivity(resolvedEndpoints);
        if (connectivity.serviceMesh) {
          console.log('🔗 AI Gateway service mesh is available');
          setIsConnected(true);
          
          // Only auto-register if explicitly enabled and AI Gateway is available
          if (autoRegister) {
            console.log('🚀 Auto-registering with AI Gateway...');
            await registerService({
              serviceId: 'ecosystem-dashboard',
              serviceName: 'AI Homelab Ecosystem Dashboard',
              serviceUrl: 'http://localhost:8404',
              capabilities: ['monitoring', 'dashboard'],
              dependencies: [],
              healthEndpoint: 'http://localhost:8404/api/health'
            });
          }
        } else {
          console.log('⚠️ AI Gateway service mesh not available - running in offline mode');
          setRegistrationStatus('failed');
          setError(new Error('AI Gateway service mesh not available'));
        }
      } catch (error) {
        console.error('❌ Failed to initialize AI Gateway connection:', error);
        setError(error as Error);
        setRegistrationStatus('failed');
      }
    };
    
    initializeEndpoints();
  }, [autoRegister]);

  // Connect to AI Gateway v2.0 service mesh monitoring (Port 7777)
  const registerService = async (registration: ServiceRegistration) => {
    try {
      setIsLoading(true);
      setRegistrationStatus('connecting');
      setError(null);

      console.log('🔗 Connecting to AI Gateway v2.0 Service Mesh (Port 7777):', registration);

      // Check if endpoints are resolved first
      if (!endpoints) {
        throw new Error('AI Gateway endpoints not resolved yet');
      }

      // Use health endpoint to establish connection instead of registration
      const response = await fetch(`${config.url}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': config.apiKey,
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), config.timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`AI Gateway connection failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      setIsConnected(true);
      setIsRegistered(true);
      setRegistrationStatus('registered');
      setLastHealthCheck(new Date());
      
      console.log('✅ Connected to AI Gateway v2.0 Service Mesh:', result);

    } catch (error) {
      console.warn('⚠️ AI Gateway connection failed - running in offline mode:', error);
      setError(error as Error);
      setRegistrationStatus('failed');
      setIsRegistered(false);
      setIsConnected(false);
      
      // Don't throw the error - allow the dashboard to run in offline mode
    } finally {
      setIsLoading(false);
    }
  };

  // Unregister service
  const unregisterService = async () => {
    try {
      setIsLoading(true);
      
      console.log('📋 Unregistering service from AHIS via AI Gateway (Port 7777)');

      const response = await fetch(`${config.url}/api/v1/service-mesh/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-Service-Mesh-Operation': 'unregister'
        },
        body: JSON.stringify({
          serviceId: config.serviceId,
          timestamp: Date.now()
        }),
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), config.timeout);
          return controller.signal;
        })()
      });

      if (response.ok) {
        setIsRegistered(false);
        setRegistrationStatus('unregistered');
        console.log('✅ Service unregistered successfully');
      }

    } catch (error) {
      console.error('❌ Service unregistration failed:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check service mesh health
  const checkServiceMeshHealth = async (): Promise<ServiceMeshHealthStatus> => {
    try {
      console.log('🏥 Checking service mesh health via AI Gateway (Port 7777)');

      const response = await fetch(`${config.url}/health`, {
        method: 'GET',
        headers: {
          'X-API-Key': config.apiKey,
          'X-Service-Mesh-Operation': 'health-check'
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), config.timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const healthStatus = await response.json();
      setLastHealthCheck(new Date());
      setIsConnected(true);
      
      return healthStatus;

    } catch (error) {
      console.error('❌ Service mesh health check failed:', error);
      setError(error as Error);
      setIsConnected(false);
      
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        services: {}
      };
    }
  };

  // Discover services
  const discoverServices = async (capability?: string): Promise<any[]> => {
    try {
      const url = new URL(`${config.url}/api/v1/service-mesh/discover`);
      if (capability) {
        url.searchParams.set('capability', capability);
      }

      console.log('🔍 Discovering services via AI Gateway (Port 7777):', { capability });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': config.apiKey,
          'X-Service-Mesh-Operation': 'discover'
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), config.timeout);
          return controller.signal;
        })()
      });

      if (!response.ok) {
        throw new Error(`Service discovery failed: ${response.status}`);
      }

      const services = await response.json();
      return services.services || [];

    } catch (error) {
      console.error('❌ Service discovery failed:', error);
      setError(error as Error);
      return [];
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Auto-register on mount
  useEffect(() => {
    if (autoRegister && !isRegistered && registrationStatus === 'unregistered') {
      const defaultRegistration: ServiceRegistration = {
        serviceId: config.serviceId,
        serviceName: config.serviceName,
        serviceUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8404',
        capabilities: ['monitoring', 'dashboard', 'ai-gateway-client'],
        dependencies: ['ai-gateway', 'ahis'],
        healthEndpoint: '/api/health',
        ...serviceConfig
      };

      registerService(defaultRegistration);
    }
  }, [autoRegister, isRegistered, registrationStatus]);

  // Periodic health checks
  useEffect(() => {
    if (isRegistered) {
      const healthCheckInterval = setInterval(() => {
        checkServiceMeshHealth();
      }, 60000); // Every minute

      return () => clearInterval(healthCheckInterval);
    }
  }, [isRegistered]);

  // Context value
  const contextValue: ServiceMeshClientContextType = {
    isConnected,
    isRegistered,
    isLoading,
    registerService,
    unregisterService,
    checkServiceMeshHealth,
    discoverServices,
    registrationStatus,
    lastHealthCheck,
    error,
    clearError
  };

  return (
    <ServiceMeshClientContext.Provider value={contextValue}>
      {children}
    </ServiceMeshClientContext.Provider>
  );
}

// Hook to use service mesh client
export function useServiceMeshClient(): ServiceMeshClientContextType {
  const context = useContext(ServiceMeshClientContext);
  if (!context) {
    throw new Error('useServiceMeshClient must be used within a ServiceMeshClientProvider');
  }
  return context;
}

// Export context for direct access
export { ServiceMeshClientContext };
