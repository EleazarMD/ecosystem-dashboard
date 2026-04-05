/**
 * AHIS Compliance Status Component
 * 
 * This component displays the compliance status of projects in the AI Homelab Ecosystem
 * with respect to AHIS integration standards.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Badge,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Spinner,
  SimpleGrid,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { useWebSocket } from '@/lib/websocket';
import { getBrowserAHISClient } from '@/lib/browser-ahis-client';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Define project compliance status types
type ComplianceStatus = 'compliant' | 'partial' | 'non-compliant' | 'unknown';

interface ComplianceTest {
  name: string;
  passed: boolean;
  message: string;
}

interface ProjectCompliance {
  projectId: string;
  projectName: string;
  projectType: string;
  projectPath: string;
  status: ComplianceStatus;
  lastChecked: string;
  tests: ComplianceTest[];
}

const AHISComplianceStatus: React.FC = () => {
  const [projects, setProjects] = useState<ProjectCompliance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<ProjectCompliance | null>(null);
  
  const { lastMessage } = useWebSocket();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Colors
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const tableBorderColor = useSemanticToken('border.default');

  // Fetch projects compliance status on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const ahisClient = getBrowserAHISClient();
        const response = await ahisClient.callMethod('getProjectsComplianceStatus', {});
        
        if (response && response.projects) {
          setProjects(response.projects);
        }
      } catch (error) {
        console.error('Failed to fetch projects compliance status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Listen for compliance status updates via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'complianceStatusUpdate') {
      const updatedProject = lastMessage.data;
      
      setProjects(prevProjects => {
        const projectIndex = prevProjects.findIndex(p => p.projectId === updatedProject.projectId);
        
        if (projectIndex >= 0) {
          // Update existing project
          const newProjects = [...prevProjects];
          newProjects[projectIndex] = updatedProject;
          return newProjects;
        } else {
          // Add new project
          return [...prevProjects, updatedProject];
        }
      });
    }
  }, [lastMessage]);

  // Filter projects based on active tab
  const filteredProjects = projects.filter(project => {
    if (activeTab === 'all') return true;
    if (activeTab === 'compliant') return project.status === 'compliant';
    if (activeTab === 'partial') return project.status === 'partial';
    if (activeTab === 'non-compliant') return project.status === 'non-compliant';
    return true;
  });

  // Run compliance test for a project
  const runComplianceTest = async (projectId: string, projectPath: string) => {
    try {
      setLoading(true);
      const ahisClient = getBrowserAHISClient();
      await ahisClient.executeCommand('runComplianceTest', { projectId, projectPath });
    } catch (error) {
      console.error('Failed to run compliance test:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return <Badge colorScheme="green">Compliant</Badge>;
      case 'partial':
        return <Badge colorScheme="yellow">Partial</Badge>;
      case 'non-compliant':
        return <Badge colorScheme="red">Non-Compliant</Badge>;
      default:
        return <Badge colorScheme="gray">Unknown</Badge>;
    }
  };

  // Show project details
  const showProjectDetails = (project: ProjectCompliance) => {
    setSelectedProject(project);
    onOpen();
  };

  return (
    <Box 
      p={6} 
      bg={cardBg} 
      borderRadius="md" 
      boxShadow="sm" 
      borderWidth="1px" 
      borderColor={borderColor}
    >
      <Heading as="h2" size="md" mb={4}>Project Compliance Status</Heading>
      
      <Tabs variant="enclosed" onChange={(index) => {
        const tabValues = ['all', 'compliant', 'partial', 'non-compliant'];
        setActiveTab(tabValues[index]);
      }}>
        <TabList mb={4}>
          <Tab>All Projects</Tab>
          <Tab>Compliant</Tab>
          <Tab>Partial</Tab>
          <Tab>Non-Compliant</Tab>
        </TabList>
        
        <TabPanels>
          {['all', 'compliant', 'partial', 'non-compliant'].map((tab) => (
            <TabPanel key={tab} p={0}>
              {loading ? (
                <Flex justify="center" align="center" h="200px">
                  <Spinner size="lg" />
                  <Text ml={4}>Loading projects...</Text>
                </Flex>
              ) : filteredProjects.length === 0 ? (
                <Flex justify="center" align="center" h="200px">
                  <Text>No projects found for this filter.</Text>
                </Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple" size="md" borderWidth="1px" borderColor={tableBorderColor}>
                    <Thead bg={useSemanticToken('surface.base')}>
                      <Tr>
                        <Th>Project Name</Th>
                        <Th>Type</Th>
                        <Th>Status</Th>
                        <Th>Last Checked</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredProjects.map((project) => (
                        <Tr key={project.projectId}>
                          <Td fontWeight="medium">{project.projectName}</Td>
                          <Td>{project.projectType}</Td>
                          <Td>{getStatusBadge(project.status)}</Td>
                          <Td>{new Date(project.lastChecked).toLocaleString()}</Td>
                          <Td>
                            <Flex gap={2}>
                              <Button 
                                size="sm" 
                                colorScheme="blue" 
                                variant="outline"
                                onClick={() => showProjectDetails(project)}
                              >
                                Details
                              </Button>
                              <Button 
                                size="sm" 
                                colorScheme="green" 
                                variant="outline"
                                onClick={() => runComplianceTest(project.projectId, project.projectPath)}
                              >
                                Run Test
                              </Button>
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      
      {/* Project Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          {selectedProject && (
            <>
              <ModalHeader>
                {selectedProject.projectName} Compliance Details
                <Text fontSize="sm" fontWeight="normal" mt={1} color={useSemanticToken('text.secondary')}>
                  Detailed compliance test results
                </Text>
              </ModalHeader>
              <ModalCloseButton />
              
              <ModalBody>
                <SimpleGrid columns={2} spacing={4} mb={6}>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Project ID:</Text>
                    <Text fontSize="sm">{selectedProject.projectId}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Project Type:</Text>
                    <Text fontSize="sm">{selectedProject.projectType}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Project Path:</Text>
                    <Text fontSize="sm">{selectedProject.projectPath}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">Last Checked:</Text>
                    <Text fontSize="sm">{new Date(selectedProject.lastChecked).toLocaleString()}</Text>
                  </Box>
                </SimpleGrid>

                <Heading as="h3" size="sm" mb={3}>Test Results</Heading>
                <Table variant="simple" size="sm" borderWidth="1px" borderColor={tableBorderColor}>
                  <Thead bg={useSemanticToken('surface.base')}>
                    <Tr>
                      <Th>Test</Th>
                      <Th>Status</Th>
                      <Th>Message</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {selectedProject.tests.map((test, index) => (
                      <Tr key={index}>
                        <Td fontWeight="medium">{test.name}</Td>
                        <Td>
                          {test.passed ? (
                            <Badge colorScheme="green">Passed</Badge>
                          ) : (
                            <Badge colorScheme="red">Failed</Badge>
                          )}
                        </Td>
                        <Td>{test.message}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </ModalBody>
              
              <ModalFooter>
                <Button colorScheme="blue" mr={3} onClick={onClose}>
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => runComplianceTest(selectedProject.projectId, selectedProject.projectPath)}
                >
                  Run Test Again
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AHISComplianceStatus;
