import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
} from '@chakra-ui/react';
import { FiActivity, FiClock } from 'react-icons/fi';
import { EventTrace } from '../../hooks/useAgentMessaging';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EventPanelProps {
  events: EventTrace[];
  selectedAgentName?: string;
}

export const EventPanel: React.FC<EventPanelProps> = ({
  events,
  selectedAgentName,
}) => {
  const sidebarBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');

  const getEventColor = (status: EventTrace['status']) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getEventIcon = (eventType: EventTrace['event_type']) => {
    switch (eventType) {
      case 'function_call': return '📞';
      case 'response': return '💬';
      case 'error': return '❌';
      case 'trace': return '🔍';
      default: return '📋';
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="full" p={4} bg={sidebarBg}>
      <HStack>
        <FiActivity size={20} />
        <Text fontSize="lg" fontWeight="bold">Events & Traces</Text>
      </HStack>

      {selectedAgentName && (
        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
          Showing events for {selectedAgentName}
        </Text>
      )}

      <Tabs size="sm" variant="enclosed" flex={1}>
        <TabList>
          <Tab fontSize="xs">Recent Events</Tab>
          <Tab fontSize="xs">Actions</Tab>
        </TabList>

        <TabPanels flex={1}>
          <TabPanel px={0} py={2} h="full">
            <VStack spacing={2} align="stretch" overflowY="auto" maxH="full">
              {events.length === 0 && (
                <Box textAlign="center" py={8}>
                  <FiClock size={32} color="gray" />
                  <Text mt={2} fontSize="sm" color={useSemanticToken('text.secondary')}>
                    No events yet
                  </Text>
                  <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                    Events will appear here as you interact with agents
                  </Text>
                </Box>
              )}

              {events.map((event) => (
                <Box
                  key={event.id}
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={borderColor}
                  bg={useSemanticToken('surface.elevated')}
                  fontSize="xs"
                >
                  <HStack justify="space-between" mb={1}>
                    <HStack spacing={1}>
                      <Text>{getEventIcon(event.event_type)}</Text>
                      <Text fontWeight="medium" textTransform="capitalize">
                        {event.event_type.replace('_', ' ')}
                      </Text>
                    </HStack>
                    <Badge size="xs" colorScheme={getEventColor(event.status)}>
                      {event.status}
                    </Badge>
                  </HStack>

                  {event.function_name && (
                    <Text color="blue.600" fontWeight="medium" mb={1}>
                      {event.function_name}
                    </Text>
                  )}

                  {event.input && (
                    <Box mb={2}>
                      <Text color={useSemanticToken('text.secondary')} fontWeight="medium">Input:</Text>
                      <Code fontSize="xs" p={1} borderRadius="sm" display="block" whiteSpace="pre-wrap">
                        {typeof event.input === 'string' 
                          ? event.input 
                          : JSON.stringify(event.input, null, 2).substring(0, 100) + '...'
                        }
                      </Code>
                    </Box>
                  )}

                  {event.output && (
                    <Box mb={2}>
                      <Text color={useSemanticToken('text.secondary')} fontWeight="medium">Output:</Text>
                      <Code fontSize="xs" p={1} borderRadius="sm" display="block" whiteSpace="pre-wrap">
                        {typeof event.output === 'string' 
                          ? event.output.substring(0, 100) + (event.output.length > 100 ? '...' : '')
                          : JSON.stringify(event.output, null, 2).substring(0, 100) + '...'
                        }
                      </Code>
                    </Box>
                  )}

                  <HStack justify="space-between" fontSize="xs" color={useSemanticToken('text.secondary')}>
                    <Text>{event.timestamp.toLocaleTimeString()}</Text>
                    {event.duration && (
                      <Text>{event.duration}ms</Text>
                    )}
                  </HStack>
                </Box>
              ))}
            </VStack>
          </TabPanel>

          <TabPanel px={0} py={2}>
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                Quick actions for {selectedAgentName || 'selected agent'}
              </Text>
              <Box p={2} borderRadius="md" borderWidth="1px" borderColor={borderColor} bg={useSemanticToken('surface.elevated')}>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  Agent actions will appear here
                </Text>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
};
