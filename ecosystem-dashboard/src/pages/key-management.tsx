/**
 * API Key Management Dashboard v2.0
 * Modern 3-pane layout with glassmorphism design
 * Pattern: Podcast Studio / AI Research layout
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Button,
  IconButton,
  Badge,
  Input,
  useDisclosure,
  useToast,
  Spinner,
  Icon,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  Switch,
  Flex,
  Heading,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Divider,
} from '@chakra-ui/react';
import { useRightPanel } from '../contexts/RightPanelContext';
import {
  FiKey,
  FiPlus,
  FiRefreshCw,
  FiDatabase,
  FiServer,
  FiCheckCircle,
  FiAlertCircle,
  FiTrash2,
  FiLock,
  FiEdit2,
  FiFolder,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useSidebar } from '../contexts/SidebarContext';
import ServiceKeysManager from '../components/ai-inferencing/ServiceKeysManager';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

// Debug environment variables
console.log('[Key Management] Environment Check:', {
  AI_INFERENCING_URL,
  ADMIN_API_KEY,
  envVar: process.env.NEXT_PUBLIC_AI_INFERENCING_URL,
});

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
  cost_limit_daily: string;
  created_at: string;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

interface AIInferencingKeysContentProps {
  embedded?: boolean;
  onDataChange?: () => void; // Callback to notify parent to refresh
}

export function AIInferencingKeysContent({ 
  embedded = false,
  onDataChange
}: AIInferencingKeysContentProps) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceKeys, setServiceKeys] = useState<APIKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [projectsPanelWidth, setProjectsPanelWidth] = useState(320);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Increment to force ServiceKeysManager reload
  
  const toast = useToast();
  const { setIsOpen: setRightPanelOpen, setCustomData } = useRightPanel();
  
  const bgColor = useSemanticToken('surface.base');
  const headerBg = useSemanticToken('surface.elevated');
  const panelBg = useSemanticToken('surface.elevated');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surfaceActive');
  const selectedBorder = useSemanticToken('border.active');

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
    secretKey: '',
    isPrimary: true,
    rateLimitPerMinute: 100,
    costLimitDaily: 50,
    metadata: { description: '' }
  });
  
  // Project management state
  const [projectFormData, setProjectFormData] = useState({ name: '', projectId: '', description: '' });
  const [isEditingProject, setIsEditingProject] = useState(false);

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

  // DISABLED: Auto-refresh was causing infinite loops
  // Instead, we force refresh via refreshTrigger after operations
  // useEffect(() => {
  //   if (!selectedKeyId || serviceKeys.length === 0) return;
  //   const updatedKey = serviceKeys.find(k => k.key_id === selectedKeyId);
  //   if (updatedKey) {
  //     setCustomData((prev: any) => {
  //       if (prev?.type === 'key-details' && (prev?.key?.key_id === updatedKey.key_id || prev?.key?.id === updatedKey.key_id)) {
  //         return { ...prev, key: updatedKey };
  //       }
  //       return prev;
  //     });
  //   }
  // }, [serviceKeys, selectedKeyId]);

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
      console.log('[Key Management] Loading projects from:', AI_INFERENCING_URL);
      console.log('[Key Management] Using admin key:', ADMIN_API_KEY);
      
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });
      
      console.log('[Key Management] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Key Management] Loaded projects:', data.projects);
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
      } else {
        const errorText = await response.text();
        console.error('[Key Management] API error:', errorText);
        throw new Error(`Failed to load projects: ${response.status}`);
      }
    } catch (error) {
      console.error('[Key Management] Error loading projects:', error);
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
        
        // Only auto-select if no service is currently selected or current service is not in the new list
        if (data.services && data.services.length > 0) {
          const currentServiceStillExists = selectedService && data.services.some(
            (s: Service) => s.service_id === selectedService.service_id
          );
          
          if (!selectedService || !currentServiceStillExists) {
            setSelectedService(data.services[0]);
          }
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
      // Transform snake_case to camelCase for API
      const payload = {
        projectId: newProject.project_id,
        name: newProject.name,
        description: newProject.description
      };
      console.log('[Create Project] Sending:', payload);
      
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': ADMIN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({ title: 'Project created', status: 'success', duration: 3000 });
        onProjectModalClose();
        setNewProject({ project_id: '', name: '', description: '' });
        loadProjects();
        
        // Notify parent to refresh
        if (onDataChange) {
          onDataChange();
        }
      } else {
        // Get detailed error message from API
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Create Project] API Error:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[Create Project] Error:', error);
      toast({
        title: 'Error creating project',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${selectedProject.project_id}`,
        {
          method: 'PATCH',
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectFormData.name,
            description: projectFormData.description,
          }),
        }
      );

      if (response.ok) {
        toast({ title: 'Project updated successfully', status: 'success', duration: 3000 });
        onProjectModalClose();
        setIsEditingProject(false);
        loadProjects();
        
        if (onDataChange) {
          onDataChange();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Error updating project',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${projectId}`,
        {
          method: 'DELETE',
          headers: { 'X-Admin-Key': ADMIN_API_KEY },
        }
      );

      if (response.ok) {
        toast({ title: 'Project deleted successfully', status: 'success', duration: 3000 });
        setSelectedProject(null);
        loadProjects();
        
        if (onDataChange) {
          onDataChange();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Error deleting project',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const createService = async () => {
    if (!selectedProject) return;

    try {
      // Transform snake_case to camelCase for API
      const payload = {
        serviceId: newService.service_id,
        name: newService.name,
        description: newService.description
      };
      console.log('[Create Service] Sending:', payload);
      
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${selectedProject.project_id}/services`,
        {
          method: 'POST',
          headers: {
            'X-Admin-Key': ADMIN_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        toast({ title: 'Service created', status: 'success', duration: 3000 });
        onServiceModalClose();
        setNewService({ service_id: '', name: '', description: '' });
        loadServices(selectedProject.project_id);
        
        // Notify parent to refresh
        if (onDataChange) {
          onDataChange();
        }
      } else {
        // Get detailed error message from API
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Create Service] API Error:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[Create Service] Error:', error);
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
        const data = await response.json();
        console.log('[Create API Key] Success:', data);
        
        toast({ 
          title: `${newKey.provider.toUpperCase()} API Key added successfully!`,
          description: `Added to ${selectedService.name}`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        
        onKeyModalClose();
        setNewKey({
          provider: 'openai',
          apiKey: '',
          secretKey: '',
          isPrimary: true,
          rateLimitPerMinute: 100,
          costLimitDaily: 50,
          metadata: { description: '' }
        });
        
        // Reload all data to refresh the dashboard
        loadServiceKeys(selectedService.service_id);
        loadProjects(); // Refresh projects to update key counts
        
        // Notify parent component to refresh its data
        if (onDataChange) {
          console.log('[Create API Key] Notifying parent to refresh');
          onDataChange();
        }
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
    console.log('='.repeat(80));
    console.log('🔥 NEW CODE RUNNING - DELETE KEY FUNCTION v2.0');
    console.log('[Key Management] 🗑️ Delete requested for key:', keyId);
    console.log('[Key Management] Showing confirmation dialog...');
    console.log('='.repeat(80));
    
    const confirmed = confirm('Are you sure you want to delete this API key?');
    console.log('[Key Management] User confirmation:', confirmed ? 'YES - proceeding' : 'NO - cancelled');
    
    if (!confirmed) {
      console.log('[Key Management] ❌ Deletion cancelled by user');
      return;
    }

    try {
      console.log('[Key Management] 🔄 Starting deletion for key:', keyId);
      console.log('[Key Management] Delete URL:', `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`);
      
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`,
        {
          method: 'DELETE',
          headers: { 'X-Admin-Key': ADMIN_API_KEY }
        }
      );

      console.log('[Key Management] Delete response status:', response.status);
      console.log('[Key Management] Delete response ok:', response.ok);

      if (response.ok) {
        console.log('='.repeat(80));
        console.log('🎉 KEY DELETED SUCCESSFULLY!');
        console.log('[Key Management] ✅ Key deleted successfully');
        console.log('Incrementing refreshTrigger to force reload...');
        console.log('='.repeat(80));
        
        toast({ title: 'API Key deleted', status: 'success', duration: 3000 });
        
        // Force ServiceKeysManager to reload by incrementing refreshTrigger
        setRefreshTrigger(prev => {
          const newValue = prev + 1;
          console.log('🔄 refreshTrigger:', prev, '→', newValue);
          return newValue;
        });
        
        // Close panel and clear selected key
        setRightPanelOpen(false);
        setCustomData(null);
        setSelectedKey(null);
        setSelectedKeyId(null);
        
        if (selectedService) {
          loadServiceKeys(selectedService.service_id);
          loadProjects(); // Refresh counts
        }
        
        // Notify parent to refresh
        if (onDataChange) {
          onDataChange();
        }
      } else {
        const errorText = await response.text();
        console.error('[Key Management] Delete error response:', errorText);
        throw new Error(`Failed to delete API key: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[Key Management] Delete error:', error);
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
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  // Embedded version - simpler layout without left panel (handled by parent)
  if (embedded) {
    console.log('[Key Management] Rendering embedded, projects:', projects.length, 'selected:', selectedProject?.name);
    
    return (
      <Box p={6} h="calc(100vh - 250px)" overflowY="auto">
        <VStack spacing={6} align="stretch">
          {/* Project Selector */}
          <Box>
            <HStack justify="space-between" mb={4}>
              <HStack spacing={3}>
                <Icon as={FiDatabase} color="blue.500" boxSize={5} />
                <Text fontSize="lg" fontWeight="bold">API Key Management</Text>
              </HStack>
              <Button size="sm" leftIcon={<FiPlus />} colorScheme="blue" onClick={onProjectModalOpen}>
                New Project
              </Button>
            </HStack>
            
            {/* Project Select Dropdown */}
            <FormControl>
              <FormLabel fontSize="sm">Select Project</FormLabel>
              <HStack>
                <Select
                  value={selectedProject?.project_id || ''}
                  onChange={(e) => {
                    console.log('[Key Management] Project selected:', e.target.value);
                    const project = projects.find(p => p.project_id === e.target.value);
                    setSelectedProject(project || null);
                  }}
                  placeholder="Choose a project..."
                  flex="1"
                >
                  {projects.map((project) => {
                    console.log('[Key Management] Mapping project:', project.name, project.project_id);
                    return (
                      <option key={project.project_id} value={project.project_id}>
                        {project.name} ({project.key_count} keys)
                      </option>
                    );
                  })}
                </Select>
                <Tooltip label="Edit Project">
                  <IconButton
                    aria-label="Edit project"
                    icon={<FiEdit2 />}
                    size="sm"
                    isDisabled={!selectedProject}
                    onClick={() => {
                      if (selectedProject) {
                        setProjectFormData({
                          name: selectedProject.name,
                          projectId: selectedProject.project_id,
                          description: selectedProject.description || '',
                        });
                        setIsEditingProject(true);
                        onProjectModalOpen();
                      }
                    }}
                  />
                </Tooltip>
                <Tooltip label="Delete Project">
                  <IconButton
                    aria-label="Delete project"
                    icon={<FiTrash2 />}
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    isDisabled={!selectedProject}
                    onClick={() => {
                      if (selectedProject) {
                        if (confirm(`Are you sure you want to delete "${selectedProject.name}"? This will delete all services and keys.`)) {
                          handleDeleteProject(selectedProject.project_id);
                        }
                      }
                    }}
                  />
                </Tooltip>
              </HStack>
            </FormControl>
            
            {/* Project Stats */}
            {selectedProject && (
              <HStack spacing={4} mt={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                <HStack>
                  <Icon as={FiServer} />
                  <Text>{selectedProject.service_count} services</Text>
                </HStack>
                <HStack>
                  <Icon as={FiKey} />
                  <Text>{selectedProject.key_count} keys</Text>
                </HStack>
                <HStack>
                  <Icon as={FiCheckCircle} color="green.500" />
                  <Text>Active</Text>
                </HStack>
              </HStack>
            )}
          </Box>

          {/* Services/Keys Section */}
          <Box>
            {!selectedService ? (
              // Show services list
              <>
                <HStack justify="space-between" mb={4}>
                  <HStack>
                    <Icon as={FiServer} color="purple.500" boxSize={5} />
                    <Text fontSize="lg" fontWeight="bold">Services</Text>
                    {selectedProject && (
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>in {selectedProject.name}</Text>
                    )}
                  </HStack>
                  <Button
                    size="sm"
                    leftIcon={<FiPlus />}
                    colorScheme="purple"
                    onClick={onServiceModalOpen}
                    isDisabled={!selectedProject}
                  >
                    New Service
                  </Button>
                </HStack>

                {!selectedProject ? (
                  <Box p={8} bg={cardBg} borderRadius="lg" textAlign="center" borderWidth="1px" borderColor={borderColor}>
                    <Text color={useSemanticToken('text.secondary')}>Select a project to view services</Text>
                  </Box>
                ) : services.length === 0 ? (
                  <Box p={8} bg={cardBg} borderRadius="lg" textAlign="center" borderWidth="1px" borderColor={borderColor}>
                    <Text color={useSemanticToken('text.secondary')}>No services yet. Click "New Service" to create one.</Text>
                  </Box>
                ) : (
                  <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4}>
                    {services.map((service) => (
                      <Box
                        key={service.service_id}
                        p={4}
                        bg={cardBg}
                        borderRadius="lg"
                        borderWidth="2px"
                        borderColor={selectedService?.service_id === service.service_id ? selectedBorder : borderColor}
                        cursor="pointer"
                        onClick={() => {
                          console.log('[Key Management] Service selected:', service.service_id);
                          setSelectedService(service);
                        }}
                        _hover={{
                          borderColor: selectedService?.service_id === service.service_id ? selectedBorder : 'gray.300',
                          transform: 'translateY(-2px)',
                          shadow: 'md',
                        }}
                    transition="all 0.2s ease"
                  >
                    <VStack align="start" spacing={2}>
                      <HStack justify="space-between" w="full">
                        <Text fontWeight="bold" fontSize="sm">
                          {service.name}
                        </Text>
                        <Badge colorScheme="purple" fontSize="xs" borderRadius="full">
                          {service.key_count} keys
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                        {service.description}
                      </Text>
                    </VStack>
                  </Box>
                ))}
              </Box>
            )}
              </>
            ) : (
              // Show ServiceKeysManager when service is selected
              <ServiceKeysManager
                service={selectedService}
                project={selectedProject}
                refreshTrigger={refreshTrigger}
                onKeySelect={(key) => {
                  console.log('[Key Management] Key selected:', key.key_id);
                  console.log('[Key Management] Opening right panel for key details');
                  setSelectedKey(key);
                  setSelectedKeyId(key.key_id);
                  // Open right panel with key details
                  setCustomData({
                    type: 'key-details',
                    key: key,
                    service: selectedService,
                    project: selectedProject,
                    onValidate: async (keyId: string) => {
                      console.log('[Key Management] Validating key:', keyId);
                      try {
                        const response = await fetch(
                          `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/validate`,
                          {
                            method: 'POST',
                            headers: {
                              'X-Admin-Key': ADMIN_API_KEY,
                              'Content-Type': 'application/json'
                            }
                          }
                        );
                        
                        console.log('[Key Management] Response status:', response.status);
                        
                        // Check if response is ok before parsing JSON
                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error('[Key Management] Non-OK response:', errorText);
                          throw new Error(`HTTP ${response.status}: ${errorText}`);
                        }
                        
                        // Get response as text first to debug
                        const responseText = await response.text();
                        console.log('[Key Management] Response text:', responseText);
                        
                        // Try to parse JSON
                        let result;
                        try {
                          result = JSON.parse(responseText);
                        } catch (parseError) {
                          console.error('[Key Management] JSON parse error:', parseError);
                          throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
                        }
                        
                        console.log('[Key Management] Parsed result:', result);
                        
                        if (result.valid) {
                          toast({
                            title: 'API Key Validated',
                            description: `${result.provider || 'Provider'} key is valid and working`,
                            status: 'success',
                            duration: 5000,
                          });
                          // Reload keys to show updated validation status
                          if (selectedService) {
                            loadServiceKeys(selectedService.service_id);
                          }
                        } else {
                          toast({
                            title: 'Validation Failed',
                            description: result.error || 'API key is invalid',
                            status: 'error',
                            duration: 5000,
                          });
                        }
                      } catch (error) {
                        console.error('[Key Management] Validation error:', error);
                        toast({
                          title: 'Validation Error',
                          description: error instanceof Error ? error.message : 'Unknown error',
                          status: 'error',
                          duration: 5000,
                        });
                      }
                    },
                    onUpdate: async (keyId: string, updates: any) => {
                      console.log('[Key Management] Update key:', keyId, updates);
                      console.log('[Key Management] API URL:', `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`);
                      console.log('[Key Management] Admin Key:', ADMIN_API_KEY);
                      
                      try {
                        const response = await fetch(
                          `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}`,
                          {
                            method: 'PATCH',
                            headers: {
                              'X-Admin-Key': ADMIN_API_KEY,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updates)
                          }
                        );

                        console.log('[Key Management] Response status:', response.status);
                        console.log('[Key Management] Response ok:', response.ok);

                        if (response.ok) {
                          toast({ 
                            title: 'API Key updated successfully',
                            status: 'success',
                            duration: 3000 
                          });
                          
                          // Reload the keys - useEffect will handle updating the panel
                          if (selectedService) {
                            loadServiceKeys(selectedService.service_id);
                            loadProjects();
                          }
                          
                          if (onDataChange) {
                            onDataChange();
                          }
                        } else {
                          const errorText = await response.text();
                          console.error('[Key Management] Update failed:', response.status, errorText);
                          
                          let errorMessage = 'Failed to update API key';
                          try {
                            const errorJson = JSON.parse(errorText);
                            errorMessage = errorJson.error || errorJson.message || errorMessage;
                          } catch (e) {
                            errorMessage = errorText || errorMessage;
                          }
                          
                          throw new Error(errorMessage);
                        }
                      } catch (error) {
                        console.error('[Key Management] Update error:', error);
                        toast({
                          title: 'Error updating key',
                          description: error instanceof Error ? error.message : 'Unknown error',
                          status: 'error',
                          duration: 5000,
                        });
                      }
                    },
                    onDelete: (keyId: string) => {
                      console.log('[Key Management] Delete key:', keyId);
                      deleteKey(keyId);
                      // Don't close panel here - deleteKey will handle it after successful deletion
                    }
                  });
                  setRightPanelOpen(true);
                }}
                onAddKey={() => {
                  console.log('[Key Management] Add key clicked');
                  onKeyModalOpen();
                }}
              />
            )}
          </Box>
        </VStack>

        {/* Modals */}
        <Modal isOpen={isProjectModalOpen} onClose={() => {
          onProjectModalClose();
          setIsEditingProject(false);
          setProjectFormData({ name: '', projectId: '', description: '' });
        }}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>{isEditingProject ? 'Edit Project' : 'Create New Project'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {!isEditingProject && (
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Project ID</FormLabel>
                  <Input
                    placeholder="ai-research"
                    value={isEditingProject ? projectFormData.projectId : newProject.project_id}
                    onChange={(e) => {
                      // Sanitize: lowercase, replace spaces with hyphens, remove invalid chars
                      const sanitized = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');
                      if (isEditingProject) {
                        setProjectFormData({ ...projectFormData, projectId: sanitized });
                      } else {
                        setNewProject({ ...newProject, project_id: sanitized });
                      }
                    }}
                    size="sm"
                    isReadOnly={isEditingProject}
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Lowercase letters, numbers, and hyphens only
                  </Text>
                </FormControl>
              )}
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input
                  placeholder="AI Research"
                  value={isEditingProject ? projectFormData.name : newProject.name}
                  onChange={(e) => {
                    if (isEditingProject) {
                      setProjectFormData({ ...projectFormData, name: e.target.value });
                    } else {
                      setNewProject({ ...newProject, name: e.target.value });
                    }
                  }}
                  size="sm"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea
                  placeholder="Project description..."
                  value={isEditingProject ? projectFormData.description : newProject.description}
                  onChange={(e) => {
                    if (isEditingProject) {
                      setProjectFormData({ ...projectFormData, description: e.target.value });
                    } else {
                      setNewProject({ ...newProject, description: e.target.value });
                    }
                  }}
                  size="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => {
              onProjectModalClose();
              setIsEditingProject(false);
              setProjectFormData({ name: '', projectId: '', description: '' });
            }} size="sm">
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={isEditingProject ? handleUpdateProject : createProject} 
              size="sm"
            >
              {isEditingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isServiceModalOpen} onClose={onServiceModalClose}>
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Create New Service</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {selectedProject && (
                <Box w="full" p={3} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" color="blue.700">
                    <strong>Project:</strong> {selectedProject.name}
                  </Text>
                </Box>
              )}
              <FormControl isRequired>
                <FormLabel fontSize="sm">Service ID</FormLabel>
                <Input
                  placeholder="research-agent"
                  value={newService.service_id}
                  onChange={(e) => {
                    // Sanitize: lowercase, replace spaces with hyphens, remove invalid chars
                    const sanitized = e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, '');
                    setNewService({ ...newService, service_id: sanitized });
                  }}
                  size="sm"
                />
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                  Lowercase letters, numbers, and hyphens only
                </Text>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input
                  placeholder="Research Agent"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  size="sm"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea
                  placeholder="Service description..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  size="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onServiceModalClose} size="sm">
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={createService} size="sm">
              Create Service
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isKeyModalOpen} onClose={onKeyModalClose} size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent>
          <ModalHeader>Add API Key</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {selectedService && (
                <Box w="full" p={3} bg="purple.50" borderRadius="md">
                  <Text fontSize="sm" color="purple.700">
                    <strong>Service:</strong> {selectedService.name}
                  </Text>
                </Box>
              )}
              <FormControl isRequired>
                <FormLabel fontSize="sm">Provider</FormLabel>
                <Select
                  value={newKey.provider}
                  onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                  size="sm"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google (Gemini)</option>
                  <option value="cohere">Cohere</option>
                  <option value="huggingface">Hugging Face</option>
                  <option value="unsplash">Unsplash (Image Gallery)</option>
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">
                  {newKey.provider === 'unsplash' ? 'Access Key' : 'API Key'}
                </FormLabel>
                <Input
                  type="password"
                  placeholder={newKey.provider === 'unsplash' ? 'Your Unsplash Access Key' : 'sk-...'}
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                  size="sm"
                />
              </FormControl>
              {newKey.provider === 'unsplash' && (
                <FormControl>
                  <FormLabel fontSize="sm">Secret Key (Optional)</FormLabel>
                  <Input
                    type="password"
                    placeholder="Your Unsplash Secret Key (for OAuth)"
                    value={newKey.secretKey}
                    onChange={(e) => setNewKey({ ...newKey, secretKey: e.target.value })}
                    size="sm"
                  />
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                    Only required for write operations and OAuth flows
                  </Text>
                </FormControl>
              )}
              <HStack w="full">
                <FormControl>
                  <FormLabel fontSize="sm">Rate Limit (per minute)</FormLabel>
                  <NumberInput
                    value={newKey.rateLimitPerMinute}
                    onChange={(_, val) => setNewKey({ ...newKey, rateLimitPerMinute: val })}
                    size="sm"
                    min={0}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Cost Limit (per day)</FormLabel>
                  <NumberInput
                    value={newKey.costLimitDaily}
                    onChange={(_, val) => setNewKey({ ...newKey, costLimitDaily: val })}
                    size="sm"
                    min={0}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </HStack>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="primary-key" mb="0" fontSize="sm">
                  Set as primary key
                </FormLabel>
                <Switch
                  id="primary-key"
                  isChecked={newKey.isPrimary}
                  onChange={(e) => setNewKey({ ...newKey, isPrimary: e.target.checked })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea
                  placeholder="Key description or notes..."
                  value={newKey.metadata.description}
                  onChange={(e) =>
                    setNewKey({ ...newKey, metadata: { description: e.target.value } })
                  }
                  size="sm"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onKeyModalClose} size="sm">
              Cancel
            </Button>
            <Button colorScheme="green" onClick={createAPIKey} size="sm">
              Add API Key
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      </Box>
    );
  }

  // Standalone version - simple message to use tabs
  return (
    <Box p={6} textAlign="center">
      <VStack spacing={4}>
        <Icon as={FiKey} boxSize={12} color="blue.500" />
        <Heading size="md">API Key Management</Heading>
        <Text color={useSemanticToken('text.secondary')}>
          Please access API Key Management from the AI Inferencing page → API Keys tab
        </Text>
      </VStack>
    </Box>
  );
}

// Standalone page wrapper (for direct access)
export default function AIInferencingKeys() {
  return (
    <DashboardLayout>
      <AIInferencingKeysContent />
    </DashboardLayout>
  );
}
