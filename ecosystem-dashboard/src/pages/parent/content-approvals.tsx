/**
 * Parent Content Approval Dashboard
 * 
 * Review flagged content and approve/deny child access to book pages
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Card,
  CardBody,
  Image,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiCheck, FiX, FiClock, FiBook } from 'react-icons/fi';
import DashboardLayout from '@/components/DashboardLayout';

interface ContentFlag {
  id: string;
  book_id: string;
  book_title: string;
  book_cover: string;
  child_name: string;
  child_age: number;
  page_number: number;
  content_excerpt: string;
  flag_reason: string;
  severity: 'mild' | 'moderate' | 'severe';
  age_recommendation: number;
  status: string;
  created_at: string;
}

interface ApprovalRequest {
  id: string;
  book_title: string;
  book_cover: string;
  child_name: string;
  page_number: number;
  content_excerpt: string;
  flag_reason: string;
  severity: string;
  expires_at: string;
  created_at: string;
}

export default function ContentApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchData();
      // Poll for new requests every 10 seconds
      const interval = setInterval(fetchRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [status, router]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchFlags(), fetchRequests()]);
    setLoading(false);
  };

  const fetchFlags = async () => {
    try {
      const response = await fetch('/api/parent/content-flags');
      const data = await response.json();
      if (data.success) {
        setFlags(data.flags);
      }
    } catch (error) {
      console.error('Error fetching flags:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/parent/approval-requests');
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleApproval = async (requestId: string, action: 'approve' | 'deny') => {
    setProcessing(requestId);
    try {
      const response = await fetch('/api/parent/approval-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: action === 'approve' ? 'Access Approved' : 'Access Denied',
          description: `You have ${action}d the content access request.`,
          status: 'success',
          duration: 3000,
        });
        fetchRequests();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process request',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setProcessing(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'red';
      case 'moderate': return 'orange';
      case 'mild': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'green';
      case 'denied': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <Flex justify="center" align="center" minH="400px">
            <Spinner size="xl" color="blue.500" />
          </Flex>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="lg" mb={2}>Content Safety & Approvals</Heading>
            <Text color="gray.600">
              Review flagged content and manage access requests from your children
            </Text>
          </Box>

          {requests.length > 0 && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Box flex="1">
                <AlertTitle>Pending Approval Requests</AlertTitle>
                <AlertDescription>
                  You have {requests.length} pending request{requests.length !== 1 ? 's' : ''} waiting for your review
                </AlertDescription>
              </Box>
            </Alert>
          )}

          <Tabs colorScheme="blue">
            <TabList>
              <Tab>
                <HStack>
                  <Icon as={FiClock} />
                  <Text>Pending Requests ({requests.length})</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack>
                  <Icon as={FiAlertTriangle} />
                  <Text>All Flagged Content ({flags.length})</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Pending Requests Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {requests.length === 0 ? (
                    <Card>
                      <CardBody>
                        <Text color="gray.500" textAlign="center" py={8}>
                          No pending approval requests
                        </Text>
                      </CardBody>
                    </Card>
                  ) : (
                    requests.map((request) => (
                      <Card key={request.id} borderWidth={2} borderColor="orange.200">
                        <CardBody>
                          <HStack spacing={4} align="start">
                            {request.book_cover && (
                              <Image
                                src={request.book_cover}
                                alt={request.book_title}
                                boxSize="100px"
                                objectFit="cover"
                                borderRadius="md"
                              />
                            )}
                            <VStack flex={1} align="stretch" spacing={3}>
                              <HStack justify="space-between">
                                <VStack align="start" spacing={1}>
                                  <Heading size="md">{request.book_title}</Heading>
                                  <Text fontSize="sm" color="gray.600">
                                    Page {request.page_number} • {request.child_name} wants to view this page
                                  </Text>
                                </VStack>
                                <Badge colorScheme={getSeverityColor(request.severity)} fontSize="md">
                                  {request.severity}
                                </Badge>
                              </HStack>

                              <Box bg="red.50" p={3} borderRadius="md" borderLeft="4px" borderColor="red.400">
                                <Text fontWeight="bold" fontSize="sm" color="red.700" mb={1}>
                                  Flagged Content:
                                </Text>
                                <Text fontSize="sm" color="red.600">
                                  {request.flag_reason}
                                </Text>
                              </Box>

                              {request.content_excerpt && (
                                <Box bg="gray.50" p={3} borderRadius="md">
                                  <Text fontSize="sm" color="gray.700" noOfLines={3}>
                                    {request.content_excerpt}
                                  </Text>
                                </Box>
                              )}

                              <HStack justify="space-between">
                                <Text fontSize="xs" color="gray.500">
                                  Expires: {new Date(request.expires_at).toLocaleString()}
                                </Text>
                                <HStack>
                                  <Button
                                    leftIcon={<FiX />}
                                    colorScheme="red"
                                    size="sm"
                                    onClick={() => handleApproval(request.id, 'deny')}
                                    isLoading={processing === request.id}
                                  >
                                    Deny
                                  </Button>
                                  <Button
                                    leftIcon={<FiCheck />}
                                    colorScheme="green"
                                    size="sm"
                                    onClick={() => handleApproval(request.id, 'approve')}
                                    isLoading={processing === request.id}
                                  >
                                    Approve
                                  </Button>
                                </HStack>
                              </HStack>
                            </VStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </TabPanel>

              {/* All Flagged Content Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {flags.length === 0 ? (
                    <Card>
                      <CardBody>
                        <Text color="gray.500" textAlign="center" py={8}>
                          No flagged content
                        </Text>
                      </CardBody>
                    </Card>
                  ) : (
                    flags.map((flag) => (
                      <Card key={flag.id}>
                        <CardBody>
                          <HStack spacing={4} align="start">
                            {flag.book_cover && (
                              <Image
                                src={flag.book_cover}
                                alt={flag.book_title}
                                boxSize="80px"
                                objectFit="cover"
                                borderRadius="md"
                              />
                            )}
                            <VStack flex={1} align="stretch" spacing={2}>
                              <HStack justify="space-between">
                                <VStack align="start" spacing={0}>
                                  <Heading size="sm">{flag.book_title}</Heading>
                                  <Text fontSize="xs" color="gray.600">
                                    Page {flag.page_number} • {flag.child_name} (age {flag.child_age})
                                  </Text>
                                </VStack>
                                <HStack>
                                  <Badge colorScheme={getSeverityColor(flag.severity)}>
                                    {flag.severity}
                                  </Badge>
                                  <Badge colorScheme={getStatusColor(flag.status)}>
                                    {flag.status}
                                  </Badge>
                                </HStack>
                              </HStack>

                              <Text fontSize="sm" color="gray.700">
                                <strong>Reason:</strong> {flag.flag_reason}
                              </Text>

                              <Text fontSize="sm" color="gray.600">
                                <strong>Recommended Age:</strong> {flag.age_recommendation}+
                              </Text>

                              {flag.content_excerpt && (
                                <Box bg="gray.50" p={2} borderRadius="md">
                                  <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                    {flag.content_excerpt}
                                  </Text>
                                </Box>
                              )}

                              <Text fontSize="xs" color="gray.500">
                                Flagged: {new Date(flag.created_at).toLocaleString()}
                              </Text>
                            </VStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export async function getServerSideProps(context: any) {
  const session = await useSession(context.req, context.res);
  
  if (!session || !session.user) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  const accountType = (session.user as any).accountType;
  if (accountType === 'child') {
    return {
      redirect: {
        destination: '/child',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
