/**
 * Child Monitoring Page
 * 
 * Detailed activity monitoring and analytics for a specific child
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Icon,
  Badge,
  useToast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import { FiArrowLeft, FiActivity, FiBarChart2, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ActivityFeed from '@/components/family/ActivityFeed';
import UsageCharts from '@/components/family/UsageCharts';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { query } from '@/lib/db';

interface ChildMonitoringProps {
  child: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  flaggedCount: number;
}

export default function ChildMonitoring({ child, flaggedCount }: ChildMonitoringProps) {
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
                  <BreadcrumbItem isCurrentPage>
                    <BreadcrumbLink>{child.name}</BreadcrumbLink>
                  </BreadcrumbItem>
                </Breadcrumb>
                <HStack>
                  <Heading size="lg">{child.name}'s Activity</Heading>
                  {flaggedCount > 0 && (
                    <Badge colorScheme="orange" fontSize="md" px={2} py={1}>
                      {flaggedCount} flagged
                    </Badge>
                  )}
                </HStack>
                <Text color="gray.500">{child.email}</Text>
              </VStack>
              <Button
                leftIcon={<FiArrowLeft />}
                variant="outline"
                onClick={() => router.push('/family')}
              >
                Back to Family Hub
              </Button>
            </HStack>

            {/* Tabs */}
            <Tabs colorScheme="blue" variant="enclosed">
              <TabList>
                <Tab>
                  <HStack>
                    <Icon as={FiActivity} />
                    <Text>Activity Feed</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack>
                    <Icon as={FiBarChart2} />
                    <Text>Analytics</Text>
                  </HStack>
                </Tab>
                <Tab>
                  <HStack>
                    <Icon as={FiClock} />
                    <Text>Usage History</Text>
                  </HStack>
                </Tab>
              </TabList>

              <TabPanels>
                {/* Activity Feed Tab */}
                <TabPanel>
                  <ActivityFeed childId={child.id} />
                </TabPanel>

                {/* Analytics Tab */}
                <TabPanel>
                  <UsageCharts childId={child.id} />
                </TabPanel>

                {/* Usage History Tab */}
                <TabPanel>
                  <Box textAlign="center" py={8}>
                    <Text color="gray.500">Usage history coming soon</Text>
                  </Box>
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

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  const { childId } = context.query;

  if (!childId) {
    return {
      redirect: {
        destination: '/family',
        permanent: false,
      },
    };
  }

  try {
    // Get child details and verify parent access
    const childResult = await query(
      `SELECT id, name, email, avatar_url, parent_user_id
       FROM users
       WHERE id = $1 AND account_type = 'child'`,
      [childId]
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

    // Verify parent access
    if (child.parent_user_id !== user.id && user.platformRole !== 'platform-admin') {
      return {
        redirect: {
          destination: '/family',
          permanent: false,
        },
      };
    }

    // Get flagged count
    const flaggedResult = await query(
      `SELECT COUNT(*) as count
       FROM child_activities
       WHERE child_id = $1
       AND flagged = true
       AND parent_reviewed = false`,
      [childId]
    );

    return {
      props: {
        child: {
          id: child.id,
          name: child.name,
          email: child.email,
          avatarUrl: child.avatar_url,
        },
        flaggedCount: parseInt(flaggedResult.rows[0]?.count || 0),
      },
    };
  } catch (error) {
    console.error('[ChildMonitoring] Error:', error);
    return {
      redirect: {
        destination: '/family',
        permanent: false,
      },
    };
  }
};
