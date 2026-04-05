/**
 * Child Approvals Management Page
 * 
 * Review and respond to approval requests from a child account
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  IconButton,
  useToast,
  Spinner,
  Badge,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Stat,
  StatLabel,
  StatNumber,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiImage,
  FiLink,
  FiMessageSquare,
  FiDownload,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withParent } from '@/lib/auth/withParent';

interface ApprovalRequest {
  id: string;
  childUserId: string;
  parentUserId: string;
  requestType: string;
  requestData: {
    title: string;
    description?: string;
    serviceId?: string;
    details?: any;
  };
  status: 'pending' | 'approved' | 'denied' | 'expired';
  respondedAt?: string;
  responseNote?: string;
  expiresAt: string;
  createdAt: string;
}

function ApprovalsPage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [childName, setChildName] = useState('');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchApprovals = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      // Get child name
      const childRes = await fetch(`/api/family/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
      }

      // Get approvals
      const res = await fetch(`/api/family/children/${childId}/approvals?status=${statusFilter}`);
      const data = await res.json();
      
      if (res.ok) {
        setApprovals(data.approvals);
        setCounts(data.counts);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch approvals', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [childId, statusFilter]);

  const handleResponse = async (approved: boolean) => {
    if (!selectedApproval) return;

    setResponding(true);
    try {
      const res = await fetch(`/api/family/children/${childId}/approvals/${selectedApproval.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approved ? 'approved' : 'denied',
          responseNote,
        }),
      });

      if (res.ok) {
        toast({
          title: approved ? 'Request approved' : 'Request denied',
          status: approved ? 'success' : 'info',
        });
        onClose();
        setResponseNote('');
        fetchApprovals();
      } else {
        const data = await res.json();
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to respond', status: 'error' });
    } finally {
      setResponding(false);
    }
  };

  const openResponseModal = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setResponseNote('');
    onOpen();
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case 'image_generation':
        return FiImage;
      case 'external_link':
        return FiLink;
      case 'new_conversation':
        return FiMessageSquare;
      case 'data_export':
        return FiDownload;
      default:
        return FiAlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'approved':
        return 'green';
      case 'denied':
        return 'red';
      case 'expired':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/family">Family</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href={`/family/${childId}`}>{childName}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>Approvals</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <IconButton
                as={NextLink}
                href={`/family/${childId}`}
                icon={<FiArrowLeft />}
                aria-label="Back"
                variant="ghost"
              />
              <VStack align="start" spacing={0}>
                <Heading size="lg">Approval Requests</Heading>
                <Text color={textSecondary}>Review requests from {childName}</Text>
              </VStack>
            </HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchApprovals}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>

          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Pending</StatLabel>
                <StatNumber color="orange.500">{counts.pending || 0}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Approved</StatLabel>
                <StatNumber color="green.500">{counts.approved || 0}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Denied</StatLabel>
                <StatNumber color="red.500">{counts.denied || 0}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Expired</StatLabel>
                <StatNumber color="gray.500">{counts.expired || 0}</StatNumber>
              </Stat>
            </GlassPanel>
          </SimpleGrid>

          {/* Tabs */}
          <Tabs
            colorScheme="blue"
            index={['pending', 'approved', 'denied', 'all'].indexOf(statusFilter)}
            onChange={(idx) => setStatusFilter(['pending', 'approved', 'denied', 'all'][idx])}
          >
            <TabList>
              <Tab>
                Pending
                {(counts.pending || 0) > 0 && (
                  <Badge ml={2} colorScheme="orange">{counts.pending}</Badge>
                )}
              </Tab>
              <Tab>Approved</Tab>
              <Tab>Denied</Tab>
              <Tab>All</Tab>
            </TabList>

            <TabPanels>
              {['pending', 'approved', 'denied', 'all'].map((status) => (
                <TabPanel key={status} px={0}>
                  {loading ? (
                    <Box p={8} textAlign="center">
                      <Spinner size="lg" />
                    </Box>
                  ) : approvals.length === 0 ? (
                    <GlassPanel variant="light" p={8}>
                      <VStack spacing={4}>
                        <Icon as={FiCheckCircle} boxSize={12} color="green.400" />
                        <Heading size="md">No {status === 'all' ? '' : status} requests</Heading>
                        <Text color={textSecondary}>
                          {status === 'pending'
                            ? `${childName} hasn't made any requests that need your approval`
                            : `No ${status} requests to show`}
                        </Text>
                      </VStack>
                    </GlassPanel>
                  ) : (
                    <VStack spacing={4} align="stretch">
                      {approvals.map((approval) => (
                        <GlassPanel key={approval.id} variant="light" p={5}>
                          <HStack justify="space-between" align="start">
                            <HStack spacing={4} align="start">
                              <Icon
                                as={getRequestIcon(approval.requestType)}
                                boxSize={8}
                                color={`${getStatusColor(approval.status)}.500`}
                                mt={1}
                              />
                              <VStack align="start" spacing={1}>
                                <HStack>
                                  <Text fontWeight="bold">
                                    {approval.requestData.title}
                                  </Text>
                                  <Badge colorScheme={getStatusColor(approval.status)}>
                                    {approval.status}
                                  </Badge>
                                  {approval.status === 'pending' && isExpired(approval.expiresAt) && (
                                    <Badge colorScheme="gray">Expired</Badge>
                                  )}
                                </HStack>
                                <Text fontSize="sm" color={textSecondary}>
                                  {approval.requestType.replace('_', ' ')}
                                  {approval.requestData.serviceId && ` • ${approval.requestData.serviceId}`}
                                </Text>
                                {approval.requestData.description && (
                                  <Text fontSize="sm" mt={2}>
                                    {approval.requestData.description}
                                  </Text>
                                )}
                                <HStack spacing={4} mt={2}>
                                  <HStack spacing={1}>
                                    <Icon as={FiClock} color={textSecondary} />
                                    <Text fontSize="xs" color={textSecondary}>
                                      {new Date(approval.createdAt).toLocaleString()}
                                    </Text>
                                  </HStack>
                                  {approval.status === 'pending' && (
                                    <Text fontSize="xs" color={isExpired(approval.expiresAt) ? 'red.500' : textSecondary}>
                                      Expires: {new Date(approval.expiresAt).toLocaleString()}
                                    </Text>
                                  )}
                                </HStack>
                                {approval.responseNote && (
                                  <Alert status={approval.status === 'approved' ? 'success' : 'error'} mt={2} borderRadius="md">
                                    <AlertIcon />
                                    <Text fontSize="sm">{approval.responseNote}</Text>
                                  </Alert>
                                )}
                              </VStack>
                            </HStack>

                            {approval.status === 'pending' && !isExpired(approval.expiresAt) && (
                              <HStack spacing={2}>
                                <Button
                                  size="sm"
                                  colorScheme="green"
                                  leftIcon={<FiCheck />}
                                  onClick={() => openResponseModal(approval)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  colorScheme="red"
                                  variant="outline"
                                  leftIcon={<FiX />}
                                  onClick={() => openResponseModal(approval)}
                                >
                                  Deny
                                </Button>
                              </HStack>
                            )}
                          </HStack>
                        </GlassPanel>
                      ))}
                    </VStack>
                  )}
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>

      {/* Response Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon as={getRequestIcon(selectedApproval?.requestType || '')} />
              <Text>Respond to Request</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold">{selectedApproval?.requestData.title}</Text>
                <Text fontSize="sm" color={textSecondary}>
                  {selectedApproval?.requestType.replace('_', ' ')}
                </Text>
              </Box>

              {selectedApproval?.requestData.description && (
                <Box p={3} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm">{selectedApproval.requestData.description}</Text>
                </Box>
              )}

              <Divider />

              <Textarea
                placeholder="Add a note (optional)"
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={3}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                variant="outline"
                leftIcon={<FiXCircle />}
                onClick={() => handleResponse(false)}
                isLoading={responding}
              >
                Deny
              </Button>
              <Button
                colorScheme="green"
                leftIcon={<FiCheckCircle />}
                onClick={() => handleResponse(true)}
                isLoading={responding}
              >
                Approve
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withParent(ApprovalsPage);
