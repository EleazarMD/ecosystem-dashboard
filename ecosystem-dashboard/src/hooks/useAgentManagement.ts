import { useState, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  endpoint?: string;
  port?: number;
  lastSeen: string;
  capabilities?: string[];
  version?: string;
  uptime?: number;
  health?: {
    status: string;
    score: number;
    memory_usage?: number;
    cpu_usage?: number;
  };
}

export const useAgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agentic-control/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
        
        // Auto-select first available agent if none selected
        if (data.agents && data.agents.length > 0 && !selectedAgent) {
          setSelectedAgent(data.agents[0]);
        }
      } else {
        throw new Error(`Failed to load agents: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      setError('Failed to load agents from API');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentSelection = (agent: Agent) => {
    if (selectedAgent?.id === agent.id) {
      return; // Already selected
    }
    
    console.log(`🔄 Switching from ${selectedAgent?.name || 'none'} to ${agent.name}`);
    setSelectedAgent(agent);
    
    toast({
      title: `Switched to ${agent.name}`,
      description: `Now chatting with ${agent.type} agent`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  return {
    agents,
    selectedAgent,
    isLoading,
    error,
    loadAgents,
    handleAgentSelection,
    getStatusColor,
  };
};
