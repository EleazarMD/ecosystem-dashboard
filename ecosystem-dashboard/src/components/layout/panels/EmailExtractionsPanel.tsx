/**
 * EmailExtractionsPanel - Shows AI-extracted events from emails in the right panel
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  useColorModeValue,
  useToast,
  Spinner,
  Divider,
  Checkbox,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiMail,
  FiClock,
  FiMapPin,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiCheckSquare,
  FiTrash2,
} from 'react-icons/fi';

interface EmailExtraction {
  id: string;
  email_subject: string;
  email_sender: string;
  extracted_title: string;
  extracted_start_time: string;
  extracted_end_time?: string;
  extracted_location?: string;
  extracted_description?: string;
  confidence_score: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface EmailExtractionsPanelProps {
  customData?: {
    extractions?: EmailExtraction[];
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
    onRefresh?: () => void;
  };
}

export function EmailExtractionsPanel({ customData }: EmailExtractionsPanelProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const toast = useToast();

  // Local state for extractions
  const [extractions, setExtractions] = useState<EmailExtraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Use extractions from customData or fetch locally
  useEffect(() => {
    if (customData?.extractions) {
      setExtractions(customData.extractions);
    } else {
      fetchExtractions();
    }
  }, [customData?.extractions]);

  const fetchExtractions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/email-extractions?status=pending');
      if (response.ok) {
        const data = await response.json();
        setExtractions(data.extractions || []);
      }
    } catch (error) {
      console.error('Failed to fetch extractions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAccept = useCallback(async (id: string) => {
    if (customData?.onAccept) {
      customData.onAccept(id);
      return;
    }

    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/calendar/email-extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (response.ok) {
        setExtractions(prev => prev.filter(e => e.id !== id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        toast({
          title: 'Event added to calendar',
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Failed to add event',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error adding event',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [customData, toast]);

  const handleReject = useCallback(async (id: string) => {
    if (customData?.onReject) {
      customData.onReject(id);
      return;
    }

    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/calendar/email-extractions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        setExtractions(prev => prev.filter(e => e.id !== id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        toast({
          title: 'Extraction ignored',
          status: 'info',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error rejecting extraction',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [customData, toast]);

  // Bulk actions
  const handleBulkAccept = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleAccept(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, handleAccept]);

  const handleBulkReject = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleReject(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, handleReject]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === extractions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extractions.map(e => e.id)));
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'green';
    if (score >= 0.7) return 'yellow';
    return 'orange';
  };

  if (isLoading) {
    return (
      <Box p={4}>
        <VStack spacing={4} py={8}>
          <Spinner size="lg" color="blue.500" />
          <Text color={mutedColor}>Loading extractions...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box h="100%" overflowY="auto" p={4}>
      <VStack align="stretch" spacing={4}>
        {/* Header with actions */}
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiMail} color="blue.500" />
            <Text fontWeight="medium">Events from Emails</Text>
            {extractions.length > 0 && (
              <Badge colorScheme="blue">{extractions.length}</Badge>
            )}
          </HStack>
          <Tooltip label="Refresh">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="sm"
              variant="ghost"
              onClick={customData?.onRefresh || fetchExtractions}
              isLoading={isLoading}
            />
          </Tooltip>
        </HStack>

        {/* Bulk actions */}
        {extractions.length > 0 && (
          <>
            <HStack justify="space-between" py={2}>
              <Checkbox
                isChecked={selectedIds.size === extractions.length && extractions.length > 0}
                isIndeterminate={selectedIds.size > 0 && selectedIds.size < extractions.length}
                onChange={toggleSelectAll}
                size="sm"
              >
                <Text fontSize="xs" color={mutedColor}>
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                </Text>
              </Checkbox>
              {selectedIds.size > 0 && (
                <HStack spacing={1}>
                  <Button
                    size="xs"
                    leftIcon={<FiCheckSquare />}
                    colorScheme="green"
                    variant="ghost"
                    onClick={handleBulkAccept}
                  >
                    Accept
                  </Button>
                  <Button
                    size="xs"
                    leftIcon={<FiTrash2 />}
                    colorScheme="red"
                    variant="ghost"
                    onClick={handleBulkReject}
                  >
                    Ignore
                  </Button>
                </HStack>
              )}
            </HStack>
            <Divider />
          </>
        )}

        {/* Extractions list */}
        {extractions.length === 0 ? (
          <VStack spacing={4} py={8} color={mutedColor}>
            <Icon as={FiMail} boxSize={12} />
            <Text textAlign="center">No pending event extractions</Text>
            <Text fontSize="sm" textAlign="center">
              Events detected in your emails will appear here
            </Text>
          </VStack>
        ) : (
          <VStack align="stretch" spacing={3}>
            {extractions.map((extraction) => (
              <Box
                key={extraction.id}
                p={3}
                border="1px solid"
                borderColor={selectedIds.has(extraction.id) ? 'blue.500' : borderColor}
                borderRadius="md"
                bg={selectedIds.has(extraction.id) ? hoverBg : bgColor}
                transition="all 0.2s"
                _hover={{ borderColor: 'blue.300' }}
              >
                <HStack align="start" spacing={3}>
                  <Checkbox
                    isChecked={selectedIds.has(extraction.id)}
                    onChange={() => toggleSelection(extraction.id)}
                    mt={1}
                  />
                  <VStack align="stretch" spacing={2} flex={1}>
                    <Text fontWeight="medium" fontSize="sm">
                      {extraction.extracted_title}
                    </Text>
                    
                    <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                      <Icon as={FiMail} mr={1} />
                      {extraction.email_subject}
                    </Text>
                    
                    <HStack fontSize="xs" color={mutedColor}>
                      <Icon as={FiClock} />
                      <Text>
                        {new Date(extraction.extracted_start_time).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </HStack>
                    
                    {extraction.extracted_location && (
                      <HStack fontSize="xs" color={mutedColor}>
                        <Icon as={FiMapPin} />
                        <Text noOfLines={1}>{extraction.extracted_location}</Text>
                      </HStack>
                    )}
                    
                    <HStack justify="space-between" pt={1}>
                      <Badge 
                        colorScheme={getConfidenceColor(extraction.confidence_score)}
                        fontSize="2xs"
                      >
                        {Math.round(extraction.confidence_score * 100)}% confidence
                      </Badge>
                      
                      <HStack spacing={1}>
                        <Button
                          size="xs"
                          leftIcon={<FiX />}
                          variant="ghost"
                          onClick={() => handleReject(extraction.id)}
                          isLoading={processingIds.has(extraction.id)}
                          isDisabled={processingIds.has(extraction.id)}
                        >
                          Ignore
                        </Button>
                        <Button
                          size="xs"
                          leftIcon={<FiCheck />}
                          colorScheme="green"
                          onClick={() => handleAccept(extraction.id)}
                          isLoading={processingIds.has(extraction.id)}
                          isDisabled={processingIds.has(extraction.id)}
                        >
                          Add
                        </Button>
                      </HStack>
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

export default EmailExtractionsPanel;
