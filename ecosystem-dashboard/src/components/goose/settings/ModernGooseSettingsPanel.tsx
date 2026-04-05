/**
 * Modern Goose Settings Panel
 * 
 * Unified, streamlined settings interface for Goose agents
 * Eliminates redundancy with clean 4-tab design
 * 
 * Tabs:
 * 1. Model - LLM configuration and advanced settings
 * 2. Personality - Identity, style, and goosehints
 * 3. Tools - MCP extensions and capabilities
 * 4. Recipes - Workflow templates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Badge,
  Icon,
  Divider,
  Spinner,
  Alert,
  AlertIcon,
  Tooltip,
  Flex,
} from '@chakra-ui/react';
import {
  FiZap,
  FiUser,
  FiTool,
  FiBook,
  FiSave,
  FiRefreshCw,
  FiX,
  FiSettings,
  FiCheck,
} from 'react-icons/fi';

// Import tab components
import ModelConfigTab from './tabs/modern/ModelConfigTab';
import PersonalityTab from './tabs/modern/PersonalityTab';
import ToolsConfigTab from './tabs/modern/ToolsConfigTab';
import { RecipesWorkflowTab } from './tabs/modern/RecipesWorkflowTab';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ModernGooseSettingsPanelProps {
  agentId: string;
  agentName?: string;
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
  agencyMode: string;
  identity: any;
  style: any;
  goosehints: string;
  enabledTools: string[];
  toolConfigs: Record<string, any>;
  
  // Advanced settings
  maxTurns?: number;
  contextStrategy?: string;
  autoCompactThreshold?: number;
  sessionAutosave?: boolean;
  enableLeadWorker?: boolean;
  leadModel?: string;
  leadTurns?: number;
  enablePlanning?: boolean;
  plannerModel?: string;
  enableRouter?: boolean;
  enableToolshim?: boolean;
  toolOutputPriority?: number;
  securityPromptEnabled?: boolean;
  securityThreshold?: number;
  debugEnabled?: boolean;
  showCosts?: boolean;
  
  configVersion: number;
}

export default function ModernGooseSettingsPanel({
  agentId,
  agentName,
  onClose,
}: ModernGooseSettingsPanelProps) {
  const [config, setConfig] = useState<AgentConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const toast = useToast();

  // Modern color scheme
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = 'blue.600';
  const successColor = 'green.500';
  const tabBg = useSemanticToken('surface.elevated');
  const tabHoverBg = useSemanticToken('surface.hover');

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
        title: 'Settings Saved',
        description: 'Agent configuration updated successfully',
        status: 'success',
        duration: 2000,
        icon: <Icon as={FiCheck} />,
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

  const handleConfigChange = (updates: Partial<AgentConfiguration>) => {
    if (!config) return;

    setConfig({
      ...config,
      ...updates,
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Flex
        h="full"
        align="center"
        justify="center"
        bg={bgColor}
        direction="column"
        gap={4}
      >
        <Spinner size="xl" color={accentColor} thickness="4px" />
        <Text color={mutedColor} fontSize="sm">
          Loading agent configuration...
        </Text>
      </Flex>
    );
  }

  if (!config) {
    return (
      <Box p={8} bg={bgColor}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Failed to load configuration
        </Alert>
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="stretch" h="full" bg={bgColor}>
      {/* Modern Header */}
      <Box
        px={6}
        py={4}
        borderBottom="1px solid"
        borderColor={borderColor}
        bg={headerBg}
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={3}>
            <Icon as={FiSettings} boxSize={5} color={accentColor} />
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="600" color={textColor}>
                {config.agentName || 'Goose Agent'}
              </Text>
              <HStack spacing={2}>
                <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                  {agentId}
                </Badge>
                <Badge colorScheme="gray" fontSize="xs" px={2} py={0.5}>
                  v{config.configVersion}
                </Badge>
              </HStack>
            </VStack>
          </HStack>

          <HStack spacing={2}>
            {hasChanges && (
              <Badge colorScheme="orange" fontSize="xs" px={3} py={1}>
                Unsaved Changes
              </Badge>
            )}
            <Tooltip label="Reload configuration">
              <IconButton
                aria-label="Reload"
                icon={<FiRefreshCw />}
                size="sm"
                variant="ghost"
                onClick={loadConfiguration}
                isDisabled={saving}
              />
            </Tooltip>
            <Button
              leftIcon={<FiSave />}
              colorScheme="blue"
              size="sm"
              onClick={handleSave}
              isLoading={saving}
              isDisabled={!hasChanges}
              loadingText="Saving"
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
        </Flex>
      </Box>

      {/* Modern Tabs */}
      <Tabs
        index={activeTab}
        onChange={setActiveTab}
        colorScheme="blue"
        variant="enclosed"
        isLazy
        flex={1}
        display="flex"
        flexDirection="column"
      >
        <Box
          px={6}
          pt={3}
          borderBottom="1px solid"
          borderColor={borderColor}
          bg={tabBg}
        >
          <TabList border="none" gap={1}>
            <Tab
              _selected={{
                color: accentColor,
                borderColor: accentColor,
                borderBottomColor: tabBg,
                bg: tabBg,
              }}
              _hover={{ bg: tabHoverBg }}
              borderRadius="md md 0 0"
              fontWeight="500"
              fontSize="sm"
            >
              <HStack spacing={2}>
                <Icon as={FiZap} boxSize={4} />
                <Text>Model</Text>
              </HStack>
            </Tab>
            <Tab
              _selected={{
                color: accentColor,
                borderColor: accentColor,
                borderBottomColor: tabBg,
                bg: tabBg,
              }}
              _hover={{ bg: tabHoverBg }}
              borderRadius="md md 0 0"
              fontWeight="500"
              fontSize="sm"
            >
              <HStack spacing={2}>
                <Icon as={FiUser} boxSize={4} />
                <Text>Personality</Text>
              </HStack>
            </Tab>
            <Tab
              _selected={{
                color: accentColor,
                borderColor: accentColor,
                borderBottomColor: tabBg,
                bg: tabBg,
              }}
              _hover={{ bg: tabHoverBg }}
              borderRadius="md md 0 0"
              fontWeight="500"
              fontSize="sm"
            >
              <HStack spacing={2}>
                <Icon as={FiTool} boxSize={4} />
                <Text>Tools</Text>
                <Badge size="sm" colorScheme="green" variant="subtle">
                  {config.enabledTools?.length || 0}
                </Badge>
              </HStack>
            </Tab>
            <Tab
              _selected={{
                color: accentColor,
                borderColor: accentColor,
                borderBottomColor: tabBg,
                bg: tabBg,
              }}
              _hover={{ bg: tabHoverBg }}
              borderRadius="md md 0 0"
              fontWeight="500"
              fontSize="sm"
            >
              <HStack spacing={2}>
                <Icon as={FiBook} boxSize={4} />
                <Text>Recipes</Text>
              </HStack>
            </Tab>
          </TabList>
        </Box>

        <TabPanels flex={1} overflowY="auto">
          <TabPanel p={6}>
            <ModelConfigTab
              config={config}
              onChange={handleConfigChange}
            />
          </TabPanel>
          <TabPanel p={6}>
            <PersonalityTab
              config={config}
              onChange={handleConfigChange}
            />
          </TabPanel>
          <TabPanel p={6}>
            <ToolsConfigTab
              agentId={agentId}
              config={config}
              onChange={handleConfigChange}
            />
          </TabPanel>
          <TabPanel p={6}>
            <RecipesWorkflowTab agentId={agentId} />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Footer with save reminder */}
      {hasChanges && (
        <Box
          px={6}
          py={3}
          borderTop="1px solid"
          borderColor={borderColor}
          bg={headerBg}
        >
          <Flex justify="space-between" align="center">
            <HStack spacing={2}>
              <Icon as={FiSettings} boxSize={4} color="orange.500" />
              <Text fontSize="sm" color={mutedColor}>
                You have unsaved changes
              </Text>
            </HStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadConfiguration}
                isDisabled={saving}
              >
                Discard
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<FiSave />}
                onClick={handleSave}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}
    </VStack>
  );
}
