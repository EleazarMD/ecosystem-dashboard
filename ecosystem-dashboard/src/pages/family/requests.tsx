/**
 * Family Requests Page
 * 
 * Parent view of all pending service requests from children
 */

import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Icon,
} from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PendingRequests from '@/components/family/PendingRequests';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function FamilyRequests() {
  const router = useRouter();
  const bg = useSemanticToken('surface.base');

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh" py={8}>
        <Container maxW="container.md">
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Heading size="lg">Pending Requests</Heading>
                <Text color="gray.500">
                  Review service access requests from your children
                </Text>
              </VStack>
              <Button
                leftIcon={<FiArrowLeft />}
                variant="outline"
                onClick={() => router.push('/family')}
              >
                Back
              </Button>
            </HStack>

            {/* Requests */}
            <PendingRequests />
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

  // Only parents can view this page
  if (!user.isParent && user.platformRole !== 'platform-admin') {
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
