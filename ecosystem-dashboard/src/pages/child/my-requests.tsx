/**
 * My Requests Page
 * 
 * Children can view their service access requests
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Icon,
  Spinner,
  Button,
} from '@chakra-ui/react';
import { FiClock, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ServiceRequest {
  id: string;
  serviceName: string;
  reason: string;
  status: string;
  requestedAt: string;
  reviewedAt?: string;
  expiresAt?: string;
  notes?: string;
  parentName: string;
}

export default function MyRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const bg = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests/list');
      
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'denied': return 'red';
      case 'expired': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return FiClock;
      case 'approved': return FiCheck;
      case 'denied': return FiX;
      default: return FiClock;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh" py={8}>
        <Container maxW="container.md">
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Heading size="lg">My Requests</Heading>
                <Text color="gray.500">
                  Service access requests you've sent to your parent
                </Text>
              </VStack>
              <Button
                leftIcon={<FiRefreshCw />}
                size="sm"
                variant="outline"
                onClick={fetchRequests}
              >
                Refresh
              </Button>
            </HStack>

            {/* Requests List */}
            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4} color="gray.500">Loading your requests...</Text>
              </Box>
            ) : requests.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">You haven't made any requests yet</Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  When you try to access a blocked service, you can ask your parent for permission
                </Text>
              </Box>
            ) : (
              <VStack spacing={3} align="stretch">
                {requests.map((request) => (
                  <Box
                    key={request.id}
                    bg={cardBg}
                    p={4}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={`${getStatusColor(request.status)}.200`}
                  >
                    <VStack align="stretch" spacing={3}>
                      {/* Header */}
                      <HStack justify="space-between">
                        <Text fontWeight="bold" textTransform="capitalize">
                          {request.serviceName.replace(/-/g, ' ')}
                        </Text>
                        <Badge
                          colorScheme={getStatusColor(request.status)}
                          fontSize="sm"
                          px={2}
                          py={1}
                        >
                          <HStack spacing={1}>
                            <Icon as={getStatusIcon(request.status)} />
                            <Text>{request.status}</Text>
                          </HStack>
                        </Badge>
                      </HStack>

                      {/* Your Reason */}
                      {request.reason && (
                        <Box>
                          <Text fontSize="sm" color="gray.500" mb={1}>
                            Your reason:
                          </Text>
                          <Text fontSize="sm">{request.reason}</Text>
                        </Box>
                      )}

                      {/* Parent's Response */}
                      {request.notes && (
                        <Box bg="blue.50" p={3} borderRadius="md">
                          <Text fontSize="sm" color="gray.500" mb={1}>
                            {request.parentName}'s response:
                          </Text>
                          <Text fontSize="sm" color="blue.700">
                            {request.notes}
                          </Text>
                        </Box>
                      )}

                      {/* Expiration */}
                      {request.status === 'approved' && request.expiresAt && (
                        <HStack fontSize="sm" color="gray.500">
                          <Icon as={FiClock} />
                          <Text>
                            Expires: {formatDate(request.expiresAt)}
                          </Text>
                        </HStack>
                      )}

                      {/* Timestamps */}
                      <HStack justify="space-between" fontSize="xs" color="gray.400">
                        <Text>Requested: {formatDate(request.requestedAt)}</Text>
                        {request.reviewedAt && (
                          <Text>Reviewed: {formatDate(request.reviewedAt)}</Text>
                        )}
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const user = session.user as any;

  // Only child accounts can view this page
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
