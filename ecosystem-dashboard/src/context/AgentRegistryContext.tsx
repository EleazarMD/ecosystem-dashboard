import React, { createContext, useContext, useEffect, useState } from 'react';
import { AgentRegistryClient, AgentRegistryEventType } from '../lib/agent-registry-client';
import { useAHIS } from './AHISContext';

// Define the context type
interface AgentRegistryContextType {
  client: AgentRegistryClient | null;
  isConnected: boolean;
  lastEvent: {
    type: string;
    data: any;
    timestamp: number;
  } | null;
}

// Create the context with default values
const AgentRegistryContext = createContext<AgentRegistryContextType>({
  client: null,
  isConnected: false,
  lastEvent: null,
});

/**
 * Agent Registry Provider Component
 * 
 * Provides the Agent Registry Client to all child components
 */
export const AgentRegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { client: ahisClient, isConnected: ahisConnected } = useAHIS();
  const [client, setClient] = useState<AgentRegistryClient | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<{
    type: string;
    data: any;
    timestamp: number;
  } | null>(null);

  // Initialize the Agent Registry Client when the AHIS client is connected
  useEffect(() => {
    if (ahisClient && ahisConnected) {
      const agentRegistryClient = new AgentRegistryClient(ahisClient);
      setClient(agentRegistryClient);
      setIsConnected(true);
      
      // Subscribe to all events to track the last event
      const eventTypes = Object.values(AgentRegistryEventType);
      const unsubscribers = eventTypes.map(eventType => 
        agentRegistryClient.subscribe(eventType, (data) => {
          setLastEvent({
            type: eventType,
            data,
            timestamp: Date.now(),
          });
        })
      );
      
      return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
        setClient(null);
        setIsConnected(false);
      };
    }
  }, [ahisClient, ahisConnected]);

  return (
    <AgentRegistryContext.Provider value={{ client, isConnected, lastEvent }}>
      {children}
    </AgentRegistryContext.Provider>
  );
};

/**
 * Use Agent Registry Hook
 * 
 * A custom hook to access the Agent Registry Client
 * 
 * @returns The Agent Registry context
 */
export const useAgentRegistry = () => useContext(AgentRegistryContext);

export default AgentRegistryContext;
