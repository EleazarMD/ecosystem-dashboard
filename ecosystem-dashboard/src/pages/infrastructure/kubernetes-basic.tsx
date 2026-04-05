import React from 'react';
import { Box, Text, Heading } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';

const KubernetesBasicPage: React.FC = () => {
  return (
    <DashboardLayout>
      <Box p={6}>
        <GlassPanel variant="light">
          <Box p={8}>
            <Heading size="xl" mb={4}>
              🚀 Kubernetes Dashboard
            </Heading>
            <Text>
              This is a basic working Kubernetes page to test the navigation and imports.
            </Text>
          </Box>
        </GlassPanel>
      </Box>
    </DashboardLayout>
  );
};

export default KubernetesBasicPage;
