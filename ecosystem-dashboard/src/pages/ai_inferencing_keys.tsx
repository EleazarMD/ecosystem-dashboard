/**
 * AI Inferencing - API Key Management Dashboard
 * 
 * Multi-tenant API key management for the AI Homelab ecosystem
 * Manages Projects → Services → Providers → API Keys hierarchy
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Text,
  HStack,
  VStack,
  Flex,
  Icon,
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
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  useToast,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
} from '@chakra-ui/react';
import {
  FiKey,
  FiPlus,
  FiRefreshCw,
  FiEdit,
  FiTrash2,
  FiDatabase,
  FiServer,
  FiLock,
  FiActivity,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useRightPanel } from '../contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

interface Project {
  project_id: string;
  name: string;
  description: string;
  status: string;
  service_count: string;
  key_count: string;
  created_at: string;
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

export function AIInferencingKeysContent() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceKeys, setServiceKeys] = useState<APIKey[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Right panel context
  const { setIsOpen: setRightPanelOpen, setCustomData } = useRightPanel();

  // Modals
  const { isOpen: isProjectModalOpen, onOpen: onProjectModalOpen, onClose: onProjectModalClose } = useDisclosure();
  const { isOpen: isServiceModalOpen, onOpen: onServiceModalOpen, onClose: onServiceModalClose } = useDisclosure();
  const { isOpen: isKeyModalOpen, onOpen: onKeyModalOpen, onClose: onKeyModalClose } = useDisclosure();

  // Form states
  const [newProject, setNewProject] = useState({ project_id: '', name: '', description: '' });
  const [newService, setNewService] = useState({ service_id: '', name: '', description: '' });
  const [newKey, setNewKey] = useState({
    provider: 'openai',
    apiKey: '',
    isPrimary: true,
    rateLimitPerMinute: 100,
    costLimitDaily: 50,
    metadata: { description: '' }
  });

  // Load health status
  useEffect(() => {
    loadHealthStatus();
  }, []);

  // Load initial data
  useEffect(() => {
    loadProjects();
  }, []);

  // Load services when project selected
  useEffect(() => {
    if (selectedProject) {
      loadServices(selectedProject.project_id);
    }
  }, [selectedProject]);

  // Load keys when service selected
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
      console.error('Failed to load health status:', error);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
      } else {
        throw new Error('Failed to load projects');
      }
    } catch (error) {
      toast({
        title: 'Error loading projects',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (projectId: string) => {
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${projectId}/services`,
        { headers: { 'X-Admin-Key': ADMIN_API_KEY } }
      );
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        if (data.services && data.services.length > 0) {
          setSelectedService(data.services[0]);
        } else {
          setSelectedService(null);
          setServiceKeys([]);
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

  const createProject = async () => {
    try {
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': ADMIN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProject)
      });

      if (response.ok) {
        toast({ title: 'Project created', status: 'success', duration: 3000 });
        onProjectModalClose();
        setNewProject({ project_id: '', name: '', description: '' });
        loadProjects();
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      toast({
        title: 'Error creating project',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const createService = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${selectedProject.project_id}/services`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newService)
        }
      );

      if (response.ok) {
        toast({ title: 'Service created', status: 'success', duration: 3000 });
        onServiceModalClose();
        setNewService({ service_id: '', name: '', description: '' });
        loadServices(selectedProject.project_id);
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
          metadata: { description: '' }
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
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      toast({
        title: 'Error deleting key',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={2}>
            <Icon as={FiKey} mr={2} />
            API Key Management
          </Heading>
          <Text color={useSemanticToken('text.secondary')}>Multi-tenant API key vault for AI Homelab ecosystem</Text>
        </Box>
        <HStack>
          {healthStatus && (
            <Badge
              colorScheme={healthStatus.status === 'healthy' ? 'green' : 'red'}
              px={3}
              py={1}
              borderRadius="full"
            >
              <Icon as={healthStatus.status === 'healthy' ? FiCheckCircle : FiAlertCircle} mr={1} />
              {healthStatus.status === 'healthy' ? 'Service Healthy' : 'Service Down'}
            </Badge>
          )}
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={() => {
              loadProjects();
              loadHealthStatus();
            }}
            size="sm"
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Overview Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <Icon as={FiDatabase} mr={1} />
                Projects
              </StatLabel>
              <StatNumber>{projects.length}</StatNumber>
              <StatHelpText>Active projects</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <Icon as={FiServer} mr={1} />
                Services
              </StatLabel>
              <StatNumber>
                {projects.reduce((sum, p) => sum + parseInt(p.service_count || '0'), 0)}
              </StatNumber>
              <StatHelpText>Total services</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <Icon as={FiKey} mr={1} />
                API Keys
              </StatLabel>
              <StatNumber>
                {projects.reduce((sum, p) => sum + parseInt(p.key_count || '0'), 0)}
              </StatNumber>
              <StatHelpText>Stored keys</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>
                <Icon as={FiLock} mr={1} />
                Encryption
              </StatLabel>
              <StatNumber>AES-256</StatNumber>
              <StatHelpText>All keys encrypted</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Main Content */}
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
        {/* Projects Column */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">
                <Icon as={FiDatabase} mr={2} />
                Projects
              </Heading>
              <Button
                size="sm"
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={onProjectModalOpen}
              >
                New
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack spacing={2} align="stretch">
              {projects.map((project) => (
                <Box
                  key={project.project_id}
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  cursor="pointer"
                  bg={selectedProject?.project_id === project.project_id ? 'blue.50' : bgColor}
                  borderColor={selectedProject?.project_id === project.project_id ? 'blue.500' : borderColor}
                  onClick={() => setSelectedProject(project)}
                  _hover={{ borderColor: 'blue.300' }}
                >
                  <Text fontWeight="bold">{project.name}</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{project.description}</Text>
                  <HStack mt={2}>
                    <Badge>{project.service_count} services</Badge>
                    <Badge>{project.key_count} keys</Badge>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Services Column */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">
                <Icon as={FiServer} mr={2} />
                Services
              </Heading>
              <Button
                size="sm"
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={onServiceModalOpen}
                isDisabled={!selectedProject}
              >
                New
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {!selectedProject ? (
              <Text color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                Select a project to view services
              </Text>
            ) : services.length === 0 ? (
              <Text color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                No services yet. Click "New" to create one.
              </Text>
            ) : (
              <VStack spacing={2} align="stretch">
                {services.map((service) => (
                  <Box
                    key={service.service_id}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    cursor="pointer"
                    bg={selectedService?.service_id === service.service_id ? 'green.50' : bgColor}
                    borderColor={selectedService?.service_id === service.service_id ? 'green.500' : borderColor}
                    onClick={() => setSelectedService(service)}
                    _hover={{ borderColor: 'green.300' }}
                  >
                    <Text fontWeight="bold">{service.name}</Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{service.description}</Text>
                    <Badge mt={2}>{service.key_count} keys</Badge>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* API Keys Column */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">
                <Icon as={FiKey} mr={2} />
                API Keys
              </Heading>
              <Button
                size="sm"
                leftIcon={<FiPlus />}
                colorScheme="green"
                onClick={onKeyModalOpen}
                isDisabled={!selectedService}
              >
                Add Key
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {!selectedService ? (
              <Text color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                Select a service to view API keys
              </Text>
            ) : serviceKeys.length === 0 ? (
              <Text color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                No API keys configured. Click "Add Key" to add one.
              </Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {serviceKeys.map((key) => (
                  <Box
                    key={key.key_id}
                    p={4}
                    borderWidth="2px"
                    borderRadius="lg"
                    borderColor={borderColor}
                    cursor="pointer"
                    bg={bgColor}
                    transition="all 0.2s"
                    _hover={{ 
                      borderColor: 'blue.400', 
                      shadow: 'lg',
                      transform: 'translateY(-2px)',
                      bg: 'blue.50'
                    }}
                    onClick={() => {
                      console.log('✅ [AIInferencingKeys] Opening right panel for key:', key.key_id);
                      console.log('✅ [AIInferencingKeys] Full key object:', JSON.stringify(key, null, 2));
                      
                      const customDataObj = {
                        type: 'key-details',
                        key: key,
                        onUpdate: async (keyId: string, updates: any) => {
                          console.log('Update key:', keyId, updates);
                          if (selectedService) {
                            await loadServiceKeys(selectedService.service_id);
                          }
                        },
                        onDelete: async (keyId: string) => {
                          await deleteKey(keyId);
                          setRightPanelOpen(false);
                        },
                        onValidate: async (keyId: string) => {
                          console.log('Validate key:', keyId);
                        }
                      };
                      
                      console.log('✅ [AIInferencingKeys] Setting customData:', customDataObj);
                      setCustomData(customDataObj);
                      setRightPanelOpen(true);
                    }}
                  >
                    {/* Header with Provider and Status */}
                    <Flex justify="space-between" align="flex-start" mb={3}>
                      <VStack align="flex-start" spacing={1} flex="1">
                        <Badge 
                          colorScheme="purple" 
                          fontSize="sm" 
                          px={2} 
                          py={1} 
                          textTransform="uppercase"
                        >
                          {key.provider}
                        </Badge>
                        {key.provider_display_name && (
                          <Text fontSize="xs" fontWeight="medium" color={useSemanticToken('text.secondary')}>
                            {key.provider_display_name}
                          </Text>
                        )}
                      </VStack>
                      <HStack>
                        {key.is_primary && (
                          <Tooltip label="Primary key for this service">
                            <Badge colorScheme="green" fontSize="xs">Primary</Badge>
                          </Tooltip>
                        )}
                        {key.is_active ? (
                          <Tooltip label="Key is active">
                            <Badge colorScheme="green" fontSize="xs">Active</Badge>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Key is inactive">
                            <Badge colorScheme="red" fontSize="xs">Inactive</Badge>
                          </Tooltip>
                        )}
                      </HStack>
                    </Flex>

                    <Divider mb={3} />

                    {/* Key Details */}
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={FiActivity} boxSize={3} color={useSemanticToken('text.tertiary')} />
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            Rate Limit
                          </Text>
                        </HStack>
                        <Text fontSize="xs" fontWeight="medium">
                          {key.rate_limit_per_minute || 'Unlimited'}/min
                        </Text>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={FiDollarSign} boxSize={3} color={useSemanticToken('text.tertiary')} />
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            Cost Limit
                          </Text>
                        </HStack>
                        <Text fontSize="xs" fontWeight="medium">
                          ${key.cost_limit_daily || 'Unlimited'}/day
                        </Text>
                      </HStack>

                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={FiClock} boxSize={3} color={useSemanticToken('text.tertiary')} />
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            Created
                          </Text>
                        </HStack>
                        <Text fontSize="xs" fontWeight="medium">
                          {new Date(key.created_at).toLocaleDateString()}
                        </Text>
                      </HStack>
                    </VStack>

                    {/* Actions Footer */}
                    <Flex mt={3} pt={3} borderTop="1px" borderColor={borderColor} justify="space-between" align="center">
                      <Button
                        size="xs"
                        variant="ghost"
                        leftIcon={<FiEdit />}
                        onClick={(e) => {
                          e.stopPropagation();
                          // The card click handler will open the panel
                        }}
                      >
                        Edit Settings
                      </Button>
                      <IconButton
                        aria-label="Delete key"
                        icon={<FiTrash2 />}
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteKey(key.key_id);
                        }}
                      />
                    </Flex>
                  </Box>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Create Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={onProjectModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Project ID</FormLabel>
                <Input
                  placeholder="ai-research"
                  value={newProject.project_id}
                  onChange={(e) => setNewProject({ ...newProject, project_id: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="AI Research"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Project description..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onProjectModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={createProject}>
              Create Project
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Service Modal */}
      <Modal isOpen={isServiceModalOpen} onClose={onServiceModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Service</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Project: {selectedProject?.name}</AlertTitle>
                </Box>
              </Alert>
              <FormControl isRequired>
                <FormLabel>Service ID</FormLabel>
                <Input
                  placeholder="research-agent"
                  value={newService.service_id}
                  onChange={(e) => setNewService({ ...newService, service_id: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Research Agent"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Service description..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onServiceModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={createService}>
              Create Service
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add API Key Modal */}
      <Modal isOpen={isKeyModalOpen} onClose={onKeyModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add API Key</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Service: {selectedService?.name}</AlertTitle>
                </Box>
              </Alert>
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
                  <option value="ollama">Ollama (Local)</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>API Key</FormLabel>
                <Input
                  type="password"
                  placeholder="sk-proj-xxxxx or AIza-xxxxx"
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
                <FormLabel>Rate Limit (requests/minute)</FormLabel>
                <NumberInput
                  value={newKey.rateLimitPerMinute}
                  onChange={(val) => setNewKey({ ...newKey, rateLimitPerMinute: parseInt(val) || 0 })}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Daily Cost Limit ($)</FormLabel>
                <NumberInput
                  value={newKey.costLimitDaily}
                  onChange={(val) => setNewKey({ ...newKey, costLimitDaily: parseFloat(val) || 0 })}
                  precision={2}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  placeholder="Key description or notes..."
                  value={newKey.metadata.description}
                  onChange={(e) =>
                    setNewKey({ ...newKey, metadata: { description: e.target.value } })
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onKeyModalClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={createAPIKey}>
              Add API Key
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default function AIInferencingKeys() {
  return (
    <DashboardLayout>
      <AIInferencingKeysContent />
    </DashboardLayout>
  );
}
