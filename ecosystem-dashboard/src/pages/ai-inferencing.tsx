/**
 * AI Inferencing Dashboard
 * Complete dashboard with provider performance, cost optimization, and Goose AI analytics
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import {
  Box,
  Flex,
  Container,
  Spinner,
  VStack,
} from '@chakra-ui/react';
import { AIInferencingNavigation } from '@/components/ai-inferencing/AIInferencingNavigation';
import { AIInferencingRightPanel } from '@/components/ai-inferencing/AIInferencingRightPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { SimpleGlassPanel } from '@/components/ui/SimpleGlassPanel';
import { useRightPanel } from '@/contexts/RightPanelContext';
import DynamicRightPanel from '@/components/layout/DynamicRightPanel.new';

// Dynamic imports with client-side only rendering to avoid hydration issues
const OverviewDashboard = dynamic(
  () => import('@/components/ai-inferencing/OverviewDashboard').then(mod => mod.OverviewDashboard),
  {
    ssr: false,
    loading: () => (
      <VStack h="full" justify="center" align="center" p={8}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </VStack>
    )
  }
);

const GooseAnalyticsPanel = dynamic(
  () => import('@/components/ai-inferencing/GooseAnalyticsPanel').then(mod => mod.GooseAnalyticsPanel),
  { ssr: false }
);

const BudgetDashboard = dynamic(
  () => import('@/components/ai-inferencing/BudgetDashboard').then(mod => mod.BudgetDashboard),
  { ssr: false }
);

const TelemetryDashboard = dynamic(
  () => import('./telemetry'),
  { ssr: false }
);

const APIKeysManagement = dynamic(
  () => import('@/pages/ai_inferencing_keys').then(mod => ({ default: mod.AIInferencingKeysContent })),
  { 
    ssr: false,
    loading: () => (
      <VStack h="full" justify="center" align="center" p={8}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </VStack>
    )
  }
);

export default function AIInferencingPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  
  // Right panel for API keys section
  const { isOpen: isPanelOpen, setIsOpen: setIsPanelOpen } = useRightPanel();

  // Read section from URL query parameter
  useEffect(() => {
    if (router.isReady && router.query.section) {
      setSelectedSection(router.query.section as string);
    }
  }, [router.isReady, router.query.section]);

  const bgPrimary = useSemanticToken('surface.base');
  const borderSubtle = useSemanticToken('border.subtle');

  // Update URL when section changes
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    router.push(`/ai-inferencing?section=${sectionId}`, undefined, { shallow: true });
  };

  // Render main content based on selected section
  const renderMainContent = () => {
    console.log('[AI Inferencing] Rendering section:', selectedSection);

    switch (selectedSection) {
      case 'provider-performance':
        return (
          <Box p={6}>
            <OverviewDashboard />
          </Box>
        );

      case 'llm-providers':
        return (
          <Box p={6} textAlign="center" color={useSemanticToken('text.secondary')}>
            <Box fontSize="xl" fontWeight="bold" mb={2}>LLM Providers</Box>
            <Box fontSize="sm">Provider management coming soon</Box>
          </Box>
        );

      case 'model-usage':
        return (
          <Box p={6} textAlign="center" color={useSemanticToken('text.secondary')}>
            <Box fontSize="xl" fontWeight="bold" mb={2}>Model Usage</Box>
            <Box fontSize="sm">Model analytics coming soon</Box>
          </Box>
        );

      case 'activity-logs':
        return <TelemetryDashboard />;

      case 'cost-optimization':
        return <BudgetDashboard />;

      case 'goose-analytics':
        console.log('[AI Inferencing] Rendering Goose Analytics Panel');
        return (
          <Box p={6}>
            <GooseAnalyticsPanel />
          </Box>
        );

      case 'api-keys':
        return <APIKeysManagement />;

      case 'mcp-providers':
        return (
          <Box p={6} textAlign="center" color={useSemanticToken('text.secondary')}>
            <Box fontSize="xl" fontWeight="bold" mb={2}>MCP Providers</Box>
            <Box fontSize="sm">MCP provider management coming soon</Box>
          </Box>
        );

      default:
        return (
          <Box p={6}>
            <OverviewDashboard />
          </Box>
        );
    }
  };

  const handleRefresh = () => {
    // Trigger refresh - could emit event or use context
    window.location.reload();
  };

  return (
    <Box minH="100vh" bg={bgPrimary}>
      <Flex>
        {/* Left Sidebar - Navigation */}
        <Box
          w="250px"
          minH="100vh"
          position="sticky"
          top={0}
          zIndex={10}
        >
          <SimpleGlassPanel
            variant="heavy"
            h="full"
            borderRadius="none"
            borderRight="1px solid"
            borderColor={borderSubtle}
          >
            <AIInferencingNavigation
              selectedSection={selectedSection}
              onSectionChange={handleSectionChange}
              providerCount={3}
              llmProviderCount={5}
              modelCount={12}
              keyCount={8}
              mcpCount={4}
              gooseAnalyticsEnabled={true}
            />
          </SimpleGlassPanel>
        </Box>

        {/* Main Content Area */}
        <Box flex={1} overflow="auto">
          <Container maxW="container.xl">
            {renderMainContent()}
          </Container>
        </Box>

        {/* Right Sidebar - Controls (hide for api-keys section which uses DynamicRightPanel) */}
        {selectedSection !== 'api-keys' && (
          <Box
            w="300px"
            minH="100vh"
            position="sticky"
            top={0}
            zIndex={10}
          >
            <SimpleGlassPanel
              variant="heavy"
              h="full"
              borderRadius="none"
              borderLeft="1px solid"
              borderColor={borderSubtle}
            >
              <AIInferencingRightPanel
                page={selectedSection}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                onRefresh={handleRefresh}
              />
            </SimpleGlassPanel>
          </Box>
        )}
      </Flex>
      
      {/* DynamicRightPanel for API keys section - always mounted, handles its own visibility */}
      {selectedSection === 'api-keys' && (
        <DynamicRightPanel
          onClose={() => setIsPanelOpen(false)}
          systemData={{
            health: 'good',
            services: [],
            metrics: {},
            alerts: 0
          }}
        />
      )}
    </Box>
  );
}
