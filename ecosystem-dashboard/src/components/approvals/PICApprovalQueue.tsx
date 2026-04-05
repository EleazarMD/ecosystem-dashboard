/**
 * PICApprovalQueue Component
 * 
 * Minimalist, modern queue view for pending Personal Identity Core observations.
 * Allows reviewing, editing, approving, and rejecting AI-learned observations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Spinner,
  Center,
  useToast,
  Icon,
  Flex,
  IconButton,
  Tooltip,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Collapse,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheck,
  FiX,
  FiEdit2,
  FiSave,
  FiChevronDown,
  FiChevronUp,
  FiUser,
  FiClock,
  FiCpu,
  FiInbox,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const MotionBox = motion(Box);

const PIC_API = '/api/pic';

interface Observation {
  id: string;
  observation_type: string;
  category: string | null;
  key: string;
  value: any;
  context: string | null;
  explanation: string | null;
  source_agent: string;
  source_action: string | null;
  processed: boolean;
  created_at: string;
}

interface PICApprovalQueueProps {
  onCountChange?: (count: number) => void;
}

export function PICApprovalQueue({ onCountChange }: PICApprovalQueueProps) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedKey, setEditedKey] = useState('');
  const [editedValue, setEditedValue] = useState('');
  const [editedExplanation, setEditedExplanation] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const toast = useToast();
  
  // Semantic tokens
  const bgBase = useSemanticToken('surface.base');
  const bgElevated = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const accentColor = useSemanticToken('interactive.primary');

  const fetchObservations = useCallback(async () => {
    try {
      const response = await fetch(`${PIC_API}/learn/observations?processed=false&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch observations');
      const data = await response.json();
      setObservations(data.observations || []);
      onCountChange?.(data.observations?.length || 0);
    } catch (error) {
      console.error('Failed to fetch observations:', error);
      toast({
        title: 'Failed to load observations',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, onCountChange]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  const handleEdit = (obs: Observation) => {
    setEditingId(obs.id);
    setEditedKey(obs.key);
    setEditedValue(typeof obs.value === 'object' ? JSON.stringify(obs.value) : String(obs.value));
    setEditedExplanation(obs.explanation || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedKey('');
    setEditedValue('');
    setEditedExplanation('');
  };

  const handleSaveEdit = async (obsId: string) => {
    setProcessingIds(prev => new Set(prev).add(obsId));
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editedKey,
          value: editedValue,
          explanation: editedExplanation,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast({
        title: 'Observation updated',
        status: 'success',
        duration: 2000,
      });
      
      await fetchObservations();
      handleCancelEdit();
    } catch (error) {
      toast({
        title: 'Update failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(obsId);
        return next;
      });
    }
  };

  const handleApprove = async (obsId: string) => {
    setProcessingIds(prev => new Set(prev).add(obsId));
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      if (!response.ok) throw new Error('Failed to approve');

      toast({
        title: 'Observation approved',
        description: 'Added to your preferences',
        status: 'success',
        duration: 2000,
      });
      
      await fetchObservations();
    } catch (error) {
      toast({
        title: 'Approval failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(obsId);
        return next;
      });
    }
  };

  const handleReject = async (obsId: string) => {
    setProcessingIds(prev => new Set(prev).add(obsId));
    try {
      const response = await fetch(`${PIC_API}/learn/observations/${obsId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false }),
      });

      if (!response.ok) throw new Error('Failed to reject');

      toast({
        title: 'Observation rejected',
        status: 'info',
        duration: 2000,
      });
      
      await fetchObservations();
    } catch (error) {
      toast({
        title: 'Rejection failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(obsId);
        return next;
      });
    }
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" color={accentColor} />
      </Center>
    );
  }

  if (observations.length === 0) {
    return (
      <Center py={12} flexDirection="column">
        <Icon as={FiInbox} boxSize={10} color={textSecondary} mb={3} />
        <Text color={textSecondary} fontSize="sm" fontWeight="500">
          All Clear
        </Text>
        <Text color={textSecondary} fontSize="xs" mt={1}>
          No pending observations to review
        </Text>
      </Center>
    );
  }

  return (
    <VStack spacing={2} align="stretch">
      <AnimatePresence mode="popLayout">
        {observations.map((obs) => {
          const isEditing = editingId === obs.id;
          const isExpanded = expandedId === obs.id;
          const isProcessing = processingIds.has(obs.id);

          return (
            <MotionBox
              key={obs.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                bg={bgElevated}
                borderRadius="lg"
                border="1px solid"
                borderColor={borderSubtle}
                overflow="hidden"
                opacity={isProcessing ? 0.6 : 1}
                transition="opacity 0.2s"
              >
                {/* Header row */}
                <Flex
                  px={3}
                  py={2}
                  justify="space-between"
                  align="center"
                  borderBottom={isEditing || isExpanded ? '1px solid' : 'none'}
                  borderColor={borderSubtle}
                >
                  <HStack spacing={2} flex={1} minW={0}>
                    {obs.category && (
                      <Badge 
                        colorScheme="blue" 
                        variant="subtle" 
                        fontSize="9px"
                        textTransform="uppercase"
                        letterSpacing="0.5px"
                      >
                        {obs.category}
                      </Badge>
                    )}
                    <Text 
                      fontSize="sm" 
                      fontWeight="600" 
                      color={textPrimary}
                      noOfLines={1}
                    >
                      {obs.key}
                    </Text>
                    <Text 
                      fontSize="sm" 
                      color={textSecondary}
                      noOfLines={1}
                    >
                      {formatValue(obs.value)}
                    </Text>
                  </HStack>

                  <HStack spacing={1}>
                    {isEditing ? (
                      <>
                        <Tooltip label="Save" placement="top">
                          <IconButton
                            aria-label="Save"
                            icon={<FiSave size={14} />}
                            size="xs"
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => handleSaveEdit(obs.id)}
                            isLoading={isProcessing}
                          />
                        </Tooltip>
                        <Tooltip label="Cancel" placement="top">
                          <IconButton
                            aria-label="Cancel"
                            icon={<FiX size={14} />}
                            size="xs"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          />
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip label="Edit" placement="top">
                          <IconButton
                            aria-label="Edit"
                            icon={<FiEdit2 size={14} />}
                            size="xs"
                            variant="ghost"
                            onClick={() => handleEdit(obs)}
                          />
                        </Tooltip>
                        <Tooltip label="Approve" placement="top">
                          <IconButton
                            aria-label="Approve"
                            icon={<FiCheck size={14} />}
                            size="xs"
                            colorScheme="green"
                            variant="ghost"
                            onClick={() => handleApprove(obs.id)}
                            isLoading={isProcessing}
                          />
                        </Tooltip>
                        <Tooltip label="Reject" placement="top">
                          <IconButton
                            aria-label="Reject"
                            icon={<FiX size={14} />}
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleReject(obs.id)}
                            isLoading={isProcessing}
                          />
                        </Tooltip>
                        <IconButton
                          aria-label="Details"
                          icon={isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          size="xs"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : obs.id)}
                        />
                      </>
                    )}
                  </HStack>
                </Flex>

                {/* Edit mode */}
                <Collapse in={isEditing} animateOpacity>
                  <VStack spacing={3} p={3} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="xs" color={textSecondary} mb={1}>
                        Explanation
                      </FormLabel>
                      <Textarea
                        value={editedExplanation}
                        onChange={(e) => setEditedExplanation(e.target.value)}
                        size="sm"
                        fontSize="sm"
                        placeholder="What does this observation mean?"
                        rows={2}
                        bg={bgBase}
                        borderColor={borderSubtle}
                      />
                    </FormControl>
                    <HStack spacing={3}>
                      <FormControl flex={1}>
                        <FormLabel fontSize="xs" color={textSecondary} mb={1}>
                          Key
                        </FormLabel>
                        <Input
                          value={editedKey}
                          onChange={(e) => setEditedKey(e.target.value)}
                          size="sm"
                          fontSize="sm"
                          bg={bgBase}
                          borderColor={borderSubtle}
                        />
                      </FormControl>
                      <FormControl flex={2}>
                        <FormLabel fontSize="xs" color={textSecondary} mb={1}>
                          Value
                        </FormLabel>
                        <Input
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          size="sm"
                          fontSize="sm"
                          bg={bgBase}
                          borderColor={borderSubtle}
                        />
                      </FormControl>
                    </HStack>
                  </VStack>
                </Collapse>

                {/* Expanded details */}
                <Collapse in={isExpanded && !isEditing} animateOpacity>
                  <Box px={3} py={2}>
                    {obs.explanation && (
                      <Box 
                        mb={2} 
                        p={2} 
                        bg={bgBase} 
                        borderRadius="md"
                        borderLeft="3px solid"
                        borderLeftColor="blue.400"
                      >
                        <Text fontSize="xs" color={textSecondary} mb={0.5}>
                          What this means
                        </Text>
                        <Text fontSize="sm" color={textPrimary}>
                          {obs.explanation}
                        </Text>
                      </Box>
                    )}
                    <HStack spacing={4} fontSize="xs" color={textSecondary}>
                      <HStack spacing={1}>
                        <Icon as={FiCpu} boxSize={3} />
                        <Text>{obs.source_agent}</Text>
                      </HStack>
                      <HStack spacing={1}>
                        <Icon as={FiClock} boxSize={3} />
                        <Text>{formatDate(obs.created_at)}</Text>
                      </HStack>
                      {obs.context && (
                        <Text noOfLines={1} flex={1}>
                          {obs.context}
                        </Text>
                      )}
                    </HStack>
                  </Box>
                </Collapse>
              </Box>
            </MotionBox>
          );
        })}
      </AnimatePresence>
    </VStack>
  );
}

export default PICApprovalQueue;
