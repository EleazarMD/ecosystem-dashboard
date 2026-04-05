/**
 * Error Logs Panel
 * Centralized error monitoring and diagnostics for the entire ecosystem
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  Button,
  Icon,
  Code,
  Collapse,
  IconButton,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiTrash2,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiX,
} from 'react-icons/fi';
import type { ErrorLog } from '@/lib/error-logger';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ErrorLogWithId extends ErrorLog {
  id: number;
}

export function ErrorLogsPanel() {
  const [logs, setLogs] = useState<ErrorLogWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  
  // Filters
  const [sourceFilter, setSourceFilter] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  
  // Available options
  const [sources, setSources] = useState<string[]>([]);
  const [errorTypes, setErrorTypes] = useState<string[]>([]);

  const toast = useToast();

  // Color mode
  const tableBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');
  const errorColor = 'red.500';
  const expandedBg = useSemanticToken('surface.base');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (sourceFilter) params.append('source', sourceFilter);
      if (errorTypeFilter) params.append('errorType', errorTypeFilter);

      const response = await fetch(`/api/system/error-logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setSources(data.filters.sources);
        setErrorTypes(data.filters.errorTypes);
      }
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
      toast({
        title: 'Failed to load error logs',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Clear all error logs? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/system/error-logs', {
        method: 'DELETE',
      });

      if (response.ok) {
        setLogs([]);
        toast({
          title: 'Error logs cleared',
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to clear logs',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchLogs();
  }, [sourceFilter, errorTypeFilter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, sourceFilter, errorTypeFilter]);

  const getErrorTypeBadgeColor = (errorType: string): string => {
    if (errorType.includes('connection')) return 'red';
    if (errorType.includes('request')) return 'orange';
    if (errorType.includes('parse')) return 'yellow';
    if (errorType.includes('timeout')) return 'purple';
    return 'gray';
  };

  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case 'podcast-studio': return 'blue';
      case 'ai-gateway': return 'purple';
      case 'knowledge-graph': return 'green';
      case 'research-lab': return 'cyan';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Header & Controls */}
      <HStack justify="space-between">
        <HStack spacing={4}>
          <Icon as={FiAlertTriangle} boxSize={5} color={errorColor} />
          <Text fontSize="lg" fontWeight="600">
            Error Logs
          </Text>
          <Badge colorScheme="red">{logs.length} errors</Badge>
        </HStack>

        <HStack spacing={2}>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
              Auto-refresh
            </FormLabel>
            <Switch
              id="auto-refresh"
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
          </FormControl>

          <Button
            size="sm"
            leftIcon={<FiRefreshCw />}
            onClick={fetchLogs}
            isLoading={loading}
          >
            Refresh
          </Button>

          <Button
            size="sm"
            leftIcon={<FiTrash2 />}
            colorScheme="red"
            variant="ghost"
            onClick={clearLogs}
            isDisabled={logs.length === 0}
          >
            Clear All
          </Button>
        </HStack>
      </HStack>

      {/* Filters */}
      <HStack spacing={4}>
        <Select
          size="sm"
          placeholder="All Sources"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          maxW="200px"
        >
          {sources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </Select>

        <Select
          size="sm"
          placeholder="All Error Types"
          value={errorTypeFilter}
          onChange={(e) => setErrorTypeFilter(e.target.value)}
          maxW="200px"
        >
          {errorTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
      </HStack>

      {/* Error Count Alert */}
      {logs.length > 0 && (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            {logs.length} errors detected. Review and resolve issues to improve system reliability.
          </Text>
        </Alert>
      )}

      {/* Logs Table */}
      <Box
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        overflow="hidden"
        bg={tableBg}
      >
        <Table size="sm">
          <Thead>
            <Tr>
              <Th width="30px"></Th>
              <Th>Timestamp</Th>
              <Th>Source</Th>
              <Th>Error Type</Th>
              <Th>Message</Th>
              <Th width="50px"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {logs.length === 0 ? (
              <Tr>
                <Td colSpan={6} textAlign="center" py={8}>
                  <VStack spacing={2}>
                    <Icon as={FiAlertTriangle} boxSize={8} color={useSemanticToken('text.tertiary')} />
                    <Text color={useSemanticToken('text.secondary')} fontSize="sm">
                      {loading ? 'Loading...' : 'No errors logged'}
                    </Text>
                  </VStack>
                </Td>
              </Tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.id}>
                  <Tr
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                    onClick={() => toggleExpanded(log.id)}
                  >
                    <Td>
                      <IconButton
                        aria-label="Expand"
                        icon={expandedIds.has(log.id) ? <FiChevronDown /> : <FiChevronRight />}
                        size="xs"
                        variant="ghost"
                      />
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Icon as={FiClock} boxSize={3} color={useSemanticToken('text.secondary')} />
                        <Text fontSize="xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </Text>
                      </HStack>
                    </Td>
                    <Td>
                      <Badge colorScheme={getSourceBadgeColor(log.source)} fontSize="10px">
                        {log.source}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge colorScheme={getErrorTypeBadgeColor(log.errorType)} fontSize="10px">
                        {log.errorType}
                      </Badge>
                    </Td>
                    <Td>
                      <Text fontSize="xs" noOfLines={1}>
                        {log.message}
                      </Text>
                    </Td>
                    <Td>
                      <Tooltip label="View details">
                        <Icon
                          as={expandedIds.has(log.id) ? FiX : FiAlertTriangle}
                          boxSize={4}
                          color={errorColor}
                        />
                      </Tooltip>
                    </Td>
                  </Tr>

                  {/* Expanded Details */}
                  <Tr>
                    <Td colSpan={6} p={0} borderBottom="none">
                      <Collapse in={expandedIds.has(log.id)} animateOpacity>
                        <Box p={4} bg={expandedBg}>
                          <VStack align="stretch" spacing={3}>
                            {/* Full Message */}
                            <Box>
                              <Text fontSize="xs" fontWeight="600" mb={1}>
                                Error Message:
                              </Text>
                              <Code fontSize="xs" p={2} display="block" borderRadius="md">
                                {log.message}
                              </Code>
                            </Box>

                            {/* Details */}
                            {log.details && (
                              <Box>
                                <Text fontSize="xs" fontWeight="600" mb={1}>
                                  Details:
                                </Text>
                                <Code fontSize="xs" p={2} display="block" borderRadius="md" whiteSpace="pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </Code>
                              </Box>
                            )}

                            {/* Stack Trace */}
                            {log.stackTrace && (
                              <Box>
                                <Text fontSize="xs" fontWeight="600" mb={1}>
                                  Stack Trace:
                                </Text>
                                <Code fontSize="10px" p={2} display="block" borderRadius="md" whiteSpace="pre-wrap">
                                  {log.stackTrace}
                                </Code>
                              </Box>
                            )}

                            {/* Session Info */}
                            <HStack spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
                              <Text>Session: {log.sessionId || 'N/A'}</Text>
                              {log.userId && <Text>User: {log.userId}</Text>}
                            </HStack>
                          </VStack>
                        </Box>
                      </Collapse>
                    </Td>
                  </Tr>
                </React.Fragment>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
}
