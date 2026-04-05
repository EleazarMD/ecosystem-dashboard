/**
 * Tenant AI Gateway Tab
 * Manages API keys and AI services scoped to a specific tenant/workspace
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  Switch,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
} from '@chakra-ui/react';
import {
  FiKey,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiMoreVertical,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiDollarSign,
  FiServer,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

interface TenantAIGatewayTabProps {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
}

interface Service {
  service_id: string;
  project_id: string;
  name: string;
  description: string;
  status: string;
  key_count: string;
}

interface APIKey {
  key_id: string;
  service_id: string;
  provider: string;
  provider_display_name: string;
  is_active: boolean;
  is_primary: boolean;
  rate_limit_per_minute: number;
  cost_limit_daily: number;
  created_at: string;
}

export function TenantAIGatewayTab({ tenantId, tenantSlug, tenantName }: TenantAIGatewayTabProps) {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceKeys, setServiceKeys] = useState<APIKey[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [projectExists, setProjectExists] = useState(false);
  
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');
  
  const { isOpen: isKeyModalOpen, onOpen: onKeyModalOpen, onClose: onKeyModalClose } = useDisclosure();
  const { isOpen: isServiceModalOpen, onOpen: onServiceModalOpen, onClose: onServiceModalClose } = useDisclosure();
  
  const [newKey, setNewKey] = useState({
    provider: 'openai',
    apiKey: '',
    isPrimary: true,
    rateLimitPerMinute: 100,
    costLimitDaily: 50,
  });
  
  const [newService, setNewService] = useState({
    name: '',
    description: '',
  });

  const projectId = `tenant-${tenantSlug}`;

  useEffect(() => {
    loadHealthStatus();
    checkAndCreateProject();
  }, [tenantSlug]);

  useEffect(() => {
    if (selectedService) {
      loadServiceKeys(selectedService.service_id);
    }
  }, [selectedService]);

  const loadHealthStatus = async () => {
    try {
      const response = await fetch(`${AI_INFERENCING_URL}/health`);
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('AI Gateway not reachable:', error);
      setHealthStatus({ status: 'unreachable' });
    }
  };

  const checkAndCreateProject = async () => {
    setLoading(true);
    try {
      // Check if project exists
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });
      
      if (response.ok) {
        const data = await response.json();
        const existingProject = data.projects?.find((p: any) => p.project_id === projectId);
        
        if (existingProject) {
          setProjectExists(true);
          await loadServices();
        } else {
          // Create project for this tenant
          await createTenantProject();
        }
      }
    } catch (error) {
      console.error('Failed to check project:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTenantProject = async () => {
    try {
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': ADMIN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          name: `${tenantName} Workspace`,
          description: `AI Gateway project for tenant: ${tenantName}`,
        })
      });

      if (response.ok) {
        setProjectExists(true);
        toast({
          title: 'AI Gateway Initialized',
          description: `Created AI project for ${tenantName}`,
          status: 'success',
          duration: 3000,
        });
        await loadServices();
      }
    } catch (error) {
      console.error('Failed to create tenant project:', error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${projectId}/services`,
        { headers: { 'X-Admin-Key': ADMIN_API_KEY } }
      );
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        if (data.services && data.services.length > 0 && !selectedService) {
          setSelectedService(data.services[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const loadServiceKeys = async (serviceId: string) => {
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/services/${serviceId}/keys`,
        { headers: { 'X-Admin-Key': ADMIN_API_KEY } }
      );
      if (response.ok) {
        const data = await response.json();
        setServiceKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
    }
  };

  const createService = async () => {
    try {
      const serviceId = newService.name.toLowerCase().replace(/\s+/g, '-');
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${projectId}/services`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            service_id: serviceId,
            name: newService.name,
            description: newService.description || `Service for ${newService.name}`,
          })
        }
      );

      if (response.ok) {
        toast({ title: 'Service created', status: 'success', duration: 3000 });
        onServiceModalClose();
        setNewService({ name: '', description: '' });
        await loadServices();
      } else {
        throw new Error('Failed to create service');
      }
    } catch (error) {
      toast({
        title: 'Error creating service',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const createAPIKey = async () => {
    if (!selectedService) return;

    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/services/${selectedService.service_id}/keys`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newKey)
        }
      );

      if (response.ok) {
        toast({ title: 'API Key added', status: 'success', duration: 3000 });
        onKeyModalClose();
        setNewKey({
          provider: 'openai',
          apiKey: '',
          isPrimary: true,
          rateLimitPerMinute: 100,
          costLimitDaily: 50,
        });
        loadServiceKeys(selectedService.service_id);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add API key');
      }
    } catch (error) {
      toast({
        title: 'Error adding API key',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`,
        {
          method: 'DELETE',
          headers: { 'X-Admin-Key': ADMIN_API_KEY }
        }
      );

      if (response.ok) {
        toast({ title: 'API Key deleted', status: 'success', duration: 3000 });
        if (selectedService) {
          loadServiceKeys(selectedService.service_id);
        }
      }
    } catch (error) {
      toast({
        title: 'Error deleting key',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const toggleKeyStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`,
        {
          method: 'PATCH',
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: !currentStatus })
        }
      );

      if (response.ok) {
        toast({ 
          title: `Key ${!currentStatus ? 'activated' : 'deactivated'}`, 
          status: 'success', 
          duration: 2000 
        });
        if (selectedService) {
          loadServiceKeys(selectedService.service_id);
        }
      }
    } catch (error) {
      toast({ title: 'Error updating key', status: 'error', duration: 3000 });
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading AI Gateway...</Text>
      </Box>
    );
  }

  if (healthStatus?.status === 'unreachable') {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">AI Gateway Unavailable</Text>
          <Text fontSize="sm">
            The AI Inferencing service is not reachable. Please ensure it's running at {AI_INFERENCING_URL}
          </Text>
        </Box>
      </Alert>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Text fontWeight="semibold">AI Gateway</Text>
          <Badge colorScheme={healthStatus?.status === 'healthy' ? 'green' : 'red'}>
            {healthStatus?.status === 'healthy' ? 'Connected' : 'Disconnected'}
          </Badge>
        </HStack>
        <HStack>
          <Button
            size="sm"
            leftIcon={<FiRefreshCw />}
            variant="ghost"
            onClick={() => {
              loadHealthStatus();
              loadServices();
            }}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {/* Stats */}
      <SimpleGrid columns={3} spacing={3}>
        <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
          <StatLabel fontSize="xs">Services</StatLabel>
          <StatNumber>{services.length}</StatNumber>
          <StatHelpText fontSize="xs">configured</StatHelpText>
        </Stat>
        <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
          <StatLabel fontSize="xs">API Keys</StatLabel>
          <StatNumber>
            {services.reduce((sum, s) => sum + parseInt(s.key_count || '0'), 0)}
          </StatNumber>
          <StatHelpText fontSize="xs">total</StatHelpText>
        </Stat>
        <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
          <StatLabel fontSize="xs">Project ID</StatLabel>
          <StatNumber fontSize="sm">{projectId}</StatNumber>
          <StatHelpText fontSize="xs">scoped</StatHelpText>
        </Stat>
      </SimpleGrid>

      <Divider />

      {/* Services Section */}
      <HStack justify="space-between">
        <Text fontWeight="medium" fontSize="sm">Services</Text>
        <Button size="xs" leftIcon={<FiPlus />} onClick={onServiceModalOpen}>
          Add Service
        </Button>
      </HStack>

      {services.length === 0 ? (
        <Alert status="info" size="sm">
          <AlertIcon />
          <Text fontSize="sm">No services configured. Create a service to start adding API keys.</Text>
        </Alert>
      ) : (
        <HStack spacing={2} flexWrap="wrap">
          {services.map((service) => (
            <Badge
              key={service.service_id}
              px={3}
              py={1}
              borderRadius="full"
              cursor="pointer"
              colorScheme={selectedService?.service_id === service.service_id ? 'blue' : 'gray'}
              onClick={() => setSelectedService(service)}
            >
              <HStack spacing={1}>
                <FiServer size={12} />
                <Text>{service.name}</Text>
                <Badge colorScheme="purple" fontSize="2xs" ml={1}>
                  {service.key_count}
                </Badge>
              </HStack>
            </Badge>
          ))}
        </HStack>
      )}

      {/* API Keys Table */}
      {selectedService && (
        <>
          <HStack justify="space-between" mt={2}>
            <Text fontWeight="medium" fontSize="sm">
              API Keys for {selectedService.name}
            </Text>
            <Button size="xs" leftIcon={<FiKey />} colorScheme="green" onClick={onKeyModalOpen}>
              Add Key
            </Button>
          </HStack>

          {serviceKeys.length === 0 ? (
            <Alert status="info" size="sm">
              <AlertIcon />
              <Text fontSize="sm">No API keys configured for this service.</Text>
            </Alert>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Provider</Th>
                  <Th>Status</Th>
                  <Th>Rate Limit</Th>
                  <Th>Cost Limit</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {serviceKeys.map((key) => (
                  <Tr key={key.key_id}>
                    <Td>
                      <HStack>
                        <Badge colorScheme="purple">{key.provider}</Badge>
                        {key.is_primary && (
                          <Tooltip label="Primary key">
                            <Badge colorScheme="green" fontSize="2xs">Primary</Badge>
                          </Tooltip>
                        )}
                      </HStack>
                    </Td>
                    <Td>
                      <Badge colorScheme={key.is_active ? 'green' : 'red'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <FiActivity size={12} />
                        <Text fontSize="xs">{key.rate_limit_per_minute}/min</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <FiDollarSign size={12} />
                        <Text fontSize="xs">${key.cost_limit_daily}/day</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="xs"
                        />
                        <MenuList>
                          <MenuItem onClick={() => toggleKeyStatus(key.key_id, key.is_active)}>
                            {key.is_active ? 'Deactivate' : 'Activate'}
                          </MenuItem>
                          <MenuItem 
                            icon={<FiTrash2 />} 
                            color="red.500"
                            onClick={() => deleteKey(key.key_id)}
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </>
      )}

      {/* Add Service Modal */}
      <Modal isOpen={isServiceModalOpen} onClose={onServiceModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Service</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Service Name</FormLabel>
                <Input
                  placeholder="e.g., Research Agent"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  placeholder="Optional description"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onServiceModalClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={createService}>Create Service</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add API Key Modal */}
      <Modal isOpen={isKeyModalOpen} onClose={onKeyModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add API Key to {selectedService?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Provider</FormLabel>
                <Select
                  value={newKey.provider}
                  onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                >
                  <option value="openai">OpenAI</option>
                  <option value="google">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="perplexity">Perplexity</option>
                  <option value="local">Local Model</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>API Key</FormLabel>
                <Input
                  type="password"
                  placeholder="sk-proj-xxxxx"
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Primary Key</FormLabel>
                <Switch
                  isChecked={newKey.isPrimary}
                  onChange={(e) => setNewKey({ ...newKey, isPrimary: e.target.checked })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Rate Limit (requests/min)</FormLabel>
                <NumberInput
                  value={newKey.rateLimitPerMinute}
                  onChange={(val) => setNewKey({ ...newKey, rateLimitPerMinute: parseInt(val) || 100 })}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Daily Cost Limit ($)</FormLabel>
                <NumberInput
                  value={newKey.costLimitDaily}
                  onChange={(val) => setNewKey({ ...newKey, costLimitDaily: parseFloat(val) || 50 })}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onKeyModalClose}>Cancel</Button>
            <Button colorScheme="green" onClick={createAPIKey}>Add Key</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
