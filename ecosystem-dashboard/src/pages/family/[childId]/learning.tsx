/**
 * Child Learning Insights Page
 * 
 * Parent view of child's PIC-powered learning progress and wellness.
 * Shows aggregated insights while protecting child privacy.
 */

import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
} from '@chakra-ui/react';
import { FiArrowLeft, FiTrendingUp, FiShield, FiTarget } from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PICInsightsDashboard from '@/components/family/PICInsightsDashboard';
import AISafetyDashboard from '@/components/family/AISafetyDashboard';
import SkillProgressDashboard from '@/components/family/SkillProgressDashboard';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { query } from '@/lib/db';

interface LearningPageProps {
  child: {
    id: string;
    name: string;
    email: string;
  };
  childProfileId: string;
}

export default function ChildLearningPage({ child, childProfileId }: LearningPageProps) {
  const router = useRouter();
  const bg = useSemanticToken('surface.base');

  return (
    <DashboardLayout>
      <Box bg={bg} minH="100vh" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Breadcrumb fontSize="sm">
                  <BreadcrumbItem>
                    <BreadcrumbLink as={NextLink} href="/family">
                      Family Hub
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem>
                    <BreadcrumbLink as={NextLink} href={`/family/${child.id}`}>
                      {child.name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbItem isCurrentPage>
                    <BreadcrumbLink>Learning Insights</BreadcrumbLink>
                  </BreadcrumbItem>
                </Breadcrumb>
                <Heading size="lg">Learning Insights</Heading>
                <Text color="gray.500">
                  Privacy-first view of {child.name}'s learning journey
                </Text>
              </VStack>
              <Button
                leftIcon={<FiArrowLeft />}
                variant="outline"
                onClick={() => router.push(`/family/${child.id}`)}
              >
                Back to {child.name}
              </Button>
            </HStack>

            {/* Tabbed Dashboard */}
            <Tabs colorScheme="purple" variant="enclosed">
              <TabList>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiTrendingUp} />
                    <Text>Learning Progress</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiTarget} />
                    <Text>Skill Progress</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack spacing={2}>
                    <Icon as={FiShield} />
                    <Text>AI Safety</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  <PICInsightsDashboard 
                    childId={childProfileId} 
                    childName={child.name}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  <SkillProgressDashboard 
                    childId={childProfileId} 
                    childName={child.name}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  <AISafetyDashboard 
                    childId={childProfileId} 
                    childName={child.name}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const { childId } = context.params as { childId: string };

  // Verify parent-child relationship and get child info
  const childResult = await query(
    `SELECT u.id, u.name, u.email, cp.id as profile_id
     FROM users u
     LEFT JOIN child_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1 AND u.parent_user_id = $2`,
    [childId, session.user.id]
  );

  if (childResult.rows.length === 0) {
    return {
      redirect: {
        destination: '/family',
        permanent: false,
      },
    };
  }

  const child = childResult.rows[0];

  // If no profile exists yet, create one
  let profileId = child.profile_id;
  if (!profileId) {
    const createResult = await query(
      `INSERT INTO child_profiles (user_id, display_name, age_group)
       VALUES ($1, $2, 'middle')
       RETURNING id`,
      [childId, child.name]
    );
    profileId = createResult.rows[0].id;
  }

  return {
    props: {
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
      },
      childProfileId: profileId,
    },
  };
};
