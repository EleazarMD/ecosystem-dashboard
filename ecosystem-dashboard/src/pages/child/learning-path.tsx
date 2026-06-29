/**
 * Child Learning Path Page
 *
 * Child-facing page showing their individualized learning path.
 * Accessible at /child/learning-path.
 */

import React from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import ChildLearningPath from '@/components/child/ChildLearningPath';
import { SkillMap } from '@/components/child/learning-kit';

function ChildLearningPathPageContent({ childId }: { childId: string }) {
  // The live Context Hub provider for this surface is registered inside
  // <ChildLearningPath/>, where the actual path + current-step state lives.
  return (
    <Box p={{ base: 4, md: 6 }} maxW="container.md" mx="auto">
      <VStack spacing={2} align="start" mb={6}>
        <Heading size="lg">My Learning Path</Heading>
        <Text fontSize="sm" color="gray.500">
          Your personalized learning adventure!
        </Text>
      </VStack>
      <ChildLearningPath childId={childId} />

      {/* Narrative Skill-Map — island world map showing mastery across domains */}
      <Box mt={8}>
        <SkillMap childId={childId} />
      </Box>
    </Box>
  );
}

export default function ChildLearningPathPage({ childId }: { childId: string }) {
  return (
    <ChildDashboardLayout pageType="learning-path">
      <ChildLearningPathPageContent childId={childId} />
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

  return { props: { childId: user.id } };
};
