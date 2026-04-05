import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Spinner,
  Tag,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  List,
  ListItem,
  ListIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Divider,
  Button,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  IconButton,
  useToast,
  Icon
} from '@chakra-ui/react';
import { 
  MdCheckCircle, 
  MdSettings, 
  MdErrorOutline, 
  MdTimeline, 
  MdTaskAlt,
  MdRefresh,
  MdMonitor,
  MdCode,
  MdDocumentScanner
} from 'react-icons/md';
import { ArrowBackIcon } from '@chakra-ui/icons';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Enhanced interfaces for better data structure
interface Task {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: string;
}

interface Milestone {
  id: string;
  name: string;
  due_date: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'overdue';
  progress: number;
}

interface Update {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  author?: string;
}

interface HealthMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: string;
}

interface ProjectDetails {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'active' | 'inactive' | 'completed' | 'archived';
  type: 'platform' | 'service' | 'ai-system' | 'infrastructure';
  path: string;
  repository?: string;
  framework?: string;
  tasks: Task[];
  milestones: Milestone[];
  updates: Update[];
  healthMetrics?: HealthMetrics;
  aiComponents?: string[];
}

const ProjectDetailPage: React.FC = () => {
  const router = useRouter();
  const { projectId } = router.query;
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const formatDate = (dateString: string): string => {
    if (!isClient) return 'Loading...';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateTime = (dateString: string): string => {
    if (!isClient) return 'Loading...';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const fetchProjectDetails = async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      // Enhanced mock data for demo
      const mockProjectDetails: ProjectDetails = {
        id: projectId as string,
        name: `AI Homelab ${projectId}`,
        description: 'Advanced AI-powered project with real-time monitoring and analytics',
        progress: 78,
        status: 'active',
        type: 'ai-system',
        path: `/Users/eleazar/CascadeProjects/ai-homelab-ecosystem/${projectId}`,
        repository: `https://github.com/ai-homelab/${projectId}`,
        framework: 'FastAPI + React',
        healthMetrics: {
          uptime: 99.5,
          responseTime: 120,
          errorRate: 0.02,
          lastCheck: new Date().toISOString()
        },
        aiComponents: ['Vector Embeddings', 'Knowledge Graphs', 'Natural Language Processing'],
        tasks: [
          { id: '1', name: 'Implement vector embeddings', status: 'completed', priority: 'high' },
          { id: '2', name: 'Setup knowledge graph integration', status: 'in-progress', priority: 'medium' },
          { id: '3', name: 'Add real-time monitoring', status: 'in-progress', priority: 'high' },
          { id: '4', name: 'Write documentation', status: 'pending', priority: 'low' },
          { id: '5', name: 'Performance optimization', status: 'blocked', priority: 'medium' }
        ],
        milestones: [
          { id: '1', name: 'MVP Release', due_date: '2024-12-01', status: 'completed', progress: 100 },
          { id: '2', name: 'Beta Testing', due_date: '2024-12-15', status: 'in-progress', progress: 65 },
          { id: '3', name: 'Production Release', due_date: '2025-01-01', status: 'upcoming', progress: 0 }
        ],
        updates: [
          { id: '1', timestamp: new Date().toISOString(), message: 'Real-time monitoring system deployed', type: 'success', author: 'AI System' },
          { id: '2', timestamp: new Date(Date.now() - 3600000).toISOString(), message: 'Performance metrics improved by 15%', type: 'info', author: 'System' },
          { id: '3', timestamp: new Date(Date.now() - 7200000).toISOString(), message: 'Minor API issues detected and resolved', type: 'warning', author: 'Monitor' }
        ]
      };

      setProject(mockProjectDetails);
      
      if (showRefreshToast) {
        toast({
          title: 'Project Updated',
          description: 'Latest project data has been loaded',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      console.error('Error fetching project details:', err);
      setError(err.message);
      setProject(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId]);

  // Helper functions for colors and status
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'green';
      case 'in-progress': return 'blue';
      case 'pending': return 'gray';
      case 'blocked': return 'red';
      case 'active': return 'green';
      case 'inactive': return 'yellow';
      case 'overdue': return 'red';
      case 'upcoming': return 'purple';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'green';
      case 'warning': return 'orange';
      case 'error': return 'red';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <VStack>
            <Spinner size="xl" />
            <Text>Loading project details...</Text>
          </VStack>
        </Box>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Box p={6}>
          <HStack mb={4}>
            <IconButton
              aria-label="Back to projects"
              icon={<ArrowBackIcon />}
              onClick={() => router.push('/projects')}
              variant="ghost"
            />
            <Heading size="lg">Project Error</Heading>
          </HStack>
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Error Loading Project!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </Box>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <Box p={6}>
          <HStack mb={4}>
            <IconButton
              aria-label="Back to projects"
              icon={<ArrowBackIcon />}
              onClick={() => router.push('/projects')}
              variant="ghost"
            />
            <Heading size="lg">Project Not Found</Heading>
          </HStack>
          <Alert status="warning">
            <AlertIcon />
            <AlertTitle>Project Not Found</AlertTitle>
            <AlertDescription>The requested project could not be found.</AlertDescription>
          </Alert>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box w="full" h="full" py={6}>
        {/* Header with Navigation */}
        <HStack justify="space-between" mb={6}>
          <HStack>
            <IconButton
              aria-label="Back to projects"
              icon={<ArrowBackIcon />}
              onClick={() => router.push('/projects')}
              variant="ghost"
            />
            <Box>
              <Heading size="lg">{project.name}</Heading>
              <Text color={useSemanticToken('text.secondary')}>{project.description}</Text>
            </Box>
          </HStack>
          <HStack>
            <IconButton
              aria-label="Refresh project data"
              icon={<MdRefresh />}
              onClick={() => fetchProjectDetails(true)}
              isLoading={refreshing}
              variant="outline"
            />
            <Button leftIcon={<MdSettings />} variant="outline">
              Settings
            </Button>
          </HStack>
        </HStack>

        {/* Project Status Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Status</StatLabel>
                <StatNumber>
                  <Badge colorScheme={getStatusColor(project.status)} fontSize="md">
                    {project.status}
                  </Badge>
                </StatNumber>
                <StatHelpText>
                  {project.type} • {project.framework}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Progress</StatLabel>
                <StatNumber>{project.progress}%</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  +5% this week
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {project.healthMetrics && (
            <>
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Uptime</StatLabel>
                    <StatNumber>{project.healthMetrics.uptime}%</StatNumber>
                    <StatHelpText>
                      <StatArrow type="increase" />
                      {project.healthMetrics.responseTime}ms avg
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Error Rate</StatLabel>
                    <StatNumber>{(project.healthMetrics.errorRate * 100).toFixed(2)}%</StatNumber>
                    <StatHelpText>
                      <StatArrow type="decrease" />
                      Last 24h
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </>
          )}
        </SimpleGrid>

        {/* Progress Bar */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} mb={6}>
          <CardBody>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">Overall Progress</Text>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{project.progress}% Complete</Text>
            </HStack>
            <Progress 
              value={project.progress} 
              size="lg" 
              colorScheme={project.progress > 80 ? 'green' : 'blue'} 
              borderRadius="md" 
            />
          </CardBody>
        </Card>

        {/* Detailed Tabs */}
        <Tabs index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>
              <HStack spacing={2}>
                <Icon as={MdTaskAlt} />
                <Text>Tasks ({project.tasks.length})</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <Icon as={MdTimeline} />
                <Text>Milestones ({project.milestones.length})</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <Icon as={MdMonitor} />
                <Text>Activity ({project.updates.length})</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing={2}>
                <Icon as={MdCode} />
                <Text>Technical</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Tasks Tab */}
            <TabPanel p={0} pt={6}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {project.tasks.map(task => (
                  <Card key={task.id} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="medium">{task.name}</Text>
                        <HStack>
                          <Badge colorScheme={getStatusColor(task.status)} size="sm">
                            {task.status}
                          </Badge>
                          <Badge colorScheme={getPriorityColor(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
                        </HStack>
                      </HStack>
                      {task.assignee && (
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Assigned to: {task.assignee}</Text>
                      )}
                      {task.dueDate && (
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Due: {formatDate(task.dueDate)}</Text>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </TabPanel>

            {/* Milestones Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={4}>
                {project.milestones.map(milestone => (
                  <Card key={milestone.id} bg={cardBg} borderWidth="1px" borderColor={borderColor} w="full">
                    <CardBody>
                      <HStack justify="space-between" mb={3}>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium">{milestone.name}</Text>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Due: {formatDate(milestone.due_date)}</Text>
                        </VStack>
                        <Badge colorScheme={getStatusColor(milestone.status)}>
                          {milestone.status}
                        </Badge>
                      </HStack>
                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="sm">Progress</Text>
                          <Text fontSize="sm">{milestone.progress}%</Text>
                        </HStack>
                        <Progress 
                          value={milestone.progress} 
                          colorScheme={getStatusColor(milestone.status)} 
                          size="sm" 
                          borderRadius="full"
                        />
                      </Box>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </TabPanel>

            {/* Activity Tab */}
            <TabPanel p={0} pt={6}>
              <VStack spacing={3} align="stretch">
                {project.updates.map(update => (
                  <Card key={update.id} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardBody>
                      <HStack justify="space-between" align="start">
                        <HStack align="start" spacing={3}>
                          <Badge colorScheme={getUpdateTypeColor(update.type)} variant="subtle">
                            {update.type}
                          </Badge>
                          <VStack align="start" spacing={1}>
                            <Text>{update.message}</Text>
                            <HStack>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {formatDateTime(update.timestamp)}
                              </Text>
                              {update.author && (
                                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                  by {update.author}
                                </Text>
                              )}
                            </HStack>
                          </VStack>
                        </HStack>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </TabPanel>

            {/* Technical Tab */}
            <TabPanel p={0} pt={6}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                  <CardHeader>
                    <Heading size="md">Project Information</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={3}>
                      <Box>
                        <Text fontWeight="medium">Repository</Text>
                        <Text fontSize="sm" color="blue.500">{project.repository}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="medium">Local Path</Text>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{project.path}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="medium">Framework</Text>
                        <Text fontSize="sm">{project.framework}</Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                {project.aiComponents && (
                  <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                    <CardHeader>
                      <Heading size="md">AI Components</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        {project.aiComponents.map((component, index) => (
                          <Badge key={index} colorScheme="blue" variant="subtle">
                            {component}
                          </Badge>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DashboardLayout>
  );
};

export default ProjectDetailPage;
