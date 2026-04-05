import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Collapse,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
} from '@chakra-ui/react';
import { FiChevronRight, FiChevronDown, FiClock, FiZap, FiAlertCircle } from 'react-icons/fi';
import { EventTrace } from './types';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TraceTimelineVisualizationProps {
  events: EventTrace[];
}

interface TraceRowProps {
  event: EventTrace;
  index: number;
  totalDuration: number;
}

const TraceRow: React.FC<TraceRowProps> = ({ event, index, totalDuration }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bgColor = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');
  const selectedBg = useSemanticToken('surface.highlight');
  const expandedBg = useSemanticToken('surface.base');

  // Calculate visual timeline bar
  const durationPercent = event.duration ? (event.duration / totalDuration) * 100 : 0;
  const barColor = 
    event.status === 'success' ? 'green' :
    event.status === 'error' ? 'red' : 'yellow';

  return (
    <Box borderBottom="1px" borderColor={borderColor}>
      {/* Main trace row */}
      <HStack
        p={2}
        spacing={2}
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        bg={isExpanded ? selectedBg : bgColor}
        _hover={{ bg: hoverBg }}
        transition="all 0.2s"
      >
        <Icon 
          as={isExpanded ? FiChevronDown : FiChevronRight} 
          boxSize={4}
          color={useSemanticToken('text.secondary')}
        />
        
        <Text fontSize="xs" color={useSemanticToken('text.secondary')} minW="60px">
          {event.timestamp.toLocaleTimeString()}
        </Text>
        
        <Badge 
          size="xs" 
          colorScheme={
            event.status === 'success' ? 'green' : 
            event.status === 'error' ? 'red' : 'yellow'
          }
          minW="60px"
        >
          {event.event_type}
        </Badge>
        
        <Text fontSize="xs" fontWeight="medium" flex={1} noOfLines={1}>
          {event.function_name || 'System event'}
        </Text>
        
        {event.duration && (
          <HStack spacing={1}>
            <Icon as={FiClock} boxSize={3} color={useSemanticToken('text.secondary')} />
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              {event.duration}ms
            </Text>
          </HStack>
        )}

        {event.protocol && (
          <Badge size="xs" colorScheme="purple" variant="outline">
            {event.protocol}
          </Badge>
        )}
      </HStack>

      {/* Timeline bar */}
      {event.duration && (
        <Box h="3px" bg={useSemanticToken('surface.base')}>
          <Box 
            h="full" 
            w={`${durationPercent}%`} 
            bg={`${barColor}.400`}
            transition="width 0.3s"
          />
        </Box>
      )}

      {/* Expanded details */}
      <Collapse in={isExpanded} animateOpacity>
        <Box p={4} bg={expandedBg}>
          <Tabs size="sm" variant="soft-rounded" colorScheme="blue">
            <TabList mb={2}>
              <Tab fontSize="xs">Event</Tab>
              <Tab fontSize="xs">Request</Tab>
              <Tab fontSize="xs">Response</Tab>
              <Tab fontSize="xs">Details</Tab>
            </TabList>

            <TabPanels>
              {/* Event Tab */}
              <TabPanel p={2}>
                <VStack spacing={2} align="start">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="xs" fontWeight="medium">Event ID:</Text>
                    <Text fontSize="xs" fontFamily="mono">{event.id}</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="xs" fontWeight="medium">Type:</Text>
                    <Text fontSize="xs">{event.event_type}</Text>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="xs" fontWeight="medium">Status:</Text>
                    <Badge size="xs" colorScheme={event.status === 'success' ? 'green' : event.status === 'error' ? 'red' : 'yellow'}>
                      {event.status}
                    </Badge>
                  </HStack>
                  {event.function_name && (
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="medium">Function:</Text>
                      <Text fontSize="xs" fontFamily="mono">{event.function_name}</Text>
                    </HStack>
                  )}
                </VStack>
              </TabPanel>

              {/* Request Tab */}
              <TabPanel p={2}>
                {event.llm_model ? (
                  <VStack spacing={2} align="start" w="full">
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="medium">Model:</Text>
                      <Badge size="xs" colorScheme="blue">{event.llm_model}</Badge>
                    </HStack>
                    {event.llm_provider && (
                      <HStack justify="space-between" w="full">
                        <Text fontSize="xs" fontWeight="medium">Provider:</Text>
                        <Badge size="xs" colorScheme="cyan">{event.llm_provider}</Badge>
                      </HStack>
                    )}
                    <Box w="full">
                      <Text fontSize="xs" fontWeight="medium" mb={1}>Request Data:</Text>
                      <Code fontSize="xs" p={2} borderRadius="md" display="block" whiteSpace="pre-wrap">
                        {JSON.stringify(event.output, null, 2).substring(0, 500)}
                        {JSON.stringify(event.output).length > 500 && '...'}
                      </Code>
                    </Box>
                  </VStack>
                ) : (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>No request data available</Text>
                )}
              </TabPanel>

              {/* Response Tab */}
              <TabPanel p={2}>
                {event.output ? (
                  <Box w="full">
                    <Code fontSize="xs" p={2} borderRadius="md" display="block" whiteSpace="pre-wrap" maxH="300px" overflowY="auto">
                      {typeof event.output === 'object' 
                        ? JSON.stringify(event.output, null, 2)
                        : String(event.output)
                      }
                    </Code>
                  </Box>
                ) : (
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>No response data available</Text>
                )}
              </TabPanel>

              {/* Details Tab */}
              <TabPanel p={2}>
                <VStack spacing={2} align="start" w="full">
                  {event.protocol && (
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="medium">Protocol:</Text>
                      <Badge size="xs" colorScheme="purple">{event.protocol}</Badge>
                    </HStack>
                  )}
                  {event.duration && (
                    <HStack justify="space-between" w="full">
                      <Text fontSize="xs" fontWeight="medium">Duration:</Text>
                      <HStack>
                        <Icon as={FiClock} boxSize={3} />
                        <Text fontSize="xs">{event.duration}ms</Text>
                      </HStack>
                    </HStack>
                  )}
                  <HStack justify="space-between" w="full">
                    <Text fontSize="xs" fontWeight="medium">Timestamp:</Text>
                    <Text fontSize="xs">{event.timestamp.toLocaleString()}</Text>
                  </HStack>
                  <Box w="full" pt={2}>
                    <Text fontSize="xs" fontWeight="medium" mb={1}>Full Event Data:</Text>
                    <Code fontSize="xs" p={2} borderRadius="md" display="block" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                      {JSON.stringify(event, null, 2)}
                    </Code>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Collapse>
    </Box>
  );
};

export const TraceTimelineVisualization: React.FC<TraceTimelineVisualizationProps> = ({
  events,
}) => {
  const maxDuration = Math.max(...events.map(e => e.duration || 0), 1);

  if (events.length === 0) {
    return (
      <Box h="full" display="flex" alignItems="center" justifyContent="center" p={8}>
        <VStack spacing={2}>
          <Icon as={FiAlertCircle} boxSize={12} color={useSemanticToken('text.tertiary')} />
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            No trace events yet
          </Text>
          <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
            Interact with agents to see execution traces
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={0} align="stretch" h="full" overflowY="auto">
      <Box p={3} borderBottom="1px" borderColor={useSemanticToken('border.default')}>
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiZap} boxSize={4} color="blue.500" />
            <Text fontSize="sm" fontWeight="medium">Execution Timeline</Text>
          </HStack>
          <Badge colorScheme="blue">{events.length} traces</Badge>
        </HStack>
      </Box>

      {events.slice().reverse().map((event, index) => (
        <TraceRow 
          key={event.id} 
          event={event} 
          index={index}
          totalDuration={maxDuration}
        />
      ))}
    </VStack>
  );
};

export default TraceTimelineVisualization;
