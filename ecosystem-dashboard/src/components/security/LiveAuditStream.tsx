'use client';

import React, { useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Heading,
  IconButton,
  Tooltip,
  Divider,
  Code,
} from '@chakra-ui/react';
import {
  InfoIcon,
  CheckCircleIcon,
  WarningIcon,
  NotAllowedIcon,
  DeleteIcon,
  TimeIcon,
} from '@chakra-ui/icons';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AuditEvent } from '@/hooks/useSecurityWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface LiveAuditStreamProps {
  events: AuditEvent[];
  onClear?: () => void;
  maxVisible?: number;
  autoScroll?: boolean;
}

const outcomeConfig: Record<string, { color: string; icon: typeof CheckCircleIcon }> = {
  success: { color: 'green', icon: CheckCircleIcon },
  denied: { color: 'red', icon: NotAllowedIcon },
  blocked: { color: 'red', icon: NotAllowedIcon },
  failed: { color: 'orange', icon: WarningIcon },
  pending: { color: 'yellow', icon: TimeIcon },
};

function AuditEventItem({ event }: { event: AuditEvent }) {
  const config = outcomeConfig[event.outcome] || { color: 'gray', icon: InfoIcon };
  const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });

  return (
    <HStack
      p={2}
      bg="whiteAlpha.50"
      borderRadius="md"
      spacing={3}
      fontSize="xs"
      _hover={{ bg: 'whiteAlpha.100' }}
      transition="all 0.2s"
      animation="slideIn 0.2s ease-out"
      sx={{
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateY(-10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Icon as={config.icon} color={`${config.color}.400`} boxSize={3} />
      
      <VStack align="start" spacing={0} flex={1} minW={0}>
        <HStack spacing={2} flexWrap="wrap">
          <Badge colorScheme={config.color} fontSize="2xs" variant="subtle">
            {event.outcome}
          </Badge>
          <Code fontSize="2xs" bg="whiteAlpha.100" px={1}>
            {event.actor}
          </Code>
        </HStack>
        <Text color="gray.300" noOfLines={1} title={event.resource}>
          {event.resource}
        </Text>
      </VStack>
      
      <Text color="gray.500" fontSize="2xs" whiteSpace="nowrap">
        {timeAgo}
      </Text>
    </HStack>
  );
}

export function LiveAuditStream({
  events,
  onClear,
  maxVisible = 15,
  autoScroll = true,
}: LiveAuditStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleEvents = events.slice(0, maxVisible);
  
  // Calculate quick stats
  const successCount = events.filter(e => e.outcome === 'success').length;
  const deniedCount = events.filter(e => e.outcome === 'denied' || e.outcome === 'blocked').length;
  
  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (autoScroll && containerRef.current && events.length > 0) {
      containerRef.current.scrollTop = 0;
    }
  }, [events.length, autoScroll]);

  return (
    <GlassPanel p={4} h="100%">
      <VStack align="stretch" spacing={3} h="100%">
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={InfoIcon} color="cyan.400" />
            <Heading size="sm">Live Audit Stream</Heading>
          </HStack>
          
          <HStack spacing={2}>
            <Tooltip label={`${successCount} successful, ${deniedCount} denied`}>
              <HStack spacing={1}>
                <Badge colorScheme="green" variant="outline" fontSize="2xs">
                  {successCount}
                </Badge>
                <Badge colorScheme="red" variant="outline" fontSize="2xs">
                  {deniedCount}
                </Badge>
              </HStack>
            </Tooltip>
            
            {onClear && events.length > 0 && (
              <Tooltip label="Clear stream">
                <IconButton
                  aria-label="Clear stream"
                  icon={<DeleteIcon />}
                  size="xs"
                  variant="ghost"
                  onClick={onClear}
                />
              </Tooltip>
            )}
          </HStack>
        </HStack>
        
        <Divider borderColor="whiteAlpha.200" />
        
        <Box ref={containerRef} flex={1} overflowY="auto" pr={1}>
          {visibleEvents.length === 0 ? (
            <VStack py={6} spacing={2}>
              <Icon as={TimeIcon} color="gray.500" boxSize={5} />
              <Text color="gray.500" fontSize="xs" textAlign="center">
                Waiting for events...
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={1}>
              {visibleEvents.map((event) => (
                <AuditEventItem key={event.event_id} event={event} />
              ))}
              
              {events.length > maxVisible && (
                <Text fontSize="2xs" color="gray.600" textAlign="center" py={1}>
                  Showing {maxVisible} of {events.length}
                </Text>
              )}
            </VStack>
          )}
        </Box>
      </VStack>
    </GlassPanel>
  );
}
