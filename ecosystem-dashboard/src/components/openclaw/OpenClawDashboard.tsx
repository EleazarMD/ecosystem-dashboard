/**
 * OpenClaw Dashboard - Infrastructure View
 * 
 * Gateway infrastructure management: status, channels, and configuration.
 * Agent features (chat, sessions, skills, logs) are in Agentic Workflows.
 */

import React, { useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Alert,
  AlertIcon,
  Link,
} from '@chakra-ui/react';
import { FiPower, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import NextLink from 'next/link';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useOpenClawWebSocket } from '@/hooks/useOpenClawWebSocket';
import { OpenClawStatusWidget } from './OpenClawStatusWidget';
import { OpenClawConfigPanel } from './OpenClawConfigPanel';
import { OpenClawChannelsPanel } from './OpenClawChannelsPanel';

export function OpenClawDashboard() {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  const [state, actions] = useOpenClawWebSocket();

  useEffect(() => {
    actions.connect();
    return () => {
      actions.disconnect();
    };
  }, []);

  return (
    <Box p={6}>
      <VStack align="start" spacing={6}>
        <HStack justify="space-between" w="full">
          <Box>
            <Heading size="lg" color={textPrimary}>
              OpenClaw Gateway
            </Heading>
            <Text color={textSecondary} mt={1}>
              Infrastructure management for multi-channel agentic gateway
            </Text>
          </Box>
          <HStack>
            <Badge
              colorScheme={state.connected ? 'green' : state.connecting ? 'yellow' : 'red'}
              fontSize="sm"
              px={3}
              py={1}
            >
              {state.connected ? 'Connected' : state.connecting ? 'Connecting...' : 'Disconnected'}
            </Badge>
            <Button
              leftIcon={state.connected ? <FiPower /> : <FiRefreshCw />}
              size="sm"
              colorScheme={state.connected ? 'red' : 'green'}
              variant="outline"
              onClick={state.connected ? actions.disconnect : actions.connect}
            >
              {state.connected ? 'Disconnect' : 'Connect'}
            </Button>
          </HStack>
        </HStack>

        {state.error && (
          <Box p={3} bg="red.900" borderRadius="md" w="full">
            <Text color="red.200" fontSize="sm">
              Error: {state.error}
            </Text>
          </Box>
        )}

        <Alert status="info" borderRadius="lg" variant="subtle">
          <AlertIcon />
          <Box flex={1}>
            <Text fontWeight="medium">Agent Features Available in Agentic Workflows</Text>
            <Text fontSize="sm">
              Sessions, Skills, and Logs are managed in{' '}
              <Link as={NextLink} href="/agentic-workflows" color="blue.400">
                Agentic Workflows <FiExternalLink style={{ display: 'inline' }} />
              </Link>
            </Text>
          </Box>
        </Alert>

        <Tabs variant="enclosed" colorScheme="blue" w="full" isLazy>
          <TabList>
            <Tab>Status</Tab>
            <Tab>Channels</Tab>
            <Tab>Configuration</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <OpenClawStatusWidget />
                <Box
                  p={4}
                  bg={bgElevated}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderSubtle}
                >
                  <VStack align="start" spacing={4}>
                    <Text fontWeight="600" color={textPrimary}>
                      Quick Links
                    </Text>
                    <VStack align="start" spacing={2} w="full">
                      <Link as={NextLink} href="/agentic-workflows" w="full">
                        <HStack
                          p={3}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={borderSubtle}
                          _hover={{ borderColor: 'blue.400', bg: bgElevated }}
                          w="full"
                        >
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                              Agentic Workflows
                            </Text>
                            <Text fontSize="xs" color={textSecondary}>
                              Manage sessions, skills, and view logs
                            </Text>
                          </Box>
                          <FiExternalLink />
                        </HStack>
                      </Link>
                      <Link as={NextLink} href="/goose-mind" w="full">
                        <HStack
                          p={3}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={borderSubtle}
                          _hover={{ borderColor: 'green.400', bg: bgElevated }}
                          w="full"
                        >
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                              GooseMind Chat
                            </Text>
                            <Text fontSize="xs" color={textSecondary}>
                              Chat with AI agents including OpenClaw
                            </Text>
                          </Box>
                          <FiExternalLink />
                        </HStack>
                      </Link>
                      <Link as={NextLink} href="/approvals" w="full">
                        <HStack
                          p={3}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={borderSubtle}
                          _hover={{ borderColor: 'purple.400', bg: bgElevated }}
                          w="full"
                        >
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                              Approvals Queue
                            </Text>
                            <Text fontSize="xs" color={textSecondary}>
                              Review pending agent actions
                            </Text>
                          </Box>
                          <FiExternalLink />
                        </HStack>
                      </Link>
                    </VStack>
                  </VStack>
                </Box>
              </SimpleGrid>
            </TabPanel>

            <TabPanel px={0}>
              <OpenClawChannelsPanel
                connected={state.connected}
                channels={state.channels}
                onRefresh={actions.channelsStatus}
              />
            </TabPanel>

            <TabPanel px={0}>
              <OpenClawConfigPanel
                connected={state.connected}
                config={state.config}
                onGet={actions.configGet}
                onSet={actions.configSet}
                onApply={actions.configApply}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
}

export default OpenClawDashboard;
