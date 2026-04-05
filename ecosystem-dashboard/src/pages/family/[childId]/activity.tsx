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
  SimpleGrid,
  Button,
  IconButton,
  useToast,
  Spinner,
  Select,
  Input,
  Badge,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiFilter,
  FiEye,
  FiAlertTriangle,
  FiCheckCircle,
  FiMessageSquare,
  FiSearch,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withParent } from '@/lib/auth/withParent';

interface Activity {
  id: string;
  activityType: string;
  serviceId?: string;
  conversationId?: string;
  userMessage?: string;
  aiResponse?: string;
  wasFiltered: boolean;
  filterReason?: string;
  metadata?: any;
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

  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summary, setSummary] = useState<ActivitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [canViewConversations, setCanViewConversations] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Filters
  const [activityType, setActivityType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  const fetchActivity = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      // Get child name
      const childRes = await fetch(`/api/family/children/${childId}`);
      const childData = await childRes.json();
      if (childRes.ok) {
        setChildName(childData.child.name);
      }

      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
        includeConversations: 'true',
      });
      if (activityType !== 'all') params.set('activityType', activityType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/family/children/${childId}/activity?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setActivities(data.activities);
        setSummary(data.summary);
        setTotal(data.total);
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
  }, [childId, activityType, startDate, endDate, page]);

  const viewActivityDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    onOpen();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation':
      case 'message':
        return FiMessageSquare;
      case 'blocked_attempt':
        return FiAlertTriangle;
      case 'search':
        return FiSearch;
      default:
        return FiCheckCircle;
    }
  };

  const getActivityColor = (type: string, wasFiltered: boolean) => {
    if (wasFiltered) return 'red';
    switch (type) {
      case 'blocked_attempt':
        return 'red';
      case 'conversation':
        return 'blue';
      default:
        return 'gray';
    }
  };

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
              <BreadcrumbLink>Activity</BreadcrumbLink>
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
            {summary.map((item) => (
              <GlassPanel key={item.activityType} variant="light" p={4}>
                <Stat size="sm">
                  <StatLabel textTransform="capitalize">
                    {item.activityType.replace('_', ' ')}
                  </StatLabel>
                  <StatNumber>{item.count}</StatNumber>
                  {item.filteredCount > 0 && (
                    <Badge colorScheme="red" fontSize="xs">
                      {item.filteredCount} filtered
                    </Badge>
                  )}
                </Stat>
              </GlassPanel>
            ))}
          </SimpleGrid>

          {/* Filters */}
          <GlassPanel variant="light" p={4}>
            <HStack spacing={4} wrap="wrap">
              <HStack>
                <Icon as={FiFilter} />
                <Text fontWeight="medium">Filters:</Text>
              </HStack>
              <Select
                value={activityType}
                onChange={(e) => { setActivityType(e.target.value); setPage(0); }}
                w="200px"
              >
                <option value="all">All Activity</option>
                <option value="conversation">Conversations</option>
                <option value="message">Messages</option>
                <option value="blocked_attempt">Blocked Attempts</option>
                <option value="login">Logins</option>
                <option value="service_access">Service Access</option>
              </Select>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                w="160px"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                w="160px"
                placeholder="End date"
              />
              {(activityType !== 'all' || startDate || endDate) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActivityType('all');
                    setStartDate('');
                    setEndDate('');
                    setPage(0);
                  }}
                >
                  Clear
                </Button>
              )}
            </HStack>
          </GlassPanel>

          {/* Activity Table */}
          <GlassPanel variant="light" p={0} overflow="hidden">
            {loading ? (
              <Box p={8} textAlign="center">
                <Spinner size="lg" />
              </Box>
            ) : activities.length === 0 ? (
              <Box p={8} textAlign="center">
                <Icon as={FiSearch} boxSize={8} color="gray.400" mb={4} />
                <Text color={textSecondary}>No activity found</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Type</Th>
                    <Th>Service</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
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
                      <Td>
                        <HStack>
                          <Icon
                            as={getActivityIcon(activity.activityType)}
                            color={`${getActivityColor(activity.activityType, activity.wasFiltered)}.500`}
                          />
                          <Badge
                            colorScheme={getActivityColor(activity.activityType, activity.wasFiltered)}
                            variant="subtle"
                          >
                            {activity.activityType.replace('_', ' ')}
                          </Badge>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{activity.serviceId || '-'}</Text>
                      </Td>
                      <Td>
                        {activity.wasFiltered ? (
                          <Badge colorScheme="red">Filtered</Badge>
                        ) : (
                          <Badge colorScheme="green">OK</Badge>
                        )}
                      </Td>
                      <Td>
                        {canViewConversations && (activity.userMessage || activity.aiResponse) && (
                          <IconButton
                            icon={<FiEye />}
                            aria-label="View details"
                            size="sm"
                            variant="ghost"
                            onClick={() => viewActivityDetails(activity)}
                          />
                        )}
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
                onClick={() => setPage(p => Math.max(0, p - 1))}
                isDisabled={page === 0}
                variant="outline"
              >
                Previous
              </Button>
              <Text color={textSecondary}>
                Page {page + 1} of {Math.ceil(total / limit)}
              </Text>
              <Button
                onClick={() => setPage(p => p + 1)}
                isDisabled={(page + 1) * limit >= total}
                variant="outline"
              >
                Next
              </Button>
            </HStack>
          )}
        </VStack>
      </Container>

      {/* Activity Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <Icon
                as={getActivityIcon(selectedActivity?.activityType || '')}
                color={`${getActivityColor(selectedActivity?.activityType || '', selectedActivity?.wasFiltered || false)}.500`}
              />
              <Text textTransform="capitalize">
                {selectedActivity?.activityType.replace('_', ' ')}
              </Text>
              {selectedActivity?.wasFiltered && (
                <Badge colorScheme="red">Filtered</Badge>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Text color={textSecondary}>Time</Text>
                <Text>{selectedActivity && new Date(selectedActivity.createdAt).toLocaleString()}</Text>
              </HStack>
              
              {selectedActivity?.serviceId && (
                <HStack justify="space-between">
                  <Text color={textSecondary}>Service</Text>
                  <Text>{selectedActivity.serviceId}</Text>
                </HStack>
              )}

              {selectedActivity?.filterReason && (
                <>
                  <Divider />
                  <Box>
                    <Text color={textSecondary} mb={2}>Filter Reason</Text>
                    <Badge colorScheme="red">{selectedActivity.filterReason}</Badge>
                  </Box>
                </>
              )}

              {selectedActivity?.userMessage && (
                <>
                  <Divider />
                  <Box>
                    <Text color={textSecondary} mb={2}>User Message</Text>
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text whiteSpace="pre-wrap">{selectedActivity.userMessage}</Text>
                    </Box>
                  </Box>
                </>
              )}

              {selectedActivity?.aiResponse && (
                <Box>
                  <Text color={textSecondary} mb={2}>AI Response</Text>
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <Text whiteSpace="pre-wrap">{selectedActivity.aiResponse}</Text>
                  </Box>
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withParent(ActivityLogPage);
