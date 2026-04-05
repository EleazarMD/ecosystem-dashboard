import { useState, useEffect } from 'react';
import { Agent, ChatMessage, EventTrace, AgentConfiguration, SaveStatus } from '../types';

export const useAgentState = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<EventTrace[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfiguration>({
    name: '',
    description: '',
    instructions: '',
    model: 'llama3.2:3b',
    temperature: 0.7,
    maxTokens: 2048,
    voiceEnabled: false,
    safetyGuardrails: true,
    role: '',
    priority: 'medium',
    maxConcurrentTasks: 3,
    timeoutMs: 30000,
    capabilities: [],
    canDelegate: false,
    memoryScope: 'app',
    delegationRules: [],
  });
  const [originalConfig, setOriginalConfig] = useState<AgentConfiguration>(agentConfig);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isSaving, setIsSaving] = useState(false);

  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agentic-control/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
        
        // Auto-select first available agent
        if (data.agents && data.agents.length > 0 && !selectedAgent) {
          const firstAgent = data.agents[0];
          setSelectedAgent(firstAgent);
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
      console.log(`✅ Agent ${agent.name} already selected`);
      return;
    }
    
    console.log(`🔄 Switching from ${selectedAgent?.name || 'none'} to ${agent.name}`);
    console.log(`🔍 Selected agent ID: ${agent.id}, Name: ${agent.name}`);
    setSelectedAgent(agent);
    setMessages([]);
    setEvents([]);
    setCurrentMessage('');
    setIsTyping(false);
    
    // Add selection event
    const selectionEvent: EventTrace = {
      id: `event-${Date.now()}`,
      timestamp: new Date(),
      event_type: 'agent_selection',
      agent_id: agent.id,
      status: 'success',
    };
    setEvents(prev => [selectionEvent, ...prev]);
  };

  const addEvent = (eventData: Partial<EventTrace>) => {
    const newEvent: EventTrace = {
      id: `event-${Date.now()}`,
      timestamp: new Date(),
      event_type: eventData.event_type || 'unknown',
      agent_id: eventData.agent_id,
      function_name: eventData.function_name,
      input: eventData.input,
      output: eventData.output,
      duration: eventData.duration,
      status: eventData.status || 'pending',
      trace_id: eventData.trace_id,
      protocol: eventData.protocol,
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events
  };

  const hasConfigChanged = (): boolean => {
    return JSON.stringify(agentConfig) !== JSON.stringify(originalConfig);
  };

  return {
    // State
    agents,
    selectedAgent,
    messages,
    events,
    currentMessage,
    isLoading,
    isTyping,
    error,
    agentConfig,
    originalConfig,
    saveStatus,
    isSaving,
    
    // Setters
    setAgents,
    setSelectedAgent,
    setMessages,
    setEvents,
    setCurrentMessage,
    setIsLoading,
    setIsTyping,
    setError,
    setAgentConfig,
    setOriginalConfig,
    setSaveStatus,
    setIsSaving,
    
    // Actions
    loadAgents,
    handleAgentSelection,
    addEvent,
    hasConfigChanged,
  };
};
