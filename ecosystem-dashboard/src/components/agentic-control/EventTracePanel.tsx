import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  Badge,
  Card,
  CardBody,
  Code,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { FiRefreshCcw, FiActivity, FiClock } from 'react-icons/fi';
import { EventTrace } from './types';

interface EventTracePanelProps {
  events: EventTrace[];
  onClearEvents?: () => void;
}

export const EventTracePanel: React.FC<EventTracePanelProps> = ({
  events,
  onClearEvents,
}) => {
  const cardBg = useSemanticToken('surface.base');
  const codeBg = useSemanticToken('surface.elevated');

  return (
    <VStack spacing={3} align="stretch" h="full" p={4}>
      <HStack justify="space-between">
        <HStack>
          <FiActivity size={14} />
          <Text fontSize="sm" fontWeight="medium">Event Trace</Text>
        </HStack>
        <HStack>
          <Badge size="sm" colorScheme="blue">{events.length}</Badge>
          {onClearEvents && (
            <IconButton
              aria-label="Clear events"
              icon={<FiRefreshCcw />}
              size="xs"
              variant="ghost"
              onClick={onClearEvents}
            />
          )}
        </HStack>
      </HStack>

      <VStack spacing={2} align="stretch" flex={1} overflowY="auto" pr={1}>
        {events.length === 0 ? (
          <Box textAlign="center" py={12}>
            <FiActivity size={32} color="gray" style={{ margin: '0 auto' }} />
            <Text mt={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
              No events yet
            </Text>
            <Text fontSize="xs" color={useSemanticToken('text.tertiary')} mt={1}>
              Events will appear here as agents communicate
            </Text>
          </Box>
        ) : (
          events.slice().reverse().map((event) => (
            <Card key={event.id} size="sm" variant="outline" bg={cardBg}>
              <CardBody p={2}>
                <VStack spacing={1} align="start">
                  <HStack justify="space-between" w="full">
                    <Badge 
                      size="xs" 
                      colorScheme={
                        event.status === 'success' ? 'green' : 
                        event.status === 'error' ? 'red' : 'yellow'
                      }
                    >
                      {event.event_type}
                    </Badge>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {event.timestamp.toLocaleTimeString()}
                    </Text>
                  </HStack>
                  
                  {event.function_name && (
                    <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                      {event.function_name}
                    </Text>
                  )}
                  
                  <HStack spacing={2} flexWrap="wrap">
                    {event.duration && (
                      <HStack spacing={1}>
                        <FiClock size={10} />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {event.duration}ms
                        </Text>
                      </HStack>
                    )}
                    
                    {event.protocol && (
                      <Badge size="xs" colorScheme="purple" variant="subtle">
                        {event.protocol}
                      </Badge>
                    )}
                  </HStack>
                  
                  {event.llm_model && (
                    <HStack spacing={1} flexWrap="wrap">
                      <Badge size="xs" colorScheme="blue" variant="outline">
                        🤖 {event.llm_model}
                      </Badge>
                      {event.llm_provider && (
                        <Badge size="xs" colorScheme="cyan" variant="outline">
                          {event.llm_provider}
                        </Badge>
                      )}
                    </HStack>
                  )}
                  
                  {event.output && (
                    <Code fontSize="xs" p={1} bg={codeBg} borderRadius="sm" noOfLines={2} w="full">
                      {typeof event.output === 'object' 
                        ? JSON.stringify(event.output).substring(0, 80) + '...'
                        : String(event.output).substring(0, 80) + (String(event.output).length > 80 ? '...' : '')
                      }
                    </Code>
                  )}
                </VStack>
              </CardBody>
            </Card>
          ))
        )}
      </VStack>
    </VStack>
  );
};

export default EventTracePanel;
