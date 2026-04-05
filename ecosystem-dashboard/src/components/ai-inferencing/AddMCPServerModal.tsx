/**
 * Add MCP Server Modal
 * Wizard-style interface for adding remote MCP servers like Notion
 * 
 * Follows AI Homelab Ecosystem Standards:
 * - Service Discovery Protocol
 * - Component-Service Pattern
 * - Knowledge Graph Integration
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  Textarea,
  Switch,
  Text,
  Badge,
  Box,
  Icon,
  Code,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
} from '@chakra-ui/react';
import {
  FiServer,
  FiCheck,
  FiAlertCircle,
  FiSettings,
  FiZap,
} from 'react-icons/fi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (server: MCPServerConfig) => void;
}

interface MCPServerConfig {
  name: string;
  displayName: string;
  type: 'sse' | 'stdio' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  description?: string;
  autoStart: boolean;
  authentication?: {
    type: 'none' | 'api_key' | 'oauth';
    apiKey?: string;
    oauthConfig?: object;
  };
}

type Step = 'basic' | 'connection' | 'auth' | 'test' | 'review';

const PRESET_SERVERS = [
  {
    id: 'tavily',
    name: 'Tavily Search MCP',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@tavily/mcp-server'],
    description: 'Real-time web search optimized for AI agents and RAG (1,000 free credits/month)',
    requiresAuth: true,
    envVars: {
      TAVILY_API_KEY: 'Your Tavily API key from https://app.tavily.com'
    }
  },
  {
    id: 'notion',
    name: 'Notion MCP',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-notion'],
    description: 'Connect to Notion for note management and database queries (requires Notion API key)',
    requiresAuth: true,
    envVars: {
      NOTION_API_KEY: 'Your Notion integration token'
    }
  },
  {
    id: 'filesystem',
    name: 'Filesystem MCP',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/directory'],
    description: 'Local filesystem access and file operations',
    requiresAuth: false,
  },
  {
    id: 'postgres',
    name: 'PostgreSQL MCP',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    description: 'Connect to PostgreSQL databases',
    requiresAuth: true,
  },
  {
    id: 'custom',
    name: 'Custom Server',
    type: 'http',
    description: 'Configure a custom MCP server',
    requiresAuth: false,
  },
];

export function AddMCPServerModal({ isOpen, onClose, onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [config, setConfig] = useState<MCPServerConfig>({
    name: '',
    displayName: '',
    type: 'sse',
    autoStart: true,
    authentication: { type: 'none' },
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tools?: string[];
  } | null>(null);

  const toast = useToast();

  // Colors
  const borderColor = useSemanticToken('border.default');
  const bgColor = useSemanticToken('surface.elevated');
  const mutedText = useSemanticToken('text.secondary');

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESET_SERVERS.find(p => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setConfig({
      ...config,
      name: preset.id,
      displayName: preset.name,
      type: preset.type as any,
      url: (preset as any).url,
      command: (preset as any).command,
      args: (preset as any).args,
      description: preset.description,
      env: (preset as any).envVars,
      authentication: {
        type: preset.requiresAuth ? 'api_key' : 'none',
      },
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Call backend API to test connection
      const response = await fetch('/api/mcp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful!' : 'Connection failed'),
        tools: result.tools,
      });

      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: `Found ${result.tools?.length || 0} tools`,
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Could not connect to server',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Error testing connection: ' + (error as Error).message,
      });
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Call backend API to add server
      const response = await fetch('/api/mcp/add-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Server Added',
          description: `${config.displayName} has been added successfully`,
          status: 'success',
          duration: 3000,
        });
        onSuccess(config);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to add server');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const renderBasicInfo = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" color={mutedText}>
        Choose a preset or configure a custom MCP server
      </Text>

      {/* Preset Selection */}
      <FormControl>
        <FormLabel fontSize="sm">Quick Start (Presets)</FormLabel>
        <VStack spacing={2} align="stretch">
          {PRESET_SERVERS.map((preset) => (
            <Box
              key={preset.id}
              p={3}
              borderWidth="1px"
              borderColor={selectedPreset === preset.id ? 'blue.500' : borderColor}
              borderRadius="md"
              cursor="pointer"
              onClick={() => handlePresetSelect(preset.id)}
              bg={selectedPreset === preset.id ? useSemanticToken('surface.highlight') : bgColor}
              _hover={{ borderColor: 'blue.500' }}
              transition="all 0.2s"
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <HStack>
                    <Icon as={FiServer} color="blue.500" />
                    <Text fontSize="sm" fontWeight="600">{preset.name}</Text>
                    <Badge colorScheme="gray" fontSize="xs">{preset.type.toUpperCase()}</Badge>
                  </HStack>
                  <Text fontSize="xs" color={mutedText}>{preset.description}</Text>
                </VStack>
                {selectedPreset === preset.id && (
                  <Icon as={FiCheck} color="blue.500" boxSize={5} />
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      </FormControl>

      <Divider />

      {/* Manual Configuration */}
      <FormControl isRequired>
        <FormLabel fontSize="sm">Display Name</FormLabel>
        <Input
          value={config.displayName}
          onChange={(e) => setConfig({ ...config, displayName: e.target.value })}
          placeholder="My Notion Server"
        />
        <FormHelperText fontSize="xs">Friendly name shown in the dashboard</FormHelperText>
      </FormControl>

      <FormControl isRequired>
        <FormLabel fontSize="sm">Server ID</FormLabel>
        <Input
          value={config.name}
          onChange={(e) => setConfig({ ...config, name: e.target.value })}
          placeholder="notion-mcp"
        />
        <FormHelperText fontSize="xs">Unique identifier (lowercase, no spaces)</FormHelperText>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Description</FormLabel>
        <Textarea
          value={config.description || ''}
          onChange={(e) => setConfig({ ...config, description: e.target.value })}
          placeholder="Describe what this server does..."
          rows={3}
        />
      </FormControl>
    </VStack>
  );

  const renderConnectionConfig = () => (
    <VStack spacing={4} align="stretch">
      <FormControl isRequired>
        <FormLabel fontSize="sm">Connection Type</FormLabel>
        <Select
          value={config.type}
          onChange={(e) => setConfig({ ...config, type: e.target.value as any })}
        >
          <option value="sse">SSE (Server-Sent Events)</option>
          <option value="stdio">STDIO (Local Process)</option>
          <option value="http">HTTP (REST API)</option>
        </Select>
      </FormControl>

      {config.type === 'sse' || config.type === 'http' ? (
        <FormControl isRequired>
          <FormLabel fontSize="sm">Server URL</FormLabel>
          <Input
            value={config.url || ''}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            placeholder="https://api.notion.com/mcp/v1"
          />
          <FormHelperText fontSize="xs">Full URL to the MCP server endpoint</FormHelperText>
        </FormControl>
      ) : (
        <>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Command</FormLabel>
            <Input
              value={config.command || ''}
              onChange={(e) => setConfig({ ...config, command: e.target.value })}
              placeholder="npx"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Arguments (one per line)</FormLabel>
            <Textarea
              value={config.args?.join('\n') || ''}
              onChange={(e) => setConfig({ ...config, args: e.target.value.split('\n') })}
              placeholder="-y&#10;@modelcontextprotocol/server-notion"
              rows={4}
            />
          </FormControl>
        </>
      )}

      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="auto-start" mb="0" fontSize="sm">
          Auto-start on dashboard launch
        </FormLabel>
        <Switch
          id="auto-start"
          isChecked={config.autoStart}
          onChange={(e) => setConfig({ ...config, autoStart: e.target.checked })}
        />
      </FormControl>
    </VStack>
  );

  const renderAuthConfig = () => (
    <VStack spacing={4} align="stretch">
      <FormControl>
        <FormLabel fontSize="sm">Authentication Type</FormLabel>
        <Select
          value={config.authentication?.type || 'none'}
          onChange={(e) => setConfig({
            ...config,
            authentication: { ...config.authentication, type: e.target.value as any },
          })}
        >
          <option value="none">None</option>
          <option value="api_key">API Key</option>
          <option value="oauth">OAuth 2.0</option>
        </Select>
      </FormControl>

      {config.authentication?.type === 'api_key' && (
        <FormControl isRequired>
          <FormLabel fontSize="sm">API Key</FormLabel>
          <Input
            type="password"
            value={config.authentication.apiKey || ''}
            onChange={(e) => setConfig({
              ...config,
              authentication: { ...config.authentication, apiKey: e.target.value },
            })}
            placeholder="Enter your API key"
          />
          <FormHelperText fontSize="xs">
            Your API key will be stored securely and never exposed in logs
          </FormHelperText>
        </FormControl>
      )}

      {config.authentication?.type === 'oauth' && (
        <VStack spacing={3} align="stretch">
          <Alert status="info">
            <AlertIcon />
            <Box flex="1">
              <AlertDescription fontSize="sm">
                You'll be redirected to authorize access to your Notion workspace
              </AlertDescription>
            </Box>
          </Alert>

          <Button
            colorScheme="blue"
            leftIcon={<Icon as={FiZap} />}
            onClick={() => {
              // Save current config first
              const serverName = config.name || `notion-${Date.now()}`;
              // Redirect to OAuth authorization
              window.location.href = `/api/mcp/oauth/notion/authorize?serverName=${encodeURIComponent(serverName)}`;
            }}
            isDisabled={!config.name}
          >
            Connect to Notion
          </Button>

          <Text fontSize="xs" color={mutedText}>
            After authorization, you'll be redirected back to the dashboard
          </Text>
        </VStack>
      )}
    </VStack>
  );

  const renderTestConnection = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" color={mutedText}>
        Test the connection to ensure your server is configured correctly
      </Text>

      <Button
        leftIcon={<Icon as={FiZap} />}
        colorScheme="blue"
        onClick={handleTestConnection}
        isLoading={isTestingConnection}
        loadingText="Testing..."
      >
        Test Connection
      </Button>

      {testResult && (
        <Alert status={testResult.success ? 'success' : 'error'}>
          <AlertIcon />
          <Box flex="1">
            <AlertDescription fontSize="sm">{testResult.message}</AlertDescription>
            {testResult.success && testResult.tools && testResult.tools.length > 0 && (
              <Box mt={2}>
                <Text fontSize="xs" fontWeight="600" mb={1}>
                  Available Tools ({testResult.tools.length}):
                </Text>
                <HStack flexWrap="wrap" spacing={1}>
                  {testResult.tools.slice(0, 10).map((tool) => (
                    <Code key={tool} fontSize="xs">{tool}</Code>
                  ))}
                  {testResult.tools.length > 10 && (
                    <Text fontSize="xs" color={mutedText}>
                      +{testResult.tools.length - 10} more
                    </Text>
                  )}
                </HStack>
              </Box>
            )}
          </Box>
        </Alert>
      )}
    </VStack>
  );

  const renderReview = () => (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" fontWeight="600">Review Configuration</Text>

      <Box p={4} borderWidth="1px" borderColor={borderColor} borderRadius="md">
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Display Name:</Text>
            <Text fontSize="sm" fontWeight="600">{config.displayName}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Server ID:</Text>
            <Code fontSize="xs">{config.name}</Code>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Type:</Text>
            <Badge>{config.type.toUpperCase()}</Badge>
          </HStack>
          {config.url && (
            <HStack justify="space-between">
              <Text fontSize="sm" color={mutedText}>URL:</Text>
              <Code fontSize="xs">{config.url}</Code>
            </HStack>
          )}
          {config.command && (
            <HStack justify="space-between">
              <Text fontSize="sm" color={mutedText}>Command:</Text>
              <Code fontSize="xs">{config.command}</Code>
            </HStack>
          )}
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Authentication:</Text>
            <Text fontSize="sm">{config.authentication?.type || 'none'}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color={mutedText}>Auto-start:</Text>
            <Text fontSize="sm">{config.autoStart ? 'Yes' : 'No'}</Text>
          </HStack>
        </VStack>
      </Box>

      <Alert status="info">
        <AlertIcon />
        <AlertDescription fontSize="sm">
          Server will be registered with the Service Discovery system and appear in your MCP Providers list
        </AlertDescription>
      </Alert>
    </VStack>
  );

  const getStepIndex = (step: Step): number => {
    const steps: Step[] = ['basic', 'connection', 'auth', 'test', 'review'];
    return steps.indexOf(step);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'basic':
        return config.name.length > 0 && config.displayName.length > 0;
      case 'connection':
        if (config.type === 'sse' || config.type === 'http') {
          return !!config.url && config.url.length > 0;
        }
        return !!config.command && config.command.length > 0;
      case 'auth':
        if (config.authentication?.type === 'api_key') {
          return !!config.authentication.apiKey && config.authentication.apiKey.length > 0;
        }
        return true;
      case 'test':
        return testResult?.success || false;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['basic', 'connection', 'auth', 'test', 'review'];
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['basic', 'connection', 'auth', 'test', 'review'];
    const currentIndex = getStepIndex(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Icon as={FiServer} color="blue.500" />
            <Text>Add MCP Server</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {/* Progress Indicator */}
          <Box mb={6}>
            <HStack justify="space-between" mb={2}>
              {(['basic', 'connection', 'auth', 'test', 'review'] as Step[]).map((step, index) => (
                <VStack key={step} spacing={1} flex={1}>
                  <Box
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    bg={getStepIndex(currentStep) >= index ? 'blue.500' : 'gray.300'}
                    color="whiteAlpha.900"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="sm"
                    fontWeight="600"
                  >
                    {getStepIndex(currentStep) > index ? (
                      <Icon as={FiCheck} />
                    ) : (
                      index + 1
                    )}
                  </Box>
                  <Text fontSize="xs" textAlign="center" noOfLines={1}>
                    {step === 'basic' && 'Basic Info'}
                    {step === 'connection' && 'Connection'}
                    {step === 'auth' && 'Auth'}
                    {step === 'test' && 'Test'}
                    {step === 'review' && 'Review'}
                  </Text>
                </VStack>
              ))}
            </HStack>
            <Progress
              value={((getStepIndex(currentStep) + 1) / 5) * 100}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
            />
          </Box>

          {/* Step Content */}
          <Box minH="400px">
            {currentStep === 'basic' && renderBasicInfo()}
            {currentStep === 'connection' && renderConnectionConfig()}
            {currentStep === 'auth' && renderAuthConfig()}
            {currentStep === 'test' && renderTestConnection()}
            {currentStep === 'review' && renderReview()}
          </Box>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={2}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {currentStep !== 'basic' && (
              <Button onClick={prevStep}>
                Back
              </Button>
            )}
            {currentStep !== 'review' ? (
              <Button
                colorScheme="blue"
                onClick={nextStep}
                isDisabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                leftIcon={<Icon as={FiCheck} />}
              >
                Add Server
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
