import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Progress,
  Alert,
  AlertIcon,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  Flex
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, ViewIcon, SettingsIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectOnboardingWizard from '@/components/projects/ProjectOnboardingWizard';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'completed' | 'archived';
  progress: number;
  type: 'platform' | 'service' | 'ai-system' | 'infrastructure';
  lastUpdated: string;
  tasksTotal: number;
  tasksCompleted: number;
  healthScore: number;
}

const ProjectsPage: React.FC = () => {
  const router = useRouter();
  const { isOpen: isOnboardingOpen, onOpen: onOnboardingOpen, onClose: onOnboardingClose } = useDisclosure();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      if (data.success) {
        // Mock enhanced data for demo
        const enhancedProjects: Project[] = [
          {
            id: 'ai-homelab-ecosystem',
            name: 'AI Homelab Ecosystem',
            description: 'Main ecosystem repository with microservices architecture',
            status: 'active',
            progress: 85,
            type: 'platform',
            lastUpdated: new Date().toISOString(),
            tasksTotal: 50,
            tasksCompleted: 42,
            healthScore: 92
          },
          {
            id: 'knowledge-graph-service',
            name: 'Knowledge Graph Service',
            description: 'MCP-based knowledge graph with vector embeddings',
            status: 'active',
            progress: 78,
            type: 'service',
            lastUpdated: new Date(Date.now() - 86400000).toISOString(),
            tasksTotal: 30,
            tasksCompleted: 23,
            healthScore: 88
          },
          {
            id: 'ai-gateway',
            name: 'AI Gateway',
            description: 'Centralized AI service routing and management',
            status: 'active',
            progress: 95,
            type: 'ai-system',
            lastUpdated: new Date(Date.now() - 3600000).toISOString(),
            tasksTotal: 25,
            tasksCompleted: 24,
            healthScore: 96
          },
          {
            id: 'authentik-sso',
            name: 'Authentik SSO',
            description: 'Identity provider and SSO infrastructure',
            status: 'inactive',
            progress: 60,
            type: 'infrastructure',
            lastUpdated: new Date(Date.now() - 172800000).toISOString(),
            tasksTotal: 20,
            tasksCompleted: 12,
            healthScore: 72
          }
        ];
        setProjects(enhancedProjects);
      } else {
        setError(data.message || 'Failed to fetch projects');
      }
    } catch (err) {
      setError('Network error fetching projects');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'completed': return 'blue';
      case 'archived': return 'gray';
      default: return 'gray';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'platform': return 'purple';
      case 'service': return 'blue';
      case 'ai-system': return 'orange';
      case 'infrastructure': return 'teal';
      default: return 'gray';
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const projectsByStatus = {
    active: filteredProjects.filter(p => p.status === 'active'),
    inactive: filteredProjects.filter(p => p.status === 'inactive'),
    completed: filteredProjects.filter(p => p.status === 'completed'),
    all: filteredProjects
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <VStack>
            <Spinner size="xl" />
            <Text>Loading projects...</Text>
          </VStack>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box p={6} maxW="full">
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="lg" mb={2}>
              AI Homelab Projects
            </Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Manage, monitor, and onboard AI projects in your homelab ecosystem
            </Text>
          </Box>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onOnboardingOpen}
          >
            New Project
          </Button>
        </Flex>

        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Search */}
        <InputGroup mb={6}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color={useSemanticToken('text.tertiary')} />
          </InputLeftElement>
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>

        {/* Project Tabs */}
        <Tabs index={selectedTab} onChange={setSelectedTab}>
          <TabList>
            <Tab>All ({projectsByStatus.all.length})</Tab>
            <Tab>Active ({projectsByStatus.active.length})</Tab>
            <Tab>Inactive ({projectsByStatus.inactive.length})</Tab>
            <Tab>Completed ({projectsByStatus.completed.length})</Tab>
          </TabList>

          <TabPanels>
            {Object.entries(projectsByStatus).map(([status, statusProjects]) => (
              <TabPanel key={status} p={0} pt={6}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {statusProjects.map((project) => (
                    <Card
                      key={project.id}
                      bg={cardBg}
                      borderWidth="1px"
                      borderColor={borderColor}
                      cursor="pointer"
                      _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                      transition="all 0.2s"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <CardHeader pb={3}>
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={2} flex={1}>
                            <Heading size="md" noOfLines={1}>
                              {project.name}
                            </Heading>
                            <HStack spacing={2}>
                              <Badge colorScheme={getStatusColor(project.status)}>
                                {project.status}
                              </Badge>
                              <Badge colorScheme={getTypeColor(project.type)}>
                                {project.type}
                              </Badge>
                            </HStack>
                          </VStack>
                          <IconButton
                            aria-label="View project"
                            icon={<ViewIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/projects/${project.id}`);
                            }}
                          />
                        </HStack>
                      </CardHeader>
                      <CardBody pt={0}>
                        <Text color={useSemanticToken('text.secondary')} mb={4} noOfLines={2}>
                          {project.description}
                        </Text>
                        
                        <VStack spacing={3}>
                          <Box w="full">
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="sm">Progress</Text>
                              <Text fontSize="sm" fontWeight="bold">
                                {project.progress}%
                              </Text>
                            </HStack>
                            <Progress
                              value={project.progress}
                              colorScheme={project.progress > 80 ? 'green' : 'blue'}
                              size="sm"
                              borderRadius="full"
                            />
                          </Box>

                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              Tasks: {project.tasksCompleted}/{project.tasksTotal}
                            </Text>
                            <Badge
                              colorScheme={project.healthScore > 90 ? 'green' : project.healthScore > 75 ? 'yellow' : 'red'}
                              variant="subtle"
                            >
                              Health: {project.healthScore}%
                            </Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>

        {/* Project Onboarding Modal */}
        <Modal isOpen={isOnboardingOpen} onClose={onOnboardingClose} size="2xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Project Onboarding</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <ProjectOnboardingWizard onComplete={onOnboardingClose} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
};

export default ProjectsPage;
