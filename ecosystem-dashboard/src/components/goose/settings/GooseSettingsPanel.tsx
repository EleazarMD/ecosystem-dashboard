/**
 * Goose Settings Panel
 * 
 * Unified settings panel for Goose agent configuration
 * Integrates Model, Identity, Style, Goosehints, Tools, and Recipes tabs
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, IconButton,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useToast, Badge, Icon,
  Divider, Spinner, Alert, AlertIcon,
} from '@chakra-ui/react';
import {
  FiZap, FiUser, FiMessageSquare, FiFileText,
  FiTool, FiBook, FiSave, FiRefreshCw, FiX,
} from 'react-icons/fi';

// Import tab components
import ModelTab from './tabs/ModelTab';
import IdentityTab from './tabs/IdentityTab';
import StyleTab from './tabs/StyleTab';
import GoosehintsTab from './tabs/GoosehintsTab';
import ToolsTab from './tabs/ToolsTab';
import RecipesTab from './tabs/RecipesTab';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GooseSettingsPanelProps {
  agentId: string;
  onClose?: () => void;
}

interface AgentConfiguration {
  id: string;
  agentId: string;
  agentName: string;
  description: string;
  model: string;
  provider: string;
  temperature: number;
  maxTokens: number;
  identity: {
    name: string;
    role: string;
    personality: string;
    expertiseDomains: string[];
  };
  style: {
    tone: string;
    verbosity: string;
    useEmojis: boolean;
    greetingMessage: string;
  };
  goosehints: string;
  enabledTools: string[];
  toolConfigs: Record<string, any>;
  isActive: boolean;
  configVersion: number;
}

export default function GooseSettingsPanel({ agentId, onClose }: GooseSettingsPanelProps) {
  const [config, setConfig] = useState<AgentConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const accentColor = 'blue.500';

  // Load configuration
  useEffect(() => {
    loadConfiguration();
  }, [agentId]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/goose/settings/${agentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }
      
      const data = await response.json();
      setConfig(data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agent configuration',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/goose/settings/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      const updatedConfig = await response.json();
      setConfig(updatedConfig);
      setHasChanges(false);
      
      toast({
        title: 'Configuration Saved',
        description: 'Agent settings updated successfully',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (field: string, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [field]: value,
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" color={accentColor} />
        <Text mt={4}>Loading configuration...</Text>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          Failed to load agent configuration
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      bg={bgColor}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      maxW="900px"
      w="full"
    >
      {/* Header */}
      <HStack
        justify="space-between"
        p={4}
        bg={headerBg}
        borderBottomWidth="1px"
        borderColor={borderColor}
      >
        <HStack spacing={3}>
          <Icon as={FiZap} boxSize={5} color={accentColor} />
          <VStack align="start" spacing={0}>
            <Text fontSize="lg" fontWeight="semibold">
              Goose Settings
            </Text>
            <HStack spacing={2}>
              <Badge colorScheme="blue" fontSize="xs">
                {config.agentName}
              </Badge>
              <Badge colorScheme="gray" fontSize="xs">
                v{config.configVersion}
              </Badge>
            </HStack>
          </VStack>
        </HStack>
        
        <HStack spacing={2}>
          {hasChanges && (
            <Badge colorScheme="orange">Unsaved Changes</Badge>
          )}
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            variant="ghost"
            onClick={loadConfiguration}
          >
            Reload
          </Button>
          <Button
            leftIcon={<FiSave />}
            size="sm"
            colorScheme="blue"
            onClick={handleSave}
            isLoading={saving}
            isDisabled={!hasChanges}
          >
            Save Changes
          </Button>
          {onClose && (
            <IconButton
              aria-label="Close"
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={onClose}
            />
          )}
        </HStack>
      </HStack>

      {/* Tabs */}
      <Tabs
        index={activeTab}
        onChange={setActiveTab}
        colorScheme="blue"
        variant="enclosed"
      >
        <TabList px={4} pt={2} borderBottomWidth="1px" borderColor={borderColor}>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiZap} />
              <Text>Model</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiUser} />
              <Text>Identity</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiMessageSquare} />
              <Text>Style</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiFileText} />
              <Text>.goosehints</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiTool} />
              <Text>Tools</Text>
            </HStack>
          </Tab>
          <Tab>
            <HStack spacing={2}>
              <Icon as={FiBook} />
              <Text>Recipes</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          {/* Model Tab */}
          <TabPanel p={0}>
            <ModelTab
              agentId={agentId}
              value={{
                model: config.model,
                provider: config.provider,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
              }}
              onChange={(value) => {
                handleConfigChange('model', value.model);
                handleConfigChange('provider', value.provider);
                handleConfigChange('temperature', value.temperature);
                handleConfigChange('maxTokens', value.maxTokens);
              }}
            />
          </TabPanel>

          {/* Identity Tab */}
          <TabPanel p={0}>
            <IdentityTab
              value={config.identity}
              onChange={(identity) => handleConfigChange('identity', identity)}
            />
          </TabPanel>

          {/* Style Tab */}
          <TabPanel p={0}>
            <StyleTab
              value={config.style}
              onChange={(style) => handleConfigChange('style', style)}
            />
          </TabPanel>

          {/* Goosehints Tab */}
          <TabPanel p={0}>
            <GoosehintsTab
              agentId={agentId}
              value={config.goosehints}
              onChange={(goosehints) => handleConfigChange('goosehints', goosehints)}
            />
          </TabPanel>

          {/* Tools Tab */}
          <TabPanel p={0}>
            <ToolsTab
              agentId={agentId}
              value={{
                enabledTools: config.enabledTools,
                toolConfigs: config.toolConfigs,
              }}
              onChange={(value) => {
                handleConfigChange('enabledTools', value.enabledTools);
                handleConfigChange('toolConfigs', value.toolConfigs);
              }}
            />
          </TabPanel>

          {/* Recipes Tab */}
          <TabPanel p={0}>
            <RecipesTab agentId={agentId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
