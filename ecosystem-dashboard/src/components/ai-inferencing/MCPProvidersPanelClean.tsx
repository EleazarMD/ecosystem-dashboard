/**
 * Clean MCP Providers Panel
 * Minimal design matching the clean aesthetic
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Icon,
  IconButton,
  
  SimpleGrid,
  Input,
  Select,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  FiServer,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiGithub,
  FiCloud,
  FiFolder,
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

interface MCPProvidersPanelCleanProps {
  providers?: MCPProvider[];
  onProviderAdd?: (provider: MCPProvider) => void;
  onProviderUpdate?: (provider: MCPProvider) => void;
  onProviderDelete?: (id: string) => void;
}

export function MCPProvidersPanelClean({
  providers = [],
  onProviderAdd,
  onProviderUpdate,
  onProviderDelete,
}: MCPProvidersPanelCleanProps) {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');

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
    <VStack spacing={8} align="stretch">
      {/* Header with Add Button */}
      <HStack justify="space-between">
        <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
          {displayProviders.length} Provider{displayProviders.length !== 1 ? 's' : ''} Configured
        </Text>
        <Button
          leftIcon={<FiPlus />}
          size="sm"
          variant="outline"
          borderColor={borderColor}
          onClick={handleAddProvider}
        >
          Add Provider
        </Button>
      </HStack>

      {/* Provider Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
        {displayProviders.map((provider) => (
          <Card
            key={provider.id}
            bg={cardBg}
            shadow="none"
            border="1px"
            borderColor={borderColor}
            p={8}
          >
            <VStack align="stretch" spacing={6}>
              {/* Header */}
              <HStack justify="space-between" align="start">
                <HStack spacing={3}>
                  <Icon
                    as={getProviderIcon(provider.type)}
                    boxSize={5}
                    color={subtleText}
                  />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="md" fontWeight="600">
                      {provider.name}
                    </Text>
                    <Text fontSize="xs" color={provider.status === 'active' ? 'green.500' : subtleText}>
                      {provider.status === 'active' ? 'Active' : 'Inactive'}
                    </Text>
                  </VStack>
                </HStack>
                <HStack spacing={1}>
                  <IconButton
                    aria-label="Edit"
                    icon={<FiEdit />}
                    size="xs"
                    variant="ghost"
                    color={subtleText}
                    onClick={() => handleEditProvider(provider)}
                  />
                  <IconButton
                    aria-label="Delete"
                    icon={<FiTrash2 />}
                    size="xs"
                    variant="ghost"
                    color={subtleText}
                    onClick={() => handleDeleteProvider(provider.id, provider.name)}
                  />
                </HStack>
              </HStack>

              {/* Stats */}
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontSize="xs" color={subtleText} mb={1}>
                    REQUESTS
                  </Text>
                  <Text fontSize="2xl" fontWeight="500">
                    {provider.requestCount?.toLocaleString() || 0}
                  </Text>
                </Box>

                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>
                      COST
                    </Text>
                    <Text fontSize="lg" fontWeight="500">
                      ${provider.cost?.toFixed(2) || '0.00'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>
                      LAST USED
                    </Text>
                    <Text fontSize="sm" fontWeight="500">
                      {provider.lastUsed || 'Never'}
                    </Text>
                  </Box>
                </SimpleGrid>

                <Box>
                  <Text fontSize="xs" color={subtleText}>
                    {provider.type === 'custom' ? 'Local Provider' : 'External Provider'}
                  </Text>
                </Box>
              </VStack>
            </VStack>
          </Card>
        ))}
      </SimpleGrid>

      {/* Empty State */}
      {displayProviders.length === 0 && (
        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={12}>
          <VStack spacing={4}>
            <Icon as={FiServer} boxSize={12} color={subtleText} />
            <Text color={subtleText}>No MCP providers configured</Text>
            <Button
              leftIcon={<FiPlus />}
              size="sm"
              variant="outline"
              borderColor={borderColor}
              onClick={handleAddProvider}
            >
              Add Provider
            </Button>
          </VStack>
        </Card>
      )}

      {/* Add/Edit Provider Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontWeight="600">
            {editingProvider ? 'Edit Provider' : 'Add MCP Provider'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500">
                  Provider Name
                </FormLabel>
                <Input
                  placeholder="e.g., Notion Workspace"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500">
                  Provider Type
                </FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as MCPProvider['type'] })
                  }
                >
                  <option value="notion">Notion</option>
                  <option value="github">GitHub</option>
                  <option value="cloud">Cloud Storage</option>
                  <option value="filesystem">Filesystem</option>
                  <option value="custom">Custom</option>
                </Select>
              </FormControl>

              {['notion', 'github', 'cloud'].includes(formData.type) && (
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="500">
                    API Key
                  </FormLabel>
                  <Input
                    type="password"
                    placeholder="Enter API key..."
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                  <Text fontSize="xs" color={subtleText} mt={2}>
                    API key is encrypted and stored securely
                  </Text>
                </FormControl>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProvider}
              isDisabled={
                !formData.name ||
                (!formData.apiKey && ['notion', 'github', 'cloud'].includes(formData.type))
              }
            >
              {editingProvider ? 'Update' : 'Add'} Provider
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
