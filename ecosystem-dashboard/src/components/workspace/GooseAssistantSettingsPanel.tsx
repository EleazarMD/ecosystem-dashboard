/**
 * Morpheus Settings Panel
 * Comprehensive configuration panel for Morpheus Workspace AI Agent
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Input, Textarea, Select, Switch,
  FormControl, FormLabel, Button, IconButton,
  Divider, Icon, Badge, Tooltip, Tabs, TabList, TabPanels,
  Tab, TabPanel, useToast, Alert, AlertIcon, AlertDescription,
  Code, Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
} from '@chakra-ui/react';
import {
  FiUser, FiCpu, FiMessageSquare, FiDatabase, FiSettings,
  FiInfo, FiZap, FiFileText, FiSave, FiRefreshCw, FiCheck,
  FiX, FiAlertCircle, FiShield, FiTool, FiBook,
} from 'react-icons/fi';

interface GooseAssistantSettingsPanelProps {
  onSave?: (config: any) => void;
  onTest?: () => void;
}

export default function GooseAssistantSettingsPanel({
  onSave,
  onTest,
}: GooseAssistantSettingsPanelProps) {
  const toast = useToast();
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const codeBg = useSemanticToken('surface.elevated');

  const [config, setConfig] = useState({
    identity: {
      name: 'Homelab Assistant',
      role: 'AI Homelab Workspace & Infrastructure Manager',
      expertiseDomains: ['Workspace Management', 'Service Discovery', 'Cost Optimization'],
      personality: 'Professional, proactive, infrastructure-aware',
    },
    communication: {
      tone: 'professional' as 'professional' | 'friendly' | 'casual' | 'technical',
      verbosity: 'balanced' as 'concise' | 'balanced' | 'detailed',
      useEmojis: true,
      greeting: '👋 Hi! I\'m Homelab Assistant. How can I help with your AI Homelab today?',
    },
    goosehints: `# Homelab Assistant

You are "Homelab Assistant," a specialized AI agent for AI Homelab.

## Core Identity
- Name: Homelab Assistant
- Role: Workspace & infrastructure manager
- Personality: Professional, proactive

## Standards
@AIHDS_SERVICE_DISCOVERY_STANDARD.md`,
  });

  const [newExpertise, setNewExpertise] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('goose-assistant-config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      }
    } catch (error) {
      console.error('Failed to load saved Goose config:', error);
    }
  }, []);

  const handleSave = async () => {
    try {
      onSave?.(config);
      
      // Save to localStorage for immediate UI updates
      localStorage.setItem('goose-assistant-config', JSON.stringify(config));
      
      // Save to backend for persistent file storage
      const response = await fetch('/api/goose/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: 'Configuration Saved',
          description: 'Morpheus settings updated. Refresh to see changes.',
          status: 'success',
          duration: 3000,
        });
        setHasChanges(false);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('goose-config-updated', { detail: config }));
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save configuration',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const addExpertise = () => {
    if (newExpertise.trim()) {
      setConfig({
        ...config,
        identity: {
          ...config.identity,
          expertiseDomains: [...config.identity.expertiseDomains, newExpertise.trim()],
        },
      });
      setNewExpertise('');
      setHasChanges(true);
    }
  };

  const removeExpertise = (domain: string) => {
    setConfig({
      ...config,
      identity: {
        ...config.identity,
        expertiseDomains: config.identity.expertiseDomains.filter(d => d !== domain),
      },
    });
    setHasChanges(true);
  };

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto" bg={bgColor}>
      {/* Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor}>
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between">
            <HStack>
              <Icon as={FiZap} color="blue.500" />
              <Text fontSize="md" fontWeight="600" color={textColor}>
                Morpheus Settings
              </Text>
              <Badge colorScheme="blue" fontSize="xs">AI Homelab Agent</Badge>
            </HStack>
            <HStack spacing={1}>
              <Tooltip label="Test configuration">
                <IconButton aria-label="Test" icon={<FiRefreshCw />} size="xs" variant="ghost" onClick={onTest} />
              </Tooltip>
              <Tooltip label="Documentation">
                <IconButton aria-label="Info" icon={<FiInfo />} size="xs" variant="ghost" color={mutedColor} />
              </Tooltip>
            </HStack>
          </HStack>
          
          {hasChanges && (
            <Alert status="warning" size="sm" borderRadius="md">
              <AlertIcon boxSize={3} />
              <AlertDescription fontSize="xs">Unsaved changes</AlertDescription>
              <Button size="xs" ml="auto" colorScheme="blue" onClick={handleSave}>
                Save Changes
              </Button>
            </Alert>
          )}
        </VStack>
      </Box>

      {/* Tabs */}
      <Tabs size="sm" variant="soft-rounded" colorScheme="blue">
        <Box px={4} pt={3} borderBottom="1px solid" borderColor={borderColor}>
          <TabList>
            <Tab fontSize="xs"><Icon as={FiUser} mr={1} />Identity</Tab>
            <Tab fontSize="xs"><Icon as={FiMessageSquare} mr={1} />Style</Tab>
            <Tab fontSize="xs"><Icon as={FiFileText} mr={1} />.goosehints</Tab>
          </TabList>
        </Box>

        <TabPanels>
          {/* Identity Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch" px={2}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>
                  <HStack>
                    <Icon as={FiUser} boxSize={3} color="purple.500" />
                    <Text>Agent Name</Text>
                  </HStack>
                </FormLabel>
                <Input
                  size="sm"
                  value={config.identity.name}
                  onChange={(e) => {
                    setConfig({ ...config, identity: { ...config.identity, name: e.target.value } });
                    setHasChanges(true);
                  }}
                  placeholder="Homelab Assistant"
                />
                <Text fontSize="xs" color={mutedColor} mt={1}>
                  Name shown to users
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>Role / Function</FormLabel>
                <Input
                  size="sm"
                  value={config.identity.role}
                  onChange={(e) => {
                    setConfig({ ...config, identity: { ...config.identity, role: e.target.value } });
                    setHasChanges(true);
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>Personality</FormLabel>
                <Textarea
                  size="sm"
                  value={config.identity.personality}
                  onChange={(e) => {
                    setConfig({ ...config, identity: { ...config.identity, personality: e.target.value } });
                    setHasChanges(true);
                  }}
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>Expertise Domains</FormLabel>
                <Wrap spacing={2} mb={2}>
                  {config.identity.expertiseDomains.map((domain, idx) => (
                    <WrapItem key={idx}>
                      <Tag size="sm" colorScheme="blue" borderRadius="full">
                        <TagLabel>{domain}</TagLabel>
                        <TagCloseButton onClick={() => removeExpertise(domain)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
                <HStack>
                  <Input
                    size="sm"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    placeholder="Add expertise"
                    onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
                  />
                  <IconButton
                    aria-label="Add"
                    icon={<FiCheck />}
                    size="sm"
                    colorScheme="blue"
                    onClick={addExpertise}
                  />
                </HStack>
              </FormControl>
            </VStack>
          </TabPanel>

          {/* Communication Style Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch" px={2}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>Tone</FormLabel>
                <Select
                  size="sm"
                  value={config.communication.tone}
                  onChange={(e) => {
                    setConfig({ ...config, communication: { ...config.communication, tone: e.target.value as any } });
                    setHasChanges(true);
                  }}
                >
                  <option value="professional">💼 Professional</option>
                  <option value="friendly">😊 Friendly</option>
                  <option value="casual">👋 Casual</option>
                  <option value="technical">🔧 Technical</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>Verbosity</FormLabel>
                <Select
                  size="sm"
                  value={config.communication.verbosity}
                  onChange={(e) => {
                    setConfig({ ...config, communication: { ...config.communication, verbosity: e.target.value as any } });
                    setHasChanges(true);
                  }}
                >
                  <option value="concise">✂️ Concise</option>
                  <option value="balanced">⚖️ Balanced</option>
                  <option value="detailed">📚 Detailed</option>
                </Select>
              </FormControl>

              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>Use emojis</Text>
                <Switch
                  size="sm"
                  colorScheme="blue"
                  isChecked={config.communication.useEmojis}
                  onChange={(e) => {
                    setConfig({ ...config, communication: { ...config.communication, useEmojis: e.target.checked } });
                    setHasChanges(true);
                  }}
                />
              </HStack>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>Greeting Message</FormLabel>
                <Textarea
                  size="sm"
                  value={config.communication.greeting}
                  onChange={(e) => {
                    setConfig({ ...config, communication: { ...config.communication, greeting: e.target.value } });
                    setHasChanges(true);
                  }}
                  rows={3}
                />
              </FormControl>

              <Box p={3} bg={codeBg} borderRadius="md" borderLeft="3px solid" borderColor="blue.500">
                <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>Preview</Text>
                <Text fontSize="sm" color={textColor}>{config.communication.greeting}</Text>
              </Box>
            </VStack>
          </TabPanel>

          {/* .goosehints Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch" px={2}>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600" color={textColor}>
                  <HStack>
                    <Icon as={FiFileText} boxSize={3} color="green.500" />
                    <Text>.goosehints File Content</Text>
                  </HStack>
                </FormLabel>
                <Textarea
                  value={config.goosehints}
                  onChange={(e) => {
                    setConfig({ ...config, goosehints: e.target.value });
                    setHasChanges(true);
                  }}
                  rows={20}
                  fontFamily="mono"
                  fontSize="xs"
                  bg={codeBg}
                  borderColor={borderColor}
                />
                <Text fontSize="xs" color={mutedColor} mt={1}>
                  Changes take effect immediately after saving
                </Text>
              </FormControl>

              <Box p={3} bg={codeBg} borderRadius="md" border="1px solid" borderColor="blue.500">
                <VStack align="start" spacing={1}>
                  <Text fontSize="xs" fontWeight="600" color={textColor}>
                    💡 .goosehints Tips
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    • Use @filename.md to auto-include files
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    • Define personality, behavior, and standards
                  </Text>
                  <Text fontSize="xs" color={mutedColor}>
                    • Reference documentation paths
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
