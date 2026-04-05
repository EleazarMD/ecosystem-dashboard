import React from 'react';
import {
  Box,
  Grid,
  GridItem,
  VStack,
  SimpleGrid,
} from '@chakra-ui/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Head from 'next/head';

// Import the enhanced agentic components
import EnhancedAgenticCommandBar from '@/components/dashboard/home/EnhancedAgenticCommandBar';
import EnhancedExplainabilityPanel from '@/components/dashboard/home/EnhancedExplainabilityPanel';
import ProactiveMonitoringWidget from '@/components/dashboard/home/ProactiveMonitoringWidget';

// Import existing components that work well
import PredictiveActionsWidget from '@/components/dashboard/home/PredictiveActionsWidget';
import ActivityFeedWidget from '@/components/dashboard/home/ActivityFeedWidget';
import ProjectHotlistWidget from '@/components/dashboard/home/ProjectHotlistWidget';
import KnowledgeGraphPreviewWidget from '@/components/dashboard/home/KnowledgeGraphPreviewWidget';

// Import enhanced context provider
import { EnhancedAgenticCommandProvider } from '@/context/EnhancedAgenticCommandContext';

// --- Main Home Page Component --- //

const AgenticHomePage = () => {
  return (
    <EnhancedAgenticCommandProvider>
      <DashboardLayout>
        <Head>
          <title>AI Homelab Dashboard - Intelligent Ecosystem Management</title>
          <meta name="description" content="AI-powered homelab dashboard with proactive monitoring, intelligent insights, and voice-enabled command interface" />
        </Head>
        <Box p={6}>
          <Grid
            templateColumns={{ base: '1fr', xl: '2fr 1fr' }}
            templateRows="auto 1fr"
            gap={6}
            h="calc(100vh - 120px)"
          >
            {/* Enhanced Agentic Command Bar - Full Width */}
            <GridItem colSpan={{ base: 1, xl: 2 }}>
              <EnhancedAgenticCommandBar />
            </GridItem>

            {/* Main Dashboard Content */}
            <GridItem>
              <VStack align="stretch" spacing={6}>
                {/* Top Row - System Health and Predictive Actions */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <ProactiveMonitoringWidget />
                  <PredictiveActionsWidget />
                </SimpleGrid>
                
                {/* Middle Row - Activity Feed */}
                <ActivityFeedWidget />
                
                {/* Bottom Row - Project Status and Knowledge Graph */}
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <ProjectHotlistWidget />
                  <KnowledgeGraphPreviewWidget />
                </SimpleGrid>
              </VStack>
            </GridItem>

            {/* Enhanced Agent Insights Panel */}
            <GridItem>
              <EnhancedExplainabilityPanel />
            </GridItem>
          </Grid>
        </Box>
      </DashboardLayout>
    </EnhancedAgenticCommandProvider>
  );
};

export default AgenticHomePage;
