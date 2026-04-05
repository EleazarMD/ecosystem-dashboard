/**
 * LLM Providers Management Page
 * Comprehensive provider configuration with ecosystem mapping
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  SimpleGrid,
  Icon,
  Badge,
  
  useDisclosure,
  Collapse,
  IconButton,
  Progress,
  Divider,
  Code,
  Alert,
  AlertIcon,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiChevronDown,
  FiChevronRight,
  FiEdit,
  FiTrash2,
  FiZap,
  FiDollarSign,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
  FiServer,
  FiGitBranch,
  FiKey,
} from 'react-icons/fi';
import { ProviderOnboardingWizard } from '../provider-onboarding';
import { useRightPanel } from '@/contexts/RightPanelContext';
import RequestTopologyPage from './RequestTopologyPage';
import EcosystemTopology from './EcosystemTopology';
import { ModelDetailsPanel } from './ModelDetailsPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Provider {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  models: {
    id: string;
    name: string;
    useCases: string[];
  }[];
  projects: {
    id: string;
    name: string;
    services: string[];
  }[];
  endpoints: string[];
  dailyCost: number;
  dailyLimit: number;
  requestsPerMinute: number;
  requestLimit: number;
  apiKeyConfigured: boolean;
}

export const LLMProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{success: boolean; message: string} | null>(null);

  const { isOpen: isWizardOpen, onOpen: onWizardOpen, onClose: onWizardClose } = useDisclosure();
  const { isOpen: isMetricsOpen, onOpen: onMetricsOpen, onClose: onMetricsClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  
  // Right panel integration
  const { setCustomData, setIsOpen: setRightPanelOpen, setContext } = useRightPanel();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const bgAccent = useSemanticToken('surface.base');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surface');

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    // Auto-select first provider when loaded
    if (providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0].id);
    }
  }, [providers, selectedProvider]);
  
  // Update right panel when connection status or testing state changes
  useEffect(() => {
    if (selectedProvider) {
      const provider = providers.find(p => p.id === selectedProvider);
      if (provider) {
        setCustomData({
          provider,
          connectionStatus,
          isTestingConnection: testingConnection,
          onTestConnection: handleTestConnection,
          onEditConfiguration: handleEditConfiguration,
          onViewMetrics: handleViewMetrics,
        });
      }
    }
  }, [connectionStatus, testingConnection, selectedProvider, providers]);

  const loadProviders = async () => {
    setLoading(true);
    console.log('[Load Providers] Starting to load providers...');
    
    try {
      const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
      const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';
      
      console.log('[Load Providers] Fetching from:', `${AI_INFERENCING_URL}/api/v1/admin/providers`);
      
      // Fetch providers
      const providersResponse = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/providers`, {
        headers: { 'X-Admin-Key': ADMIN_KEY }
      });
      
      console.log('[Load Providers] Response status:', providersResponse.status);
      
      if (!providersResponse.ok) {
        console.warn('[Load Providers] Failed to fetch providers from API, using mock data');
        setProviders(getMockProviders());
        return;
      }

      const providersData = await providersResponse.json();
      
      // Transform API data to match component interface
      const transformedProviders = await Promise.all(
        providersData.providers.map(async (apiProvider: any) => {
          // Fetch models for this provider
          let models = [];
          try {
            const modelsResponse = await fetch(
              `${AI_INFERENCING_URL}/api/v1/admin/providers/${apiProvider.provider_id}/models`,
              { headers: { 'X-Admin-Key': ADMIN_KEY } }
            );
            if (modelsResponse.ok) {
              const modelsData = await modelsResponse.json();
              models = modelsData.models.map((m: any) => ({
                id: m.model_id,
                name: m.display_name,
                useCases: m.recommended_for || []
              }));
            }
          } catch (err) {
            console.warn(`Failed to fetch models for ${apiProvider.provider_id}:`, err);
          }

          return {
            id: apiProvider.provider_id,
            name: apiProvider.display_name,
            status: apiProvider.is_active ? 'active' : 'inactive',
            models,
            projects: [], // TODO: Fetch from API keys service
            endpoints: [], // TODO: Fetch from endpoints API
            dailyCost: 0, // TODO: Calculate from usage API
            dailyLimit: apiProvider.default_rpd_limit || 0,
            requestsPerMinute: apiProvider.default_rpm_limit || 0,
            requestLimit: apiProvider.default_rpm_limit || 60,
            apiKeyConfigured: false // TODO: Check from API keys service
          };
        })
      );
      
      console.log('[Load Providers] Successfully loaded', transformedProviders.length, 'providers');
      console.log('[Load Providers] Providers:', transformedProviders.map(p => ({ id: p.id, name: p.name, models: p.models.length })));
      setProviders(transformedProviders);
    } catch (error) {
      console.error('[Load Providers] Error:', error);
      console.log('[Load Providers] Falling back to mock data');
      setProviders(getMockProviders());
    } finally {
      setLoading(false);
      console.log('[Load Providers] Loading complete');
    }
  };

  const selectProvider = (providerId: string) => {
    const newProvider = providerId === selectedProvider ? null : providerId;
    setSelectedProvider(newProvider);
    
    // Clear connection status when switching providers
    setConnectionStatus(null);
    console.log('[Provider Selection] Switched to provider:', providerId, '- cleared connection status');
    
    // Update right panel with provider data
    if (newProvider) {
      const provider = providers.find(p => p.id === newProvider);
      if (provider) {
        setContext('ai-inferencing');
        setCustomData({
          provider,
          connectionStatus,
          isTestingConnection: testingConnection,
          onTestConnection: handleTestConnection,
          onEditConfiguration: handleEditConfiguration,
          onViewMetrics: handleViewMetrics,
        });
        setRightPanelOpen(true);
      }
    } else {
      setRightPanelOpen(false);
    }
  };

  const handleModelClick = (model: any, provider: Provider) => {
    console.log('[Model Click] Opening model details for:', model.name, 'from provider:', provider.name);
    
    // Open right panel with model details (keep ai-inferencing context)
    setCustomData({
      type: 'model-details',
      model: {
        id: model.id,
        name: model.name,
        provider: provider.name,
        useCases: model.useCases,
      },
      onClose: () => {
        // Return to provider view
        selectProvider(provider.id);
      },
    });
    setRightPanelOpen(true);
  };

  const handleProviderAdded = async (config: any) => {
    console.log('[handleProviderAdded] Starting deployment with config:', config);
    
    try {
      const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
      const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';
      
      // Step 1: Create or get project
      let projectId = config.apiConfig?.projectId;
      
      if (config.apiConfig?.newProject) {
        console.log('[handleProviderAdded] Creating new project:', config.apiConfig.newProject.name);
        
        const projectResponse = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY
          },
          body: JSON.stringify({
            projectId: config.apiConfig.newProject.name.toLowerCase().replace(/\s+/g, '-'),
            name: config.apiConfig.newProject.name,
            description: config.apiConfig.newProject.description || ''
          })
        });
        
        if (!projectResponse.ok) {
          const error = await projectResponse.json();
          throw new Error(`Failed to create project: ${error.message || projectResponse.statusText}`);
        }
        
        const projectData = await projectResponse.json();
        projectId = projectData.project.project_id;
        console.log('[handleProviderAdded] Project created:', projectId);
      }
      
      // Step 2: Create service for each selected project
      const selectedProjects = config.projects || [projectId];
      
      for (const selectedProjectId of selectedProjects) {
        const serviceId = `${config.provider.id}-${selectedProjectId}-${Date.now()}`;
        
        console.log('[handleProviderAdded] Creating service:', serviceId, 'in project:', selectedProjectId);
        
        const serviceResponse = await fetch(
          `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${selectedProjectId}/services`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': ADMIN_KEY
            },
            body: JSON.stringify({
              serviceId: serviceId,
              name: `${config.provider.name} Service`,
              description: `Auto-generated service for ${config.provider.name} provider`
            })
          }
        );
        
        if (!serviceResponse.ok) {
          const error = await serviceResponse.json();
          console.error('[handleProviderAdded] Failed to create service:', error);
          throw new Error(`Failed to create service: ${error.message || serviceResponse.statusText}`);
        }
        
        const serviceData = await serviceResponse.json();
        console.log('[handleProviderAdded] Service created:', serviceData);
        
        // Step 3: Add API key to the service
        console.log('[handleProviderAdded] Adding API key for provider:', config.provider.id);
        
        const keyResponse = await fetch(
          `${AI_INFERENCING_URL}/api/v1/admin/keys/services/${serviceId}/keys`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': ADMIN_KEY
            },
            body: JSON.stringify({
              provider: config.provider.id,
              apiKey: config.apiConfig.apiKey,
              isPrimary: true,
              rateLimitPerMinute: config.apiConfig?.rateLimits?.requestsPerMinute,
              costLimitDaily: config.apiConfig?.costLimits?.dailyMax,
              displayName: config.apiConfig?.apiKeyName || `${config.provider.name} API Key`,
              metadata: {
                models: config.models?.map((m: any) => m.modelId) || [],
                addedVia: 'onboarding-wizard',
                addedAt: new Date().toISOString()
              }
            })
          }
        );
        
        if (!keyResponse.ok) {
          const error = await keyResponse.json();
          console.error('[handleProviderAdded] Failed to add API key:', error);
          throw new Error(`Failed to add API key: ${error.message || keyResponse.statusText}`);
        }
        
        const keyData = await keyResponse.json();
        console.log('[handleProviderAdded] API key added:', keyData);
      }
      
      console.log('[handleProviderAdded] ✅ Provider deployment complete!');
      
      // Reload providers and close wizard
      await loadProviders();
      onWizardClose();
      
    } catch (error) {
      console.error('[handleProviderAdded] ❌ Deployment failed:', error);
      alert(`Failed to deploy provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't close wizard on error so user can retry
    }
  };

  const handleTestConnection = async () => {
    if (!currentProvider) {
      console.warn('[Test Connection] No provider selected');
      return;
    }
    
    console.log('[Test Connection] Testing connection for provider:', currentProvider.id);
    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
      const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';
      
      const url = `${AI_INFERENCING_URL}/api/v1/admin/providers/${currentProvider.id}/stats`;
      console.log('[Test Connection] Fetching:', url);
      console.log('[Test Connection] Using admin key:', ADMIN_KEY.substring(0, 10) + '...');
      
      // Test by fetching provider stats
      const response = await fetch(url, { 
        headers: { 'X-Admin-Key': ADMIN_KEY },
        mode: 'cors'
      });
      
      console.log('[Test Connection] Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Test Connection] Success! Data:', data);
        
        setConnectionStatus({
          success: true,
          message: `✅ Connected successfully! Found ${data.stats.model_count} models and ${data.stats.endpoint_count} endpoints. Average cost: $${parseFloat(data.stats.avg_input_cost).toFixed(4)}/1K input tokens.`
        });
      } else {
        const errorText = await response.text();
        console.error('[Test Connection] Failed:', response.status, errorText);
        
        setConnectionStatus({
          success: false,
          message: `❌ Connection failed (${response.status}). Please check your configuration.`
        });
      }
    } catch (error) {
      console.error('[Test Connection] Error:', error);
      
      setConnectionStatus({
        success: false,
        message: `❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}. Check browser console for details.`
      });
    } finally {
      setTestingConnection(false);
      console.log('[Test Connection] Test completed');
    }
  };

  const handleEditConfiguration = () => {
    // TODO: Implement edit modal
    alert(`Edit configuration for ${currentProvider?.name}\n\nThis will open a configuration editor (to be implemented)`);
  };

  const handleViewMetrics = () => {
    // TODO: Implement metrics modal or navigate to metrics page
    alert(`View metrics for ${currentProvider?.name}\n\nThis will show detailed usage analytics (to be implemented)`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'gray';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <>
      <HStack spacing={0} align="stretch" h="100%" w="100%">
        {/* Left Sidebar - Provider List */}
        <VStack
          w="320px"
          minW="320px"
          h="calc(100vh - 60px)"
          maxH="calc(100vh - 60px)"
          borderRightWidth="1px"
          borderColor={borderColor}
          bg={cardBg}
          spacing={0}
          align="stretch"
          position="sticky"
          top={0}
          flexShrink={0}
        >
        {/* Header */}
        <Box p={5} borderBottomWidth="1px" borderColor={borderColor}>
          <Heading size="sm" fontWeight="600" mb={1}>
            LLM Providers
          </Heading>
          <Text color={subtleText} fontSize="xs">
            {providers.length} configured
          </Text>
        </Box>

        {/* Provider List */}
        <VStack spacing={0} align="stretch" overflowY="auto" flex="1">
          {providers.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            
            return (
              <Box
                key={provider.id}
                p={3}
                cursor="pointer"
                bg={isSelected ? selectedBg : 'transparent'}
                borderBottomWidth="1px"
                borderColor={borderColor}
                onClick={() => selectProvider(provider.id)}
                _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                transition="background 0.2s"
              >
                <VStack align="start" spacing={1.5}>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                      {provider.name}
                    </Text>
                    {provider.apiKeyConfigured && (
                      <Icon as={FiKey} boxSize={3} color={useSemanticToken('text.tertiary')} flexShrink={0} />
                    )}
                  </HStack>
                  <Badge colorScheme={getStatusColor(provider.status)} fontSize="2xs" alignSelf="flex-start">
                    {provider.status}
                  </Badge>
                  <HStack spacing={2} fontSize="2xs" color={subtleText} flexWrap="wrap">
                    <Text>{provider.models.length} models</Text>
                    <Text>•</Text>
                    <Text>{provider.projects.length} proj</Text>
                  </HStack>
                  <Text fontSize="2xs" color={subtleText} fontWeight="500">
                    {formatCost(provider.dailyCost)}/day
                  </Text>
                </VStack>
              </Box>
            );
          })}

          {providers.length === 0 && !loading && (
            <VStack spacing={4} p={8}>
              <Icon as={FiServer} boxSize={12} color={subtleText} />
              <Text color={subtleText} fontSize="sm" textAlign="center">
                No providers configured
              </Text>
            </VStack>
          )}
        </VStack>

        {/* Add Provider Footer */}
        <Box 
          p={3} 
          borderTopWidth="1px" 
          borderColor={borderColor}
          bg={useSemanticToken('surface.elevated')}
        >
          <HStack spacing={2}>
            <IconButton
              aria-label="Add Provider"
              icon={<Icon as={FiPlus} boxSize={3.5} />}
              onClick={onWizardOpen}
              size="sm"
              variant="outline"
              borderColor={borderColor}
              _hover={{
                bg: hoverBg,
              }}
              transition="all 0.2s"
            />
            <Text fontSize="xs" fontWeight="500" color={subtleText}>
              Add Provider
            </Text>
          </HStack>
        </Box>
      </VStack>

      {/* Right Panel - Provider Details */}
      <Box flex="1" bg={bgAccent} overflowY="auto">
        {currentProvider ? (
          <VStack spacing={6} align="stretch" p={8} maxW="1400px" mx="auto" w="100%" minH="calc(100vh - 60px)">
            {/* Provider Header */}
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <HStack>
                  <Heading size="lg" fontWeight="600">
                    {currentProvider.name}
                  </Heading>
                  <Badge colorScheme={getStatusColor(currentProvider.status)} fontSize="sm">
                    {currentProvider.status}
                  </Badge>
                </HStack>
                <Text color={subtleText} fontSize="sm">
                  {currentProvider.models.length} models • {currentProvider.projects.length} projects • {formatCost(currentProvider.dailyCost)}/day
                </Text>
              </VStack>

              <HStack spacing={2}>
                <Tooltip label="Edit Configuration">
                  <IconButton
                    aria-label="Configure"
                    icon={<FiEdit />}
                    size="sm"
                    variant="outline"
                  />
                </Tooltip>
                <Tooltip label="Delete Provider">
                  <IconButton
                    aria-label="Delete"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                  />
                </Tooltip>
              </HStack>
            </HStack>

            {/* Tabs for Provider Details and Topology */}
            <Tabs colorScheme="blue" isLazy>
              <TabList>
                <Tab>Provider Details</Tab>
                <Tab>Request Topology</Tab>
              </TabList>

              <TabPanels>
                {/* Provider Details Tab */}
                <TabPanel px={0}>
                  <VStack spacing={6} align="stretch">
                    {/* Ecosystem Mapping */}
                    <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
              <Text fontSize="md" fontWeight="600" mb={6}>
                🗺️ Ecosystem Mapping
              </Text>
              <VStack align="stretch" spacing={6}>
                {currentProvider.models.map((model) => (
                  <Box 
                    key={model.id}
                    cursor="pointer"
                    p={3}
                    borderRadius="md"
                    transition="all 0.2s"
                    _hover={{ bg: hoverBg }}
                    onClick={() => handleModelClick(model, currentProvider)}
                  >
                    <HStack spacing={2} mb={3}>
                      <Icon as={FiZap} boxSize={5} color={useSemanticToken('text.secondary')} />
                      <Text fontSize="sm" fontWeight="600">
                        {model.name}
                      </Text>
                      <Badge colorScheme="blue" fontSize="xs" ml="auto">Click for details</Badge>
                    </HStack>
                    
                    <VStack align="stretch" spacing={4} pl={7}>
                      {/* Use Cases */}
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={2} textTransform="uppercase">
                          Use Cases
                        </Text>
                        <HStack spacing={2} flexWrap="wrap">
                          {model.useCases.map((useCase) => (
                            <Badge key={useCase} fontSize="xs" colorScheme="gray" variant="subtle">
                              {useCase}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>

                      {/* Projects */}
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={2} textTransform="uppercase">
                          Assigned Projects
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          {currentProvider.projects.map((project) => (
                            <HStack key={project.id} fontSize="sm">
                              <Icon as={FiGitBranch} boxSize={4} />
                              <Text fontWeight="500">{project.name}</Text>
                              <Text color={subtleText} fontSize="xs">
                                ({project.services.length} services)
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    </VStack>

                    {model.id !== currentProvider.models[currentProvider.models.length - 1].id && (
                      <Divider mt={6} />
                    )}
                  </Box>
                ))}
              </VStack>
            </Card>

            {/* Gateway Routes */}
            <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
              <Text fontSize="md" fontWeight="600" mb={4}>
                🌐 AI Gateway Endpoints
              </Text>
              <VStack align="stretch" spacing={3}>
                {currentProvider.endpoints.map((endpoint, index) => (
                  <HStack key={index} fontSize="sm">
                    <Badge colorScheme="gray" fontSize="xs" variant="outline">
                      POST
                    </Badge>
                    <Code fontSize="sm" colorScheme="gray" px={3} py={1}>
                      {endpoint}
                    </Code>
                  </HStack>
                ))}
              </VStack>
            </Card>

            {/* Cost & Rate Limits */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
              <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
                <Text fontSize="md" fontWeight="600" mb={4}>
                  💰 Daily Budget
                </Text>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text color={subtleText} fontSize="sm">Used</Text>
                    <Text fontWeight="600" fontSize="sm">
                      {formatCost(currentProvider.dailyCost)} / {formatCost(currentProvider.dailyLimit)}
                    </Text>
                  </HStack>
                  <Progress
                    value={(currentProvider.dailyCost / currentProvider.dailyLimit) * 100}
                    size="md"
                    colorScheme={(currentProvider.dailyCost / currentProvider.dailyLimit) * 100 > 80 ? 'red' : 'gray'}
                    borderRadius="full"
                  />
                  <Text fontSize="xs" color={subtleText}>
                    {((currentProvider.dailyCost / currentProvider.dailyLimit) * 100).toFixed(1)}% of daily limit
                  </Text>
                </VStack>
              </Card>

              <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
                <Text fontSize="md" fontWeight="600" mb={4}>
                  ⚡ Rate Limit
                </Text>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text color={subtleText} fontSize="sm">Current</Text>
                    <Text fontWeight="600" fontSize="sm">
                      {currentProvider.requestsPerMinute} / {currentProvider.requestLimit} req/min
                    </Text>
                  </HStack>
                  <Progress
                    value={(currentProvider.requestsPerMinute / currentProvider.requestLimit) * 100}
                    size="md"
                    colorScheme={(currentProvider.requestsPerMinute / currentProvider.requestLimit) * 100 > 80 ? 'orange' : 'gray'}
                    borderRadius="full"
                  />
                  <Text fontSize="xs" color={subtleText}>
                    {((currentProvider.requestsPerMinute / currentProvider.requestLimit) * 100).toFixed(1)}% of rate limit
                  </Text>
                </VStack>
              </Card>
                    </SimpleGrid>
                  </VStack>
                </TabPanel>

                {/* Request Topology Tab */}
                <TabPanel px={0}>
                  <RequestTopologyPage />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        ) : (
          <Box p={6} h="full">
            <EcosystemTopology />
          </Box>
        )}
      </Box>
    </HStack>

    {/* Provider Onboarding Wizard */}
    <ProviderOnboardingWizard
      isOpen={isWizardOpen}
      onClose={onWizardClose}
      onComplete={handleProviderAdded}
    />
  </>
  );
};

// Mock data for demo
function getMockProviders(): Provider[] {
  return [
    {
      id: 'openai',
      name: 'OpenAI',
      status: 'active',
      models: [
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          useCases: ['Code Generation', 'Complex Reasoning', 'Content Creation'],
        },
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          useCases: ['General Chat', 'Analysis', 'Creative Writing'],
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          useCases: ['Quick Tasks', 'General Chat', 'Simple Analysis'],
        },
      ],
      projects: [
        {
          id: 'podcast-studio',
          name: 'Podcast Studio',
          services: ['script-writer', 'content-generator'],
        },
        {
          id: 'ai-research',
          name: 'AI Research Assistant',
          services: ['deep-analysis', 'summarization'],
        },
      ],
      endpoints: [
        '/v1/openai/chat/completions',
        '/v1/openai/completions',
        '/v1/chat/completions',
      ],
      dailyCost: 18.75,
      dailyLimit: 75.0,
      requestsPerMinute: 35,
      requestLimit: 60,
      apiKeyConfigured: true,
    },
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      status: 'active',
      models: [
        {
          id: 'pplx-7b-online',
          name: 'Perplexity Online 7B',
          useCases: ['Deep Research', 'Quick Research', 'Current Events'],
        },
        {
          id: 'pplx-70b-online',
          name: 'Perplexity Online 70B',
          useCases: ['Deep Research', 'Complex Analysis'],
        },
      ],
      projects: [
        {
          id: 'podcast-studio',
          name: 'Podcast Studio',
          services: ['content-generator', 'research-assistant'],
        },
        {
          id: 'medgemma-clinical',
          name: 'MedGemma Clinical',
          services: ['diagnosis-support'],
        },
      ],
      endpoints: [
        '/v1/perplexity/chat/completions',
        '/v1/research/deep',
        '/v1/research/quick',
      ],
      dailyCost: 12.45,
      dailyLimit: 50.0,
      requestsPerMinute: 45,
      requestLimit: 60,
      apiKeyConfigured: true,
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      status: 'active',
      models: [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          useCases: ['Code Generation', 'Complex Problem Solving'],
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          useCases: ['General Tasks', 'Content Creation'],
        },
      ],
      projects: [
        {
          id: 'podcast-studio',
          name: 'Podcast Studio',
          services: ['script-writer'],
        },
      ],
      endpoints: [
        '/v1/anthropic/messages',
        '/v1/code/generate',
      ],
      dailyCost: 24.80,
      dailyLimit: 100.0,
      requestsPerMinute: 28,
      requestLimit: 50,
      apiKeyConfigured: true,
    },
    {
      id: 'groq',
      name: 'Groq',
      status: 'active',
      models: [
        {
          id: 'llama-3.1-70b-versatile',
          name: 'Llama 3.1 70B',
          useCases: ['Fast Inference', 'General Chat'],
        },
      ],
      projects: [
        {
          id: 'content-generator',
          name: 'Content Generator',
          services: ['quick-chat'],
        },
      ],
      endpoints: ['/v1/groq/chat/completions'],
      dailyCost: 3.20,
      dailyLimit: 25.0,
      requestsPerMinute: 15,
      requestLimit: 30,
      apiKeyConfigured: true,
    },
  ];
}
