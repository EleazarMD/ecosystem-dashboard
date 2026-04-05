/**
 * Service Blocked Modal
 * 
 * Shown to children when they try to access a blocked service
 */

import React, { useState } from 'react';
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
  Textarea,
  FormControl,
  FormLabel,
  Icon,
  Box,
  useToast,
} from '@chakra-ui/react';
import { FiShield, FiSend } from 'react-icons/fi';

interface ServiceBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  servicePath: string;
  reason?: string;
}

export default function ServiceBlockedModal({
  isOpen,
  onClose,
  serviceName,
  servicePath,
  reason,
}: ServiceBlockedModalProps) {
  const [requestReason, setRequestReason] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleRequestAccess = async () => {
    if (!requestReason.trim()) {
      toast({
        title: 'Please tell us why you need access',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/requests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          servicePath,
          reason: requestReason,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Request sent! 🎉',
          description: 'Your parent will review your request soon.',
          status: 'success',
          duration: 5000,
        });
        setRequestReason('');
        onClose();
      } else {
        const data = await res.json();
        toast({
          title: 'Could not send request',
          description: data.error || 'Please try again',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error sending request',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <VStack spacing={2} align="center">
            <Box bg="orange.100" p={3} borderRadius="full">
              <Icon as={FiShield} boxSize={8} color="orange.500" />
            </Box>
            <Text>Service Blocked</Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text textAlign="center" color="gray.600">
              {reason || `Your parent has blocked access to ${serviceName}.`}
            </Text>

            <Box bg="blue.50" p={4} borderRadius="lg">
              <Text fontSize="sm" color="blue.700">
                💡 <strong>Want to use this?</strong> Ask your parent for permission!
              </Text>
            </Box>

            <FormControl>
              <FormLabel fontSize="sm">Why do you need access?</FormLabel>
              <Textarea
                placeholder="Example: I need it for my homework assignment..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={4}
                resize="none"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Go Back
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<FiSend />}
            onClick={handleRequestAccess}
            isLoading={loading}
          >
            Ask Parent
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
