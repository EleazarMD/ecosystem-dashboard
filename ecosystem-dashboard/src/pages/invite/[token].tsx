/**
 * Invitation Acceptance Page
 * 
 * Allows users to view and accept workspace invitations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Badge,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { FiMail, FiUsers, FiCheck, FiX } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface InvitationDetails {
  email: string;
  role: string;
  tenantName: string;
  tenantSlug: string;
  expiresAt: string;
}

export default function InvitationPage() {
  const router = useRouter();
  const { token } = router.query;
  const { data: session, status: sessionStatus } = useSession();
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();

        if (res.ok) {
          setInvitation(data.invitation);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to load invitation');
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setAccepted(true);
        // Redirect to workspace after a short delay
        setTimeout(() => {
          router.push('/admin/tenants');
        }, 2000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'tenant-admin': return 'Admin';
      case 'tenant-member': return 'Member';
      case 'tenant-viewer': return 'Viewer';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tenant-admin': return 'purple';
      case 'tenant-member': return 'blue';
      case 'tenant-viewer': return 'gray';
      default: return 'gray';
    }
  };

  if (loading || sessionStatus === 'loading') {
    return (
      <Container maxW="md" py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text color="gray.500">Loading invitation...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="md" py={20}>
        <Head>
          <title>Invalid Invitation | AI Homelab</title>
        </Head>
        <GlassPanel p={8}>
          <VStack spacing={6}>
            <Icon as={FiX} boxSize={12} color="red.400" />
            <Heading size="lg" textAlign="center">Invitation Error</Heading>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Home
            </Button>
          </VStack>
        </GlassPanel>
      </Container>
    );
  }

  if (accepted) {
    return (
      <Container maxW="md" py={20}>
        <Head>
          <title>Invitation Accepted | AI Homelab</title>
        </Head>
        <GlassPanel p={8}>
          <VStack spacing={6}>
            <Icon as={FiCheck} boxSize={12} color="green.400" />
            <Heading size="lg" textAlign="center">Welcome!</Heading>
            <Text textAlign="center" color="gray.500">
              You've joined <strong>{invitation?.tenantName}</strong>. Redirecting...
            </Text>
            <Spinner />
          </VStack>
        </GlassPanel>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxW="md" py={20}>
        <Head>
          <title>Sign In Required | AI Homelab</title>
        </Head>
        <GlassPanel p={8}>
          <VStack spacing={6}>
            <Icon as={FiMail} boxSize={12} color="blue.400" />
            <Heading size="lg" textAlign="center">Workspace Invitation</Heading>
            
            {invitation && (
              <VStack spacing={2}>
                <Text textAlign="center">
                  You've been invited to join
                </Text>
                <Heading size="md" color="blue.400">{invitation.tenantName}</Heading>
                <Badge colorScheme={getRoleColor(invitation.role)}>
                  as {getRoleName(invitation.role)}
                </Badge>
              </VStack>
            )}

            <Alert status="info" borderRadius="md">
              <AlertIcon />
              Please sign in to accept this invitation
            </Alert>

            <Button 
              colorScheme="blue" 
              size="lg" 
              onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
            >
              Sign In to Continue
            </Button>
          </VStack>
        </GlassPanel>
      </Container>
    );
  }

  // Check if email matches
  const emailMismatch = invitation && session.user?.email?.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <Container maxW="md" py={20}>
      <Head>
        <title>Join {invitation?.tenantName} | AI Homelab</title>
      </Head>
      <GlassPanel p={8}>
        <VStack spacing={6}>
          <Icon as={FiUsers} boxSize={12} color="purple.400" />
          <Heading size="lg" textAlign="center">Workspace Invitation</Heading>
          
          {invitation && (
            <VStack spacing={4} w="100%">
              <Text textAlign="center" color="gray.500">
                You've been invited to join
              </Text>
              <Heading size="md" color="purple.400">{invitation.tenantName}</Heading>
              
              <HStack spacing={4} justify="center">
                <Badge colorScheme={getRoleColor(invitation.role)} fontSize="sm" px={3} py={1}>
                  {getRoleName(invitation.role)}
                </Badge>
              </HStack>

              <Box w="100%" p={4} bg="whiteAlpha.100" borderRadius="md">
                <VStack spacing={2} align="start">
                  <HStack justify="space-between" w="100%">
                    <Text fontSize="sm" color="gray.500">Invited as:</Text>
                    <Text fontSize="sm">{invitation.email}</Text>
                  </HStack>
                  <HStack justify="space-between" w="100%">
                    <Text fontSize="sm" color="gray.500">Expires:</Text>
                    <Text fontSize="sm">{new Date(invitation.expiresAt).toLocaleDateString()}</Text>
                  </HStack>
                </VStack>
              </Box>

              {emailMismatch && (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Email mismatch</Text>
                    <Text fontSize="sm">
                      This invitation was sent to {invitation.email}, but you're signed in as {session.user?.email}.
                    </Text>
                  </Box>
                </Alert>
              )}
            </VStack>
          )}

          <HStack spacing={4} w="100%">
            <Button 
              variant="outline" 
              flex={1}
              onClick={() => router.push('/')}
            >
              Decline
            </Button>
            <Button 
              colorScheme="purple" 
              flex={1}
              onClick={handleAccept}
              isLoading={accepting}
              isDisabled={emailMismatch}
            >
              Accept Invitation
            </Button>
          </HStack>
        </VStack>
      </GlassPanel>
    </Container>
  );
}
