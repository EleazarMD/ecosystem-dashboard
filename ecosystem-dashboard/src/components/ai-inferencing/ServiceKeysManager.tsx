/**
 * Service Keys Manager Component  
 * Main panel component for managing API keys for a selected service
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Icon,
  IconButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiRefreshCw,
  FiKey,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';

interface ServiceKeysManagerProps {
  service: any;
  project: any;
  onKeySelect?: (key: any) => void;
  onAddKey?: () => void;
  refreshTrigger?: number; // Increment this to force reload
}

export const ServiceKeysManager: React.FC<ServiceKeysManagerProps> = ({
  service,
  project,
  onKeySelect,
  onAddKey,
  refreshTrigger,
}) => {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const toast = useToast();

  const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
  const ADMIN_API_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

  useEffect(() => {
    if (service?.service_id) {
      console.log('='.repeat(60));
      console.log('🔄 [ServiceKeysManager] RELOAD TRIGGERED');
      console.log('[ServiceKeysManager] Service ID:', service.service_id);
      console.log('[ServiceKeysManager] refreshTrigger value:', refreshTrigger);
      console.log('='.repeat(60));
      loadKeys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.service_id, refreshTrigger]);

  const loadKeys = async () => {
    if (!service?.service_id) {
      console.log('[ServiceKeysManager] No service ID, skipping load');
      setLoading(false);
      return;
    }
    
    console.log('[ServiceKeysManager] 🔄 Loading keys for service:', service.service_id);
    setLoading(true);
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/services/${service.service_id}/keys`,
        {
          headers: { 'X-Admin-Key': ADMIN_API_KEY },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const keyCount = data.keys?.length || 0;
        console.log('='.repeat(60));
        console.log('✅ [ServiceKeysManager] KEYS LOADED SUCCESSFULLY');
        console.log('[ServiceKeysManager] Key count:', keyCount);
        console.log('[ServiceKeysManager] Keys:', data.keys?.map((k: any) => k.key_id || k.id).join(', '));
        console.log('='.repeat(60));
        setKeys(data.keys || []);
      } else {
        console.error('[ServiceKeysManager] ❌ Failed to load keys, status:', response.status);
        throw new Error('Failed to load keys');
      }
    } catch (error) {
      console.error('[ServiceKeysManager] Error loading keys:', error);
      toast({
        title: 'Error loading API keys',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyClick = (key: any) => {
    if (onKeySelect) {
      onKeySelect(key);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`,
        {
          method: 'DELETE',
          headers: { 'X-Admin-Key': ADMIN_API_KEY },
        }
      );

      if (response.ok) {
        toast({
          title: 'API key deleted',
          status: 'success',
          duration: 2000,
        });
        loadKeys(); // Reload keys
      } else {
        throw new Error('Failed to delete key');
      }
    } catch (error) {
      toast({
        title: 'Error deleting key',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskKey = (key: string, visible: boolean) => {
    if (visible) return key;
    if (!key) return '••••••••••••••••';
    const start = key.substring(0, 8);
    const end = key.substring(key.length - 4);
    return `${start}${'•'.repeat(12)}${end}`;
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      openai: 'green',
      anthropic: 'purple',
      google: 'blue',
      ollama: 'orange',
      perplexity: 'pink',
    };
    return colors[provider.toLowerCase()] || 'gray';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'green';
      case 'invalid':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" h="400px">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={6}>
        <Box>
          <HStack spacing={3} mb={2}>
            <Icon as={FiKey} boxSize={6} color="blue.500" />
            <Text fontSize="2xl" fontWeight="bold">API Keys</Text>
          </HStack>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Manage API keys for <strong>{service?.name || 'Service'}</strong>
            {project && <> in project <strong>{project.name}</strong></>}
          </Text>
        </Box>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={onAddKey}
        >
          Add API Key
        </Button>
      </HStack>

      {/* Keys Table */}
      {keys.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">No API keys configured</Text>
            <Text fontSize="sm">
              Click "Add API Key" to add your first provider key for this service.
            </Text>
          </Box>
        </Alert>
      ) : (
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          <Table variant="simple">
            <Thead bg={useSemanticToken('surface.base')}>
              <Tr>
                <Th>Provider</Th>
                <Th>Status</Th>
                <Th>Type</Th>
                <Th>API Key</Th>
                <Th>Rate Limit</Th>
                <Th>Cost Limit</Th>
                <Th>Last Validated</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {keys.map((key) => (
                <Tr
                  key={key.key_id}
                  _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                  onClick={() => handleKeyClick(key)}
                >
                  <Td>
                    <VStack align="start" spacing={0.5}>
                      <HStack>
                        <Badge colorScheme={getProviderColor(key.provider)} textTransform="capitalize">
                          {key.provider}
                        </Badge>
                        {key.is_primary && (
                          <Badge colorScheme="blue" fontSize="2xs">Primary</Badge>
                        )}
                      </HStack>
                      {(key.provider_display_name || key.metadata?.displayName) && (
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="medium">
                          {key.provider_display_name || key.metadata?.displayName}
                        </Text>
                      )}
                    </VStack>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Icon
                        as={key.validation_status === 'valid' ? FiCheckCircle : FiRefreshCw}
                        color={`${getStatusColor(key.validation_status)}.500`}
                      />
                      <Badge colorScheme={getStatusColor(key.validation_status)} size="sm">
                        {key.validation_status || 'pending'}
                      </Badge>
                    </HStack>
                  </Td>
                  <Td>
                    {key.is_primary ? (
                      <Badge colorScheme="blue">Primary</Badge>
                    ) : (
                      <Badge variant="outline">Backup</Badge>
                    )}
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <HStack spacing={2}>
                      <Text fontSize="xs" fontFamily="mono" maxW="200px" isTruncated>
                        {maskKey(key.masked_key || '', visibleKeys.has(key.key_id))}
                      </Text>
                      <IconButton
                        aria-label={visibleKeys.has(key.key_id) ? 'Hide key' : 'Show key'}
                        icon={visibleKeys.has(key.key_id) ? <FiEyeOff /> : <FiEye />}
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleKeyVisibility(key.key_id);
                        }}
                      />
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontSize="sm">
                      {key.rate_limit_per_minute ? `${key.rate_limit_per_minute}/min` : '—'}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm">
                      {key.cost_limit_daily ? `$${key.cost_limit_daily}/day` : '—'}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {key.last_validated
                        ? new Date(key.last_validated).toLocaleDateString()
                        : 'Never'}
                    </Text>
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList>
                        <MenuItem icon={<FiEdit2 />} onClick={() => handleKeyClick(key)}>
                          Edit Settings
                        </MenuItem>
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKey(key.key_id);
                          }}
                        >
                          Delete Key
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Quick Stats */}
      <HStack spacing={4} mt={6} p={4} bg={useSemanticToken('surface.base')} borderRadius="md">
        <Box>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Total Keys</Text>
          <Text fontSize="2xl" fontWeight="bold">{keys.length}</Text>
        </Box>
        <Box>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Primary Keys</Text>
          <Text fontSize="2xl" fontWeight="bold">
            {keys.filter((k) => k.is_primary).length}
          </Text>
        </Box>
        <Box>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Valid Keys</Text>
          <Text fontSize="2xl" fontWeight="bold" color="green.500">
            {keys.filter((k) => k.validation_status === 'valid').length}
          </Text>
        </Box>
        <Box>
          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Providers</Text>
          <Text fontSize="2xl" fontWeight="bold">
            {new Set(keys.map((k) => k.provider)).size}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
};

export default ServiceKeysManager;
