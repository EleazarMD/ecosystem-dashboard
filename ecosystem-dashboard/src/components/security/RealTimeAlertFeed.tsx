'use client';

import React, { useEffect, useRef } from 'react';
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
  Collapse,
  useDisclosure,
  Divider,
} from '@chakra-ui/react';
import {
  WarningIcon,
  CheckCircleIcon,
  InfoIcon,
  BellIcon,
  DeleteIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@chakra-ui/icons';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SecurityAlert } from '@/hooks/useSecurityWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeAlertFeedProps {
  alerts: SecurityAlert[];
  onClear?: () => void;
  maxVisible?: number;
  title?: string;
}

const severityConfig = {
  critical: {
    color: 'red',
    icon: WarningIcon,
    bg: 'red.900',
    borderColor: 'red.500',
  },
  warning: {
    color: 'orange',
    icon: WarningIcon,
    bg: 'orange.900',
    borderColor: 'orange.500',
  },
  info: {
    color: 'blue',
    icon: InfoIcon,
    bg: 'blue.900',
    borderColor: 'blue.500',
  },
};

function AlertItem({ alert }: { alert: SecurityAlert }) {
  const { isOpen, onToggle } = useDisclosure();
  const config = severityConfig[alert.severity] || severityConfig.info;
  
  const timeAgo = formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true });

  return (
    <Box
      p={3}
      bg={`${config.color}.900`}
      borderLeft="4px solid"
      borderLeftColor={config.borderColor}
      borderRadius="md"
      opacity={0.95}
      _hover={{ opacity: 1 }}
      transition="opacity 0.2s"
      animation="slideIn 0.3s ease-out"
      sx={{
        '@keyframes slideIn': {
          from: { transform: 'translateX(-20px)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 0.95 },
        },
      }}
    >
      <HStack justify="space-between" align="start">
        <HStack spacing={3} align="start" flex={1}>
          <Icon as={config.icon} color={`${config.color}.300`} boxSize={5} mt={0.5} />
          <VStack align="start" spacing={1} flex={1}>
            <HStack spacing={2} flexWrap="wrap">
              <Badge colorScheme={config.color} fontSize="xs" textTransform="uppercase">
                {alert.severity}
              </Badge>
              <Text fontSize="xs" color="gray.400">
                {timeAgo}
              </Text>
            </HStack>
            <Text fontWeight="semibold" fontSize="sm" color="white">
              {alert.title}
            </Text>
            <Text fontSize="xs" color="gray.300" noOfLines={isOpen ? undefined : 2}>
              {alert.message}
            </Text>
          </VStack>
        </HStack>
        
        {alert.context && Object.keys(alert.context).length > 0 && (
          <IconButton
            aria-label="Toggle details"
            icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            size="xs"
            variant="ghost"
            onClick={onToggle}
          />
        )}
      </HStack>
      
      <Collapse in={isOpen} animateOpacity>
        {alert.context && (
          <Box mt={3} p={2} bg="blackAlpha.300" borderRadius="md" fontSize="xs">
            <Text color="gray.400" mb={1}>Context:</Text>
            <Box as="pre" whiteSpace="pre-wrap" color="gray.300">
              {JSON.stringify(alert.context, null, 2)}
            </Box>
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

export function RealTimeAlertFeed({
  alerts,
  onClear,
  maxVisible = 10,
  title = 'Live Alerts',
}: RealTimeAlertFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleAlerts = alerts.slice(0, maxVisible);
  
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  return (
    <GlassPanel p={4} h="100%">
      <VStack align="stretch" spacing={4} h="100%">
        <HStack justify="space-between">
          <HStack spacing={2}>
            <Icon as={BellIcon} color="purple.400" />
            <Heading size="sm">{title}</Heading>
            {alerts.length > 0 && (
              <Badge colorScheme="purple" variant="solid" borderRadius="full">
                {alerts.length}
              </Badge>
            )}
          </HStack>
          
          <HStack spacing={2}>
            {criticalCount > 0 && (
              <Badge colorScheme="red" variant="solid">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge colorScheme="orange" variant="solid">
                {warningCount} Warning
              </Badge>
            )}
            {onClear && alerts.length > 0 && (
              <Tooltip label="Clear all alerts">
                <IconButton
                  aria-label="Clear alerts"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={onClear}
                />
              </Tooltip>
            )}
          </HStack>
        </HStack>
        
        <Divider borderColor="whiteAlpha.200" />
        
        <Box ref={containerRef} flex={1} overflowY="auto" pr={2}>
          {visibleAlerts.length === 0 ? (
            <VStack py={8} spacing={3}>
              <Icon as={CheckCircleIcon} color="green.400" boxSize={8} />
              <Text color="gray.400" fontSize="sm" textAlign="center">
                No active alerts
              </Text>
              <Text color="gray.500" fontSize="xs" textAlign="center">
                Real-time alerts will appear here
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={3}>
              {visibleAlerts.map((alert) => (
                <AlertItem key={alert.alert_id} alert={alert} />
              ))}
              
              {alerts.length > maxVisible && (
                <Text fontSize="xs" color="gray.500" textAlign="center" py={2}>
                  + {alerts.length - maxVisible} more alerts
                </Text>
              )}
            </VStack>
          )}
        </Box>
      </VStack>
    </GlassPanel>
  );
}
