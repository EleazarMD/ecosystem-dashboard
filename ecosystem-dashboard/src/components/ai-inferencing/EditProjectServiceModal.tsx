/**
 * Edit Project/Service Modal
 * Modal for editing project or service details
 */

import React, { useState, useEffect } from 'react';
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
  Badge,
} from '@chakra-ui/react';

interface EditProjectServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'project' | 'service';
  id: string;
  currentName: string;
  currentDescription?: string;
  onUpdated?: () => void;
}

export function EditProjectServiceModal({
  isOpen,
  onClose,
  type,
  id,
  currentName,
  currentDescription = '',
  onUpdated,
}: EditProjectServiceModalProps) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setDescription(currentDescription);
    }
  }, [isOpen, currentName, currentDescription]);

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name cannot be empty',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsUpdating(true);
    try {
      const endpoint =
        type === 'project'
          ? `http://localhost:9000/api/v1/admin/keys/projects/${id}`
          : `http://localhost:9000/api/v1/admin/keys/services/${id}`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': 'ai-inferencing-admin-key-2024',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (response.ok) {
        toast({
          title: `${type === 'project' ? 'Project' : 'Service'} Updated`,
          description: `Successfully updated ${name}`,
          status: 'success',
          duration: 3000,
        });
        onUpdated?.();
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to update');
      }
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Edit {type === 'project' ? 'Project' : 'Service'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>ID (Read-only)</FormLabel>
              <Input value={id} isReadOnly bg={useSemanticToken('surface.base')} />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                The ID cannot be changed as it's used as a reference key
              </Text>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${type} name`}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Enter ${type} description (optional)`}
                rows={3}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleUpdate}
            isLoading={isUpdating}
          >
            Update
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
