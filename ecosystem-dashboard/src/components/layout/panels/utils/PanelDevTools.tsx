/**
 * Panel Development Tools
 * Utilities for developers working with the panel system
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  useToast,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { PanelEngine } from '../core/PanelEngine';
import { PanelStateManager } from '@/services/PanelStateManager';
import { useRightPanel } from '@/contexts/RightPanelContext';

/**
 * Panel DevTools Component
 * Shows validation, stats, and debugging info
 * Only render in development mode
 */
export function PanelDevTools() {
  const [validation, setValidation] = useState(PanelEngine.validateConfiguration());
  const [stats, setStats] = useState(PanelEngine.getRoutingStats());
  const [usageStats, setUsageStats] = useState(PanelStateManager.getUsageStats());
  const { context, activeTab, customData } = useRightPanel();
  const toast = useToast();

  const refresh = () => {
    setValidation(PanelEngine.validateConfiguration());
    setStats(PanelEngine.getRoutingStats());
    setUsageStats(PanelStateManager.getUsageStats());
  };

  const exportRoutingMap = () => {
    const map = PanelEngine.generateRoutingMap();
    const blob = new Blob([map], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'panel-routing-map.md';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Routing map exported',
      status: 'success',
      duration: 2000,
    });
  };

  const clearState = () => {
    PanelStateManager.clearState();
    toast({
      title: 'Panel state cleared',
      status: 'info',
      duration: 2000,
    });
    refresh();
  };

  return (
    <Box
      position="fixed"
      bottom="20px"
      left="20px"
      w="400px"
      maxH="600px"
      bg="gray.900"
      color="white"
      borderRadius="lg"
      boxShadow="2xl"
      overflow="hidden"
      zIndex={9999}
    >
      <VStack align="stretch" spacing={0}>
        {/* Header */}
        <HStack p={3} bg="gray.800" justify="space-between">
          <Text fontSize="sm" fontWeight="bold">
            🔧 Panel DevTools
          </Text>
          <HStack spacing={2}>
            <Button size="xs" onClick={refresh}>
              Refresh
            </Button>
            <Button size="xs" onClick={exportRoutingMap}>
              Export Map
            </Button>
          </HStack>
        </HStack>

        <Box overflowY="auto" maxH="540px">
          <Tabs size="sm" colorScheme="blue">
            <TabList px={3} pt={2}>
              <Tab>Validation</Tab>
              <Tab>Stats</Tab>
              <Tab>Current</Tab>
              <Tab>Usage</Tab>
            </TabList>

            <TabPanels>
              {/* Validation Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <HStack>
                    <Badge colorScheme={validation.valid ? 'green' : 'red'}>
                      {validation.valid ? 'VALID' : 'INVALID'}
                    </Badge>
                    <Text fontSize="xs">
                      {validation.errors.length} errors, {validation.warnings.length} warnings
                    </Text>
                  </HStack>

                  {validation.errors.length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" color="red.300" mb={2}>
                        Errors:
                      </Text>
                      <VStack align="stretch" spacing={1}>
                        {validation.errors.map((error, i) => (
                          <Text key={i} fontSize="xs" color="red.200">
                            • {error}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {validation.warnings.length > 0 && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" color="yellow.300" mb={2}>
                        Warnings:
                      </Text>
                      <VStack align="stretch" spacing={1}>
                        {validation.warnings.map((warning, i) => (
                          <Text key={i} fontSize="xs" color="yellow.200">
                            • {warning}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  )}

                  {validation.valid && validation.warnings.length === 0 && (
                    <Text fontSize="xs" color="green.300">
                      ✅ All configurations are valid!
                    </Text>
                  )}
                </VStack>
              </TabPanel>

              {/* Stats Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Overview
                    </Text>
                    <VStack align="stretch" spacing={1} fontSize="xs">
                      <HStack justify="space-between">
                        <Text>Total Contexts:</Text>
                        <Badge>{stats.totalContexts}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Total Panels:</Text>
                        <Badge>{stats.totalPanels}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Total Routes:</Text>
                        <Badge>{stats.totalRoutes}</Badge>
                      </HStack>
                    </VStack>
                  </Box>

                  <Divider />

                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Routes by Priority
                    </Text>
                    <VStack align="stretch" spacing={1} fontSize="xs">
                      <HStack justify="space-between">
                        <Text>High (≥100):</Text>
                        <Badge colorScheme="red">{stats.routesByPriority.high}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Medium (50-99):</Text>
                        <Badge colorScheme="yellow">{stats.routesByPriority.medium}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Low (&lt;50):</Text>
                        <Badge colorScheme="green">{stats.routesByPriority.low}</Badge>
                      </HStack>
                    </VStack>
                  </Box>

                  <Divider />

                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={2}>
                      Contexts
                    </Text>
                    <VStack align="stretch" spacing={1} fontSize="xs">
                      <HStack justify="space-between">
                        <Text>Child Contexts:</Text>
                        <Badge colorScheme="purple">{stats.childContexts}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Adult Contexts:</Text>
                        <Badge colorScheme="blue">{stats.adultContexts}</Badge>
                      </HStack>
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Current State Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={3} fontSize="xs">
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Current Context
                    </Text>
                    <Code fontSize="xs" p={2} borderRadius="md" w="full">
                      {context}
                    </Code>
                  </Box>

                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Active Tab
                    </Text>
                    <Code fontSize="xs" p={2} borderRadius="md" w="full">
                      {activeTab}
                    </Code>
                  </Box>

                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Custom Data
                    </Text>
                    <Code fontSize="xs" p={2} borderRadius="md" w="full" whiteSpace="pre-wrap">
                      {customData ? JSON.stringify(customData, null, 2) : 'null'}
                    </Code>
                  </Box>

                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Available Panels
                    </Text>
                    <VStack align="stretch" spacing={1}>
                      {PanelEngine.getPanelsForContext(context).map(panelId => (
                        <Badge key={panelId} size="sm">
                          {panelId}
                        </Badge>
                      ))}
                    </VStack>
                  </Box>

                  <Button size="xs" onClick={clearState} colorScheme="red">
                    Clear Saved State
                  </Button>
                </VStack>
              </TabPanel>

              {/* Usage Stats Tab */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Text fontSize="xs" fontWeight="bold">
                    Panel Usage Statistics
                  </Text>
                  
                  {Object.keys(usageStats).length === 0 ? (
                    <Text fontSize="xs" color="gray.400">
                      No usage data yet
                    </Text>
                  ) : (
                    <VStack align="stretch" spacing={2}>
                      {Object.entries(usageStats)
                        .sort(([, a], [, b]) => b.count - a.count)
                        .slice(0, 10)
                        .map(([key, data]) => (
                          <HStack key={key} justify="space-between" fontSize="xs">
                            <Text flex="1" isTruncated>
                              {key}
                            </Text>
                            <Badge>{data.count}</Badge>
                          </HStack>
                        ))}
                    </VStack>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Box>
  );
}
