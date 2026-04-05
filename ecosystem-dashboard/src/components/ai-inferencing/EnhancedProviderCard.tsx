/**
 * Enhanced Provider Card Component
 * Integrates with AI Gateway Backend for real-time provider management
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  NumberInput,
  NumberInputField,
  useToast,
  Tooltip,
  Divider
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, CheckIcon, WarningIcon, ViewIcon } from '@chakra-ui/icons';
import { Provider } from '../../lib/ai-gateway-backend-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EnhancedProviderCardProps {
  provider: Provider;
  onUpdate: (id: string, updates: Partial<Provider>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onHealthCheck: (id: string) => Promise<void>;
  isLoading?: boolean;
}

// Helper to normalize capabilities to array of strings
const normalizeCapabilities = (caps: any): string[] => {
  if (Array.isArray(caps)) return caps.map(String);
  if (caps && typeof caps === 'object') return Object.keys(caps);
  return [];
};

export function EnhancedProviderCard({ 
  provider, 
  onUpdate, 
  onDelete, 
  onHealthCheck,
  isLoading = false 
}: EnhancedProviderCardProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  // Normalize capabilities when initializing editData
  const [editData, setEditData] = useState<Partial<Provider>>(() => ({
    ...provider,
    capabilities: normalizeCapabilities(provider.capabilities)
  }));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const toast = useToast();

  const getStatusColor = (enabled: boolean, health?: Provider['health']) => {
    if (!enabled) return 'gray';
    if (!health) return 'yellow';
    switch (health.status) {
      case 'healthy': return 'green';
      case 'degraded': return 'orange';
      case 'unhealthy': return 'red';
      default: return 'yellow';
    }
  };

  const getStatusText = (enabled: boolean, health?: Provider['health']) => {
    if (!enabled) return 'OFFLINE';
    if (!health) return 'UNKNOWN';
    return health.status.toUpperCase();
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await onUpdate(provider.id, editData);
      toast({
        title: 'Provider Updated',
        description: `${provider.name} has been updated successfully`,
        status: 'success',
        duration: 3000
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update provider',
        status: 'error',
        duration: 5000
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(provider.id);
      toast({
        title: 'Provider Deleted',
        description: `${provider.name} has been removed`,
        status: 'info',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete provider',
        status: 'error',
        duration: 5000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      setIsCheckingHealth(true);
      await onHealthCheck(provider.id);
      toast({
        title: 'Health Check Complete',
        description: `${provider.name} health status updated`,
        status: 'success',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Health Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check provider health',
        status: 'error',
        duration: 5000
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleToggleEnabled = async () => {
    try {
      await onUpdate(provider.id, { enabled: !provider.enabled });
    } catch (error) {
      toast({
        title: 'Toggle Failed',
        description: error instanceof Error ? error.message : 'Failed to toggle provider status',
        status: 'error',
        duration: 5000
      });
    }
  };

  return (
    <>
      <Card 
        size="sm" 
        variant="outline"
        opacity={isLoading ? 0.6 : 1}
        transition="all 0.2s"
        _hover={{ shadow: 'md' }}
      >
        <CardHeader pb={2}>
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <Heading size="sm">{provider.name}</Heading>
              <HStack spacing={2}>
                <Badge 
                  colorScheme={getStatusColor(provider.enabled, provider.health)}
                  variant="solid"
                  fontSize="xs"
                >
                  {getStatusText(provider.enabled, provider.health)}
                </Badge>
                <Badge variant="outline" fontSize="xs">
                  {provider.type.toUpperCase()}
                </Badge>
                <Badge variant="outline" fontSize="xs">
                  Priority: {provider.priority}
                </Badge>
              </HStack>
            </VStack>
            <HStack spacing={1}>
              <Tooltip label="Health Check">
                <IconButton
                  icon={<ViewIcon />}
                  size="xs"
                  variant="ghost"
                  onClick={handleHealthCheck}
                  isLoading={isCheckingHealth}
                  aria-label="Check health"
                />
              </Tooltip>
              <Tooltip label="Edit Provider">
                <IconButton
                  icon={<EditIcon />}
                  size="xs"
                  variant="ghost"
                  onClick={onOpen}
                  aria-label="Edit provider"
                />
              </Tooltip>
              <Tooltip label="Delete Provider">
                <IconButton
                  icon={<DeleteIcon />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  aria-label="Delete provider"
                />
              </Tooltip>
            </HStack>
          </HStack>
        </CardHeader>

        <CardBody pt={0}>
          <VStack align="stretch" spacing={3}>
            {/* Enable/Disable Toggle */}
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">Enabled</Text>
              <Switch
                isChecked={provider.enabled}
                onChange={handleToggleEnabled}
                colorScheme="green"
                size="sm"
              />
            </HStack>

            {/* Health Metrics */}
            {provider.health && (
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Response Time</Text>
                  <Text fontSize="xs" fontWeight="medium">
                    {provider.health.responseTime}ms
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(provider.health.responseTime / 10, 100)}
                  size="xs"
                  colorScheme={provider.health.responseTime < 1000 ? 'green' : 
                             provider.health.responseTime < 3000 ? 'yellow' : 'red'}
                />
              </Box>
            )}

            {/* Models */}
            <Box>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Models ({provider.models.length})</Text>
              <Text fontSize="xs" noOfLines={2}>
                {provider.models.join(', ')}
              </Text>
            </Box>

            {/* Capabilities */}
            <Box>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Capabilities</Text>
              <HStack spacing={1} flexWrap="wrap">
                {(() => {
                  const caps = Array.isArray(provider.capabilities) 
                    ? provider.capabilities 
                    : (provider.capabilities && typeof provider.capabilities === 'object' 
                        ? Object.keys(provider.capabilities) 
                        : []);
                  return (
                    <>
                      {caps.slice(0, 3).map(cap => (
                        <Badge key={String(cap)} size="xs" variant="subtle">
                          {String(cap)}
                        </Badge>
                      ))}
                      {caps.length > 3 && (
                        <Badge size="xs" variant="subtle">
                          +{caps.length - 3}
                        </Badge>
                      )}
                    </>
                  );
                })()}
              </HStack>
            </Box>

            {/* Endpoint */}
            <Box>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Endpoint</Text>
              <Text fontSize="xs" fontFamily="mono" noOfLines={1}>
                {provider.endpoint}
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Provider: {provider.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={editData.type || ''}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value as Provider['type'] })}
                >
                  <option value="ollama">Ollama</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">Custom</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Endpoint</FormLabel>
                <Input
                  value={editData.endpoint || ''}
                  onChange={(e) => setEditData({ ...editData, endpoint: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Priority</FormLabel>
                <NumberInput
                  value={editData.priority || 0}
                  onChange={(_, value) => setEditData({ ...editData, priority: value })}
                  min={0}
                  max={100}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Models (comma-separated)</FormLabel>
                <Input
                  value={editData.models?.join(', ') || ''}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    models: e.target.value.split(',').map(m => m.trim()).filter(Boolean)
                  })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Capabilities (comma-separated)</FormLabel>
                <Input
                  value={normalizeCapabilities(editData.capabilities).join(', ')}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    capabilities: e.target.value.split(',').map(c => c.trim()).filter(Boolean)
                  })}
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Enabled</FormLabel>
                <Switch
                  isChecked={editData.enabled || false}
                  onChange={(e) => setEditData({ ...editData, enabled: e.target.checked })}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleUpdate}
              isLoading={isUpdating}
            >
              Update Provider
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
