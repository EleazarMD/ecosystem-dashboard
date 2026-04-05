import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Select,
  Input,
  FormControl,
  FormLabel,
  useToast,
  HStack,
  Icon,
  Box,
} from '@chakra-ui/react';
import { FiPackage, FiPlus } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PodcastProject {
  id: string;
  title: string;
  description?: string;
  created_at: Date;
}

interface ExportToPodcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
}

export default function ExportToPodcastModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
}: ExportToPodcastModalProps) {
  const [projects, setProjects] = useState<PodcastProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const infoBg = useSemanticToken('surface.highlight');
  const tipBg = useSemanticToken('surface.base');

  // Load podcast projects
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      setCustomTitle(`${sessionTitle.substring(0, 60)}... (AI Research)`);
    }
  }, [isOpen, sessionTitle]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/podcast-studio/projects');
      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not nested under 'projects' key
        const projectsList = Array.isArray(data) ? data : (data.projects || []);
        console.log('📚 Loaded projects:', projectsList.length, 'projects');
        setProjects(projectsList);
        if (projectsList.length > 0 && !selectedProject) {
          setSelectedProject(projectsList[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Failed to load projects',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    console.log('🎬 Creating new project:', newProjectTitle);
    
    if (!newProjectTitle.trim()) {
      console.warn('⚠️ Project title is empty');
      toast({
        title: 'Project title required',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    try {
      console.log('📤 Sending POST request to /api/podcast-studio/projects');
      const response = await fetch('/api/podcast-studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProjectTitle,
          description: `Created from AI Research: ${sessionTitle}`,
        }),
      });

      console.log('📥 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Project created:', data);
        console.log('🔄 Reloading projects list...');
        await loadProjects();
        console.log('✅ Projects reloaded, setting selected project to:', data.id);
        // API returns project directly, not nested under 'project' key
        setSelectedProject(data.id);
        setIsCreatingNew(false);
        setNewProjectTitle('');
        
        toast({
          title: 'Project created',
          status: 'success',
          duration: 2000,
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Create project failed:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Failed to create project',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleExport = async () => {
    if (!selectedProject && !isCreatingNew) {
      toast({
        title: 'Select a project',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/research-lab/export-to-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          projectId: selectedProject,
          title: customTitle || sessionTitle,
        }),
      });

      if (response.ok) {
        toast({
          title: '🎙️ Exported to Podcast Studio!',
          description: 'Research is now available as source material',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        onClose();
      } else {
        const error = await response.json();
        console.error('❌ Export API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        });
        throw new Error(error.error || error.message || `Export failed (${response.status})`);
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Export to Podcast Studio</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box
              p={3}
              bg={infoBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <Text fontSize="sm" fontWeight="600" mb={1}>
                Research Session
              </Text>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                {sessionTitle}
              </Text>
            </Box>

            <FormControl>
              <FormLabel fontSize="sm">Material Title</FormLabel>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Custom title for the material"
                size="sm"
              />
            </FormControl>

            {isCreatingNew ? (
              <FormControl>
                <FormLabel fontSize="sm">New Project Title</FormLabel>
                <HStack>
                  <Input
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="Enter project title"
                    size="sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateProject}
                    colorScheme="green"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsCreatingNew(false)}
                  >
                    Cancel
                  </Button>
                </HStack>
              </FormControl>
            ) : (
              <FormControl>
                <FormLabel fontSize="sm">Select Podcast Project</FormLabel>
                <Select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  size="sm"
                  isDisabled={isLoading}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </Select>
                
                <Button
                  size="sm"
                  mt={2}
                  leftIcon={<Icon as={FiPlus} />}
                  onClick={() => setIsCreatingNew(true)}
                  variant="ghost"
                  width="full"
                >
                  Create New Project
                </Button>
              </FormControl>
            )}

            <Box
              p={3}
              bg={tipBg}
              borderRadius="md"
              fontSize="xs"
            >
              <Text fontWeight="600" mb={1}>
                💡 What happens next:
              </Text>
              <Text>
                • Research will be added to project's source materials
              </Text>
              <Text>
                • Use Podcast Studio to generate multi-speaker scripts
              </Text>
              <Text>
                • Citations and metadata will be preserved
              </Text>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleExport}
            isLoading={isExporting}
            leftIcon={<Icon as={FiPackage} />}
          >
            Export to Podcast Studio
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
