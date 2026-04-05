import React, { useState, useEffect } from 'react';
import {
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Switch,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Badge,
  NumberInput,
  NumberInputField,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Box,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  Divider,
} from '@chakra-ui/react';
import { FiRefreshCw, FiInfo } from 'react-icons/fi';
import { Tooltip, Icon } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { Agent } from './types';
import ModelConfigurationService from '../../services/ModelConfigurationService';
import { useModelRegistry } from '../../hooks/useModelRegistry';

interface A2AConfiguration {
  enabled: boolean;
  endpoint: string;
  protocolVersion: '1.0' | '2.0';
  messageTimeout: number;
  maxRetries: number;
  autoRegister: boolean;
  orchestratorUrl: string;
  heartbeatInterval: number;
  requireAuthentication: boolean;
  allowedSenders: string[];
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  supportedMessageTypes: string[];
}

interface AgentConfiguration {
  name: string;
  description: string;
  instruction: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  sessionMemory: boolean;
  voiceEnabled: boolean;
  safetyEnabled: boolean;
  streamingEnabled: boolean;
  thinkingBudget: number;
  outputKey: string;
  agentClass: 'LlmAgent' | 'WorkflowAgent' | 'CustomAgent';
  safetySettings: {
    harmCategory: string;
    threshold: string;
  }[];
  callbacks: {
    beforeModel: boolean;
    beforeTool: boolean;
    afterModel: boolean;
  };
  tools: string[];
  subAgents: string[];
  a2aConfig?: A2AConfiguration;
}

interface AgentSettingsPanelProps {
  agent: Agent | null;
  onSaveSettings: (settings: AgentConfiguration) => void;
}

