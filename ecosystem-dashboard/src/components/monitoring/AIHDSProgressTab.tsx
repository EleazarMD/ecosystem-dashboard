/**
 * AIHDS Progress Tab Component
 * 
 * This component displays AIHDS progress tracking information within the existing
 * monitoring dashboard structure. It integrates with the MCP client to fetch
 * and display project progress information.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Progress,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Spinner,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { executeCommand } from '@/lib/mcp-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Define project and task interfaces
interface Task {
  id: string;
  name: string;
  description?: string;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  lastUpdate: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  lastUpdate: string;
  tasks: Task[];
}

interface AIHDSProgressTabProps {
  height?: number | string;
}

const AIHDSProgressTab: React.FC<AIHDSProgressTabProps> = ({ height = 600 }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Function to fetch projects from the MCP server
  const fetchProjects = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      const result = await executeCommand('getProjects', {});
      
      if (result && result.projects) {
        setProjects(result.projects);
      } else {
        setProjects([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch AIHDS projects:', error);
      setError(`Failed to fetch projects: ${error.message || 'Unknown error'}`);  
    } finally {
      setLoading(false);
      // Add a small delay to show the refresh effect
      setTimeout(() => setRefreshing(false), 500);
    }
  }, []);
  
  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
    
    // Set up polling for updates every 30 seconds
    const interval = setInterval(fetchProjects, 30000);
    
    return () => clearInterval(interval);
  }, [fetchProjects]);
  
  // Get status badge color scheme
  const getStatusColorScheme = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'not_started': return 'gray';
      case 'failed': return 'red';
      case 'blocked': return 'orange';
      default: return 'gray';
    }
  };
  
  // Get priority badge color scheme
  const getPriorityColorScheme = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };
  
  // Calculate statistics
  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    failed: projects.filter(p => p.status === 'failed' || p.status === 'blocked').length,
  };
  
  // Calculate overall percentage
  const overallPercentage = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.percentage, 0) / projects.length)
    : 0;
  
  return (
    <Box 
      bg={bgColor} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      p={4}
      height={height}
      overflowY="auto"
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">AIHDS Progress Tracking</Heading>
        <Button
          leftIcon={<RepeatIcon />}
          onClick={fetchProjects}
          isLoading={refreshing}
          size="sm"
          colorScheme="blue"
          variant="outline"
        >
          Refresh
        </Button>
      </Flex>
      
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      
      {loading && !refreshing ? (
        <Flex justifyContent="center" alignItems="center" height="200px">
          <Spinner size="xl" />
        </Flex>
      ) : (
        <>
          {/* Statistics Section */}
          <Flex 
            mb={6} 
            gap={4} 
            flexWrap="wrap"
          >
            <Box 
              flex="1" 
              borderWidth="1px" 
              borderRadius="md" 
              p={4}
              minW={"200px"}
            >
              <Heading size="sm" mb={2}>Overall Progress</Heading>
              <Heading size="xl" mb={2}>{overallPercentage}%</Heading>
              <Progress 
                value={overallPercentage} 
                size="lg" 
                borderRadius="md" 
                colorScheme="blue" 
              />
            </Box>
            
            <Box 
              flex="1" 
              borderWidth="1px" 
              borderRadius="md" 
              p={4}
              minW={"200px"}
            >
              <Heading size="sm" mb={2}>Projects</Heading>
              <Heading size="xl" mb={2}>{stats.total}</Heading>
              <Flex gap={2}>
                <Badge colorScheme="green">{stats.completed} Completed</Badge>
                <Badge colorScheme="blue">{stats.inProgress} In Progress</Badge>
                <Badge colorScheme="red">{stats.failed} Failed/Blocked</Badge>
              </Flex>
            </Box>
          </Flex>
          
          {/* Projects List */}
          {projects.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Text>No projects found in AIHDS tracking system.</Text>
            </Box>
          ) : (
            <Accordion allowMultiple defaultIndex={[0]}>
              {projects.map((project) => (
                <AccordionItem key={project.id}>
                  <h2>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Flex alignItems="center" gap={2}>
                          <Text fontWeight="bold">{project.name}</Text>
                          <Badge colorScheme={getStatusColorScheme(project.status)}>
                            {project.status.replace('_', ' ')}
                          </Badge>
                        </Flex>
                      </Box>
                      <Progress 
                        value={project.percentage} 
                        size="sm" 
                        width="120px" 
                        mr={2} 
                        colorScheme={getStatusColorScheme(project.status)}
                      />
                      <Text mr={2}>{project.percentage}%</Text>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>
                  <AccordionPanel pb={4}>
                    {project.description && (
                      <Text mb={4} color={useSemanticToken('text.secondary')}>{project.description}</Text>
                    )}
                    
                    <Text fontSize="sm" mb={2}>
                      Last updated: {new Date(project.lastUpdate).toLocaleString()}
                    </Text>
                    
                    <Heading size="xs" mb={2} mt={4}>Tasks</Heading>
                    
                    {project.tasks && project.tasks.length > 0 ? (
                      <TableContainer>
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Task</Th>
                              <Th>Priority</Th>
                              <Th>Status</Th>
                              <Th>Progress</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {project.tasks.map((task) => (
                              <Tr key={task.id}>
                                <Td>
                                  <Text fontWeight="medium">{task.name}</Text>
                                  {task.description && (
                                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{task.description}</Text>
                                  )}
                                </Td>
                                <Td>
                                  <Badge colorScheme={getPriorityColorScheme(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge colorScheme={getStatusColorScheme(task.status)}>
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Flex alignItems="center" gap={2}>
                                    <Progress 
                                      value={task.percentage} 
                                      size="xs" 
                                      width="80px" 
                                      colorScheme={getStatusColorScheme(task.status)}
                                    />
                                    <Text fontSize="xs">{task.percentage}%</Text>
                                  </Flex>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No tasks found for this project.</Text>
                    )}
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </>
      )}
    </Box>
  );
};

export default AIHDSProgressTab;
