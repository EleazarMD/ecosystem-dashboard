import React, { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NovaCacheIntelligence from '@/components/monitoring/NovaCacheIntelligence';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';

const NovaCachePage: React.FC = () => {
  const { setContext, setIsOpen } = useRightPanel();

  useEffect(() => {
    setContext('nova-cache');
    setIsOpen(false);
  }, [setContext, setIsOpen]);

  return (
    <DashboardLayout>
      <Box 
        bg="transparent" 
        minH="100vh" 
        p={{ base: 2, md: 3, lg: 4 }}
      >
        <NovaCacheIntelligence />
      </Box>
    </DashboardLayout>
  );
};

export default withFeatureGuard(NovaCachePage, 'monitoring');
