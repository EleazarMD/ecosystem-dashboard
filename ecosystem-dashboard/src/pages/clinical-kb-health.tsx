import React from 'react';
import dynamic from 'next/dynamic';
import { Box, Spinner, VStack, Text } from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ClinicalKBHealthDashboard = dynamic(
  () => import('@/components/clinical-kb/ClinicalKBHealthDashboard'),
  {
    ssr: false,
    loading: () => (
      <VStack h="full" justify="center" align="center" p={8}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text color="gray.500">Loading Clinical KB Health Dashboard...</Text>
      </VStack>
    ),
  }
);

export default function ClinicalKBHealthPage() {
  return (
    <DashboardLayout>
      <Box minH="100vh" bg="gray.50">
        <ClinicalKBHealthDashboard />
      </Box>
    </DashboardLayout>
  );
}
