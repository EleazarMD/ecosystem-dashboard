import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Badge,
  Tooltip,
  Divider,
  Collapse,
  Spinner,
} from '@chakra-ui/react';
import { FiPlus, FiFolder, FiUpload, FiFile, FiChevronDown, FiChevronRight, FiTrash2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: number;
  project_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  processed: boolean;
}

interface ProjectsPanelProps {
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
}

export default function ProjectsPanel({ selectedProjectId, onSelectProject }: ProjectsPanelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [projectDocuments, setProjectDocuments] = useState<Record<number, Document[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const { isOpen: isNewProjectOpen, onOpen: onNewProjectOpen, onClose: onNewProjectClose } = useDisclosure();
  const toast = useToast();

  // New project form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-research/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({
        title: 'Error loading projects',
        description: 'Failed to fetch projects from server',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: 'Project name required',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    try {
      const response = await fetch('/api/ai-research/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects(prev => [newProject, ...prev]);
        setNewProjectName('');
        setNewProjectDescription('');
        onNewProjectClose();
        
        toast({
          title: 'Project created',
          description: `"${newProject.name}" created successfully`,
          status: 'success',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Error creating project',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleProjectExpanded = async (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      
      // Load documents if not already loaded
      if (!projectDocuments[projectId]) {
        await loadProjectDocuments(projectId);
      }
    }
    
    setExpandedProjects(newExpanded);
  };

  const loadProjectDocuments = async (projectId: number) => {
    try {
      const response = await fetch(`/api/ai-research/upload-document?projectId=${projectId}`);
      if (response.ok) {
        const documents = await response.json();
        setProjectDocuments(prev => ({
          ...prev,
          [projectId]: documents,
        }));
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleFileUpload = async (projectId: number, file: File) => {
    setUploadingFile(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId.toString());

    try {
      const response = await fetch('/api/ai-research/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        toast({
          title: 'File uploaded',
          description: `${file.name} is being processed...`,
          status: 'success',
          duration: 3000,
        });

        // Reload documents for this project
        await loadProjectDocuments(projectId);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box h="full" display="flex" flexDirection="column" bg={useSemanticToken('surface.elevated')} borderRight="1px solid" borderColor={useSemanticToken('border.default')}>
      {/* Header */}
      <HStack p={4} borderBottom="1px solid" borderColor={useSemanticToken('border.default')} justify="space-between">
        <HStack>
          <FiFolder />
          <Text fontWeight="600" fontSize="sm">Projects</Text>
        </HStack>
        <Tooltip label="New Project">
          <IconButton
            aria-label="New project"
            icon={<FiPlus />}
            size="sm"
            onClick={onNewProjectOpen}
          />
        </Tooltip>
      </HStack>

      {/* Projects List */}
      <VStack flex={1} overflowY="auto" align="stretch" spacing={0} p={2}>
        {isLoading ? (
          <Box textAlign="center" py={8}>
            <Spinner size="sm" />
          </Box>
        ) : projects.length === 0 ? (
          <Box textAlign="center" py={8} px={4}>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>No projects yet</Text>
            <Button size="sm" mt={2} onClick={onNewProjectOpen}>
              Create First Project
            </Button>
          </Box>
        ) : (
          projects.map(project => {
            const isExpanded = expandedProjects.has(project.id);
            const docs = projectDocuments[project.id] || [];
            const isSelected = selectedProjectId === project.id;

            return (
              <Box key={project.id} mb={1}>
                {/* Project Header */}
                <HStack
                  p={2}
                  borderRadius="md"
                  bg={isSelected ? 'blue.50' : 'transparent'}
                  _hover={{ bg: isSelected ? 'blue.50' : 'gray.50' }}
                  cursor="pointer"
                  onClick={() => onSelectProject(project.id)}
                >
                  <IconButton
                    aria-label="Toggle"
                    icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectExpanded(project.id);
                    }}
                  />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="500">{project.name}</Text>
                    {project.description && (
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} noOfLines={1}>
                        {project.description}
                      </Text>
                    )}
                  </VStack>
                  <Badge colorScheme="blue" fontSize="xs">{docs.length}</Badge>
                </HStack>

                {/* Documents List (Collapsed) */}
                <Collapse in={isExpanded}>
                  <VStack align="stretch" spacing={1} pl={8} pr={2} pt={1}>
                    {/* Upload Button */}
                    <Button
                      size="xs"
                      leftIcon={<FiUpload />}
                      variant="ghost"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.txt,.md,.pdf,.docx';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleFileUpload(project.id, file);
                        };
                        input.click();
                      }}
                      isLoading={uploadingFile}
                    >
                      Upload File
                    </Button>

                    {/* Documents */}
                    {docs.map(doc => (
                      <HStack
                        key={doc.id}
                        p={2}
                        borderRadius="sm"
                        bg={useSemanticToken('surface.base')}
                        fontSize="xs"
                        spacing={2}
                      >
                        <FiFile size={12} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text noOfLines={1}>{doc.filename}</Text>
                          <Text color={useSemanticToken('text.secondary')} fontSize="10px">
                            {formatFileSize(doc.file_size)}
                          </Text>
                        </VStack>
                        {!doc.processed && (
                          <Spinner size="xs" color="blue.500" />
                        )}
                      </HStack>
                    ))}
                  </VStack>
                </Collapse>
              </Box>
            );
          })
        )}
      </VStack>

      {/* New Project Modal */}
      <Modal isOpen={isNewProjectOpen} onClose={onNewProjectClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="full">
                <Text fontSize="sm" fontWeight="500" mb={1}>Project Name</Text>
                <Input
                  placeholder="e.g., AI Ethics Research"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </Box>
              <Box w="full">
                <Text fontSize="sm" fontWeight="500" mb={1}>Description (Optional)</Text>
                <Textarea
                  placeholder="Brief description of this project..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNewProjectClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleCreateProject}>
              Create Project
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
