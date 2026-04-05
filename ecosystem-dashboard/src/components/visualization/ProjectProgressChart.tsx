import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Progress,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
} from '@chakra-ui/react';
import { ecosystemApi } from '@/lib/api';
import StatWrapper from '@/components/ui/StatWrapper';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Project {
  id: string;
  name: string;
  progress: number;
  status: string;
  path: string;
}

interface HealthMetrics {
  projectsCount: number;
  averageProgress: number;
  projectsByStatus: {
    'not-started': number;
    'in-progress': number;
    'completed': number;
  };
  componentsCount: number;
  documentationCount: number;
  tasksByStatus: {
    'not-started': number;
    'completed': number;
  };
}

interface ProjectProgressChartProps {
  // Add any props if needed
}

const ProjectProgressChart: React.FC<ProjectProgressChartProps> = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch projects
        const projectsResponse = await ecosystemApi.get('/projects');
        if (projectsResponse.data.success) {
          setProjects(projectsResponse.data.data);
        } else {
          throw new Error('Failed to fetch projects');
        }

        // Fetch health metrics
        const metricsResponse = await ecosystemApi.get('/health-metrics');
        if (metricsResponse.data.success) {
          setMetrics(metricsResponse.data.data);
        } else {
          throw new Error('Failed to fetch health metrics');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch visualization data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColorScheme = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'in-progress':
        return 'blue';
      case 'not-started':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading project progress data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading project progress data: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Heading size="md" mb={4}>Project Progress Overview</Heading>

      {/* Summary Metrics */}
      {metrics && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
          <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <StatWrapper>
                <StatLabel>Total Projects</StatLabel>
                <StatNumber>{metrics.projectsCount}</StatNumber>
                <StatHelpText>Across the ecosystem</StatHelpText>
              </StatWrapper>
            </CardBody>
          </Card>

          <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <StatWrapper>
                <StatLabel>Average Progress</StatLabel>
                <StatNumber>{Math.round(metrics.averageProgress)}%</StatNumber>
                <StatHelpText>Ecosystem-wide</StatHelpText>
              </StatWrapper>
            </CardBody>
          </Card>

          <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <StatWrapper>
                <StatLabel>Completed Projects</StatLabel>
                <StatNumber>{metrics.projectsByStatus.completed}</StatNumber>
                <StatHelpText>Out of {metrics.projectsCount} total</StatHelpText>
              </StatWrapper>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Project Progress Bars */}
      <Box mt={6}>
        <Heading size="sm" mb={4}>Individual Project Progress</Heading>
        {projects.length === 0 ? (
          <Text>No projects found.</Text>
        ) : (
          projects.map((project) => (
            <Box key={project.id} mb={4} p={4} borderWidth="1px" borderRadius="md" borderColor={borderColor}>
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontWeight="bold">{project.name}</Text>
                <Badge colorScheme={getStatusColorScheme(project.status)}>
                  {project.status}
                </Badge>
              </Flex>
              <Progress
                value={project.progress}
                size="md"
                colorScheme={getStatusColorScheme(project.status)}
                borderRadius="md"
                hasStripe
              />
              <Flex justify="space-between" mt={1}>
                <Text fontSize="sm">{project.id}</Text>
                <Text fontSize="sm" fontWeight="bold">{project.progress}%</Text>
              </Flex>
            </Box>
          ))
        )}
      </Box>

      {/* Task Status Summary */}
      {metrics && (
        <Box mt={8}>
          <Heading size="sm" mb={4}>Task Status Summary</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
              <CardBody>
                <StatWrapper>
                  <StatLabel>Completed Tasks</StatLabel>
                  <StatNumber>{metrics.tasksByStatus.completed}</StatNumber>
                  <StatHelpText>
                    {Math.round(
                      (metrics.tasksByStatus.completed /
                        (metrics.tasksByStatus.completed + metrics.tasksByStatus['not-started'])) *
                        100
                    )}% completion rate
                  </StatHelpText>
                </StatWrapper>
              </CardBody>
            </Card>

            <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
              <CardBody>
                <StatWrapper>
                  <StatLabel>Pending Tasks</StatLabel>
                  <StatNumber>{metrics.tasksByStatus['not-started']}</StatNumber>
                  <StatHelpText>Across all projects</StatHelpText>
                </StatWrapper>
              </CardBody>
            </Card>
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default ProjectProgressChart;
