/**
 * Child Learning Teams Page
 *
 * Child-facing page showing their learning teams and shared activities.
 * Accessible at /child/teams.
 */

import React, { useRef } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import ChildTeamView from '@/components/child/ChildTeamView';
import {
  KNOWN_ACTIVITY_IDS,
  useActivityContext,
  createTeamsContextProvider,
} from '@/domains/learning/shared/activity-registry';

function ChildTeamsPageContent() {
  // Register Teams context provider with the Context Hub
  const teamsStateRef = useRef({ childName: '' });
  useActivityContext(KNOWN_ACTIVITY_IDS.TEAMS, () => createTeamsContextProvider(teamsStateRef));
  return (
    <Box p={{ base: 4, md: 6 }} maxW="container.md" mx="auto">
      <VStack spacing={2} align="start" mb={6}>
        <Heading size="lg">My Teams</Heading>
        <Text fontSize="sm" color="gray.500">
          Learn together with your teammates!
        </Text>
      </VStack>
      <ChildTeamView />
    </Box>
  );
}

export default function ChildTeamsPage() {
  return (
    <ChildDashboardLayout pageType="teams">
      <ChildTeamsPageContent />
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
