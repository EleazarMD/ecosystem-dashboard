/**
 * Child Activity Log Page
 * 
 * View detailed activity history for a child account
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  Input,
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
  ModalCloseButton,
  useDisclosure,
  Code,
  Divider,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiFilter,
  FiEye,
  FiMessageSquare,
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';

interface Activity {
  id: string;
  activityType: string;
  serviceId?: string;
  conversationId?: string;
  userMessage?: string;
  aiResponse?: string;
  wasFiltered: boolean;
  filterReason?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface ActivitySummary {
  activityType: string;
  count: number;
  filteredCount: number;
}

function ActivityLogPage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { setActiveTab, setCustomData } = useRightPanel();

  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<ActivitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [canViewConversations, setCanViewConversations] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Filters
  const [activityType, setActivityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Set the right panel to show the "activity" tab and pass child ID
  useEffect(() => {
    if (childId) {
      setActiveTab('activity');
      setCustomData({ selectedChildId: childId });
    }
  }, [childId, setActiveTab, setCustomData]);

  const fetchActivity = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      // Get child name
      const childRes = await fetch(`/api/admin/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
      }

      // Build query params
      const params = new URLSearchParams();
      if (activityType) params.set('activityType', activityType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());
      params.set('includeConversations', 'true');

      const res = await fetch(`/api/admin/children/${childId}/activity?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setActivities(data.activities);
        setTotal(data.total);
        setSummary(data.summary);
        setCanViewConversations(data.canViewConversations);
      } else {
        toast({ title: data.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to fetch activity', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [childId, activityType, startDate, endDate, limit, offset]);

  const viewDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    onOpen();
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'conversation':
        return <Badge colorScheme="blue">Conversation</Badge>;
      case 'blocked_attempt':
        return <Badge colorScheme="red">Blocked</Badge>;
      case 'login':
        return <Badge colorScheme="green">Login</Badge>;
      case 'logout':
        return <Badge colorScheme="gray">Logout</Badge>;
      case 'service_access':
        return <Badge colorScheme="purple">Service Access</Badge>;
      case 'approval_request':
        return <Badge colorScheme="orange">Approval Request</Badge>;
      case 'approval_response':
        return <Badge colorScheme="teal">Approval Response</Badge>;
      default:
        return <Badge>{type.replace('_', ' ')}</Badge>;
    }
  };

  const totalFiltered = summary.reduce((sum, s) => sum + s.filteredCount, 0);
  const totalConversations = summary.find(s => s.activityType === 'conversation')?.count || 0;

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
              <BreadcrumbLink>Activity</BreadcrumbLink>
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
                <Heading size="lg">Activity Log</Heading>
                <Text color={textSecondary}>View {childName}'s activity history</Text>
              </VStack>
            </HStack>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchActivity}
              isLoading={loading}
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>

          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Total Activities</StatLabel>
                <StatNumber>{total}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Conversations</StatLabel>
                <StatNumber>{totalConversations}</StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Blocked Attempts</StatLabel>
                <StatNumber color={totalFiltered > 0 ? 'red.500' : undefined}>
                  {totalFiltered}
                </StatNumber>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Last 7 Days</StatLabel>
                <StatNumber>{summary.reduce((sum, s) => sum + s.count, 0)}</StatNumber>
              </Stat>
            </GlassPanel>
          </SimpleGrid>

          {/* Filters */}
          <GlassPanel variant="light" p={4}>
            <HStack spacing={4} wrap="wrap">
              <HStack>
                <FiFilter />
                <Text fontWeight="medium">Filters:</Text>
              </HStack>
              <Select
                placeholder="All activity types"
                value={activityType}
                onChange={(e) => { setActivityType(e.target.value); setOffset(0); }}
                maxW="200px"
              >
                <option value="conversation">Conversations</option>
                <option value="blocked_attempt">Blocked Attempts</option>
                <option value="login">Logins</option>
                <option value="service_access">Service Access</option>
                <option value="approval_request">Approval Requests</option>
              </Select>
              <Input
                type="date"
                placeholder="Start date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
                maxW="180px"
              />
              <Input
                type="date"
                placeholder="End date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
                maxW="180px"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActivityType('');
                  setStartDate('');
                  setEndDate('');
                  setOffset(0);
                }}
              >
                Clear
              </Button>
            </HStack>
          </GlassPanel>

          {/* Activity Table */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            {loading ? (
              <Box p={8} textAlign="center">
                <Spinner size="lg" />
              </Box>
            ) : activities.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No activity found for the selected filters
              </Alert>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Type</Th>
                    <Th>Service</Th>
                    <Th>Status</Th>
                    <Th>Details</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {activities.map((activity) => (
                    <Tr key={activity.id}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </Text>
                          <Text fontSize="xs" color={textSecondary}>
                            {new Date(activity.createdAt).toLocaleTimeString()}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>{getActivityBadge(activity.activityType)}</Td>
                      <Td>
                        <Text fontSize="sm">{activity.serviceId || '-'}</Text>
                      </Td>
                      <Td>
                        {activity.wasFiltered ? (
                          <HStack color="red.500">
                            <FiAlertTriangle />
                            <Text fontSize="sm">Blocked</Text>
                          </HStack>
                        ) : (
                          <HStack color="green.500">
                            <FiCheckCircle />
                            <Text fontSize="sm">OK</Text>
                          </HStack>
                        )}
                      </Td>
                      <Td>
                        <Text fontSize="sm" noOfLines={1} maxW="200px">
                          {activity.filterReason || 
                           activity.userMessage?.substring(0, 50) || 
                           '-'}
                        </Text>
                      </Td>
                      <Td>
                        <IconButton
                          icon={<FiEye />}
                          aria-label="View details"
                          size="sm"
                          variant="ghost"
                          onClick={() => viewDetails(activity)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </GlassPanel>

          {/* Pagination */}
          {total > limit && (
            <HStack justify="center" spacing={4}>
              <Button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                isDisabled={offset === 0}
              >
                Previous
              </Button>
              <Text color={textSecondary}>
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </Text>
              <Button
                onClick={() => setOffset(offset + limit)}
                isDisabled={offset + limit >= total}
              >
                Next
              </Button>
            </HStack>
          )}
        </VStack>
      </Container>

      {/* Activity Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Activity Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedActivity && (
              <VStack align="stretch" spacing={4}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>Time</Text>
                    <Text fontWeight="medium">
                      {new Date(selectedActivity.createdAt).toLocaleString()}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>Type</Text>
                    {getActivityBadge(selectedActivity.activityType)}
                  </Box>
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>Service</Text>
                    <Text fontWeight="medium">{selectedActivity.serviceId || 'N/A'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color={textSecondary}>Status</Text>
                    {selectedActivity.wasFiltered ? (
                      <Badge colorScheme="red">Blocked</Badge>
                    ) : (
                      <Badge colorScheme="green">Allowed</Badge>
                    )}
                  </Box>
                </SimpleGrid>

                {selectedActivity.filterReason && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontSize="sm" color={textSecondary} mb={1}>Filter Reason</Text>
                      <Alert status="warning" size="sm">
                        <AlertIcon />
                        {selectedActivity.filterReason}
                      </Alert>
                    </Box>
                  </>
                )}

                {canViewConversations && selectedActivity.userMessage && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontSize="sm" color={textSecondary} mb={1}>
                        <HStack><FiMessageSquare /><Text>User Message</Text></HStack>
                      </Text>
                      <Box p={3} bg="gray.50" borderRadius="md">
                        <Text whiteSpace="pre-wrap">{selectedActivity.userMessage}</Text>
                      </Box>
                    </Box>
                  </>
                )}

                {canViewConversations && selectedActivity.aiResponse && (
                  <Box>
                    <Text fontSize="sm" color={textSecondary} mb={1}>AI Response</Text>
                    <Box p={3} bg="blue.50" borderRadius="md">
                      <Text whiteSpace="pre-wrap">{selectedActivity.aiResponse}</Text>
                    </Box>
                  </Box>
                )}

                {!canViewConversations && selectedActivity.activityType === 'conversation' && (
                  <Alert status="info">
                    <AlertIcon />
                    Conversation content viewing is disabled in parental controls
                  </Alert>
                )}

                {Object.keys(selectedActivity.metadata || {}).length > 0 && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontSize="sm" color={textSecondary} mb={1}>Metadata</Text>
                      <Code p={3} display="block" whiteSpace="pre" overflow="auto">
                        {JSON.stringify(selectedActivity.metadata, null, 2)}
                      </Code>
                    </Box>
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default ActivityLogPage;

export { familyAdminRouteGuard as getServerSideProps } from '@/lib/auth/admin-route-guard';
