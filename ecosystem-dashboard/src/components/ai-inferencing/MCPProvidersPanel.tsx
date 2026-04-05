import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Card,
  CardBody,
  Icon,
  IconButton,
  SimpleGrid,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  Input,
  Select,
  Tooltip,
  Alert,
  AlertIcon,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiServer,
  FiPlus,
  FiSettings,
  FiCheck,
  FiX,
  FiEdit,
  FiTrash2,
  FiGithub,
  FiCloud,
  FiFolder,
  FiDatabase,
} from 'react-icons/fi';
import { SiNotion } from 'react-icons/si';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MCPProvider {
  id: string;
  name: string;
  type: 'notion' | 'github' | 'filesystem' | 'cloud' | 'custom';
  status: 'active' | 'inactive' | 'error';
  apiKey?: string;
  config: Record<string, any>;
  lastUsed?: string;
  requestCount?: number;
  cost?: number;
}

interface MCPProvidersPanelProps {
  providers?: MCPProvider[];
  onProviderAdd?: (provider: MCPProvider) => void;
  onProviderUpdate?: (provider: MCPProvider) => void;
  onProviderDelete?: (id: string) => void;
}

export function MCPProvidersPanel({
  providers = [],
  onProviderAdd,
  onProviderUpdate,
  onProviderDelete,
}: MCPProvidersPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [editingProvider, setEditingProvider] = useState<MCPProvider | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'notion' as MCPProvider['type'],
    apiKey: '',
    config: {},
  });

  // Mock providers for demo
  const mockProviders: MCPProvider[] = [
    {
      id: '1',
      name: 'Workspace MCP',
      type: 'custom',
      status: 'active',
      config: { path: '/workspace-mcp-server' },
      requestCount: 1243,
      cost: 0,
      lastUsed: '2 minutes ago',
    },
    {
      id: '2',
      name: 'Knowledge Graph MCP',
      type: 'custom',
      status: 'active',
      config: { neo4jUri: 'bolt://localhost:7687' },
      requestCount: 892,
      cost: 0.15,
      lastUsed: '5 minutes ago',
    },
    {
      id: '3',
      name: 'Notion Integration',
      type: 'notion',
      status: 'inactive',
      apiKey: 'secret_*********************',
      config: {},
      requestCount: 0,
      cost: 0,
      lastUsed: 'Never',
    },
  ];

  const displayProviders = providers.length > 0 ? providers : mockProviders;

  const getProviderIcon = (type: MCPProvider['type']) => {
    switch (type) {
      case 'notion':
        return SiNotion;
      case 'github':
        return FiGithub;
      case 'filesystem':
        return FiFolder;
      case 'cloud':
        return FiCloud;
      default:
        return FiServer;
    }
  };

  const getProviderColor = (type: MCPProvider['type']) => {
    switch (type) {
      case 'notion':
        return 'gray';
      case 'github':
        return 'purple';
      case 'filesystem':
        return 'orange';
      case 'cloud':
        return 'blue';
      default:
        return 'green';
    }
  };

  const handleAddProvider = () => {
    setEditingProvider(null);
    setFormData({
      name: '',
      type: 'notion',
      apiKey: '',
      config: {},
    });
    onOpen();
  };

  const handleEditProvider = (provider: MCPProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      apiKey: provider.apiKey || '',
      config: provider.config,
    });
    onOpen();
  };

  const handleSaveProvider = () => {
    const provider: MCPProvider = {
      id: editingProvider?.id || Date.now().toString(),
      name: formData.name,
      type: formData.type,
      status: 'active',
      apiKey: formData.apiKey,
      config: formData.config,
    };

    if (editingProvider) {
      onProviderUpdate?.(provider);
      toast({
        title: 'Provider updated',
        status: 'success',
        duration: 3000,
      });
    } else {
      onProviderAdd?.(provider);
      toast({
        title: 'Provider added',
        status: 'success',
        duration: 3000,
      });
    }

    onClose();
  };

  const handleDeleteProvider = (id: string, name: string) => {
    if (confirm(`Delete provider "${name}"?`)) {
      onProviderDelete?.(id);
      toast({
        title: 'Provider deleted',
        status: 'info',
        duration: 3000,
      });
    }
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="600" color={textColor}>
              MCP Providers
            </Text>
            <Text fontSize="sm" color={mutedColor}>
              Manage Model Context Protocol providers for AI context enhancement
            </Text>
          </VStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            size="sm"
            onClick={handleAddProvider}
          >
            Add Provider
          </Button>
        </HStack>

        <Divider />

        {/* Info Alert */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontSize="sm" fontWeight="600">
              What are MCP Providers?
            </Text>
            <Text fontSize="xs" color={mutedColor} mt={1}>
              MCP (Model Context Protocol) providers supply additional context to LLMs from external sources like
              Notion workspaces, GitHub repos, file systems, and custom databases.
            </Text>
          </Box>
        </Alert>

        {/* Provider Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {displayProviders.map((provider) => (
            <Card
              key={provider.id}
              borderWidth="1px"
              borderColor={borderColor}
              bg={bgColor}
              _hover={{ shadow: 'md', borderColor: 'blue.300' }}
              transition="all 0.2s"
            >
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  {/* Provider Header */}
                  <HStack justify="space-between">
                    <HStack>
                      <Icon
                        as={getProviderIcon(provider.type)}
                        boxSize={5}
                        color={`${getProviderColor(provider.type)}.500`}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="600" color={textColor}>
                          {provider.name}
                        </Text>
                        <Badge
                          colorScheme={provider.status === 'active' ? 'green' : 'gray'}
                          fontSize="xs"
                        >
                          {provider.status}
                        </Badge>
                      </VStack>
                    </HStack>
                    <HStack spacing={1}>
                      <Tooltip label="Edit provider">
                        <IconButton
                          aria-label="Edit"
                          icon={<FiEdit />}
                          size="xs"
                          variant="ghost"
                          onClick={() => handleEditProvider(provider)}
                        />
                      </Tooltip>
                      <Tooltip label="Delete provider">
                        <IconButton
                          aria-label="Delete"
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDeleteProvider(provider.id, provider.name)}
                        />
                      </Tooltip>
                    </HStack>
                  </HStack>

                  <Divider />

                  {/* Provider Stats */}
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" fontSize="xs">
                      <Text color={mutedColor}>Requests:</Text>
                      <Text fontWeight="600" color={textColor}>
                        {provider.requestCount?.toLocaleString() || 0}
                      </Text>
                    </HStack>
                    <HStack justify="space-between" fontSize="xs">
                      <Text color={mutedColor}>Cost:</Text>
                      <Text fontWeight="600" color={textColor}>
                        ${provider.cost?.toFixed(2) || '0.00'}
                      </Text>
                    </HStack>
                    <HStack justify="space-between" fontSize="xs">
                      <Text color={mutedColor}>Last Used:</Text>
                      <Text fontWeight="600" color={textColor}>
                        {provider.lastUsed || 'Never'}
                      </Text>
                    </HStack>
                  </VStack>

                  {/* Provider Type Badge */}
                  <Box>
                    <Badge
                      colorScheme={getProviderColor(provider.type)}
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      {provider.type === 'custom' ? '🟢 Local' : '🔘 External'}
                    </Badge>
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Empty State */}
        {displayProviders.length === 0 && (
          <Card borderWidth="1px" borderColor={borderColor} borderStyle="dashed">
            <CardBody>
              <VStack spacing={3} py={8}>
                <Icon as={FiServer} boxSize={12} color={mutedColor} />
                <Text fontSize="sm" color={mutedColor} textAlign="center">
                  No MCP providers configured
                </Text>
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="blue"
                  size="sm"
                  onClick={handleAddProvider}
                >
                  Add Your First Provider
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* Add/Edit Provider Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingProvider ? 'Edit Provider' : 'Add MCP Provider'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm">Provider Name</FormLabel>
                <Input
                  placeholder="e.g., Notion Workspace"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm">Provider Type</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as MCPProvider['type'] })
                  }
                >
                  <option value="notion">🔘 Notion (External)</option>
                  <option value="github">🔘 GitHub (External)</option>
                  <option value="cloud">🔘 Cloud Storage (External)</option>
                  <option value="filesystem">🟢 Filesystem (Local)</option>
                  <option value="custom">🟢 Custom (Local)</option>
                </Select>
              </FormControl>

              {['notion', 'github', 'cloud'].includes(formData.type) && (
                <FormControl isRequired>
                  <FormLabel fontSize="sm">API Key</FormLabel>
                  <Input
                    type="password"
                    placeholder="Enter API key..."
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                  <Text fontSize="xs" color={mutedColor} mt={1}>
                    API key is encrypted and stored securely
                  </Text>
                </FormControl>
              )}

              {formData.type === 'notion' && (
                <Alert status="info" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  Configure your Notion integration at{' '}
                  <Text as="span" fontWeight="600">
                    notion.so/my-integrations
                  </Text>
                </Alert>
              )}

              {formData.type === 'github' && (
                <Alert status="info" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  Create a personal access token at{' '}
                  <Text as="span" fontWeight="600">
                    github.com/settings/tokens
                  </Text>
                </Alert>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveProvider}
              isDisabled={!formData.name || (!formData.apiKey && ['notion', 'github', 'cloud'].includes(formData.type))}
            >
              {editingProvider ? 'Update' : 'Add'} Provider
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
