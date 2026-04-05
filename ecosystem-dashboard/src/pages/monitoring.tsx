import React, { useEffect } from 'react';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorMode,
} from '@chakra-ui/react';
import MonitoringDashboardV3 from '@/components/monitoring/MonitoringDashboardV3';
import WorkstationMonitor from '@/components/monitoring/WorkstationMonitor';
import MetricsCharts from '@/components/monitoring/MetricsCharts';
import MonitoringLogs from '@/components/monitoring/MonitoringLogs';
import NovaCacheIntelligence from '@/components/monitoring/NovaCacheIntelligence';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';

const MonitoringPage: React.FC = () => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const { setContext, setIsOpen } = useRightPanel();

  useEffect(() => {
    setContext('monitoring');
    setIsOpen(true);
  }, [setContext, setIsOpen]);

  return (
    <DashboardLayout>
      <Box 
        bg="transparent" 
        minH="100vh" 
        p={{ base: 2, md: 3, lg: 4 }}
      >
        <Tabs variant="soft-rounded" colorScheme="blue" size="sm" isLazy>
          <TabList mb={3} bg={isDark ? 'whiteAlpha.50' : 'gray.50'} p={1} borderRadius="lg" w="fit-content">
            <Tab fontSize="xs" px={3}>Workstation</Tab>
            <Tab fontSize="xs" px={3}>Inference</Tab>
            <Tab fontSize="xs" px={3}>Nova Cache</Tab>
            <Tab fontSize="xs" px={3}>Trends</Tab>
            <Tab fontSize="xs" px={3}>Logs</Tab>
          </TabList>

          <TabPanels>
            <TabPanel p={0}>
              <WorkstationMonitor />
            </TabPanel>

            <TabPanel p={0}>
              <MonitoringDashboardV3 />
            </TabPanel>

            <TabPanel p={0}>
              <NovaCacheIntelligence />
            </TabPanel>

            <TabPanel p={0}>
              <MetricsCharts refreshInterval={30000} />
            </TabPanel>

            <TabPanel p={0}>
              <MonitoringLogs refreshInterval={10000} maxHeight="calc(100vh - 150px)" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DashboardLayout>
  );
};

export default withFeatureGuard(MonitoringPage, 'monitoring');
