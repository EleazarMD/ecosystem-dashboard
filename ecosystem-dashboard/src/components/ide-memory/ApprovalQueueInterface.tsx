/**
 * AI Truth Engine - Approval Queue Interface Component
 * 
 * Interactive interface for reviewing and managing AI-generated memory corrections.
 * Provides real-time queue management with filtering, sorting, and bulk operations.
 * 
 * @module components/ide-memory/ApprovalQueueInterface
 * @version 1.0.0
 * @updated 2025-08-15
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Checkbox,
  Tooltip,
  Icon,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Tag,
  TagLabel,
  TagLeftIcon,
  Progress,
  useToast
} from '@chakra-ui/react';
import {
  FiSearch,
  FiFilter,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiEdit3,
  FiFileText,
  FiGitBranch,
  FiTarget,
  FiTrendingUp
} from 'react-icons/fi';
import { useApprovalQueue, useBulkApproval } from '../../hooks/useApprovalWorkflow';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ApprovalQueueInterfaceProps {
  onCorrectionSelect?: (correctionId: string) => void;
  onDecisionMade?: () => void;
}

const ApprovalQueueInterface: React.FC<ApprovalQueueInterfaceProps> = ({
  onCorrectionSelect,
  onDecisionMade
}) => {
  const [filters, setFilters] = useState({
    priority: '',
    type: '',
    workspace: '',
    search: ''
  });
  const [selectedCorrections, setSelectedCorrections] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'created_at' | 'priority' | 'confidence'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // All hooks must be called before any conditional returns
  const { data: queueData, loading, error, refetch } = useApprovalQueue(filters);
  const { processBulkDecisions, processing: bulkProcessing } = useBulkApproval();
  const toast = useToast();

  // Color mode values - must be called before any early returns
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.secondary');
  const reasoningBg = useSemanticToken('surface.base');

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  // Type icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'factual': return FiTarget;
      case 'consistency': return FiGitBranch;
      case 'compliance': return FiCheckCircle;
      case 'optimization': return FiTrendingUp;
      default: return FiFileText;
    }
  };

  // Filtered and sorted corrections
  const processedCorrections = useMemo(() => {
    if (!queueData?.pending_corrections) return [];

    let filtered = queueData.pending_corrections;

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(correction =>
        correction.memory_title.toLowerCase().includes(searchLower) ||
        correction.ai_reasoning.toLowerCase().includes(searchLower) ||
        correction.workspace.toLowerCase().includes(searchLower)
      );
    }

    // Sort corrections
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'confidence':
          aValue = a.confidence_score;
          bValue = b.confidence_score;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [queueData?.pending_corrections, filters.search, sortBy, sortOrder]);

  // Handle bulk operations
  const handleBulkApprove = async () => {
    if (selectedCorrections.length === 0) return;

    try {
      await processBulkDecisions(
        selectedCorrections,
        'approve',
        'dashboard-user',
        'Dashboard User',
        'Bulk approval via dashboard'
      );

      toast({
        title: 'Bulk Approval Successful',
        description: `${selectedCorrections.length} corrections approved`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedCorrections([]);
      refetch();
      onDecisionMade?.();
    } catch (error) {
      toast({
        title: 'Bulk Approval Failed',
        description: 'Failed to process bulk approval',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedCorrections.length === 0) return;

    try {
      await processBulkDecisions(
        selectedCorrections,
        'reject',
        'dashboard-user',
        'Dashboard User',
        'Bulk rejection via dashboard'
      );

      toast({
        title: 'Bulk Rejection Successful',
        description: `${selectedCorrections.length} corrections rejected`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setSelectedCorrections([]);
      refetch();
      onDecisionMade?.();
    } catch (error) {
      toast({
        title: 'Bulk Rejection Failed',
        description: 'Failed to process bulk rejection',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Toggle correction selection
  const toggleCorrectionSelection = (correctionId: string) => {
    setSelectedCorrections(prev =>
      prev.includes(correctionId)
        ? prev.filter(id => id !== correctionId)
        : [...prev, correctionId]
    );
  };

  // Select all corrections
  const toggleSelectAll = () => {
    if (selectedCorrections.length === processedCorrections.length) {
      setSelectedCorrections([]);
    } else {
      setSelectedCorrections(processedCorrections.map(c => c.id));
    }
  };


  // Loading state with all hooks already called
  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" />
        <Text mt={4}>Loading approval queue...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Queue Load Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Queue Statistics */}
      {queueData && (
        <Card mb={6} bg={cardBg} borderColor={borderColor}>
          <CardHeader pb={2}>
            <Text fontSize="lg" fontWeight="semibold">Queue Overview</Text>
          </CardHeader>
          <CardBody pt={0}>
            <HStack spacing={6} wrap="wrap">
              <VStack spacing={1} align="start">
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {queueData.queue_stats.total_pending}
                </Text>
                <Text fontSize="sm" color={textColor}>Total Pending</Text>
              </VStack>
              <VStack spacing={1} align="start">
                <HStack>
                  <Badge colorScheme="red">{queueData.queue_stats.by_priority.critical}</Badge>
                  <Badge colorScheme="orange">{queueData.queue_stats.by_priority.high}</Badge>
                  <Badge colorScheme="yellow">{queueData.queue_stats.by_priority.medium}</Badge>
                  <Badge colorScheme="green">{queueData.queue_stats.by_priority.low}</Badge>
                </HStack>
                <Text fontSize="sm" color={textColor}>By Priority</Text>
              </VStack>
              <VStack spacing={1} align="start">
                <Text fontSize="lg" fontWeight="semibold">
                  {Math.round(queueData.queue_stats.average_confidence * 100)}%
                </Text>
                <Text fontSize="sm" color={textColor}>Avg Confidence</Text>
              </VStack>
              <VStack spacing={1} align="start">
                <Badge colorScheme={queueData.metadata.queue_health === 'healthy' ? 'green' : 
                                 queueData.metadata.queue_health === 'warning' ? 'yellow' : 'red'}>
                  {queueData.metadata.queue_health.toUpperCase()}
                </Badge>
                <Text fontSize="sm" color={textColor}>Queue Health</Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card mb={6} bg={cardBg} borderColor={borderColor}>
        <CardBody>
          <VStack spacing={4}>
            {/* Search and Filters */}
            <HStack spacing={4} width="100%" wrap="wrap">
              <InputGroup flex="1" minW="200px">
                <InputLeftElement>
                  <Icon as={FiSearch} color={textColor} />
                </InputLeftElement>
                <Input
                  placeholder="Search corrections..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </InputGroup>
              
              <Select
                placeholder="All Priorities"
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                minW="150px"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>

              <Select
                placeholder="All Types"
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                minW="150px"
              >
                <option value="factual">Factual</option>
                <option value="consistency">Consistency</option>
                <option value="compliance">Compliance</option>
                <option value="optimization">Optimization</option>
              </Select>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                minW="150px"
              >
                <option value="created_at">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="confidence">Sort by Confidence</option>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </HStack>

            {/* Bulk Actions */}
            {selectedCorrections.length > 0 && (
              <HStack spacing={4} width="100%" justify="space-between">
                <HStack>
                  <Checkbox
                    isChecked={selectedCorrections.length === processedCorrections.length}
                    isIndeterminate={selectedCorrections.length > 0 && selectedCorrections.length < processedCorrections.length}
                    onChange={toggleSelectAll}
                  >
                    {selectedCorrections.length} selected
                  </Checkbox>
                </HStack>
                
                <HStack>
                  <Button
                    size="sm"
                    colorScheme="green"
                    leftIcon={<FiCheckCircle />}
                    onClick={handleBulkApprove}
                    isLoading={bulkProcessing}
                    loadingText="Approving..."
                  >
                    Bulk Approve
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    leftIcon={<FiXCircle />}
                    onClick={handleBulkReject}
                    isLoading={bulkProcessing}
                    loadingText="Rejecting..."
                  >
                    Bulk Reject
                  </Button>
                </HStack>
              </HStack>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Corrections List */}
      <VStack spacing={4} align="stretch">
        {processedCorrections.length === 0 ? (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody textAlign="center" py={8}>
              <Text color={textColor}>No corrections match your filters</Text>
            </CardBody>
          </Card>
        ) : (
          processedCorrections.map((correction) => (
            <Card
              key={correction.id}
              bg={cardBg}
              borderColor={borderColor}
              borderWidth="1px"
              _hover={{ borderColor: 'blue.300', shadow: 'md' }}
              cursor="pointer"
            >
              <CardBody>
                <VStack spacing={4} align="stretch">
                  {/* Header */}
                  <HStack justify="space-between" align="start">
                    <HStack spacing={3} flex="1">
                      <Checkbox
                        isChecked={selectedCorrections.includes(correction.id)}
                        onChange={() => toggleCorrectionSelection(correction.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <VStack align="start" spacing={1} flex="1">
                        <HStack>
                          <Text fontWeight="semibold" fontSize="md">
                            {correction.memory_title}
                          </Text>
                          <Badge colorScheme={getPriorityColor(correction.priority)}>
                            {correction.priority.toUpperCase()}
                          </Badge>
                        </HStack>
                        
                        <HStack spacing={4} fontSize="sm" color={textColor}>
                          <HStack>
                            <Icon as={getTypeIcon(correction.correction_type)} />
                            <Text>{correction.correction_type}</Text>
                          </HStack>
                          <HStack>
                            <Icon as={FiClock} />
                            <Text>{new Date(correction.created_at).toLocaleString()}</Text>
                          </HStack>
                          <Text>{correction.workspace}</Text>
                        </HStack>
                      </VStack>
                    </HStack>

                    <VStack align="end" spacing={1}>
                      <Text fontSize="lg" fontWeight="semibold" color="blue.500">
                        {Math.round(correction.confidence_score * 100)}%
                      </Text>
                      <Text fontSize="xs" color={textColor}>Confidence</Text>
                    </VStack>
                  </HStack>

                  {/* AI Reasoning */}
                  <Box>
                    <Text fontSize="sm" color={textColor} mb={2}>
                      <strong>AI Reasoning:</strong>
                    </Text>
                    <Text fontSize="sm" bg={reasoningBg} p={3} borderRadius="md">
                      {correction.ai_reasoning || 'No reasoning provided'}
                    </Text>
                  </Box>

                  {/* Impact Assessment */}
                  <HStack spacing={4} wrap="wrap">
                    <Tag size="sm" colorScheme="blue">
                      <TagLabel>Scope: {correction.impact_assessment?.scope || 'local'}</TagLabel>
                    </Tag>
                    <Tag size="sm" colorScheme={correction.impact_assessment?.risk_level === 'high' ? 'red' : 
                                                correction.impact_assessment?.risk_level === 'medium' ? 'yellow' : 'green'}>
                      <TagLabel>Risk: {correction.impact_assessment?.risk_level || 'low'}</TagLabel>
                    </Tag>
                    <Tag size="sm" colorScheme="purple">
                      <TagLabel>{correction.affected_files?.length || correction.evidence_sources?.length || 0} files affected</TagLabel>
                    </Tag>
                  </HStack>

                  {/* Actions */}
                  <HStack justify="end" spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<FiEdit3 />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCorrectionSelect?.(correction.id);
                      }}
                    >
                      Review
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>
    </Box>
  );
};

export default ApprovalQueueInterface;
