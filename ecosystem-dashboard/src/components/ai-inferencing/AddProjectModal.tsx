/**
 * Add Project Modal
 * Modal for creating new projects in AI Inferencing
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
  Text,
  Code,
} from '@chakra-ui/react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: { projectId: string; name: string }) => void;
}

export function AddProjectModal({ isOpen, onClose, onProjectCreated }: AddProjectModalProps) {
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();

  const handleCreate = async () => {
    if (!projectId || !projectName) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in Project ID and Name',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsCreating(true);

    try {
      // Call the AI Inferencing API to create project
      const response = await fetch('http://localhost:9000/api/v1/admin/keys/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': 'ai-inferencing-admin-key-2024',
        },
        body: JSON.stringify({
          projectId: projectId,
          name: projectName,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }

      const data = await response.json();

      toast({
        title: 'Project created',
        description: `Successfully created ${projectName}`,
        status: 'success',
        duration: 3000,
      });

      onProjectCreated?.({ projectId, name: projectName });
      
      // Reset and close
      setProjectId('');
      setProjectName('');
      setDescription('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to create project',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const generateProjectId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleNameChange = (value: string) => {
    setProjectName(value);
    if (!projectId || projectId === generateProjectId(projectName)) {
      setProjectId(generateProjectId(value));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Project</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Project Name</FormLabel>
              <Input
                placeholder="e.g., Workspace AI"
                value={projectName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                Human-readable name for the project
              </Text>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Project ID</FormLabel>
              <Input
                placeholder="e.g., workspace-ai"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                fontFamily="mono"
              />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                Unique identifier (kebab-case, alphanumeric and hyphens only)
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="What this project is used for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </FormControl>

            <Text fontSize="xs" color={useSemanticToken('text.secondary')} width="full">
              💡 After creating the project, you'll need to:
              <br />
              1. Create a service for this project
              <br />
              2. Add API keys to the service
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isCreating}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleCreate}
            isLoading={isCreating}
            loadingText="Creating..."
          >
            Create Project
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
