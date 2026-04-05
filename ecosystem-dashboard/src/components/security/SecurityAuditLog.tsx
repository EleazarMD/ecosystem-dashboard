'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Badge,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Code,
  Collapse,
  useDisclosure,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { RepeatIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { formatDistanceToNow, format } from 'date-fns';

interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  agentId?: string;
  sessionId?: string;
  action: string;
  resource?: string;
  outcome: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, unknown>;
  clientIp?: string;
  userAgent?: string;
}

interface SecurityAuditLogProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

const severityColors: Record<string, string> = {
  info: 'blue',
  warning: 'yellow',
  error: 'orange',
  critical: 'red',
};

const outcomeColors: Record<string, string> = {
  success: 'green',
  failure: 'red',
  blocked: 'orange',
};

function AuditEventRow({ event }: { event: AuditEvent }) {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <>
      <Tr 
        cursor="pointer" 
        onClick={onToggle}
        _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}
      >
        <Td>
          <Tooltip label={format(new Date(event.timestamp), 'PPpp')}>
            <Text fontSize="sm">
              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
            </Text>
          </Tooltip>
        </Td>
        <Td>
          <Badge colorScheme={severityColors[event.severity]} fontSize="xs">
            {event.severity}
          </Badge>
        </Td>
        <Td>
          <Text fontSize="sm" fontWeight="medium">{event.eventType}</Text>
        </Td>
        <Td>
          <Text fontSize="sm" noOfLines={1} maxW="200px">{event.action}</Text>
        </Td>
        <Td>
          <Badge colorScheme={outcomeColors[event.outcome]} fontSize="xs">
            {event.outcome}
          </Badge>
        </Td>
        <Td>
          <IconButton
            aria-label="Expand"
            icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            size="xs"
            variant="ghost"
          />
        </Td>
      </Tr>
      {isOpen && (
        <Tr>
          <Td colSpan={6} bg="gray.50" _dark={{ bg: 'gray.800' }}>
            <Box p={3}>
              <VStack align="start" spacing={2}>
                {event.agentId && (
                  <HStack>
                    <Text fontSize="sm" fontWeight="bold">Agent:</Text>
                    <Text fontSize="sm">{event.agentId}</Text>
                  </HStack>
                )}
                {event.resource && (
                  <HStack>
                    <Text fontSize="sm" fontWeight="bold">Resource:</Text>
                    <Text fontSize="sm">{event.resource}</Text>
                  </HStack>
                )}
                {event.reason && (
                  <HStack>
                    <Text fontSize="sm" fontWeight="bold">Reason:</Text>
                    <Text fontSize="sm">{event.reason}</Text>
                  </HStack>
                )}
                {event.clientIp && (
                  <HStack>
                    <Text fontSize="sm" fontWeight="bold">IP:</Text>
                    <Text fontSize="sm">{event.clientIp}</Text>
                  </HStack>
                )}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <Box w="100%">
                    <Text fontSize="sm" fontWeight="bold" mb={1}>Metadata:</Text>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      fontSize="xs"
                      p={2}
                      borderRadius="md"
                    >
                      {JSON.stringify(event.metadata, null, 2)}
                    </Code>
                  </Box>
                )}
              </VStack>
            </Box>
          </Td>
        </Tr>
      )}
    </>
  );
}

export function SecurityAuditLog({ 
  autoRefresh = false, 
  refreshInterval = 10000,
  limit = 50,
}: SecurityAuditLogProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (severityFilter !== 'all') {
        params.append('severity', severityFilter);
      }
      
      const response = await fetch(`/api/security/audit-log?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }
      
      const data = await response.json();
      setEvents(data.events);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, limit]);

  useEffect(() => {
    fetchEvents();
    
    if (autoRefresh) {
      const interval = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchEvents, autoRefresh, refreshInterval]);

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Security Audit Log</Heading>
        
        <HStack>
          <Select
            size="sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            w="150px"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </Select>
          
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RepeatIcon />}
            onClick={fetchEvents}
            isLoading={loading}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {loading && events.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
          <Text mt={2} color="gray.500">Loading audit log...</Text>
        </Box>
      ) : events.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No audit events found</Text>
        </Box>
      ) : (
        <>
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Severity</Th>
                  <Th>Event</Th>
                  <Th>Action</Th>
                  <Th>Outcome</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {events.map((event) => (
                  <AuditEventRow key={event.id} event={event} />
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          
          {total > events.length && (
            <Text textAlign="center" color="gray.500" fontSize="sm" mt={4}>
              Showing {events.length} of {total} events
            </Text>
          )}
        </>
      )}
    </Box>
  );
}
