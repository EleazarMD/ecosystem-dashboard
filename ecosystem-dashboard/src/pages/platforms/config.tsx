/**
 * Platform Configuration Page
 * 
 * Redirects to the main Platform Management page at /infrastructure/platform
 * This page exists for URL compatibility with navigation links.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function PlatformsConfigPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main platform management page
    router.replace('/infrastructure/platform');
  }, [router]);

  return (
    <DashboardLayout>
      <Box display="flex" justifyContent="center" alignItems="center" h="50vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Redirecting to Platform Management...</Text>
        </VStack>
      </Box>
    </DashboardLayout>
  );
}