export const AgentSettingsPanel: React.FC<AgentSettingsPanelProps> = ({
  agent,
  onSaveSettings,
}) => {
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use model registry for dynamic LLM availability
  // Pass agent-specific IDs for Dashboard AI Agent
  const serviceId = agent?.id === 'dashboard-ai-41247' ? 'dashboard-ai-agent' : undefined;
  const projectId = agent?.id === 'dashboard-ai-41247' ? 'dashboard-ai' : undefined;
  
  const { 
    availableModels, 
    modelsByProvider, 
    providers, 
    isLoading: modelsLoading, 
    error: modelsError, 
    refreshModels,
    getModelById 
  } = useModelRegistry(serviceId, projectId);
  
  const [config, setConfig] = useState<AgentConfiguration>({
    name: '',
    description: '',
    instruction: '',
    model: 'llama3.2:3b',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,
    topK: 40,
    sessionMemory: true,
    voiceEnabled: false,
    safetyEnabled: true,
    streamingEnabled: true,
    thinkingBudget: 10000,
    outputKey: '',
    agentClass: 'LlmAgent',
    safetySettings: [
      {
        harmCategory: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ],
    callbacks: {
      beforeModel: false,
      beforeTool: false,
      afterModel: false
    },
    tools: [],
    subAgents: [],
    a2aConfig: {
      enabled: true,
      endpoint: '/a2a/message',
      protocolVersion: '1.0',
      messageTimeout: 30000,
      maxRetries: 3,
      autoRegister: true,
      orchestratorUrl: 'http://localhost:41240',
      heartbeatInterval: 30000,
      requireAuthentication: false,
      allowedSenders: [],
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      supportedMessageTypes: [
        'task_request', 'task_response', 'status_update', 'error_report',
        'memory_change', 'graph_query', 'document_ingest', 'reasoning_request'
      ]
    }
  });

  // Map UI agent ID to database agent ID
  const mapAgentId = (uiAgentId: string): string => {
    // UI uses: "orchestrator-41240", DB uses: "orchestrator-agent"
    return uiAgentId.includes('-4') 
      ? uiAgentId.replace(/-\d{5}$/, '-agent')
      : uiAgentId;
  };

  useEffect(() => {
    const loadAgentSettings = async () => {
      if (agent) {
        setIsLoading(true);
        setError(null);
        try {
          const dbAgentId = mapAgentId(agent.id);
          console.log(`🔄 Loading settings for agent: ${agent.id} (DB: ${dbAgentId})`);
          
          // Call the dashboard's agent-settings API
          const response = await fetch(`/api/agent-settings?agentId=${dbAgentId}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log(`📊 Agent settings loaded:`, data);
          
          if (data.success && data.settings) {
            console.log('✅ Model from database:', data.settings.model);
            
            // Map API response to UI config format
            const mappedConfig = {
              ...data.settings,
              instruction: data.settings.instructions || data.settings.instruction || '', // API uses 'instructions' (plural)
            };
            
            console.log('✅ System instructions:', mappedConfig.instruction);
            setConfig(mappedConfig);
          } else if (data.error && data.error.includes('not found')) {
            // Agent not in database (e.g., external agents like Goose)
            console.log('ℹ️ Agent not found in database, using defaults for external agent');
            setConfig({
              name: agent.name || 'External Agent',
              description: `External ${agent.type || 'agent'} discovered dynamically`,
              instruction: '',
              model: 'gpt-4o',
              temperature: 0.7,
              maxTokens: 2000,
              topP: 0.95,
              topK: 40,
              sessionMemory: true,
              voiceEnabled: false,
              safetyEnabled: true,
              streamingEnabled: true,
              thinkingBudget: 10000,
              outputKey: '',
              agentClass: 'LlmAgent',
              safetySettings: [],
              callbacks: {
                beforeModel: false,
                beforeTool: false,
                afterModel: false,
              },
              tools: [],
              subAgents: [],
            });
          } else {
            throw new Error(`No configuration found for agent: ${dbAgentId}`);
          }
        } catch (error) {
          console.error('❌ Failed to load agent settings:', error);
          setError(`Unable to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadAgentSettings();
  }, [agent]);

  const handleSave = async () => {
    if (!agent) return;

    setIsSaving(true);
    try {
      const dbAgentId = mapAgentId(agent.id);
      console.log(`💾 Saving settings for agent: ${agent.id} (DB: ${dbAgentId})`);

      // Build configuration update payload - include ALL editable fields
      const configUpdate: any = {
        // Core metadata
        metadata: {
          description: config.description,
          name: config.name
        },
        
        // LLM Configuration
        llmConfig: {
          model: config.model,
          provider: config.provider || 'ai-gateway',
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP,
          topK: config.topK,
          thinkingBudget: config.thinkingBudget
        },
        
        // Agent behavior
        agentClass: config.agentClass,
        systemInstructions: config.instruction,
        behaviorGuidelines: config.behaviorGuidelines,
        constraints: config.constraints,
        roleDefinition: config.roleDefinition,
        
        // Advanced settings
        outputKey: config.outputKey,
        sessionMemory: config.sessionMemory,
        voiceEnabled: config.voiceEnabled,
        safetyEnabled: config.safetyEnabled,
        streamingEnabled: config.streamingEnabled,
        safetySettings: config.safetySettings,
        callbacks: config.callbacks,
        tools: config.tools,
        subAgents: config.subAgents,
        
        // A2A Protocol configuration
        a2aConfig: config.a2aConfig
      };

      // Call Agent Configuration API directly
      const AGENT_CONFIG_API = process.env.NEXT_PUBLIC_AGENT_CONFIG_API_URL || 'http://localhost:8768';
      const response = await fetch(`${AGENT_CONFIG_API}/api/agents/${dbAgentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configUpdate)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Agent configuration saved:', {
          agentId: dbAgentId,
          model: config.model
        });
        
        onSaveSettings(config);
        alert('✅ Agent settings saved successfully!');
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (error) {
      console.error('❌ Error saving agent configuration:', error);
      alert(`Error saving settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Get only available models from registry (filters out unavailable providers)
  const models = availableModels.length > 0 
    ? availableModels.filter(model => model.status === 'available').map(model => model.id)
    : [
        'llama3.2:3b',
        'llama3.2-vision:11b', 
        'mistral:latest',
        'gemma3:4b'
      ];

  const agentClasses = ['LlmAgent', 'WorkflowAgent', 'CustomAgent'];
  
  const harmCategories = [
    'HARM_CATEGORY_DANGEROUS_CONTENT',
    'HARM_CATEGORY_HARASSMENT',
    'HARM_CATEGORY_HATE_SPEECH',
    'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  ];
  
  const thresholds = [
    'BLOCK_NONE',
    'BLOCK_LOW_AND_ABOVE',
    'BLOCK_MEDIUM_AND_ABOVE',
    'BLOCK_HIGH_AND_ABOVE'
  ];

  if (!agent) {
    return (
      <Box textAlign="center" py={8}>
        <Text fontSize="lg" color={useSemanticToken('text.secondary')}>
          No agent selected
        </Text>
      </Box>
    );
  }
  return (
    <VStack spacing={6} align="stretch" h="full">
      {/* Header */}
      <HStack justify="space-between" pb={4} borderBottom="1px" borderColor={borderColor}>
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="bold">Agent Settings</Text>
          {agent && <Badge colorScheme="blue">{agent.name}</Badge>}
        </VStack>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              console.log('🔄 Manual refresh triggered for agent:', agent?.id);
              // Call the loadAgentSettings function directly
              const loadAgentSettings = async () => {
                if (agent) {
                  setIsLoading(true);
                  setError(null); // Clear any previous errors
                  try {
                    const response = await fetch(`/api/agent-settings?agentId=${agent.id}`);
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success && data.settings) {
                        setConfig(data.settings);
                        console.log('✅ Settings refreshed');
                      } else {
                        throw new Error(`No configuration found for agent: ${agent.id}`);
                      }
                    } else {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                  } catch (error) {
                    console.error('❌ Error refreshing:', error);
                    setError(`Unable to load agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}. Please check API connectivity.`);
                  } finally {
                    setIsLoading(false);
                  }
                }
              };
              loadAgentSettings();
            }}
          >
            🔄 Refresh
          </Button>
          <Button
            onClick={handleSave}
            colorScheme="blue"
            isLoading={isSaving}
            loadingText="Saving..."
          >
            Save Settings
          </Button>
        </HStack>
      </HStack>

      {/* Error Display */}
      {error && (
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={1} flex={1}>
            <Text fontWeight="bold">Configuration Load Failed</Text>
            <Text fontSize="sm">{error}</Text>
            <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
              Ensure the agent settings API is accessible at /api/agent-settings
            </Text>
          </VStack>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <Alert status="info">
          <Spinner size="sm" mr={3} />
          <Text>Loading agent configuration...</Text>
        </Alert>
      )}

      {/* Settings Content */}
      <Box flex={1} overflowY="auto">
        <Tabs>
          <TabList>
            <Tab>Core</Tab>
            <Tab>Model & Generation</Tab>
            <Tab>Safety & Callbacks</Tab>
            <Tab>Tools & Agents</Tab>
            <Tab>A2A Protocol</Tab>
            <Tab>Advanced</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Agent Name</FormLabel>
                  <Input
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({...prev, name: e.target.value}))}
                    placeholder="e.g., customer_support_agent"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Agent Class</FormLabel>
                  <Select
                    value={config.agentClass}
                    onChange={(e) => setConfig(prev => ({...prev, agentClass: e.target.value as any}))}
                  >
                    {agentClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </Select>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    LlmAgent: Standard AI agent | WorkflowAgent: Multi-step workflows | CustomAgent: Custom logic
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                    placeholder="A concise summary of the agent's purpose and capabilities"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Used by other agents for delegation decisions in multi-agent systems
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel>System Instructions</FormLabel>
                  <Textarea
                    value={config.instruction}
                    onChange={(e) => setConfig(prev => ({...prev, instruction: e.target.value}))}
                    rows={8}
                    fontFamily="mono"
                    fontSize="sm"
                    placeholder="You are a helpful assistant that..."
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Detailed instructions defining the agent's behavior, persona, and guidelines
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel>Output Key (Optional)</FormLabel>
                  <Input
                    value={config.outputKey}
                    onChange={(e) => setConfig(prev => ({...prev, outputKey: e.target.value}))}
                    placeholder="e.g., recommendation_result"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Automatically save agent response to session state with this key
                  </Text>
                </FormControl>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4}>
                {/* Model Registry Status */}
                {(modelsError || modelsLoading) && (
                  <Alert status={modelsError ? "warning" : "info"} size="sm">
                    <AlertIcon />
                    <AlertDescription>
                      {modelsError 
                        ? `Model registry error: ${modelsError}. Using fallback models.`
                        : "Loading model registry..."
                      }
                    </AlertDescription>
                  </Alert>
                )}

                <FormControl>
                  <HStack justify="space-between">
                    <FormLabel>Language Model</FormLabel>
                    <HStack spacing={2}>
                      {/* Provider Status Badges */}
                      {providers.ollama.available && (
                        <Tooltip label={`Ollama: ${providers.ollama.models.length} models`}>
                          <Badge colorScheme="green" size="sm">Ollama</Badge>
                        </Tooltip>
                      )}
                      {providers.openai.available && (
                        <Tooltip label={`OpenAI: ${providers.openai.models.length} models`}>
                          <Badge colorScheme="blue" size="sm">OpenAI</Badge>
                        </Tooltip>
                      )}
                      {providers.anthropic.available && (
                        <Tooltip label={`Anthropic: ${providers.anthropic.models.length} models`}>
                          <Badge colorScheme="purple" size="sm">Anthropic</Badge>
                        </Tooltip>
                      )}
                      {providers.google.available && (
                        <Tooltip label={`Google Gemini: ${providers.google.models.length} models`}>
                          <Badge colorScheme="orange" size="sm">Gemini</Badge>
                        </Tooltip>
                      )}
                      
                      {/* Refresh Button */}
                      <Tooltip label="Refresh model registry">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={refreshModels}
                          isLoading={modelsLoading}
                        >
                          <Icon as={FiRefreshCw} />
                        </Button>
                      </Tooltip>
                    </HStack>  
                  </HStack>
                  
                  <Select
                    key={`model-select-${agent?.id}-${config.model}`}
                    value={config.model}
                    onChange={(e) => setConfig(prev => ({...prev, model: e.target.value}))}
                  >
                    {/* Group models by provider */}
                    {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                      <optgroup key={provider} label={provider.toUpperCase()}>
                        {providerModels.map(model => {
                          const modelInfo = getModelById(model.id);
                          return (
                            <option key={model.id} value={model.id}>
                              {model.name || model.id}
                              {modelInfo?.parameters && ` (${modelInfo.parameters}B)`}
                              {modelInfo?.status === 'unavailable' && ' - Unavailable'}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                    
                    {/* Fallback: flat list if no provider grouping */}
                    {Object.keys(modelsByProvider).length === 0 && models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </Select>
                  
                  {/* Show selected model info */}
                  {(() => {
                    const selectedModel = getModelById(config.model);
                    return selectedModel ? (
                      <Box mt={2} p={2} bg={useSemanticToken('surface.base')} borderRadius="md" fontSize="xs">
                        <HStack justify="space-between">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">{selectedModel.provider.toUpperCase()}</Text>
                            <Text color={useSemanticToken('text.secondary')}>{selectedModel.metadata?.description}</Text>
                          </VStack>
                          <VStack align="end" spacing={0}>
                            {selectedModel.contextWindow && (
                              <Text>Context: {selectedModel.contextWindow.toLocaleString()}</Text>
                            )}
                            {selectedModel.costPer1kTokens && (
                              <Text>Cost: ${selectedModel.costPer1kTokens.input}/${selectedModel.costPer1kTokens.output}/1k</Text>
                            )}
                          </VStack>
                        </HStack>
                      </Box>
                    ) : (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        Choose the LLM that powers your agent's reasoning capabilities
                      </Text>
                    );
                  })()}
                </FormControl>

                <HStack spacing={4} align="start">
                  <FormControl flex={1}>
                    <FormLabel>Temperature: {config.temperature}</FormLabel>
                    <Slider
                      value={config.temperature}
                      onChange={(value) => setConfig(prev => ({...prev, temperature: value}))}
                      min={0}
                      max={2}
                      step={0.1}
                    >
                      <SliderTrack><SliderFilledTrack /></SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      Controls randomness: 0 = deterministic, 2 = very creative
                    </Text>
                  </FormControl>

                  <FormControl flex={1}>
                    <FormLabel>Top-P: {config.topP}</FormLabel>
                    <Slider
                      value={config.topP}
                      onChange={(value) => setConfig(prev => ({...prev, topP: value}))}
                      min={0.1}
                      max={1}
                      step={0.05}
                    >
                      <SliderTrack><SliderFilledTrack /></SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      Nucleus sampling: lower = more focused responses
                    </Text>
                  </FormControl>
                </HStack>

                <HStack spacing={4} align="start">
                  <FormControl flex={1}>
                    <FormLabel>Max Output Tokens: {config.maxTokens}</FormLabel>
                    <Slider
                      value={config.maxTokens}
                      onChange={(value) => setConfig(prev => ({...prev, maxTokens: value}))}
                      min={100}
                      max={8000}
                      step={100}
                    >
                      <SliderTrack><SliderFilledTrack /></SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      Maximum length of generated responses
                    </Text>
                  </FormControl>

                  <FormControl flex={1}>
                    <FormLabel>Top-K: {config.topK}</FormLabel>
                    <Slider
                      value={config.topK}
                      onChange={(value) => setConfig(prev => ({...prev, topK: value}))}
                      min={1}
                      max={100}
                      step={1}
                    >
                      <SliderTrack><SliderFilledTrack /></SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      Limits vocabulary: lower = more focused word choice
                    </Text>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel>Thinking Budget: {config.thinkingBudget}</FormLabel>
                  <Slider
                    value={config.thinkingBudget}
                    onChange={(value) => setConfig(prev => ({...prev, thinkingBudget: value}))}
                    min={1000}
                    max={50000}
                    step={1000}
                  >
                    <SliderTrack><SliderFilledTrack /></SliderTrack>
                    <SliderThumb />
                  </Slider>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Guides model on reasoning depth (for thinking-enabled models)
                  </Text>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Enable Streaming</FormLabel>
                  <Switch
                    isChecked={config.streamingEnabled}
                    onChange={(e) => setConfig(prev => ({...prev, streamingEnabled: e.target.checked}))}
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} ml={3}>
                    Stream responses as they're generated for better UX
                  </Text>
                </FormControl>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={6}>
                <Text fontSize="lg" fontWeight="bold">Safety Settings</Text>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb="0">Enable Safety Guardrails</FormLabel>
                  <Switch
                    isChecked={config.safetyEnabled}
                    onChange={(e) => setConfig(prev => ({...prev, safetyEnabled: e.target.checked}))}
                  />
                </FormControl>

                {config.safetyEnabled && (
                  <VStack spacing={4} w="full" p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
                    <Text fontSize="md" fontWeight="medium">Harm Category Settings</Text>
                    {config.safetySettings.map((setting, index) => (
                      <HStack key={index} w="full" spacing={4}>
                        <Select
                          value={setting.harmCategory}
                          onChange={(e) => {
                            const newSettings = [...config.safetySettings];
                            newSettings[index].harmCategory = e.target.value;
                            setConfig(prev => ({...prev, safetySettings: newSettings}));
                          }}
                          flex={1}
                        >
                          {harmCategories.map(category => (
                            <option key={category} value={category}>
                              {category.replace('HARM_CATEGORY_', '').replace('_', ' ')}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={setting.threshold}
                          onChange={(e) => {
                            const newSettings = [...config.safetySettings];
                            newSettings[index].threshold = e.target.value;
                            setConfig(prev => ({...prev, safetySettings: newSettings}));
                          }}
                          flex={1}
                        >
                          {thresholds.map(threshold => (
                            <option key={threshold} value={threshold}>
                              {threshold.replace('BLOCK_', '').replace('_', ' ')}
                            </option>
                          ))}
                        </Select>
                      </HStack>
                    ))}
                    <Button
                      size="sm"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          safetySettings: [...prev.safetySettings, {
                            harmCategory: 'HARM_CATEGORY_HARASSMENT',
                            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                          }]
                        }));
                      }}
                    >
                      Add Safety Setting
                    </Button>
                  </VStack>
                )}

                <Text fontSize="lg" fontWeight="bold" mt={6}>Callback Hooks</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Enable callbacks to intercept and modify agent behavior at key execution points
                </Text>

                <VStack spacing={3} align="start">
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Before Model Callback</FormLabel>
                    <Switch
                      isChecked={config.callbacks?.beforeModel || false}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        callbacks: {
                          beforeModel: e.target.checked,
                          beforeTool: prev.callbacks?.beforeTool || false,
                          afterModel: prev.callbacks?.afterModel || false
                        }
                      }))}
                    />
                  </FormControl>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Execute before sending requests to the LLM (input validation, profanity filtering)
                  </Text>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Before Tool Callback</FormLabel>
                    <Switch
                      isChecked={config.callbacks?.beforeTool || false}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        callbacks: {
                          beforeModel: prev.callbacks?.beforeModel || false,
                          beforeTool: e.target.checked,
                          afterModel: prev.callbacks?.afterModel || false
                        }
                      }))}
                    />
                  </FormControl>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Execute before tool calls (authorization, parameter validation)
                  </Text>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">After Model Callback</FormLabel>
                    <Switch
                      isChecked={config.callbacks?.afterModel || false}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        callbacks: {
                          beforeModel: prev.callbacks?.beforeModel || false,
                          beforeTool: prev.callbacks?.beforeTool || false,
                          afterModel: e.target.checked
                        }
                      }))}
                    />
                  </FormControl>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Execute after model responses (logging, monitoring, post-processing)
                  </Text>
                </VStack>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={6}>
                <Text fontSize="lg" fontWeight="bold">Tools Configuration</Text>
                
                <FormControl>
                  <FormLabel>Available Tools</FormLabel>
                  <Textarea
                    value={(config.tools || []).join('\n')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tools: e.target.value.split('\n').filter(tool => tool.trim())
                    }))}
                    rows={6}
                    placeholder="google_search&#10;custom_calculator&#10;database_query&#10;..."
                    fontFamily="mono"
                    fontSize="sm"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    List of tools this agent can use (one per line). Include built-in ADK tools or custom functions.
                  </Text>
                </FormControl>

                <Text fontSize="lg" fontWeight="bold" mt={6}>Sub-Agents</Text>
                
                <FormControl>
                  <FormLabel>Delegated Agents</FormLabel>
                  <Textarea
                    value={(config.subAgents || []).join('\n')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      subAgents: e.target.value.split('\n').filter(agent => agent.trim())
                    }))}
                    rows={4}
                    placeholder="billing_specialist&#10;technical_support&#10;escalation_agent&#10;..."
                    fontFamily="mono"
                    fontSize="sm"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Other agents this agent can delegate tasks to (one per line)
                  </Text>
                </FormControl>

                <Text fontSize="lg" fontWeight="bold" mt={6}>Features</Text>
                
                <VStack spacing={3} align="start">
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Voice Interaction</FormLabel>
                    <Switch
                      isChecked={config.voiceEnabled}
                      onChange={(e) => setConfig(prev => ({...prev, voiceEnabled: e.target.checked}))}
                    />
                  </FormControl>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Enable voice input/output capabilities for this agent
                  </Text>

                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Session Memory</FormLabel>
                    <Switch
                      isChecked={config.sessionMemory}
                      onChange={(e) => setConfig(prev => ({...prev, sessionMemory: e.target.checked}))}
                    />
                  </FormControl>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Persist conversation context and learned information across sessions
                  </Text>
                </VStack>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={6}>
                <Text fontSize="lg" fontWeight="bold">A2A Protocol Configuration</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Configure Agent-to-Agent (A2A) communication protocol settings for multi-agent collaboration
                </Text>

                {/* Connection Configuration */}
                <Box w="full">
                  <Text fontSize="md" fontWeight="semibold" mb={3}>Connection Settings</Text>
                  <VStack spacing={4} align="start">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable A2A Protocol</FormLabel>
                      <Switch
                        isChecked={config.a2aConfig?.enabled ?? true}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, enabled: e.target.checked }
                        }))}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>A2A Endpoint Path</FormLabel>
                      <Input
                        value={config.a2aConfig?.endpoint ?? '/a2a/message'}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, endpoint: e.target.value }
                        }))}
                        placeholder="/a2a/message"
                      />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        HTTP endpoint path for A2A message handling
                      </Text>
                    </FormControl>

                    <HStack spacing={4} w="full">
                      <FormControl flex={1}>
                        <FormLabel>Protocol Version</FormLabel>
                        <Select
                          value={config.a2aConfig?.protocolVersion ?? '1.0'}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            a2aConfig: { ...prev.a2aConfig!, protocolVersion: e.target.value as '1.0' | '2.0' }
                          }))}
                        >
                          <option value="1.0">1.0 (Stable)</option>
                          <option value="2.0">2.0 (Latest)</option>
                        </Select>
                      </FormControl>

                      <FormControl flex={1}>
                        <FormLabel>Message Timeout (ms)</FormLabel>
                        <NumberInput
                          value={config.a2aConfig?.messageTimeout ?? 30000}
                          onChange={(_, val) => setConfig(prev => ({
                            ...prev,
                            a2aConfig: { ...prev.a2aConfig!, messageTimeout: val }
                          }))}
                          min={1000}
                          max={120000}
                          step={1000}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>

                      <FormControl flex={1}>
                        <FormLabel>Max Retries</FormLabel>
                        <NumberInput
                          value={config.a2aConfig?.maxRetries ?? 3}
                          onChange={(_, val) => setConfig(prev => ({
                            ...prev,
                            a2aConfig: { ...prev.a2aConfig!, maxRetries: val }
                          }))}
                          min={0}
                          max={10}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                    </HStack>
                  </VStack>
                </Box>

                {/* Discovery & Registration */}
                <Box w="full">
                  <Text fontSize="md" fontWeight="semibold" mb={3}>Discovery & Registration</Text>
                  <VStack spacing={4} align="start">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Auto-Register with Orchestrator</FormLabel>
                      <Switch
                        isChecked={config.a2aConfig?.autoRegister ?? true}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, autoRegister: e.target.checked }
                        }))}
                      />
                    </FormControl>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Automatically register this agent with the orchestrator on startup
                    </Text>

                    <FormControl>
                      <FormLabel>Orchestrator URL</FormLabel>
                      <Input
                        value={config.a2aConfig?.orchestratorUrl ?? 'http://localhost:41240'}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, orchestratorUrl: e.target.value }
                        }))}
                        placeholder="http://localhost:41240"
                      />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        Central orchestrator endpoint for agent discovery and coordination
                      </Text>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Heartbeat Interval: {(config.a2aConfig?.heartbeatInterval ?? 30000) / 1000}s</FormLabel>
                      <Slider
                        value={config.a2aConfig?.heartbeatInterval ?? 30000}
                        onChange={(val) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, heartbeatInterval: val }
                        }))}
                        min={10000}
                        max={120000}
                        step={5000}
                      >
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        Health check frequency for agent availability monitoring
                      </Text>
                    </FormControl>
                  </VStack>
                </Box>

                {/* Security Settings */}
                <Box w="full">
                  <Text fontSize="md" fontWeight="semibold" mb={3}>Security Settings</Text>
                  <VStack spacing={4} align="start">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Require Authentication</FormLabel>
                      <Switch
                        isChecked={config.a2aConfig?.requireAuthentication ?? false}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, requireAuthentication: e.target.checked }
                        }))}
                      />
                    </FormControl>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Require authentication tokens for incoming A2A messages
                    </Text>

                    <FormControl>
                      <FormLabel>Allowed Senders (Agent IDs)</FormLabel>
                      <Textarea
                        value={(config.a2aConfig?.allowedSenders || []).join('\n')}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { 
                            ...prev.a2aConfig!, 
                            allowedSenders: e.target.value.split('\n').filter(id => id.trim())
                          }
                        }))}
                        rows={3}
                        placeholder="orchestrator-agent&#10;graph-query-agent&#10;memory-agent"
                        fontFamily="mono"
                        fontSize="sm"
                      />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                        Whitelist of agent IDs allowed to send A2A messages (leave empty for all)
                      </Text>
                    </FormControl>
                  </VStack>
                </Box>

                {/* Reliability & Error Handling */}
                <Box w="full">
                  <Text fontSize="md" fontWeight="semibold" mb={3}>Reliability & Error Handling</Text>
                  <VStack spacing={4} align="start">
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Enable Circuit Breaker</FormLabel>
                      <Switch
                        isChecked={config.a2aConfig?.enableCircuitBreaker ?? true}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          a2aConfig: { ...prev.a2aConfig!, enableCircuitBreaker: e.target.checked }
                        }))}
                      />
                    </FormControl>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      Automatically stop sending messages to failing agents to prevent cascading failures
                    </Text>

                    <HStack spacing={4} w="full">
                      <FormControl flex={1}>
                        <FormLabel>Failure Threshold</FormLabel>
                        <NumberInput
                          value={config.a2aConfig?.circuitBreakerThreshold ?? 5}
                          onChange={(_, val) => setConfig(prev => ({
                            ...prev,
                            a2aConfig: { ...prev.a2aConfig!, circuitBreakerThreshold: val }
                          }))}
                          min={1}
                          max={20}
                        >
                          <NumberInputField />
                        </NumberInput>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                          Consecutive failures before opening circuit
                        </Text>
                      </FormControl>

                      <FormControl flex={1}>
                        <FormLabel>Circuit Timeout (ms)</FormLabel>
                        <NumberInput
                          value={config.a2aConfig?.circuitBreakerTimeout ?? 60000}
                          onChange={(_, val) => setConfig(prev => ({
                            ...prev,
                            a2aConfig: { ...prev.a2aConfig!, circuitBreakerTimeout: val }
                          }))}
                          min={10000}
                          max={300000}
                          step={10000}
                        >
                          <NumberInputField />
                        </NumberInput>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                          Time before attempting retry
                        </Text>
                      </FormControl>
                    </HStack>
                  </VStack>
                </Box>

                {/* Supported Message Types (Read-Only) */}
                <Box w="full">
                  <Text fontSize="md" fontWeight="semibold" mb={3}>Supported Message Types</Text>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>
                    This agent can process the following A2A message types:
                  </Text>
                  <Box p={3} bg={useSemanticToken('surface.base')} borderRadius="md" fontFamily="mono" fontSize="xs">
                    {(config.a2aConfig?.supportedMessageTypes || []).map((type, idx) => (
                      <Badge key={idx} mr={2} mb={2} colorScheme="blue" variant="subtle">
                        {type}
                      </Badge>
                    ))}
                  </Box>
                </Box>

                {/* Test Connectivity */}
                <Box w="full">
                  <Button
                    colorScheme="green"
                    onClick={async () => {
                      try {
                        const testMessage = {
                          type: 'health_check',
                          messageId: `test-${Date.now()}`,
                          senderId: 'dashboard-settings',
                          timestamp: new Date().toISOString(),
                          payload: {}
                        };
                        
                        const response = await fetch(`${config.a2aConfig?.orchestratorUrl}/a2a/message`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(testMessage)
                        });
                        
                        if (response.ok) {
                          alert('✅ A2A connectivity test successful!');
                        } else {
                          alert(`❌ A2A test failed: ${response.statusText}`);
                        }
                      } catch (error) {
                        alert(`❌ A2A test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                  >
                    Test A2A Connectivity
                  </Button>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={2}>
                    Send a test message to verify A2A protocol configuration
                  </Text>
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack spacing={4}>
                <Text fontSize="lg" fontWeight="bold">Advanced Configuration</Text>
                
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Advanced settings for power users and specialized use cases
                </Text>

                <FormControl>
                  <FormLabel>Custom Configuration (JSON)</FormLabel>
                  <Textarea
                    rows={8}
                    fontFamily="mono"
                    fontSize="sm"
                    placeholder='{"custom_param": "value", "advanced_setting": true}'
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Additional configuration parameters in JSON format
                  </Text>
                </FormControl>

                <Text fontSize="md" fontWeight="medium" mt={4}>Export Configuration</Text>
                <Button
                  onClick={() => {
                    const yamlConfig = `# ADK Agent Configuration
name: ${config.name}
model: ${config.model}
description: "${config.description}"
instruction: |
  ${config.instruction}
${config.outputKey ? `output_key: ${config.outputKey}` : ''}
${config.tools.length > 0 ? `tools:\n${config.tools.map(tool => `  - name: ${tool}`).join('\n')}` : ''}
generate_content_config:
  temperature: ${config.temperature}
  max_output_tokens: ${config.maxTokens}
  top_p: ${config.topP}
  top_k: ${config.topK}
${config.thinkingBudget > 0 ? `  thinking_budget: ${config.thinkingBudget}` : ''}
${config.safetyEnabled ? `  safety_settings:\n${config.safetySettings.map(s => `    - category: ${s.harmCategory}\n      threshold: ${s.threshold}`).join('\n')}` : ''}`;
                    
                    const blob = new Blob([yamlConfig], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${config.name || 'agent'}_config.yaml`;
                    a.click();
                  }}
                >
                  Export as ADK YAML
                </Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </VStack>
  );
};
