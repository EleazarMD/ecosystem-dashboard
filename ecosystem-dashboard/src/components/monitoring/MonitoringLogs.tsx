/**
 * Monitoring Logs Component
 * Displays system events, alerts, and thermal incidents
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Select,
  Button,
  Spinner,
  useColorMode,
  Alert,
  AlertIcon,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { RefreshCw, Trash2, AlertTriangle, Thermometer, Zap, HardDrive, Cpu } from 'lucide-react';
import { GlassPanel } from '@/components/ui';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'thermal' | 'power' | 'vram' | 'process' | 'system';
  component: string;
  message: string;
  value?: number;
  threshold?: number;
}

interface MonitoringLogsProps {
  refreshInterval?: number;
  maxHeight?: string;
}

const levelColors: Record<string, string> = {
  info: 'blue',
  warning: 'yellow',
  error: 'orange',
  critical: 'red',
};

const categoryIcons: Record<string, React.ReactNode> = {
  thermal: <Thermometer size={14} />,
  power: <Zap size={14} />,
  vram: <HardDrive size={14} />,
  process: <Cpu size={14} />,
  system: <AlertTriangle size={14} />,
};

export const MonitoringLogs: React.FC<MonitoringLogsProps> = ({
  refreshInterval = 10000,
  maxHeight = '400px',
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const fetchLogs = useCallback(async () => {
    try {
      let url = '/api/monitoring/logs?limit=100';
      if (levelFilter !== 'all') url += `&level=${levelFilter}`;
      if (categoryFilter !== 'all') url += `&category=${categoryFilter}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, categoryFilter]);
  
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchLogs, refreshInterval]);
  
  const clearLogs = async () => {
    try {
      await fetch('/api/monitoring/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  const criticalCount = logs.filter(l => l.level === 'critical').length;
  const errorCount = logs.filter(l => l.level === 'error').length;
  const warningCount = logs.filter(l => l.level === 'warning').length;
  
  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Text fontWeight="semibold">System Logs</Text>
          {criticalCount > 0 && (
            <Badge colorScheme="red">{criticalCount} critical</Badge>
          )}
          {errorCount > 0 && (
            <Badge colorScheme="orange">{errorCount} errors</Badge>
          )}
          {warningCount > 0 && (
            <Badge colorScheme="yellow">{warningCount} warnings</Badge>
          )}
        </HStack>
        <HStack>
          <Tooltip label="Refresh">
            <IconButton
              aria-label="Refresh logs"
              icon={<RefreshCw size={16} />}
              size="sm"
              variant="ghost"
              onClick={fetchLogs}
              isLoading={loading}
            />
          </Tooltip>
          <Tooltip label="Clear all logs">
            <IconButton
              aria-label="Clear logs"
              icon={<Trash2 size={16} />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={clearLogs}
            />
          </Tooltip>
        </HStack>
      </HStack>
      
      {/* Filters */}
      <HStack spacing={4}>
        <HStack>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>Level:</Text>
          <Select
            size="sm"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            w="120px"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </Select>
        </HStack>
        <HStack>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>Category:</Text>
          <Select
            size="sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            w="120px"
          >
            <option value="all">All</option>
            <option value="thermal">Thermal</option>
            <option value="power">Power</option>
            <option value="vram">VRAM</option>
            <option value="process">Process</option>
            <option value="system">System</option>
          </Select>
        </HStack>
        <Badge colorScheme="gray">{logs.length} entries</Badge>
      </HStack>
      
      {/* Logs List */}
      <Box
        maxH={maxHeight}
        overflowY="auto"
        borderRadius="md"
        border="1px solid"
        borderColor={isDark ? 'whiteAlpha.200' : 'gray.200'}
      >
        {loading && logs.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Spinner size="md" color="blue.400" />
          </Box>
        ) : logs.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
              No logs to display
            </Text>
          </Box>
        ) : (
          <VStack spacing={0} align="stretch">
            {logs.map((log) => (
              <Box
                key={log.id}
                p={3}
                borderBottom="1px solid"
                borderColor={isDark ? 'whiteAlpha.100' : 'gray.100'}
                bg={
                  log.level === 'critical'
                    ? isDark ? 'red.900' : 'red.50'
                    : log.level === 'error'
                    ? isDark ? 'orange.900' : 'orange.50'
                    : 'transparent'
                }
                _hover={{
                  bg: isDark ? 'whiteAlpha.50' : 'gray.50',
                }}
              >
                <HStack justify="space-between" mb={1}>
                  <HStack spacing={2}>
                    <Badge
                      colorScheme={levelColors[log.level]}
                      size="sm"
                      textTransform="uppercase"
                    >
                      {log.level}
                    </Badge>
                    <HStack spacing={1} color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                      {categoryIcons[log.category]}
                      <Text fontSize="xs">{log.category}</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="medium">
                      {log.component}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                    {formatTime(log.timestamp)}
                  </Text>
                </HStack>
                <Text fontSize="sm" color={isDark ? 'whiteAlpha.800' : 'gray.700'}>
                  {log.message}
                  {log.value !== undefined && log.threshold !== undefined && (
                    <Text as="span" fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.500'} ml={2}>
                      (threshold: {log.threshold})
                    </Text>
                  )}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
};

export default MonitoringLogs;
