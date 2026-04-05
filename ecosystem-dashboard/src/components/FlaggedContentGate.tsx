/**
 * Flagged Content Gate Component
 * 
 * Blocks access to flagged book pages and handles parental approval flow
 */

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Spinner,
  Icon,
  useToast,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiLock, FiClock, FiCheck } from 'react-icons/fi';

interface FlaggedContentGateProps {
  bookId: string;
  pageNumber: number;
  onAccessGranted: () => void;
  children: React.ReactNode;
}

interface PageAccessStatus {
  accessible: boolean;
  flagged: boolean;
  approved?: boolean;
  pendingApproval?: boolean;
  requiresApproval?: boolean;
  temporaryApproval?: boolean;
  requestId?: string;
  expiresAt?: string;
  flag?: {
    id: string;
    reason: string;
    severity: string;
    ageRecommendation: number;
    contentExcerpt?: string;
  };
}

export default function FlaggedContentGate({
  bookId,
  pageNumber,
  onAccessGranted,
  children,
}: FlaggedContentGateProps) {
  const [status, setStatus] = useState<PageAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    checkAccess();
    
    // Poll for approval status if pending
    let interval: NodeJS.Timeout;
    if (status?.pendingApproval) {
      interval = setInterval(checkAccess, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [bookId, pageNumber, status?.pendingApproval]);

  const checkAccess = async () => {
    try {
      const response = await fetch(
        `/api/child/check-page-access?bookId=${bookId}&pageNumber=${pageNumber}`
      );
      const data = await response.json();
      setStatus(data);
      
      if (data.accessible) {
        onAccessGranted();
      }
    } catch (error) {
      console.error('Error checking page access:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestApproval = async () => {
    setRequesting(true);
    try {
      const response = await fetch('/api/child/request-page-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, pageNumber }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Request Sent!',
          description: 'Your parent will be notified to approve this page.',
          status: 'success',
          duration: 5000,
        });
        checkAccess(); // Refresh status
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send request',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setRequesting(false);
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

  if (loading) {
    return (
      <Box textAlign="center" py={12}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color="gray.600">Checking page access...</Text>
      </Box>
    );
  }

  // Page is accessible - show content
  if (status?.accessible) {
    return <>{children}</>;
  }

  // Page is flagged and requires approval
  if (status?.flagged) {
    return (
      <Box maxW="600px" mx="auto" py={8}>
        <VStack spacing={6} align="stretch">
          <Alert
            status="warning"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            borderRadius="lg"
            py={8}
          >
            <Icon as={FiLock} boxSize={12} color="orange.500" mb={4} />
            <AlertTitle fontSize="2xl" mb={2}>
              Page Locked
            </AlertTitle>
            <AlertDescription maxW="md">
              This page has been flagged for content that may not be appropriate for your age.
            </AlertDescription>
          </Alert>

          {status.flag && (
            <Box bg="orange.50" p={6} borderRadius="lg" borderWidth={2} borderColor="orange.200">
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Text fontWeight="bold" fontSize="lg">Content Warning</Text>
                  <Badge colorScheme={getSeverityColor(status.flag.severity)} fontSize="md">
                    {status.flag.severity}
                  </Badge>
                </HStack>

                <Text color="gray.700">
                  <strong>Reason:</strong> {status.flag.reason}
                </Text>

                <Text color="gray.600" fontSize="sm">
                  This content is recommended for ages {status.flag.ageRecommendation}+
                </Text>
              </VStack>
            </Box>
          )}

          {status.pendingApproval && (
            <Alert status="info" borderRadius="lg">
              <AlertIcon as={FiClock} />
              <Box flex="1">
                <AlertTitle>Waiting for Parent Approval</AlertTitle>
                <AlertDescription>
                  Your parent has been notified. They'll review this page and decide if you can view it.
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {status.requiresApproval && (
            <VStack spacing={4}>
              <Text color="gray.600" textAlign="center">
                You need permission from your parent to view this page.
              </Text>
              <Button
                colorScheme="blue"
                size="lg"
                leftIcon={<FiAlertTriangle />}
                onClick={requestApproval}
                isLoading={requesting}
                loadingText="Sending Request..."
              >
                Ask Parent for Permission
              </Button>
            </VStack>
          )}

          {status.temporaryApproval && (
            <Alert status="success" borderRadius="lg">
              <AlertIcon as={FiCheck} />
              <Box flex="1">
                <AlertTitle>Temporary Access Granted</AlertTitle>
                <AlertDescription>
                  Your parent has approved this page for now.
                  {status.expiresAt && (
                    <Text fontSize="sm" mt={1}>
                      Access expires: {new Date(status.expiresAt).toLocaleTimeString()}
                    </Text>
                  )}
                </AlertDescription>
              </Box>
            </Alert>
          )}

          <Button
            variant="ghost"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </VStack>
      </Box>
    );
  }

  return null;
}
