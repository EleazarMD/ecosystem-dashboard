/**
 * Agent Development Environment
 * 
 * Integrated development environment for agent creation, testing, and deployment
 * with code editor, testing framework, and live preview capabilities
 */

import React, { useState, useRef } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Button,
  ButtonGroup,
  IconButton,
  Tooltip,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Switch,
  Divider,
  Flex,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Code,
  Alert,
  AlertIcon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';
import {
  FaCode,
  FaPlay,
  FaStop,
  FaSave,
  FaDownload,
  FaUpload,
  FaCog,
  FaRocket,
  FaFlask,
  FaBug,
  FaEye,
  FaEdit,
  FaTrash,
  FaCopy,
  FaPlus,
  FaMinus,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaFile,
  FaFolder,
  FaSearch,
  FaTerminal
} from 'react-icons/fa';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'advanced' | 'specialized';
  language: 'javascript' | 'python' | 'typescript';
  framework: 'node' | 'fastapi' | 'express' | 'custom';
  code: string;
  config: Record<string, any>;
  dependencies: string[];
  tests: TestCase[];
  capabilities: string[];
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e';
  status: 'pending' | 'running' | 'passed' | 'failed';
  code: string;
  expected: any;
  actual?: any;
  duration?: number;
  error?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  status: 'active' | 'inactive' | 'error' | 'configuring' | 'deploying' | 'stopping';
  platform: string;
  lastHeartbeat: string;
  capabilities: Record<string, boolean>;
  error?: string;
}

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
  };
  ports: number[];
  environment_vars: Record<string, string>;
  health_check: {
    path: string;
    interval: number;
    timeout: number;
  };
}

interface AgentProject {
  id: string;
  name: string;
  description: string;
  template: AgentTemplate;
  code: string;
  config: Record<string, any>;
  tests: TestCase[];
  deployment: DeploymentConfig;
  status: 'draft' | 'testing' | 'deployed' | 'archived';
  created: string;
  modified: string;
  version: string;
}

