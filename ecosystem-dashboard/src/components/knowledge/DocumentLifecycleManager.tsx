/**
 * Document Lifecycle Manager Component
 * 
 * Human-in-the-loop controls for document deletion, conflict resolution,
 * and lifecycle management integrated into the Knowledge Graph Dashboard.
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Card,
  CardHeader,
  CardBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Spinner,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea,
  useDisclosure,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import {
  CheckIcon, 
  CloseIcon, 
  InfoIcon, 
  WarningIcon,
  RepeatIcon,
  ViewIcon,
  DeleteIcon
} from '@chakra-ui/icons';

interface PendingDeletion {
  id: string;
  documentPath: string;
  documentId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  requesterAgent: string;
  status: string;
  createdAt: string;
  dependencies: {
    hasCriticalDependencies: boolean;
    incomingRelationships: number;
    outgoingRelationships: number;
    dependentDocuments: number;
    relatedDocuments: number;
  };
  similarity?: number;
  duplicateOf?: string;
}

interface ConflictAnalysis {
  id: string;
  documentPath: string;
  conflictTypes: string[];
  conflictingStatements: string[];
  confidence: number;
  hasConflicts: boolean;
  aiAnalysis: string;
}

interface LifecycleStats {
  totalDocuments: number;
  pendingDeletions: number;
  conflictsDetected: number;
  duplicatesFound: number;
  deletionsToday: number;
  averageProcessingTime: string;
}

const DocumentLifecycleManager: React.FC = () => {
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const [conflicts, setConflicts] = useState<ConflictAnalysis[]>([]);
  const [stats, setStats] = useState<LifecycleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeletion, setSelectedDeletion] = useState<PendingDeletion | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  useEffect(() => {
    fetchLifecycleData();
    const interval = setInterval(fetchLifecycleData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

    const getMockData = () => ({
    deletionsData: {
      pendingDeletions: [
        {
          id: 'del-001',
          documentPath: '/docs/architecture/legacy-api.md',
          documentId: 'doc-1024',
          reason: 'Outdated Content',
          priority: 'high',
          requesterAgent: 'Content-Truth-Agent-v2',
          status: 'pending_approval',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          dependencies: {
            hasCriticalDependencies: true,
            incomingRelationships: 12,
            outgoingRelationships: 5,
            dependentDocuments: 3,
            relatedDocuments: 8,
          },
        },
        {
          id: 'del-002',
          documentPath: '/docs/guides/onboarding-v1.md',
          documentId: 'doc-1025',
          reason: 'Duplicate of /docs/guides/onboarding-v2.md',
          priority: 'medium',
          requesterAgent: 'Duplicate-Detection-Agent',
          status: 'pending_approval',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          dependencies: {
            hasCriticalDependencies: false,
            incomingRelationships: 2,
            outgoingRelationships: 1,
            dependentDocuments: 0,
            relatedDocuments: 1,
          },
          similarity: 0.98,
          duplicateOf: '/docs/guides/onboarding-v2.md',
        },
      ],
    },
    conflictsData: { conflicts: [] },
    statsData: { totalDocuments: 1250, deletionsToday: 5, averageProcessingTime: '2.3s' },
  });

  const fetchLifecycleData = async () => {
    try {
      setLoading(true);
      const deletionsResponse = await fetch('http://localhost:41248/pending-deletions');
      const conflictsResponse = await fetch('http://localhost:41248/conflicts');
      const statsResponse = await fetch('http://localhost:41248/health');

      if (!deletionsResponse.ok || !conflictsResponse.ok || !statsResponse.ok) {
        throw new Error('One or more lifecycle services are unavailable.');
      }

      const deletionsData = await deletionsResponse.json();
      const conflictsData = await conflictsResponse.json();
      const statsData = await statsResponse.json();

      setPendingDeletions(deletionsData.pendingDeletions || []);
      setConflicts(conflictsData.conflicts || []);
      setStats({
        totalDocuments: statsData.total_documents || 1250,
        pendingDeletions: deletionsData.pendingDeletions?.length || 0,
        conflictsDetected: conflictsData.conflicts?.length || 0,
        duplicatesFound: deletionsData.pendingDeletions?.filter((d: PendingDeletion) => d.reason.includes('Duplicate')).length || 0,
        deletionsToday: statsData.deletions_today || 5,
        averageProcessingTime: statsData.avg_processing_time || '2.3s',
      });
    } catch (error) {
      console.error('Failed to fetch lifecycle data, using mock data:', error);
      toast({
        title: 'Using Mock Data',
        description: 'Could not connect to Document Lifecycle Service. Displaying mock data.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      const { deletionsData, conflictsData, statsData } = getMockData();
      setPendingDeletions(deletionsData.pendingDeletions || []);
      setConflicts(conflictsData.conflicts || []);
      setStats({
        totalDocuments: statsData.totalDocuments,
        pendingDeletions: deletionsData.pendingDeletions?.length || 0,
        conflictsDetected: conflictsData.conflicts?.length || 0,
        duplicatesFound: deletionsData.pendingDeletions?.filter((d: PendingDeletion) => d.reason.includes('Duplicate')).length || 0,
        deletionsToday: statsData.deletionsToday,
        averageProcessingTime: statsData.averageProcessingTime,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (deletionId: string, approved: boolean) => {
    try {
      setProcessing(deletionId);
      
      const response = await fetch(`http://localhost:41248/approve-deletion/${deletionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved,
          reason: approvalReason || (approved ? 'Approved via dashboard' : 'Rejected via dashboard')
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: approved ? 'Deletion Approved' : 'Deletion Rejected',
          description: `Document deletion has been ${approved ? 'approved and executed' : 'rejected'}`,
          status: approved ? 'success' : 'info',
          duration: 5000,
          isClosable: true,
        });

        // Refresh data
        await fetchLifecycleData();
        onClose();
        setApprovalReason('');
      } else {
        throw new Error(result.error || 'Approval failed');
      }

    } catch (error) {
      console.error('Approval failed:', error);
      toast({
        title: 'Error',
        description: `Failed to ${approved ? 'approve' : 'reject'} deletion`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRollback = async (deletionId: string) => {
    try {
      setProcessing(deletionId);
      
      const response = await fetch(`http://localhost:41248/rollback/${deletionId}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Rollback Successful',
          description: 'Document has been restored successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        await fetchLifecycleData();
      } else {
        throw new Error(result.error || 'Rollback failed');
      }

    } catch (error) {
      console.error('Rollback failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to rollback deletion',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setProcessing(null);
    }
  };

  const openApprovalModal = (deletion: PendingDeletion) => {
    setSelectedDeletion(deletion);
    setApprovalReason('');
    onOpen();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'yellow';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'completed': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  if (loading && !stats) {
    return (
      <VStack spacing={4} align="center" py={8}>
        <Spinner size="lg" />
        <Text>Loading document lifecycle data...</Text>
      </VStack>
    );
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Stats Overview */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Document Lifecycle Overview</Heading>
              <Button
                leftIcon={<RepeatIcon />}
                size="sm"
                onClick={fetchLifecycleData}
                isLoading={loading}
              >
                Refresh
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            {stats && (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Documents</StatLabel>
                  <StatNumber>{stats.totalDocuments.toLocaleString()}</StatNumber>
                  <StatHelpText>In Knowledge Graph</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Pending Deletions</StatLabel>
                  <StatNumber color="orange.500">{stats.pendingDeletions}</StatNumber>
                  <StatHelpText>Awaiting approval</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Conflicts Detected</StatLabel>
                  <StatNumber color="red.500">{stats.conflictsDetected}</StatNumber>
                  <StatHelpText>Require resolution</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Duplicates Found</StatLabel>
                  <StatNumber color="yellow.500">{stats.duplicatesFound}</StatNumber>
                  <StatHelpText>Auto-detected</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Deletions Today</StatLabel>
                  <StatNumber color="blue.500">{stats.deletionsToday}</StatNumber>
                  <StatHelpText>Successfully processed</StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Avg Processing</StatLabel>
                  <StatNumber>{stats.averageProcessingTime}</StatNumber>
                  <StatHelpText>Per document</StatHelpText>
                </Stat>
              </SimpleGrid>
            )}
          </CardBody>
        </Card>

        {/* Tabs for different lifecycle management areas */}
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>
              Pending Deletions 
              {pendingDeletions.length > 0 && (
                <Badge ml={2} colorScheme="orange">{pendingDeletions.length}</Badge>
              )}
            </Tab>
            <Tab>
              Conflicts 
              {conflicts.length > 0 && (
                <Badge ml={2} colorScheme="red">{conflicts.length}</Badge>
              )}
            </Tab>
            <Tab>Deletion History</Tab>
          </TabList>

          <TabPanels>
            {/* Pending Deletions Tab */}
            <TabPanel p={0}>
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="sm">Documents Awaiting Deletion Approval</Heading>
                </CardHeader>
                <CardBody>
                  {pendingDeletions.length === 0 ? (
                    <Alert status="success">
                      <AlertIcon />
                      <AlertTitle>No pending deletions!</AlertTitle>
                      <AlertDescription>
                        All document lifecycle operations are up to date.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Document</Th>
                          <Th>Reason</Th>
                          <Th>Priority</Th>
                          <Th>Dependencies</Th>
                          <Th>Requester</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {pendingDeletions.map((deletion) => (
                          <Tr key={deletion.id}>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {deletion.documentPath.split('/').pop()}
                                </Text>
                                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                  {deletion.documentPath}
                                </Text>
                              </VStack>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm">{deletion.reason}</Text>
                                {deletion.similarity && (
                                  <Badge colorScheme="blue" size="sm">
                                    {Math.round(deletion.similarity * 100)}% similar
                                  </Badge>
                                )}
                              </VStack>
                            </Td>
                            <Td>
                              <Badge colorScheme={getPriorityColor(deletion.priority)}>
                                {deletion.priority}
                              </Badge>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={1}>
                                <Text fontSize="xs">
                                  {deletion.dependencies.incomingRelationships} incoming
                                </Text>
                                <Text fontSize="xs">
                                  {deletion.dependencies.outgoingRelationships} outgoing
                                </Text>
                                {deletion.dependencies.hasCriticalDependencies && (
                                  <Badge colorScheme="red" size="sm">Critical</Badge>
                                )}
                              </VStack>
                            </Td>
                            <Td>
                              <Text fontSize="sm">{deletion.requesterAgent}</Text>
                            </Td>
                            <Td>
                              <HStack spacing={2}>
                                <Tooltip label="Review and approve/reject">
                                  <IconButton
                                    aria-label="Review deletion"
                                    icon={<ViewIcon />}
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={() => openApprovalModal(deletion)}
                                  />
                                </Tooltip>
                                <Tooltip label="Quick approve">
                                  <IconButton
                                    aria-label="Approve deletion"
                                    icon={<CheckIcon />}
                                    size="sm"
                                    colorScheme="green"
                                    onClick={() => handleApproval(deletion.id, true)}
                                    isLoading={processing === deletion.id}
                                  />
                                </Tooltip>
                                <Tooltip label="Quick reject">
                                  <IconButton
                                    aria-label="Reject deletion"
                                    icon={<CloseIcon />}
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => handleApproval(deletion.id, false)}
                                    isLoading={processing === deletion.id}
                                  />
                                </Tooltip>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            {/* Conflicts Tab */}
            <TabPanel p={0}>
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="sm">Document Conflicts Requiring Resolution</Heading>
                </CardHeader>
                <CardBody>
                  {conflicts.length === 0 ? (
                    <Alert status="success">
                      <AlertIcon />
                      <AlertTitle>No conflicts detected!</AlertTitle>
                      <AlertDescription>
                        All documents are consistent with existing knowledge.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <VStack spacing={4} align="stretch">
                      {conflicts.map((conflict) => (
                        <Card key={conflict.id} variant="outline">
                          <CardBody>
                            <VStack align="start" spacing={3}>
                              <HStack justify="space-between" w="full">
                                <Text fontWeight="medium">{conflict.documentPath}</Text>
                                <Badge colorScheme="red">
                                  {Math.round(conflict.confidence * 100)}% confidence
                                </Badge>
                              </HStack>
                              
                              <HStack spacing={2}>
                                {conflict.conflictTypes.map((type) => (
                                  <Badge key={type} colorScheme="orange" size="sm">
                                    {type.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </HStack>

                              {conflict.conflictingStatements.length > 0 && (
                                <Box>
                                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                                    Conflicting Statements:
                                  </Text>
                                  <VStack align="start" spacing={1}>
                                    {conflict.conflictingStatements.map((statement, index) => (
                                      <Text key={index} fontSize="sm" color={useSemanticToken('text.secondary')}>
                                        • {statement}
                                      </Text>
                                    ))}
                                  </VStack>
                                </Box>
                              )}

                              <HStack spacing={2}>
                                <Button size="sm" colorScheme="blue">
                                  Review Details
                                </Button>
                                <Button size="sm" colorScheme="green">
                                  Resolve Conflict
                                </Button>
                                <Button size="sm" colorScheme="red">
                                  Mark as False Positive
                                </Button>
                              </HStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            {/* Deletion History Tab */}
            <TabPanel p={0}>
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="sm">Recent Deletion History</Heading>
                </CardHeader>
                <CardBody>
                  <Text color={useSemanticToken('text.secondary')}>
                    Deletion history and rollback capabilities will be displayed here.
                    This includes completed deletions with rollback options within 24 hours.
                  </Text>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Approval Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Deletion Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDeletion && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="medium" mb={2}>Document:</Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{selectedDeletion.documentPath}</Text>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Reason for Deletion:</Text>
                  <Text fontSize="sm">{selectedDeletion.reason}</Text>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Dependencies Analysis:</Text>
                  <SimpleGrid columns={2} spacing={4}>
                    <Stat size="sm">
                      <StatLabel>Incoming Links</StatLabel>
                      <StatNumber>{selectedDeletion.dependencies.incomingRelationships}</StatNumber>
                    </Stat>
                    <Stat size="sm">
                      <StatLabel>Outgoing Links</StatLabel>
                      <StatNumber>{selectedDeletion.dependencies.outgoingRelationships}</StatNumber>
                    </Stat>
                  </SimpleGrid>
                  {selectedDeletion.dependencies.hasCriticalDependencies && (
                    <Alert status="warning" mt={2}>
                      <AlertIcon />
                      <AlertTitle>Critical Dependencies Detected!</AlertTitle>
                      <AlertDescription>
                        This document has critical dependencies that may be affected by deletion.
                      </AlertDescription>
                    </Alert>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Approval Reason (Optional):</Text>
                  <Textarea
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    placeholder="Enter reason for approval/rejection..."
                    size="sm"
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button
                colorScheme="red"
                onClick={() => selectedDeletion && handleApproval(selectedDeletion.id, false)}
                isLoading={processing === selectedDeletion?.id}
              >
                Reject Deletion
              </Button>
              <Button
                colorScheme="green"
                onClick={() => selectedDeletion && handleApproval(selectedDeletion.id, true)}
                isLoading={processing === selectedDeletion?.id}
              >
                Approve Deletion
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentLifecycleManager;
