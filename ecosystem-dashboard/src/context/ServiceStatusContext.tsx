/**
 * Service Status Context
 * 
 * Provides ecosystem-wide service availability status tracking
 * following AI Homelab Ecosystem architecture standards.
 */
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import logger from '../lib/logger';
import { useSystemStatus } from './SystemStatusContext';
import { initializeKnowledgeGraphMonitoring } from '../lib/knowledgeGraphUtils';

// Services tracked in the ecosystem
export interface ServiceStatus {
  name: string;
  isAvailable: boolean;
  isMockData: boolean;
  lastChecked: Date | null;
}

interface ServiceStatusContextType {
  services: Record<string, ServiceStatus>;
  updateServiceStatus: (
    serviceName: string, 
    isAvailable: boolean, 
    isMockData: boolean
  ) => void;
  isForcingRealResponses: boolean;
}

const initialContext: ServiceStatusContextType = {
  services: {},
  updateServiceStatus: () => {},
  isForcingRealResponses: false,
};

const ServiceStatusContext = createContext<ServiceStatusContextType>(initialContext);

interface ServiceStatusProviderProps {
  children: ReactNode;
}

/**
 * Service Status Provider
 * 
 * Tracks the availability and status of all ecosystem services
 */
export const ServiceStatusProvider: React.FC<ServiceStatusProviderProps> = ({ children }) => {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const { services: systemServices, loading } = useSystemStatus();
  
  // Check for force real responses environment variable
  const [isForcingRealResponses, setIsForcingRealResponses] = useState<boolean>(false);
  
  useEffect(() => {
    // Check environment variables when component mounts
    if (typeof window !== 'undefined') {
      const forceRealResponses = process.env.NEXT_PUBLIC_FORCE_REAL_RESPONSES === 'true';
      setIsForcingRealResponses(forceRealResponses);
      
      logger.info('[ServiceStatusContext] Environment configuration loaded', { 
        forceRealResponses 
      });
      
      // Initialize with default service status
      setServices({
        'AI Gateway': {
          name: 'AI Gateway',
          isAvailable: false,
          isMockData: false,
          lastChecked: null
        },
        'Knowledge Graph': {
          name: 'Knowledge Graph',
          isAvailable: false,
          isMockData: false,
          lastChecked: null
        },
        'AHIS': {
          name: 'AHIS',
          isAvailable: false,
          isMockData: false,
          lastChecked: null
        }
      });
    }
  }, []);
  
  // Listen for custom AI Gateway status events
  useEffect(() => {
    // Only setup listeners in browser environment
    if (typeof window !== 'undefined') {
      // Handler for AI Gateway status events
      const handleAIGatewayStatus = (event: CustomEvent) => {
        const { available, mockData } = event.detail;
        updateServiceStatus('AI Gateway', available, mockData);
      };
      
      // Handler for Knowledge Graph status events
      const handleKnowledgeGraphStatus = (event: CustomEvent) => {
        const { available, mockData } = event.detail;
        updateServiceStatus('Knowledge Graph', available, mockData);
      };
      
      // Add event listeners
      window.addEventListener('ai-gateway-status', handleAIGatewayStatus as EventListener);
      window.addEventListener('knowledge-graph-status', handleKnowledgeGraphStatus as EventListener);
      
      // Cleanup
      return () => {
        window.removeEventListener('ai-gateway-status', handleAIGatewayStatus as EventListener);
        window.removeEventListener('knowledge-graph-status', handleKnowledgeGraphStatus as EventListener);
      };
    }
  }, []);
  
  // Initialize Knowledge Graph monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Start Knowledge Graph health monitoring (check every minute)
        const cleanupKnowledgeGraph = initializeKnowledgeGraphMonitoring(60000);
        
        // Cleanup on unmount
        return () => {
          try {
            cleanupKnowledgeGraph();
          } catch (error) {
            logger.warn('[ServiceStatusContext] Error during Knowledge Graph monitoring cleanup', error);
          }
        };
      } catch (error) {
        logger.warn('[ServiceStatusContext] Failed to initialize Knowledge Graph monitoring, continuing without it', error);
        // Set fallback status
        updateServiceStatus('Knowledge Graph', false, false);
      }
    }
  }, []);
  
  // Update service status from SystemStatusContext
  useEffect(() => {
    if (!loading && systemServices && systemServices.length > 0) {
      systemServices.forEach(service => {
        // Map system service status to our isAvailable boolean
        const isAvailable = service.status === 'OPERATIONAL' || service.status === 'DEGRADED';
        
        // Update service status if it matches one of our tracked services
        if (service.name === 'AHIS' || service.name.includes('AHIS')) {
          updateServiceStatus('AHIS', isAvailable, false);
        } else if (service.name.toLowerCase().includes('gateway')) {
          updateServiceStatus('AI Gateway', isAvailable, false);
        } else if (service.name.toLowerCase().includes('knowledge') || 
                  service.name.toLowerCase().includes('kg')) {
          updateServiceStatus('Knowledge Graph', isAvailable, false);
        }
      });
    }
  }, [systemServices, loading]);

  const updateServiceStatus = (serviceName: string, isAvailable: boolean, isMockData: boolean) => {
    setServices(prevServices => {
      // Get existing service or create new one
      const existingService = prevServices[serviceName] || {
        name: serviceName,
        isAvailable: false,
        isMockData: false,
        lastChecked: null
      };
      
      // Only log if status has changed
      if (existingService.isAvailable !== isAvailable || existingService.isMockData !== isMockData) {
        logger.info(`[ServiceStatusContext] Service status updated: ${serviceName}`, {
          serviceName,
          isAvailable,
          isMockData,
          previousAvailable: existingService.isAvailable,
          previousMockData: existingService.isMockData
        });
      }
      
      return {
        ...prevServices,
        [serviceName]: {
          ...existingService,
          isAvailable,
          isMockData,
          lastChecked: new Date()
        }
      };
    });
  };

  return (
    <ServiceStatusContext.Provider value={{ 
      services, 
      updateServiceStatus,
      isForcingRealResponses
    }}>
      {children}
    </ServiceStatusContext.Provider>
  );
};

/**
 * useServiceStatus Hook
 * 
 * Access and update service status information
 */
export const useServiceStatus = () => useContext(ServiceStatusContext);

export default ServiceStatusProvider;