interface AgentDevelopmentEnvironmentProps {
  projects: AgentProject[];
  templates: AgentTemplate[];
  onCreateProject: (template: AgentTemplate, name: string) => Promise<AgentProject>;
  onSaveProject: (project: AgentProject) => Promise<void>;
  onTestProject: (project: AgentProject) => Promise<TestCase[]>;
  onDeployProject: (project: AgentProject) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export const AgentDevelopmentEnvironment: React.FC<AgentDevelopmentEnvironmentProps> = ({
  projects,
  templates,
  onCreateProject,
  onSaveProject,
  onTestProject,
  onDeployProject,
  onDeleteProject
}) => {
  const [selectedProject, setSelectedProject] = useState<AgentProject | null>(null);
  const [activeFile, setActiveFile] = useState<string>('main');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestCase[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { isOpen: isTemplateModalOpen, onOpen: onTemplateModalOpen, onClose: onTemplateModalClose } = useDisclosure();
  const { isOpen: isDeployModalOpen, onOpen: onDeployModalOpen, onClose: onDeployModalClose } = useDisclosure();
  
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const codeBlockBg = useSemanticToken('surface.base');

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = async () => {
    if (!selectedTemplate || !newProjectName) return;

    try {
      const newProject = await onCreateProject(selectedTemplate, newProjectName);
      setSelectedProject(newProject);
      setNewProjectName('');
      setSelectedTemplate(null);
      onTemplateModalClose();
      
      toast({
        title: 'Project Created',
        description: `${newProjectName} has been created successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create project',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveProject = async () => {
    if (!selectedProject) return;

    try {
      await onSaveProject(selectedProject);
      toast({
        title: 'Project Saved',
        description: 'Changes have been saved successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save project',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRunTests = async () => {
    if (!selectedProject) return;

    setIsRunning(true);
    try {
      const results = await onTestProject(selectedProject);
      setTestResults(results);
      
      const passed = results.filter(test => test.status === 'passed').length;
      const failed = results.filter(test => test.status === 'failed').length;
      
      toast({
        title: 'Tests Completed',
        description: `${passed} passed, ${failed} failed`,
        status: failed === 0 ? 'success' : 'warning',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to run tests',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedProject) return;

    try {
      await onDeployProject(selectedProject);
      onDeployModalClose();
      
      toast({
        title: 'Deployment Started',
        description: `${selectedProject.name} is being deployed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Failed to deploy project',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'green';
      case 'failed': return 'red';
      case 'running': return 'blue';
      case 'pending': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <Card variant="outline" borderRadius="none" borderLeft="none" borderRight="none" borderTop="none">
        <CardHeader py={3}>
          <Flex justify="space-between" align="center">
            <HStack spacing={4}>
              <FaCode />
              <Heading size="md">Agent Development Environment</Heading>
              {selectedProject && (
                <Badge colorScheme="blue">{selectedProject.name}</Badge>
              )}
            </HStack>
            <ButtonGroup size="sm">
              <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={onTemplateModalOpen}>
                New Project
              </Button>
              {selectedProject && (
                <>
                  <Button leftIcon={<FaSave />} onClick={handleSaveProject}>
                    Save
                  </Button>
                  <Button leftIcon={<FaFlask />} onClick={handleRunTests} isLoading={isRunning}>
                    Test
                  </Button>
                  <Button leftIcon={<FaRocket />} colorScheme="green" onClick={onDeployModalOpen}>
                    Deploy
                  </Button>
                </>
              )}
            </ButtonGroup>
          </Flex>
        </CardHeader>
      </Card>

      <Flex flex="1" overflow="hidden">
        {/* Project Sidebar */}
        <Box w="300px" borderRight="1px" borderColor={borderColor} bg={bgColor}>
          <VStack spacing={0} align="stretch" h="100%">
            <Box p={4} borderBottom="1px" borderColor={borderColor}>
              <FormControl>
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="sm"
                />
              </FormControl>
            </Box>
            
            <Box flex="1" overflow="auto">
              <VStack spacing={2} align="stretch" p={2}>
                {filteredProjects.map(project => (
                  <Card
                    key={project.id}
                    variant={selectedProject?.id === project.id ? 'filled' : 'outline'}
                    cursor="pointer"
                    onClick={() => setSelectedProject(project)}
                    size="sm"
                  >
                    <CardBody>
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <Text fontWeight="semibold" fontSize="sm" isTruncated>
                            {project.name}
                          </Text>
                          <Badge colorScheme={
                            project.status === 'deployed' ? 'green' :
                            project.status === 'testing' ? 'blue' :
                            project.status === 'draft' ? 'gray' : 'orange'
                          } size="sm">
                            {project.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={2}>
                          {project.description}
                        </Text>
                        <HStack justify="space-between">
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            v{project.version}
                          </Text>
                          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                            {new Date(project.modified).toLocaleDateString()}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </Box>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex="1" display="flex" flexDirection="column">
          {selectedProject ? (
            <Tabs flex="1" display="flex" flexDirection="column">
              <TabList>
                <Tab>Code Editor</Tab>
                <Tab>Configuration</Tab>
                <Tab>Tests</Tab>
                <Tab>Console</Tab>
                <Tab>Deployment</Tab>
              </TabList>

              <TabPanels flex="1" overflow="hidden">
                {/* Code Editor */}
                <TabPanel h="100%" p={0}>
                  <Box h="100%" display="flex">
                    <Box w="200px" borderRight="1px" borderColor={borderColor} bg={codeBlockBg}>
                      <VStack spacing={1} align="stretch" p={2}>
                        <Text fontSize="sm" fontWeight="semibold" mb={2}>Files</Text>
                        {['main.js', 'config.json', 'package.json', 'README.md'].map(file => (
                          <Button
                            key={file}
                            size="sm"
                            variant={activeFile === file ? 'solid' : 'ghost'}
                            leftIcon={<FaFile />}
                            justifyContent="flex-start"
                            onClick={() => setActiveFile(file)}
                          >
                            {file}
                          </Button>
                        ))}
                      </VStack>
                    </Box>
                    <Box flex="1" p={4}>
                      <Textarea
                        value={selectedProject.code}
                        onChange={(e) => setSelectedProject({
                          ...selectedProject,
                          code: e.target.value,
                          modified: new Date().toISOString()
                        })}
                        fontFamily="mono"
                        fontSize="sm"
                        resize="none"
                        h="100%"
                        placeholder="Enter your agent code here..."
                      />
                    </Box>
                  </Box>
                </TabPanel>

                {/* Configuration */}
                <TabPanel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <VStack spacing={4} align="stretch">
                      <Heading size="sm">Basic Settings</Heading>
                      <FormControl>
                        <FormLabel>Project Name</FormLabel>
                        <Input
                          value={selectedProject.name}
                          onChange={(e) => setSelectedProject({
                            ...selectedProject,
                            name: e.target.value
                          })}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Description</FormLabel>
                        <Textarea
                          value={selectedProject.description}
                          onChange={(e) => setSelectedProject({
                            ...selectedProject,
                            description: e.target.value
                          })}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Language</FormLabel>
                        <Select value={selectedProject.template.language}>
                          <option value="javascript">JavaScript</option>
                          <option value="typescript">TypeScript</option>
                          <option value="python">Python</option>
                        </Select>
                      </FormControl>
                    </VStack>

                    <VStack spacing={4} align="stretch">
                      <Heading size="sm">Capabilities</Heading>
                      {(() => {
                        const caps = Array.isArray(selectedProject.template.capabilities) 
                          ? selectedProject.template.capabilities 
                          : (selectedProject.template.capabilities && typeof selectedProject.template.capabilities === 'object' 
                              ? Object.keys(selectedProject.template.capabilities) 
                              : []);
                        return caps.map(capability => (
                          <FormControl key={String(capability)} display="flex" alignItems="center">
                            <FormLabel mb="0" flex="1">{String(capability)}</FormLabel>
                            <Switch defaultChecked />
                          </FormControl>
                        ));
                      })()}
                    </VStack>
                  </SimpleGrid>
                </TabPanel>

                {/* Tests */}
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Heading size="sm">Test Suite</Heading>
                      <ButtonGroup size="sm">
                        <Button leftIcon={<FaPlus />} colorScheme="blue">
                          Add Test
                        </Button>
                        <Button 
                          leftIcon={<FaPlay />} 
                          colorScheme="green"
                          onClick={handleRunTests}
                          isLoading={isRunning}
                        >
                          Run All Tests
                        </Button>
                      </ButtonGroup>
                    </HStack>

                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Test Name</Th>
                          <Th>Type</Th>
                          <Th>Status</Th>
                          <Th>Duration</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(testResults.length > 0 ? testResults : selectedProject.tests).map(test => (
                          <Tr key={test.id}>
                            <Td>{test.name}</Td>
                            <Td>
                              <Badge variant="outline">{test.type}</Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme={getStatusColor(test.status)}>
                                {test.status}
                              </Badge>
                            </Td>
                            <Td>{test.duration ? `${test.duration}ms` : '-'}</Td>
                            <Td>
                              <ButtonGroup size="xs">
                                <IconButton
                                  icon={<FaPlay />}
                                  aria-label="Run test"
                                  size="xs"
                                />
                                <IconButton
                                  icon={<FaEdit />}
                                  aria-label="Edit test"
                                  size="xs"
                                />
                              </ButtonGroup>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </VStack>
                </TabPanel>

                {/* Console */}
                <TabPanel>
                  <VStack spacing={4} align="stretch" h="100%">
                    <HStack justify="space-between">
                      <HStack>
                        <FaTerminal />
                        <Text fontWeight="semibold">Console Output</Text>
                      </HStack>
                      <Button size="sm" onClick={() => setConsoleOutput([])}>
                        Clear
                      </Button>
                    </HStack>
                    <Box
                      flex="1"
                      bg={codeBlockBg}
                      p={3}
                      borderRadius="md"
                      fontFamily="mono"
                      fontSize="sm"
                      overflow="auto"
                    >
                      {consoleOutput.length === 0 ? (
                        <Text color={useSemanticToken('text.secondary')}>No output yet. Run tests or deploy to see output.</Text>
                      ) : (
                        consoleOutput.map((line, index) => (
                          <Text key={index}>{line}</Text>
                        ))
                      )}
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Deployment */}
                <TabPanel>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <VStack spacing={4} align="stretch">
                      <Heading size="sm">Deployment Configuration</Heading>
                      <FormControl>
                        <FormLabel>Environment</FormLabel>
                        <Select value={selectedProject.deployment.environment}>
                          <option value="development">Development</option>
                          <option value="staging">Staging</option>
                          <option value="production">Production</option>
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel>CPU Limit</FormLabel>
                        <Input value={selectedProject.deployment.resources.cpu} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Memory Limit</FormLabel>
                        <Input value={selectedProject.deployment.resources.memory} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Replicas</FormLabel>
                        <Input
                          type="number"
                          value={selectedProject.deployment.resources.replicas}
                        />
                      </FormControl>
                    </VStack>

                    <VStack spacing={4} align="stretch">
                      <Heading size="sm">Health Check</Heading>
                      <FormControl>
                        <FormLabel>Health Check Path</FormLabel>
                        <Input value={selectedProject.deployment.health_check.path} />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Check Interval (seconds)</FormLabel>
                        <Input
                          type="number"
                          value={selectedProject.deployment.health_check.interval}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Timeout (seconds)</FormLabel>
                        <Input
                          type="number"
                          value={selectedProject.deployment.health_check.timeout}
                        />
                      </FormControl>
                    </VStack>
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : (
            <Flex align="center" justify="center" h="100%">
              <VStack spacing={4}>
                <FaCode size={48} opacity={0.3} />
                <Text color={useSemanticToken('text.secondary')}>Select a project to start developing</Text>
                <Button leftIcon={<FaPlus />} colorScheme="blue" onClick={onTemplateModalOpen}>
                  Create New Project
                </Button>
              </VStack>
            </Flex>
          )}
        </Box>
      </Flex>

      {/* Project Creation Modal */}
      <Modal isOpen={isTemplateModalOpen} onClose={onTemplateModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Agent Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Project Name</FormLabel>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Select Template</FormLabel>
                <SimpleGrid columns={1} spacing={2}>
                  {templates.map(template => (
                    <Card
                      key={template.id}
                      variant={selectedTemplate?.id === template.id ? 'filled' : 'outline'}
                      cursor="pointer"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardBody>
                        <VStack align="start" spacing={2}>
                          <HStack>
                            <Text fontWeight="semibold">{template.name}</Text>
                            <Badge>{template.type}</Badge>
                            <Badge variant="outline">{template.language}</Badge>
                          </HStack>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                            {template.description}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTemplateModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateProject}
              isDisabled={!newProjectName || !selectedTemplate}
            >
              Create Project
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Deployment Modal */}
      <Modal isOpen={isDeployModalOpen} onClose={onDeployModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Deploy Agent</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="info" mb={4}>
              <AlertIcon />
              This will deploy {selectedProject?.name} to the {selectedProject?.deployment.environment} environment.
            </Alert>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm">
                <strong>Environment:</strong> {selectedProject?.deployment.environment}
              </Text>
              <Text fontSize="sm">
                <strong>Resources:</strong> {selectedProject?.deployment.resources.cpu} CPU, {selectedProject?.deployment.resources.memory} Memory
              </Text>
              <Text fontSize="sm">
                <strong>Replicas:</strong> {selectedProject?.deployment.resources.replicas}
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeployModalClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleDeploy}>
              Deploy
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
