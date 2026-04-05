/**
 * Child Approvals Page
 * 
 * Manage parental approval requests for a child account
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  IconButton,
  useToast,
  Spinner,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Icon,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface ApprovalRequest {
  id: string;
  childUserId: string;
  parentUserId: string;
  requestType: string;
  requestData: {
    title: string;
    description: string;
    serviceId?: string;
    details?: Record<string, any>;
  };
  status: string;
  respondedAt?: string;
  responseNote?: string;
  expiresAt: string;
  createdAt: string;
}

interface ApprovalCounts {
  pending: number;
  approved: number;
  denied: number;
  expired: number;
}

function ApprovalsPage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { setActiveTab, setCustomData } = useRightPanel();

  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [counts, setCounts] = useState<ApprovalCounts>({ pending: 0, approved: 0, denied: 0, expired: 0 });
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [responding, setResponding] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  // Set the right panel to show the "approvals" tab and pass child ID
  useEffect(() => {
    if (childId) {
      setActiveTab('approvals');
      setCustomData({ selectedChildId: childId });
    }
  }, [childId, setActiveTab, setCustomData]);

  const fetchApprovals = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      // Get child name
      const childRes = await fetch(`/api/admin/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
      }

      // Get approvals
      const res = await fetch(`/api/admin/children/${childId}/approvals?status=${statusFilter}`);
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

  const handleRespond = async (decision: 'approved' | 'denied') => {
    if (!selectedApproval) return;

    setResponding(true);
    try {
      const res = await fetch(`/api/admin/approvals/${selectedApproval.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          note: responseNote,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: `Request ${decision}`,
          status: decision === 'approved' ? 'success' : 'info',
        });
        onClose();
        setResponseNote('');
        fetchApprovals();
      } else {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge colorScheme="orange"><HStack spacing={1}><FiClock size={12} /><Text>Pending</Text></HStack></Badge>;
      case 'approved':
        return <Badge colorScheme="green"><HStack spacing={1}><FiCheckCircle size={12} /><Text>Approved</Text></HStack></Badge>;
      case 'denied':
        return <Badge colorScheme="red"><HStack spacing={1}><FiXCircle size={12} /><Text>Denied</Text></HStack></Badge>;
      case 'expired':
        return <Badge colorScheme="gray"><HStack spacing={1}><FiAlertCircle size={12} /><Text>Expired</Text></HStack></Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'service_access':
        return <Badge colorScheme="purple">Service Access</Badge>;
      case 'image_generation':
        return <Badge colorScheme="blue">Image Generation</Badge>;
      case 'data_export':
        return <Badge colorScheme="teal">Data Export</Badge>;
      case 'conversation':
        return <Badge colorScheme="cyan">Conversation</Badge>;
      case 'settings_change':
        return <Badge colorScheme="yellow">Settings Change</Badge>;
      default:
        return <Badge>{type.replace('_', ' ')}</Badge>;
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
              <BreadcrumbLink as={NextLink} href="/admin">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/admin/family">Family</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href={`/admin/family/${childId}`}>{childName}</BreadcrumbLink>
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
                href={`/admin/family/${childId}`}
                icon={<FiArrowLeft />}
                aria-label="Back"
                variant="ghost"
              />
              <VStack align="start" spacing={0}>
                <Heading size="lg">Approval Requests</Heading>
                <Text color={textSecondary}>Review {childName}'s permission requests</Text>
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

          {/* Counts Summary */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <GlassPanel
              variant="light"
              p={4}
              cursor="pointer"
              onClick={() => setStatusFilter('pending')}
              borderWidth={statusFilter === 'pending' ? 2 : 0}
              borderColor="orange.500"
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color={textSecondary}>Pending</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    {counts.pending || 0}
                  </Text>
                </VStack>
                <Icon as={FiClock} boxSize={6} color="orange.500" />
              </HStack>
            </GlassPanel>

            <GlassPanel
              variant="light"
              p={4}
              cursor="pointer"
              onClick={() => setStatusFilter('approved')}
              borderWidth={statusFilter === 'approved' ? 2 : 0}
              borderColor="green.500"
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color={textSecondary}>Approved</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {counts.approved || 0}
                  </Text>
                </VStack>
                <Icon as={FiCheckCircle} boxSize={6} color="green.500" />
              </HStack>
            </GlassPanel>

            <GlassPanel
              variant="light"
              p={4}
              cursor="pointer"
              onClick={() => setStatusFilter('denied')}
              borderWidth={statusFilter === 'denied' ? 2 : 0}
              borderColor="red.500"
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color={textSecondary}>Denied</Text>
                  <Text fontSize="2xl" fontWeight="bold" color="red.500">
                    {counts.denied || 0}
                  </Text>
                </VStack>
                <Icon as={FiXCircle} boxSize={6} color="red.500" />
              </HStack>
            </GlassPanel>

            <GlassPanel
              variant="light"
              p={4}
              cursor="pointer"
              onClick={() => setStatusFilter('all')}
              borderWidth={statusFilter === 'all' ? 2 : 0}
              borderColor="gray.500"
            >
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" color={textSecondary}>All</Text>
                  <Text fontSize="2xl" fontWeight="bold">
                    {(counts.pending || 0) + (counts.approved || 0) + (counts.denied || 0) + (counts.expired || 0)}
                  </Text>
                </VStack>
                <Icon as={FiAlertCircle} boxSize={6} color="gray.500" />
              </HStack>
            </GlassPanel>
          </SimpleGrid>

          {/* Approvals List */}
          {loading ? (
            <Box p={8} textAlign="center">
              <Spinner size="lg" />
            </Box>
          ) : approvals.length === 0 ? (
            <GlassPanel variant="light" p={8}>
              <VStack spacing={4}>
                <Icon as={FiCheckCircle} boxSize={12} color="green.400" />
                <Heading size="md">No {statusFilter !== 'all' ? statusFilter : ''} requests</Heading>
                <Text color={textSecondary}>
                  {statusFilter === 'pending' 
                    ? `${childName} has no pending approval requests`
                    : `No ${statusFilter} requests found`}
                </Text>
              </VStack>
            </GlassPanel>
          ) : (
            <VStack spacing={4} align="stretch">
              {approvals.map((approval) => (
                <GlassPanel key={approval.id} variant="light" p={5}>
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={2} flex={1}>
                      <HStack spacing={3}>
                        {getRequestTypeBadge(approval.requestType)}
                        {getStatusBadge(approval.status)}
                        {approval.status === 'pending' && isExpired(approval.expiresAt) && (
                          <Badge colorScheme="gray">Expired</Badge>
                        )}
                      </HStack>
                      <Heading size="sm">{approval.requestData.title}</Heading>
                      <Text color={textSecondary}>{approval.requestData.description}</Text>
                      {approval.requestData.serviceId && (
                        <Text fontSize="sm">
                          <strong>Service:</strong> {approval.requestData.serviceId}
                        </Text>
                      )}
                      <HStack spacing={4} fontSize="sm" color={textSecondary}>
                        <Text>Requested: {new Date(approval.createdAt).toLocaleString()}</Text>
                        {approval.status === 'pending' && (
                          <Text>Expires: {new Date(approval.expiresAt).toLocaleString()}</Text>
                        )}
                        {approval.respondedAt && (
                          <Text>Responded: {new Date(approval.respondedAt).toLocaleString()}</Text>
                        )}
                      </HStack>
                      {approval.responseNote && (
                        <Box mt={2} p={2} bg="gray.50" borderRadius="md" w="full">
                          <Text fontSize="sm"><strong>Note:</strong> {approval.responseNote}</Text>
                        </Box>
                      )}
                    </VStack>

                    {approval.status === 'pending' && !isExpired(approval.expiresAt) && (
                      <HStack spacing={2}>
                        <Button
                          leftIcon={<FiCheck />}
                          colorScheme="green"
                          size="sm"
                          onClick={() => openResponseModal(approval)}
                        >
                          Approve
                        </Button>
                        <Button
                          leftIcon={<FiX />}
                          colorScheme="red"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApproval(approval);
                            handleRespond('denied');
                          }}
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
        </VStack>
      </Container>

      {/* Response Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Approve Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedApproval && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="medium">{selectedApproval.requestData.title}</Text>
                  <Text color={textSecondary} fontSize="sm">
                    {selectedApproval.requestData.description}
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Text mb={2} fontWeight="medium">Add a note (optional)</Text>
                  <Textarea
                    placeholder="e.g., Approved for homework project only"
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              mr={3}
              onClick={() => handleRespond('denied')}
              isLoading={responding}
            >
              Deny
            </Button>
            <Button
              colorScheme="green"
              onClick={() => handleRespond('approved')}
              isLoading={responding}
            >
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default ApprovalsPage;

export { familyAdminRouteGuard as getServerSideProps } from '@/lib/auth/admin-route-guard';
