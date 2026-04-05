/**
 * Family Invitation Acceptance Page
 * 
 * Allows users to accept family invitations via token link
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Spinner,
  Alert,
  AlertIcon,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
} from '@chakra-ui/react';
import { FiUsers, FiCheck, FiX, FiLogIn, FiUserPlus } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface InvitationDetails {
  id: string;
  email: string;
  roleId: string;
  tenantName: string;
  invitedByName: string;
  expiresAt: string;
  status: string;
}

export default function FamilyInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { data: session, status: sessionStatus } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const res = await fetch(`/api/family/invite/verify?token=${token}`);
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
  };

  const handleAccept = async () => {
    if (!session?.user) {
      // Redirect to sign in, then back here
      signIn(undefined, { callbackUrl: `/invite/family/${token}` });
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch('/api/family/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/family');
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

  const handleDecline = async () => {
    router.push('/');
  };

  if (loading) {
    return (
      <Container maxW="container.sm" py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text color={textSecondary}>Loading invitation...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.sm" py={20}>
        <GlassPanel variant="light" p={8}>
          <VStack spacing={6}>
            <Icon as={FiX} boxSize={16} color="red.500" />
            <Heading size="lg">Invalid Invitation</Heading>
            <Text color={textSecondary} textAlign="center">{error}</Text>
            <Button onClick={() => router.push('/')} colorScheme="blue">
              Go Home
            </Button>
          </VStack>
        </GlassPanel>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxW="container.sm" py={20}>
        <GlassPanel variant="light" p={8}>
          <VStack spacing={6}>
            <Icon as={FiCheck} boxSize={16} color="green.500" />
            <Heading size="lg">Welcome to the Family!</Heading>
            <Text color={textSecondary} textAlign="center">
              You've joined {invitation?.tenantName}. Redirecting to your family dashboard...
            </Text>
            <Spinner />
          </VStack>
        </GlassPanel>
      </Container>
    );
  }

  return (
    <Container maxW="container.sm" py={20}>
      <GlassPanel variant="light" p={8}>
        <VStack spacing={6} align="stretch">
          <VStack spacing={2} textAlign="center">
            <Icon as={FiUsers} boxSize={12} color="purple.500" />
            <Heading size="lg">Family Invitation</Heading>
            <Text color={textSecondary}>
              You've been invited to join a family
            </Text>
          </VStack>

          <Divider />

          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="medium">Family:</Text>
              <Text color="purple.500" fontWeight="bold">{invitation?.tenantName}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontWeight="medium">Invited by:</Text>
              <Text>{invitation?.invitedByName}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontWeight="medium">Your role:</Text>
              <Text>{invitation?.roleId === 'family-organizer' ? 'Family Organizer' : 'Family Adult'}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontWeight="medium">Expires:</Text>
              <Text color={textSecondary}>
                {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'Never'}
              </Text>
            </HStack>
          </VStack>

          <Divider />

          {sessionStatus === 'loading' ? (
            <Spinner />
          ) : session?.user ? (
            <VStack spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  Signed in as <strong>{(session.user as any).email}</strong>
                </Text>
              </Alert>
              <HStack spacing={4} w="full">
                <Button
                  flex={1}
                  variant="outline"
                  leftIcon={<FiX />}
                  onClick={handleDecline}
                >
                  Decline
                </Button>
                <Button
                  flex={1}
                  colorScheme="purple"
                  leftIcon={<FiCheck />}
                  onClick={handleAccept}
                  isLoading={accepting}
                >
                  Accept & Join
                </Button>
              </HStack>
            </VStack>
          ) : (
            <VStack spacing={4}>
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">
                  You need to sign in or create an account to accept this invitation.
                </Text>
              </Alert>
              <HStack spacing={4} w="full">
                <Button
                  flex={1}
                  colorScheme="blue"
                  leftIcon={<FiLogIn />}
                  onClick={() => signIn(undefined, { callbackUrl: `/invite/family/${token}` })}
                >
                  Sign In
                </Button>
                <Button
                  flex={1}
                  colorScheme="purple"
                  variant="outline"
                  leftIcon={<FiUserPlus />}
                  onClick={() => router.push(`/register?invite=${token}`)}
                >
                  Create Account
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      </GlassPanel>
    </Container>
  );
}
