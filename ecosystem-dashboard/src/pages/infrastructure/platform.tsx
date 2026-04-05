/**
 * Platform Management Page
 * 
 * Central control panel for managing Dashboard features, services,
 * agents, LLMs, and UI components.
 * 
 * This is the admin backend for controlling what features are available
 * to end users when the Dashboard is deployed.
 */

import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  SimpleGrid,
  Switch,
  Badge,
  Button,
  IconButton,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
  Divider,
  Input,
  Select,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardHeader,
  CardBody,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiServer,
  FiCpu,
  FiDatabase,
  FiSettings,
  FiRefreshCw,
  FiSave,
  FiChevronDown,
  FiChevronUp,
  FiActivity,
  FiLayout,
  FiLink,
  FiZap,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import {
  ServiceConfig,
  AgentConfig,
  LLMConfig,
  UIFeatureConfig,
  IntegrationConfig,
  SERVICE_CATEGORIES,
  AGENT_TYPES,
  LLM_PROVIDERS,
  UI_CATEGORIES,
} from '@/lib/platform/types';

const PlatformManagementPage: NextPage = () => {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const bgElevated = useSemanticToken('surface.elevated');
  
  const {
    config,
    loading,
    error,
    isDefault,
    reload,
    toggleService,
    toggleAgent,
    toggleLLM,
    setDefaultLLM,
    toggleUIFeature,
    toggleIntegration,
    updateGlobalSettings,
    resetToDefaults,
  } = usePlatformConfig();
  
  const handleToggle = async (
    type: 'service' | 'agent' | 'llm' | 'ui' | 'integration',
    id: string,
    enabled: boolean
  ) => {
    try {
      switch (type) {
        case 'service':
          await toggleService(id, enabled);
          break;
        case 'agent':
          await toggleAgent(id, enabled);
          break;
        case 'llm':
          await toggleLLM(id, enabled);
          break;
        case 'ui':
          await toggleUIFeature(id, enabled);
          break;
        case 'integration':
          await toggleIntegration(id, enabled);
          break;
      }
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${enabled ? 'enabled' : 'disabled'}`,
        status: 'success',
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: 'Failed to update',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" h="50vh">
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text>Loading platform configuration...</Text>
          </VStack>
        </Box>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <Head>
        <title>Platform Management | AI Homelab</title>
      </Head>
      
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">Platform Management</Heading>
              <Text color={textSecondary}>
                Control features, services, and capabilities for the Dashboard
              </Text>
            </Box>
            <HStack spacing={2}>
              {isDefault && (
                <Badge colorScheme="yellow">Using Defaults</Badge>
              )}
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                size="sm"
                onClick={reload}
              >
                Reload
              </Button>
              <Button
                leftIcon={<FiSave />}
                colorScheme="blue"
                size="sm"
                onClick={resetToDefaults}
              >
                Reset to Defaults
              </Button>
            </HStack>
          </HStack>
          
          {error && (
            <Alert status="warning">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {/* Overview Stats */}
          <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
            <StatCard
              label="Services"
              value={config?.services.filter(s => s.enabled).length || 0}
              total={config?.services.length || 0}
              icon={FiServer}
              color="blue"
            />
            <StatCard
              label="Agents"
              value={config?.agents.filter(a => a.enabled).length || 0}
              total={config?.agents.length || 0}
              icon={FiCpu}
              color="purple"
            />
            <StatCard
              label="LLMs"
              value={config?.llms.filter(l => l.enabled).length || 0}
              total={config?.llms.length || 0}
              icon={FiZap}
              color="green"
            />
            <StatCard
              label="UI Features"
              value={config?.uiFeatures.filter(f => f.enabled).length || 0}
              total={config?.uiFeatures.length || 0}
              icon={FiLayout}
              color="orange"
            />
            <StatCard
              label="Integrations"
              value={config?.integrations.filter(i => i.enabled).length || 0}
              total={config?.integrations.length || 0}
              icon={FiLink}
              color="cyan"
            />
            <StatCard
              label="Environment"
              value={config?.environment || 'dev'}
              icon={FiShield}
              color="gray"
            />
          </SimpleGrid>
          
          {/* Main Tabs */}
          <GlassPanel variant="light">
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList flexWrap="wrap">
                <Tab><HStack><FiServer /><Text>Services</Text></HStack></Tab>
                <Tab><HStack><FiCpu /><Text>Agents</Text></HStack></Tab>
                <Tab><HStack><FiZap /><Text>LLMs</Text></HStack></Tab>
                <Tab><HStack><FiLayout /><Text>UI Features</Text></HStack></Tab>
                <Tab><HStack><FiLink /><Text>Integrations</Text></HStack></Tab>
                <Tab><HStack><FiSettings /><Text>Global Settings</Text></HStack></Tab>
              </TabList>
              
              <TabPanels>
                {/* Services Tab */}
                <TabPanel>
                  <ServicesPanel
                    services={config?.services || []}
                    onToggle={(id, enabled) => handleToggle('service', id, enabled)}
                  />
                </TabPanel>
                
                {/* Agents Tab */}
                <TabPanel>
                  <AgentsPanel
                    agents={config?.agents || []}
                    onToggle={(id, enabled) => handleToggle('agent', id, enabled)}
                  />
                </TabPanel>
                
                {/* LLMs Tab */}
                <TabPanel>
                  <LLMsPanel
                    llms={config?.llms || []}
                    defaultLLM={config?.globalSettings.defaultLLM}
                    onToggle={(id, enabled) => handleToggle('llm', id, enabled)}
                    onSetDefault={setDefaultLLM}
                  />
                </TabPanel>
                
                {/* UI Features Tab */}
                <TabPanel>
                  <UIFeaturesPanel
                    features={config?.uiFeatures || []}
                    onToggle={(id, enabled) => handleToggle('ui', id, enabled)}
                  />
                </TabPanel>
                
                {/* Integrations Tab */}
                <TabPanel>
                  <IntegrationsPanel
                    integrations={config?.integrations || []}
                    onToggle={(id, enabled) => handleToggle('integration', id, enabled)}
                  />
                </TabPanel>
                
                {/* Global Settings Tab */}
                <TabPanel>
                  <GlobalSettingsPanel
                    settings={config?.globalSettings}
                    onUpdate={updateGlobalSettings}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GlassPanel>
        </VStack>
      </Container>
    </DashboardLayout>
  );
};

// Stat Card Component
function StatCard({ label, value, total, icon: Icon, color }: {
  label: string;
  value: number | string;
  total?: number;
  icon: any;
  color: string;
}) {
  return (
    <GlassPanel variant="light" p={4}>
      <HStack justify="space-between">
        <Stat size="sm">
          <StatLabel color="gray.500">{label}</StatLabel>
          <StatNumber fontSize="xl">
            {value}
            {total !== undefined && <Text as="span" fontSize="sm" color="gray.500">/{total}</Text>}
          </StatNumber>
        </Stat>
        <Box p={2} borderRadius="md" bg={`${color}.100`} color={`${color}.600`}>
          <Icon size={20} />
        </Box>
      </HStack>
    </GlassPanel>
  );
}

// Services Panel
function ServicesPanel({ services, onToggle }: {
  services: ServiceConfig[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const borderColor = useSemanticToken('border.default');
  
  const grouped = services.reduce((acc, service) => {
    const cat = service.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, ServiceConfig[]>);
  
  return (
    <VStack spacing={6} align="stretch">
      {Object.entries(grouped).map(([category, categoryServices]) => (
        <Box key={category}>
          <HStack mb={3}>
            <Badge colorScheme={SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES]?.color || 'gray'}>
              {SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES]?.label || category}
            </Badge>
            <Text fontSize="sm" color="gray.500">
              {categoryServices.filter(s => s.enabled).length}/{categoryServices.length} enabled
            </Text>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {categoryServices.map((service) => (
              <ConfigCard
                key={service.id}
                title={service.name}
                description={service.description}
                enabled={service.enabled}
                onToggle={(enabled) => onToggle(service.id, enabled)}
                extra={
                  <HStack spacing={2} fontSize="xs" color="gray.500">
                    {service.port && <Text>Port: {service.port}</Text>}
                    {service.endpoint && <Text noOfLines={1}>{service.endpoint}</Text>}
                  </HStack>
                }
              />
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  );
}

// Agents Panel
function AgentsPanel({ agents, onToggle }: {
  agents: AgentConfig[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      {agents.map((agent) => (
        <ConfigCard
          key={agent.id}
          title={agent.name}
          description={agent.description}
          enabled={agent.enabled}
          onToggle={(enabled) => onToggle(agent.id, enabled)}
          badge={
            <Badge colorScheme={AGENT_TYPES[agent.type]?.color || 'gray'} size="sm">
              {AGENT_TYPES[agent.type]?.label || agent.type}
            </Badge>
          }
          extra={
            <VStack align="start" spacing={1} fontSize="xs">
              <Text color="gray.500">Model: {agent.model || 'Default'}</Text>
              <HStack flexWrap="wrap" gap={1}>
                {agent.features.slice(0, 4).map((f) => (
                  <Badge key={f} size="sm" variant="outline">{f}</Badge>
                ))}
                {agent.features.length > 4 && (
                  <Badge size="sm" variant="outline">+{agent.features.length - 4}</Badge>
                )}
              </HStack>
            </VStack>
          }
        />
      ))}
    </SimpleGrid>
  );
}

// LLMs Panel
function LLMsPanel({ llms, defaultLLM, onToggle, onSetDefault }: {
  llms: LLMConfig[];
  defaultLLM?: string;
  onToggle: (id: string, enabled: boolean) => void;
  onSetDefault: (id: string) => void;
}) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {llms.map((llm) => (
        <ConfigCard
          key={llm.id}
          title={llm.name}
          description={`${LLM_PROVIDERS[llm.provider]?.label || llm.provider} - ${llm.model}`}
          enabled={llm.enabled}
          onToggle={(enabled) => onToggle(llm.id, enabled)}
          badge={
            llm.id === defaultLLM ? (
              <Badge colorScheme="green">Default</Badge>
            ) : llm.enabled ? (
              <Button size="xs" variant="ghost" onClick={() => onSetDefault(llm.id)}>
                Set Default
              </Button>
            ) : null
          }
          extra={
            <VStack align="start" spacing={1} fontSize="xs">
              <HStack flexWrap="wrap" gap={1}>
                {(() => {
                  const caps = Array.isArray(llm.capabilities) 
                    ? llm.capabilities 
                    : (llm.capabilities && typeof llm.capabilities === 'object' 
                        ? Object.keys(llm.capabilities) 
                        : []);
                  return caps.map((c) => (
                    <Badge key={String(c)} size="sm" colorScheme="blue" variant="outline">{String(c)}</Badge>
                  ));
                })()}
              </HStack>
              <Text color="gray.500">Context: {llm.contextWindow.toLocaleString()} tokens</Text>
            </VStack>
          }
        />
      ))}
    </SimpleGrid>
  );
}

// UI Features Panel
function UIFeaturesPanel({ features, onToggle }: {
  features: UIFeatureConfig[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const grouped = features.reduce((acc, feature) => {
    const cat = feature.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {} as Record<string, UIFeatureConfig[]>);
  
  return (
    <VStack spacing={6} align="stretch">
      {Object.entries(grouped).map(([category, categoryFeatures]) => (
        <Box key={category}>
          <HStack mb={3}>
            <Badge colorScheme={UI_CATEGORIES[category as keyof typeof UI_CATEGORIES]?.color || 'gray'}>
              {UI_CATEGORIES[category as keyof typeof UI_CATEGORIES]?.label || category}
            </Badge>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
            {categoryFeatures.map((feature) => (
              <ConfigCard
                key={feature.id}
                title={feature.name}
                description={feature.description}
                enabled={feature.enabled}
                onToggle={(enabled) => onToggle(feature.id, enabled)}
                extra={
                  feature.requiredServices?.length || feature.requiredAgents?.length ? (
                    <Text fontSize="xs" color="orange.500">
                      Requires: {[...(feature.requiredServices || []), ...(feature.requiredAgents || [])].join(', ')}
                    </Text>
                  ) : null
                }
              />
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  );
}

// Integrations Panel
function IntegrationsPanel({ integrations, onToggle }: {
  integrations: IntegrationConfig[];
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {integrations.map((integration) => (
        <ConfigCard
          key={integration.id}
          title={integration.name}
          description={integration.description}
          enabled={integration.enabled}
          onToggle={(enabled) => onToggle(integration.id, enabled)}
          badge={
            <HStack spacing={1}>
              <Badge colorScheme={integration.isConfigured ? 'green' : 'yellow'} size="sm">
                {integration.isConfigured ? 'Configured' : 'Not Configured'}
              </Badge>
              {integration.authRequired && (
                <Badge colorScheme="purple" size="sm">Auth Required</Badge>
              )}
            </HStack>
          }
        />
      ))}
    </SimpleGrid>
  );
}

// Global Settings Panel
function GlobalSettingsPanel({ settings, onUpdate }: {
  settings?: any;
  onUpdate: (settings: any) => void;
}) {
  if (!settings) return null;
  
  return (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <GlassPanel variant="light" p={4}>
          <VStack align="stretch" spacing={4}>
            <Text fontWeight="semibold">System Settings</Text>
            <HStack justify="space-between">
              <Text>Maintenance Mode</Text>
              <Switch
                isChecked={settings.maintenanceMode}
                onChange={(e) => onUpdate({ maintenanceMode: e.target.checked })}
                colorScheme="red"
              />
            </HStack>
            <HStack justify="space-between">
              <Text>Debug Mode</Text>
              <Switch
                isChecked={settings.debugMode}
                onChange={(e) => onUpdate({ debugMode: e.target.checked })}
              />
            </HStack>
            <HStack justify="space-between">
              <Text>Analytics Enabled</Text>
              <Switch
                isChecked={settings.analyticsEnabled}
                onChange={(e) => onUpdate({ analyticsEnabled: e.target.checked })}
              />
            </HStack>
            <HStack justify="space-between">
              <Text>Telemetry Enabled</Text>
              <Switch
                isChecked={settings.telemetryEnabled}
                onChange={(e) => onUpdate({ telemetryEnabled: e.target.checked })}
              />
            </HStack>
          </VStack>
        </GlassPanel>
        
        <GlassPanel variant="light" p={4}>
          <VStack align="stretch" spacing={4}>
            <Text fontWeight="semibold">Defaults</Text>
            <HStack justify="space-between">
              <Text>Default LLM</Text>
              <Text fontWeight="medium">{settings.defaultLLM}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text>Default Agent</Text>
              <Text fontWeight="medium">{settings.defaultAgent}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text>Max Concurrent Agents</Text>
              <Text fontWeight="medium">{settings.maxConcurrentAgents}</Text>
            </HStack>
          </VStack>
        </GlassPanel>
      </SimpleGrid>
    </VStack>
  );
}

// Reusable Config Card
function ConfigCard({ title, description, enabled, onToggle, badge, extra }: {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const borderColor = useSemanticToken('border.default');
  const bgElevated = useSemanticToken('surface.elevated');
  
  return (
    <Box
      p={4}
      borderRadius="md"
      border="1px"
      borderColor={enabled ? 'blue.200' : borderColor}
      bg={enabled ? 'blue.50' : bgElevated}
      _dark={{
        bg: enabled ? 'blue.900' : bgElevated,
        borderColor: enabled ? 'blue.700' : borderColor,
      }}
      opacity={enabled ? 1 : 0.7}
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <HStack>
              <Text fontWeight="medium">{title}</Text>
              {badge}
            </HStack>
            {description && (
              <Text fontSize="sm" color="gray.500" noOfLines={2}>
                {description}
              </Text>
            )}
          </VStack>
          <Switch
            isChecked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            colorScheme="blue"
          />
        </HStack>
        {extra}
      </VStack>
    </Box>
  );
}

export default PlatformManagementPage;
