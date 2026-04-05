/**
 * Pending Requests Component
 * 
 * Shows service access requests for parent review
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Icon,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  useDisclosure,
} from '@chakra-ui/react';
import { FiCheck, FiX, FiClock, FiUser } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ServiceRequest {
  id: string;
  childId: string;
  childName: string;
  childEmail: string;
  serviceName: string;
  servicePath: string;
  reason: string;
  status: string;
  requestedAt: string;
}

interface PendingRequestsProps {
  childId?: string;
  onRequestReviewed?: () => void;
}

export default function PendingRequests({ childId, onRequestReviewed }: PendingRequestsProps) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'deny'>('approve');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState<string>('permanent');
  const [submitting, setSubmitting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');

  useEffect(() => {
    fetchRequests();
  }, [childId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'pending' });
      if (childId) {
        params.append('childId', childId);
      }

      const res = await fetch(`/api/requests/list?${params}`);
      
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error loading requests',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = (request: ServiceRequest, action: 'approve' | 'deny') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setNotes('');
    setDuration('permanent');
    onOpen();
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: reviewAction,
          notes,
          duration: reviewAction === 'approve' ? duration : undefined,
        }),
      });

      if (res.ok) {
        toast({
          title: reviewAction === 'approve' ? 'Request approved!' : 'Request denied',
          description: `${selectedRequest.childName} has been notified.`,
          status: 'success',
          duration: 5000,
        });
        
        // Remove from list
        setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
        
        if (onRequestReviewed) {
          onRequestReviewed();
        }
        
        onClose();
      } else {
        const data = await res.json();
        toast({
          title: 'Error reviewing request',
          description: data.error,
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error reviewing request',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4} color="gray.500">Loading requests...</Text>
      </Box>
    );
  }

  if (requests.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Icon as={FiCheck} boxSize={12} color="green.500" mb={4} />
        <Text color="gray.500">No pending requests</Text>
        <Text fontSize="sm" color="gray.400" mt={2}>
          You're all caught up!
        </Text>
      </Box>
    );
  }

  return (
    <>
      <VStack spacing={3} align="stretch">
        {requests.map((request) => (
          <Box
            key={request.id}
            bg={cardBg}
            p={4}
            borderRadius="lg"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <VStack align="stretch" spacing={3}>
              {/* Header */}
              <HStack justify="space-between">
                <HStack>
                  <Icon as={FiUser} color="blue.500" />
                  <Text fontWeight="bold">{request.childName}</Text>
                  <Badge colorScheme="orange">Pending</Badge>
                </HStack>
                <HStack fontSize="sm" color="gray.500">
                  <Icon as={FiClock} />
                  <Text>{formatTimestamp(request.requestedAt)}</Text>
                </HStack>
              </HStack>

              {/* Service */}
              <Box>
                <Text fontSize="sm" color="gray.500">Requesting access to:</Text>
                <Text fontWeight="medium" textTransform="capitalize">
                  {request.serviceName.replace(/-/g, ' ')}
                </Text>
              </Box>

              {/* Reason */}
              {request.reason && (
                <Box bg="gray.50" p={3} borderRadius="md">
                  <Text fontSize="sm" color="gray.500" mb={1}>Reason:</Text>
                  <Text fontSize="sm">{request.reason}</Text>
                </Box>
              )}

              {/* Actions */}
              <HStack spacing={2}>
                <Button
                  leftIcon={<FiCheck />}
                  colorScheme="green"
                  size="sm"
                  flex={1}
                  onClick={() => handleReviewClick(request, 'approve')}
                >
                  Approve
                </Button>
                <Button
                  leftIcon={<FiX />}
                  colorScheme="red"
                  size="sm"
                  flex={1}
                  variant="outline"
                  onClick={() => handleReviewClick(request, 'deny')}
                >
                  Deny
                </Button>
              </HStack>
            </VStack>
          </Box>
        ))}
      </VStack>

      {/* Review Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {reviewAction === 'approve' ? 'Approve Request' : 'Deny Request'}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                {reviewAction === 'approve' 
                  ? `Grant ${selectedRequest?.childName} access to ${selectedRequest?.serviceName}?`
                  : `Deny ${selectedRequest?.childName}'s request for ${selectedRequest?.serviceName}?`
                }
              </Text>

              {reviewAction === 'approve' && (
                <FormControl>
                  <FormLabel fontSize="sm">Access Duration</FormLabel>
                  <Select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="hour">1 Hour</option>
                    <option value="day">1 Day</option>
                    <option value="week">1 Week</option>
                    <option value="permanent">Permanent</option>
                  </Select>
                </FormControl>
              )}

              <FormControl>
                <FormLabel fontSize="sm">
                  {reviewAction === 'approve' ? 'Note (optional)' : 'Reason for denial'}
                </FormLabel>
                <Textarea
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Add a note for your child...'
                      : 'Explain why you are denying this request...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
              colorScheme={reviewAction === 'approve' ? 'green' : 'red'}
              onClick={handleSubmitReview}
              isLoading={submitting}
            >
              {reviewAction === 'approve' ? 'Approve' : 'Deny'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
