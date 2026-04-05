/**
 * AI Gateway Integration Bridge
 * Bridges the existing dashboard with the new AI Gateway Backend APIs
 * Provides seamless integration without breaking existing functionality
 */

import React, { useEffect, useState } from 'react';
import { useAIGatewayBackend } from '../../lib/ai-gateway-backend-client';

// Helper to normalize capabilities to array of strings
const normalizeCapabilities = (caps: any): string[] => {
  if (Array.isArray(caps)) return caps.map(c => String(c));
  if (caps && typeof caps === 'object') return Object.keys(caps);
  return [];
};

interface AIGatewayIntegrationBridgeProps {
  children: (bridgeProps: {
    // Enhanced provider data from AI Gateway Backend
    enhancedProviders: any[];
    // Real-time connection status
    isBackendConnected: boolean;
    // Merged configuration data
    mergedConfig: any;
    // Bridge functions
    syncWithBackend: () => Promise<void>;
    updateProviderViaBackend: (id: string, updates: any) => Promise<void>;
    // Legacy compatibility
    legacyProviders: any[];
    legacyServices: any[];
  }) => React.ReactNode;
}

export function AIGatewayIntegrationBridge({ children }: AIGatewayIntegrationBridgeProps) {
  const {
    providers: backendProviders,
    aiGatewayConfig,
    globalConfig,
    isConnected,
    createProvider,
    updateProvider,
    deleteProvider,
    refreshData
  } = useAIGatewayBackend();

  const [legacyProviders, setLegacyProviders] = useState([]);
  const [legacyServices, setLegacyServices] = useState([]);
  const [mergedConfig, setMergedConfig] = useState({});

  // Load legacy data from existing APIs
  useEffect(() => {
    const loadLegacyData = async () => {
      try {
        // Load legacy providers
        const providersResponse = await fetch('/api/ai-config/providers');
        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          setLegacyProviders(providersData.providers || []);
        }

        // Load legacy services
        const servicesResponse = await fetch('/api/ai-config/services');
        if (servicesResponse.ok) {
          const servicesData = await servicesResponse.json();
          setLegacyServices(servicesData.services || []);
        }
      } catch (error) {
        console.warn('Failed to load legacy data:', error);
      }
    };

    loadLegacyData();
  }, []);

  // Merge backend and legacy configurations
  useEffect(() => {
    const merged = {
      // AI Gateway Backend config takes precedence
      ...globalConfig,
      // Legacy config as fallback
      legacy: {
        providers: legacyProviders,
        services: legacyServices
      },
      // AI Gateway specific config
      aiGateway: aiGatewayConfig
    };
    setMergedConfig(merged);
  }, [globalConfig, aiGatewayConfig, legacyProviders, legacyServices]);

  // Enhanced providers that combine backend and legacy data
  const enhancedProviders = React.useMemo(() => {
    const enhanced = [...backendProviders];
    
    // Add legacy providers that don't exist in backend
    legacyProviders.forEach(legacyProvider => {
      const existsInBackend = backendProviders.some(bp => 
        bp.name === legacyProvider.name || bp.id === legacyProvider.id
      );
      
      if (!existsInBackend) {
        // Convert legacy provider format to backend format
        enhanced.push({
          id: legacyProvider.id,
          name: legacyProvider.name,
          type: legacyProvider.type,
          enabled: legacyProvider.status === 'active',
          priority: 50, // Default priority for legacy providers
          endpoint: legacyProvider.endpoint,
          models: legacyProvider.models?.map(m => m.id) || [],
          capabilities: legacyProvider.models?.flatMap(m => normalizeCapabilities(m.capabilities)) || [],
          health: {
            status: legacyProvider.healthStatus === 'healthy' ? 'healthy' : 
                   legacyProvider.healthStatus === 'degraded' ? 'degraded' : 'unhealthy',
            responseTime: legacyProvider.avgLatency || 0,
            lastCheck: legacyProvider.lastHealthCheck || new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: legacyProvider.lastHealthCheck || new Date().toISOString(),
          // _legacy: true // Mark as legacy provider (removed for type compatibility)
        });
      }
    });

    return enhanced;
  }, [backendProviders, legacyProviders]);

  // Sync function to update backend with legacy data
  const syncWithBackend = async () => {
    try {
      // Sync legacy providers to backend
      for (const legacyProvider of legacyProviders) {
        const existsInBackend = backendProviders.some(bp => 
          bp.name === legacyProvider.name || bp.id === legacyProvider.id
        );
        
        if (!existsInBackend) {
          await createProvider({
            name: legacyProvider.name,
            type: legacyProvider.type,
            enabled: legacyProvider.status === 'active',
            priority: 50,
            endpoint: legacyProvider.endpoint,
            models: legacyProvider.models?.map(m => m.id) || [],
            capabilities: legacyProvider.models?.flatMap(m => normalizeCapabilities(m.capabilities)) || []
          });
        }
      }
      
      // Refresh backend data
      await refreshData();
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      throw error;
    }
  };

  // Enhanced update function that updates both backend and legacy
  const updateProviderViaBackend = async (id: string, updates: any) => {
    try {
      // Update in backend if it exists there
      const backendProvider = backendProviders.find(p => p.id === id);
      if (backendProvider) {
        await updateProvider(id, updates);
      }
      
      // Also update legacy data if needed
      const legacyProvider = legacyProviders.find(p => p.id === id);
      if (legacyProvider) {
        // Update legacy provider via existing API
        await fetch('/api/ai-config/providers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: id,
            status: updates.enabled ? 'active' : 'inactive',
            configuration: updates
          })
        });
      }
    } catch (error) {
      console.error('Failed to update provider:', error);
      throw error;
    }
  };

  return (
    <>
      {children({
        enhancedProviders,
        isBackendConnected: isConnected,
        mergedConfig,
        syncWithBackend,
        updateProviderViaBackend,
        legacyProviders,
        legacyServices
      })}
    </>
  );
}
