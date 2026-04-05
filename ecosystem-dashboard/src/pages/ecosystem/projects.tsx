import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Button,
  Tag,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { SearchIcon, SmallCloseIcon } from '@chakra-ui/icons';
import { useProgress } from '@/context/ProgressContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { NextPage } from 'next';
import { Project } from '@/types';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const ProjectsPage: NextPage = () => {
  const router = useRouter();
  const { projects, loading, error, refreshProjects } = useProgress();
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const cardBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedTextColor = useSemanticToken('text.secondary');

  useEffect(() => {
    const projectList = projects || [];
    let filtered = projectList;

    if (searchQuery.trim()) {
      filtered = filtered.filter(project =>
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDomain) {
      filtered = filtered.filter(project => project.domain === selectedDomain);
    }

    if (selectedStatus) {
      filtered = filtered.filter(project => project.status === selectedStatus);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, selectedDomain, selectedStatus]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const getDomainColor = (domain: string): string => {
    const domainColorMap: { [key: string]: string } = {
      'Platforms': 'blue',
      'AI Systems': 'purple',
      'Knowledge': 'green',
      'Infrastructure': 'orange',
      'Development': 'teal',
      'Security': 'red'
    };
    return domainColorMap[domain] || 'gray';
  };

  const getStatusColorScheme = (status: string): string => {
    const statusColorMap: { [key: string]: string } = {
      'Completed': 'green',
      'In Progress': 'blue',
      'Not Started': 'gray',
      'On Hold': 'yellow',
      'Cancelled': 'red'
    };
    return statusColorMap[status] || 'gray';
  };

  const projectList = projects || [];
  const uniqueDomains = Array.from(new Set(projectList.map(p => p.domain).filter(Boolean))).sort();
  const uniqueStatuses = Array.from(new Set(projectList.map(p => p.status).filter(Boolean))).sort();

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDomain('');
    setSelectedStatus('');
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Projects - AI Homelab Ecosystem</title>
        <meta name="description" content="Manage and monitor AI projects in the ecosystem" />
      </Head>

      <Box p={6}>
        <VStack align="stretch" spacing={6}>
          <HStack justify="space-between" align="center">
            <Box>
              <Heading size="lg" mb={2}>Ecosystem Projects</Heading>
              <Text color={useSemanticToken('text.secondary')}>Manage and monitor all AI projects in the homelab ecosystem</Text>
            </Box>
            <Button
              colorScheme="blue"
              onClick={refreshProjects}
              isLoading={loading}
              loadingText="Refreshing..."
            >
              Refresh
            </Button>
          </HStack>

          {error && (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error Loading Projects</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <VStack spacing={4} py={8}>
              <Spinner size="xl" color="blue.500" />
              <Text>Loading projects...</Text>
            </VStack>
          ) : (
            <>
              <Card bg={cardBg}>
                <CardHeader><Heading size="md">Filters</Heading></CardHeader>
                <CardBody>
                  <HStack spacing={4} wrap="wrap">
                    <InputGroup minW="250px">
                      <InputLeftElement pointerEvents="none"><SearchIcon color={useSemanticToken('text.tertiary')} /></InputLeftElement>
                      <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </InputGroup>
                    <Select
                      minW="150px"
                      placeholder="All Domains"
                      value={selectedDomain}
                      onChange={(e) => setSelectedDomain(e.target.value)}
                    >
                      {uniqueDomains.map(domain => (
                        <option key={domain} value={domain}>{domain}</option>
                      ))}
                    </Select>
                    <Select
                      minW="150px"
                      placeholder="All Statuses"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </Select>
                    {(searchQuery || selectedDomain || selectedStatus) && (
                      <Button size="sm" variant="ghost" leftIcon={<SmallCloseIcon />} onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    )}
                  </HStack>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardHeader>
                  <Heading size="md">
                    Projects ({filteredProjects.length} of {projectList.length})
                  </Heading>
                </CardHeader>
                <CardBody>
                  <TableContainer>
                    <Table variant="simple" size="md">
                      <Thead>
                        <Tr>
                          <Th>Project</Th>
                          <Th>Domain</Th>
                          <Th>Status</Th>
                          <Th isNumeric>Progress</Th>
                          <Th>Tasks</Th>
                          <Th>Components</Th>
                          <Th>Last Updated</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredProjects.length > 0 ? (
                          filteredProjects.map((project) => (
                            <Tr
                              key={project.id}
                              cursor="pointer"
                              _hover={{ bg: hoverBg }}
                              onClick={() => handleProjectClick(project.id)}
                            >
                              <Td>
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="semibold" color={textColor}>{project.name}</Text>
                                  <Text fontSize="sm" color={mutedTextColor} noOfLines={2}>{project.description}</Text>
                                </VStack>
                              </Td>
                              <Td><Tag colorScheme={getDomainColor(project.domain)} variant="subtle">{project.domain}</Tag></Td>
                              <Td><Tag colorScheme={getStatusColorScheme(project.status)} variant="outline">{project.status}</Tag></Td>
                              <Td>
                                <VStack spacing={1} align="stretch">
                                  <Progress value={project.progress || 0} colorScheme={project.progress === 100 ? 'green' : 'blue'} size="sm" hasStripe />
                                  <Text fontSize="xs" color={mutedTextColor}>{project.progress || 0}%</Text>
                                </VStack>
                              </Td>
                              <Td textAlign="center"><Text fontWeight="semibold">{Array.isArray(project.tasks) ? project.tasks.length : 0}</Text></Td>
                              <Td textAlign="center"><Text fontWeight="semibold">{project.components || 0}</Text></Td>
                              <Td><Text fontSize="sm" color={mutedTextColor}>{formatDate(project.lastUpdated)}</Text></Td>
                            </Tr>
                          ))
                        ) : (
                          <Tr>
                            <Td colSpan={7} textAlign="center" py={8}>
                              <Text color={mutedTextColor}>
                                {projectList.length === 0 ? 'No projects available.' : 'No projects found matching the current filters.'}
                              </Text>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </CardBody>
              </Card>

              <Card bg={cardBg}>
                <CardHeader><Heading size="md">Project Summary</Heading></CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.500">{projectList.length}</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Projects</Text>
                    </VStack>
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="green.500">{projectList.filter(p => p.status === 'Completed').length}</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Completed</Text>
                    </VStack>
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.500">{projectList.filter(p => p.status === 'In Progress').length}</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>In Progress</Text>
                    </VStack>
                    <VStack>
                      <Text fontSize="2xl" fontWeight="bold" color={useSemanticToken('text.secondary')}>{projectList.filter(p => !['Completed', 'In Progress'].includes(p.status)).length}</Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Other Status</Text>
                    </VStack>
                  </SimpleGrid>
                </CardBody>
              </Card>
            </>
          )}
        </VStack>
      </Box>
    </DashboardLayout>
  );
};

export default ProjectsPage;
