/**
 * Project Management Page
 * 
 * Three-panel layout for managing AI Inferencing projects, services, and API keys
 * - Left Panel: Project list with search and filters
 * - Center Panel: Project/Service details and overview
 * - Right Panel: Quick actions and forms
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  Card,
  CardBody,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  FormControl,
  FormLabel,
  Textarea,
  Checkbox,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiFolder,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiSettings,
  FiKey,
  FiActivity,
  FiChevronRight,
  FiArrowLeft,
} from 'react-icons/fi';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AI_INFERENCING_URL = process.env.REACT_APP_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_API_KEY = process.env.REACT_APP_ADMIN_API_KEY || 'ai-inferencing-admin-key-2024';

interface Project {
  project_id: string;
  name: string;
  description: string;
  service_count: string;
  key_count: string;
  created_at: string;
  updated_at: string;
}

interface Service {
  service_id: string;
  project_id: string;
  name: string;
  description: string;
  status: string;
  key_count: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectManagementPage() {
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    projectId: '',
    description: '',
  });

  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surfaceActive');

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load services when project selected
  useEffect(() => {
    if (selectedProject) {
      loadServices(selectedProject.project_id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        headers: { 'X-Admin-Key': ADMIN_API_KEY }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({
        title: 'Error loading projects',
        status: 'error',
        duration: 3000,
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
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch(`${AI_INFERENCING_URL}/api/v1/admin/keys/projects`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': ADMIN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: formData.projectId || formData.name.toLowerCase().replace(/\s+/g, '-'),
          name: formData.name,
          description: formData.description,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Project created successfully',
          status: 'success',
          duration: 3000,
        });
        setIsCreating(false);
        setFormData({ name: '', projectId: '', description: '' });
        loadProjects();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
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
            name: formData.name,
            description: formData.description,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Project updated successfully',
          status: 'success',
          duration: 3000,
        });
        setIsEditing(false);
        loadProjects();
      }
    } catch (error) {
      toast({
        title: 'Error updating project',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/projects/${selectedProject.project_id}`,
        {
          method: 'DELETE',
          headers: { 'X-Admin-Key': ADMIN_API_KEY },
        }
      );

      if (response.ok) {
        toast({
          title: 'Project deleted successfully',
          status: 'success',
          duration: 3000,
        });
        setDeleteConfirmOpen(false);
        setSelectedProject(null);
        loadProjects();
      }
    } catch (error) {
      toast({
        title: 'Error deleting project',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.project_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditForm = () => {
    if (selectedProject) {
      setFormData({
        name: selectedProject.name,
        projectId: selectedProject.project_id,
        description: selectedProject.description || '',
      });
      setIsEditing(true);
    }
  };

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 80px)" overflow="hidden">
        {/* LEFT PANEL - Project List */}
        <Box
          w="250px"
          borderRight="1px"
          borderColor={borderColor}
          bg={bgColor}
          overflowY="auto"
        >
          {/* Header */}
          <Box p={4} borderBottom="1px" borderColor={borderColor}>
            <Flex justify="space-between" align="center" mb={3}>
              <Heading size="sm">Projects</Heading>
              <Tooltip label="Create Project">
                <IconButton
                  aria-label="Create project"
                  icon={<FiPlus />}
                  size="sm"
                  colorScheme="blue"
                  onClick={() => {
                    setFormData({ name: '', projectId: '', description: '' });
                    setIsCreating(true);
                  }}
                />
              </Tooltip>
            </Flex>
            
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray" />
              </InputLeftElement>
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </Box>

          {/* Project List */}
          <VStack spacing={0} align="stretch">
            {loading ? (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            ) : filteredProjects.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  No projects found
                </Text>
              </Box>
            ) : (
              filteredProjects.map((project) => (
                <Box
                  key={project.project_id}
                  p={3}
                  cursor="pointer"
                  bg={selectedProject?.project_id === project.project_id ? selectedBg : 'transparent'}
                  _hover={{ bg: hoverBg }}
                  onClick={() => {
                    setSelectedProject(project);
                    setSelectedService(null);
                  }}
                  borderBottom="1px"
                  borderColor={borderColor}
                >
                  <HStack justify="space-between" mb={1}>
                    <HStack spacing={2}>
                      <FiFolder />
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {project.name}
                      </Text>
                    </HStack>
                  </HStack>
                  <HStack spacing={3} fontSize="xs" color={useSemanticToken('text.secondary')}>
                    <Text>{project.service_count} services</Text>
                    <Text>•</Text>
                    <Text>{project.key_count} keys</Text>
                  </HStack>
                </Box>
              ))
            )}
          </VStack>

          {/* Stats Footer */}
          <Box p={4} borderTop="1px" borderColor={borderColor} mt="auto">
            <VStack spacing={1} align="stretch" fontSize="xs">
              <HStack justify="space-between">
                <Text color={useSemanticToken('text.secondary')}>Total Projects:</Text>
                <Text fontWeight="bold">{projects.length}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color={useSemanticToken('text.secondary')}>Total Services:</Text>
                <Text fontWeight="bold">
                  {projects.reduce((acc, p) => acc + parseInt(p.service_count || '0'), 0)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text color={useSemanticToken('text.secondary')}>Total Keys:</Text>
                <Text fontWeight="bold">
                  {projects.reduce((acc, p) => acc + parseInt(p.key_count || '0'), 0)}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Box>

        {/* CENTER PANEL - Project Details */}
        <Box flex="1" overflowY="auto" p={6}>
          {!selectedProject ? (
            <Flex h="full" align="center" justify="center" direction="column">
              <FiFolder size={48} color="gray" />
              <Text mt={4} fontSize="lg" color={useSemanticToken('text.secondary')}>
                Select a project to get started
              </Text>
              <Button
                mt={4}
                leftIcon={<FiPlus />}
                colorScheme="blue"
                onClick={() => {
                  setFormData({ name: '', projectId: '', description: '' });
                  setIsCreating(true);
                }}
              >
                Create New Project
              </Button>
            </Flex>
          ) : (
            <Box>
              {/* Project Header */}
              <Flex justify="space-between" align="start" mb={6}>
                <Box>
                  <Heading size="lg" mb={2}>{selectedProject.name}</Heading>
                  <Text color={useSemanticToken('text.secondary')}>{selectedProject.description || 'No description'}</Text>
                  <Text fontSize="xs" color={useSemanticToken('text.tertiary')} mt={1}>
                    ID: {selectedProject.project_id}
                  </Text>
                </Box>
                <HStack>
                  <IconButton
                    aria-label="Edit project"
                    icon={<FiEdit2 />}
                    onClick={openEditForm}
                  />
                  <IconButton
                    aria-label="Delete project"
                    icon={<FiTrash2 />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => setDeleteConfirmOpen(true)}
                  />
                </HStack>
              </Flex>

              {/* Stats Cards */}
              <SimpleGrid columns={4} spacing={4} mb={6}>
                <Card>
                  <CardBody>
                    <Stat size="sm">
                      <StatLabel>Services</StatLabel>
                      <StatNumber>{selectedProject.service_count}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Stat size="sm">
                      <StatLabel>API Keys</StatLabel>
                      <StatNumber>{selectedProject.key_count}</StatNumber>
                    </Stat>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Stat size="sm">
                      <StatLabel>Status</StatLabel>
                      <Badge colorScheme="green">Active</Badge>
                    </Stat>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <Stat size="sm">
                      <StatLabel>Created</StatLabel>
                      <StatHelpText fontSize="xs">
                        {new Date(selectedProject.created_at).toLocaleDateString()}
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Services Section */}
              <Box>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="md">Services</Heading>
                  <Button
                    size="sm"
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    onClick={() => {
                      toast({
                        title: 'Create service',
                        description: 'Service creation UI coming soon',
                        status: 'info',
                        duration: 3000,
                      });
                    }}
                  >
                    Add Service
                  </Button>
                </Flex>

                {services.length === 0 ? (
                  <Card>
                    <CardBody>
                      <Text textAlign="center" color={useSemanticToken('text.secondary')}>
                        No services in this project
                      </Text>
                    </CardBody>
                  </Card>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {services.map((service) => (
                      <Card
                        key={service.service_id}
                        cursor="pointer"
                        _hover={{ borderColor: 'blue.500' }}
                        onClick={() => setSelectedService(service)}
                      >
                        <CardBody>
                          <Flex justify="space-between" align="center">
                            <Box>
                              <HStack mb={1}>
                                <Text fontWeight="bold">{service.name}</Text>
                                {service.status === 'active' && (
                                  <Badge colorScheme="green" size="sm">Active</Badge>
                                )}
                              </HStack>
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                {service.description || 'No description'}
                              </Text>
                              <HStack mt={2} fontSize="xs" color={useSemanticToken('text.tertiary')}>
                                <FiKey />
                                <Text>{service.key_count} keys</Text>
                              </HStack>
                            </Box>
                            <FiChevronRight color="gray" />
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* RIGHT PANEL - Actions & Forms */}
        <Box
          w="350px"
          borderLeft="1px"
          borderColor={borderColor}
          bg={bgColor}
          overflowY="auto"
          p={4}
        >
          {isCreating || isEditing ? (
            /* Form View */
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm">
                  {isCreating ? 'Create Project' : 'Edit Project'}
                </Heading>
                <IconButton
                  aria-label="Close"
                  icon={<FiArrowLeft />}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                />
              </Flex>

              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Project Name</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Project"
                  />
                </FormControl>

                {isCreating && (
                  <FormControl>
                    <FormLabel fontSize="sm">Project ID</FormLabel>
                    <Input
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      placeholder="my-project"
                    />
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                      Auto-generated from name if left empty
                    </Text>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel fontSize="sm">Description</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your project..."
                    rows={3}
                  />
                </FormControl>

                <Divider />

                <HStack>
                  <Button
                    flex={1}
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    flex={1}
                    colorScheme="blue"
                    onClick={isCreating ? handleCreateProject : handleUpdateProject}
                    isDisabled={!formData.name}
                  >
                    {isCreating ? 'Create' : 'Save'}
                  </Button>
                </HStack>
              </VStack>
            </Box>
          ) : selectedProject ? (
            /* Project Details View */
            <Box>
              <Heading size="sm" mb={4}>Project Details</Heading>

              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Name</Text>
                  <Text fontWeight="medium">{selectedProject.name}</Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Project ID</Text>
                  <Text fontSize="sm" fontFamily="mono">{selectedProject.project_id}</Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Description</Text>
                  <Text fontSize="sm">{selectedProject.description || 'No description'}</Text>
                </Box>

                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Created</Text>
                  <Text fontSize="sm">
                    {new Date(selectedProject.created_at).toLocaleString()}
                  </Text>
                </Box>

                <Divider />

                <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')}>QUICK ACTIONS</Text>

                <VStack spacing={2} align="stretch">
                  <Button
                    size="sm"
                    leftIcon={<FiPlus />}
                    variant="outline"
                    justifyContent="flex-start"
                  >
                    Add Service
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<FiKey />}
                    variant="outline"
                    justifyContent="flex-start"
                  >
                    Manage Keys
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<FiActivity />}
                    variant="outline"
                    justifyContent="flex-start"
                  >
                    View Analytics
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<FiSettings />}
                    variant="outline"
                    justifyContent="flex-start"
                    onClick={openEditForm}
                  >
                    Edit Project
                  </Button>
                </VStack>

                <Divider />

                <Text fontSize="xs" fontWeight="bold" color="red.500">DANGER ZONE</Text>

                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  leftIcon={<FiTrash2 />}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete Project
                </Button>
              </VStack>
            </Box>
          ) : (
            <Box>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                Select a project to view details
              </Text>
            </Box>
          )}
        </Box>
      </Flex>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete Project</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete "{selectedProject?.name}"?
              <br /><br />
              This will permanently delete:
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>{selectedProject?.service_count} services</li>
                <li>{selectedProject?.key_count} API keys</li>
                <li>All usage history</li>
              </ul>
              <br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteProject} ml={3}>
                Delete Project
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </DashboardLayout>
  );
}
