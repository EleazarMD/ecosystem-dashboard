import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Heading,
  Text,
  Flex,
  Badge,
  Container,
} from '@chakra-ui/react';
import {
  FiLayers,
  FiFileText,
  FiCpu,
  FiSearch,
  FiBarChart2,
  FiActivity,
} from 'react-icons/fi';
import { NextPage } from 'next';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Import tab components
import OverviewTab from '@/components/knowledge/OverviewTab';
import GraphTab from '@/components/knowledge/GraphTab';
import AgentsTab from '@/components/knowledge/AgentsTab';
import SearchTab from '@/components/knowledge/SearchTab';
import AnalyticsTab from '@/components/knowledge/AnalyticsTab';
import MemoriesTab from '@/components/knowledge/MemoriesTab';
import { useSemanticToken } from '@/hooks/useSemanticToken';

/**
 * Knowledge Hub - Central page for all Knowledge Graph operations
 * 
 * Provides unified access to:
 * - Overview & Statistics
 * - Graph Visualization
 * - Knowledge Graph Agents
 * - Document Search
 * - Analytics & Insights
 * - IDE Memories
 */
const KnowledgeHubPage: NextPage = () => {
  const router = useRouter();
  const { tab } = router.query;
  
  // Map tab names to indices
  const tabMap: Record<string, number> = {
    'overview': 0,
    'graph': 1,
    'agents': 2,
    'search': 3,
    'analytics': 4,
    'memories': 5,
  };

  // Get initial tab index from URL parameter
  const getInitialTabIndex = () => {
    if (typeof tab === 'string' && tabMap[tab] !== undefined) {
      return tabMap[tab];
    }
    return 0; // Default to overview
  };

  const [tabIndex, setTabIndex] = useState(getInitialTabIndex());
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [systemStats, setSystemStats] = useState({
    totalDocuments: 0,
    totalMemories: 0,
    agentsOnline: 0,
  });

  // Update URL when tab changes
  const handleTabChange = (index: number) => {
    setTabIndex(index);
    const tabName = Object.keys(tabMap).find(key => tabMap[key] === index) || 'overview';
    router.push(`/knowledge?tab=${tabName}`, undefined, { shallow: true });
  };

  // Sync tab index with URL parameter changes
  useEffect(() => {
    if (typeof tab === 'string' && tabMap[tab] !== undefined) {
      setTabIndex(tabMap[tab]);
    }
  }, [tab]);

  // Load system stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Fetch from APIs (or use mock data)
        setSystemStats({
          totalDocuments: 13584,
          totalMemories: 247,
          agentsOnline: 7,
        });
        setPendingApprovals(0);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, []);

  // Navigate to specific tab
  const handleNavigate = (tabName: string) => {
    const index = tabMap[tabName];
    if (index !== undefined) {
      handleTabChange(index);
    }
  };

  return (
    <>
      <Head>
        <title>Knowledge Hub - AI Homelab</title>
        <meta name="description" content="Central hub for Knowledge Graph operations, visualization, and insights" />
      </Head>

      <Container maxW="container.2xl" py={6}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading as="h1" size="xl" mb={2}>
              🧠 Knowledge Hub
            </Heading>
            <Text color={useSemanticToken('text.secondary')} fontSize="lg">
              Search documentation, explore relationships, and discover insights across your AI Homelab
            </Text>
          </Box>
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            <Icon as={FiActivity} mr={2} />
            OPERATIONAL
          </Badge>
        </Flex>

        {/* Tab Navigation */}
        <Tabs 
          index={tabIndex} 
          onChange={handleTabChange} 
          variant="enclosed" 
          colorScheme="purple"
          size="md"
        >
          <TabList mb={6} flexWrap="wrap">
            <Tab>
              <Icon as={FiBarChart2} mr={2} />
              Overview
            </Tab>
            <Tab>
              <Icon as={FiLayers} mr={2} />
              Graph
              <Badge ml={2} colorScheme="purple" fontSize="xs">3D</Badge>
            </Tab>
            <Tab>
              <Icon as={FiCpu} mr={2} />
              Agents
              <Badge ml={2} colorScheme="green" fontSize="xs">7</Badge>
            </Tab>
            <Tab>
              <Icon as={FiSearch} mr={2} />
              Search
            </Tab>
            <Tab>
              <Icon as={FiBarChart2} mr={2} />
              Analytics
            </Tab>
            <Tab>
              <Icon as={FiFileText} mr={2} />
              Memories
            </Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel px={0}>
              <OverviewTab 
                pendingApprovals={pendingApprovals}
                systemStats={systemStats}
                onNavigate={handleNavigate}
              />
            </TabPanel>

            {/* Graph Visualization Tab */}
            <TabPanel px={0}>
              <GraphTab />
            </TabPanel>

            {/* Agents Tab */}
            <TabPanel px={0}>
              <AgentsTab />
            </TabPanel>

            {/* Search Tab */}
            <TabPanel px={0}>
              <SearchTab />
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel px={0}>
              <AnalyticsTab />
            </TabPanel>

            {/* Memories Tab */}
            <TabPanel px={0}>
              <MemoriesTab />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </>
  );
};

// Add layout
type PageWithLayout = NextPage & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

(KnowledgeHubPage as PageWithLayout).getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default KnowledgeHubPage;
