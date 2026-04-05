/**
 * OpenClaw Workflows Panel
 * 
 * Combined Skills, Sessions, and Logs panel for Agentic Workflows page.
 * Provides agent management capabilities within the workflow context.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Spinner,
} from '@chakra-ui/react';
import { FiPower, FiRefreshCw } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useOpenClawWebSocket } from '@/hooks/useOpenClawWebSocket';
import { OpenClawSessionsPanel } from './OpenClawSessionsPanel';
import { OpenClawSkillsPanel } from './OpenClawSkillsPanel';
import { OpenClawLogsPanel } from './OpenClawLogsPanel';

export function OpenClawWorkflowsPanel() {
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
    <Box
      bg={bgElevated}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderSubtle}
      overflow="hidden"
    >
      <HStack p={3} borderBottom="1px solid" borderColor={borderSubtle} justify="space-between">
        <HStack>
          <Text fontWeight="600" color={textPrimary} fontSize="sm">
            OpenClaw Agent Control
          </Text>
          <Badge
            colorScheme={state.connected ? 'green' : state.connecting ? 'yellow' : 'red'}
            fontSize="xs"
          >
            {state.connected ? 'Connected' : state.connecting ? 'Connecting...' : 'Disconnected'}
          </Badge>
        </HStack>
        <Button
          leftIcon={state.connected ? <FiPower /> : <FiRefreshCw />}
          size="xs"
          colorScheme={state.connected ? 'red' : 'green'}
          variant="ghost"
          onClick={state.connected ? actions.disconnect : actions.connect}
        >
          {state.connected ? 'Disconnect' : 'Connect'}
        </Button>
      </HStack>

      <Tabs variant="soft-rounded" colorScheme="blue" size="sm" p={3} isLazy>
        <TabList>
          <Tab fontSize="xs">Sessions</Tab>
          <Tab fontSize="xs">Skills</Tab>
          <Tab fontSize="xs">Logs</Tab>
        </TabList>

        <TabPanels mt={3}>
          <TabPanel p={0}>
            <OpenClawSessionsPanel
              connected={state.connected}
              sessions={state.sessions}
              onRefresh={actions.sessionsList}
              onPatch={actions.sessionsPatch}
              onDelete={actions.sessionsDelete}
            />
          </TabPanel>

          <TabPanel p={0}>
            <OpenClawSkillsPanel
              connected={state.connected}
              skills={state.skills}
              onRefresh={actions.skillsStatus}
              onInstall={actions.skillsInstall}
              onUpdate={actions.skillsUpdate}
            />
          </TabPanel>

          <TabPanel p={0}>
            <OpenClawLogsPanel
              connected={state.connected}
              onTail={actions.logsTail}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

export default OpenClawWorkflowsPanel;
