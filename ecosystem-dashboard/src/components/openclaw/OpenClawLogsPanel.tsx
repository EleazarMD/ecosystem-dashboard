/**
 * OpenClaw Logs Panel
 * 
 * Native logs viewer for OpenClaw Gateway.
 * Implements logs.tail via WebSocket RPC with live tailing.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Input,
  Select,
  Spinner,
  Code,
} from '@chakra-ui/react';
import { FiRefreshCw, FiDownload, FiPause, FiPlay } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface OpenClawLogsPanelProps {
  connected: boolean;
  onTail: (cursor?: number, limit?: number) => Promise<{ lines: string[]; cursor: number }>;
}

export function OpenClawLogsPanel({ connected, onTail }: OpenClawLogsPanelProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState<string>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  const fetchLogs = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const result = await onTail(cursor, 100);
      if (result.lines.length > 0) {
        setLogs((prev) => [...prev.slice(-900), ...result.lines]);
        setCursor(result.cursor);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [connected, cursor, onTail]);

  useEffect(() => {
    if (connected && autoRefresh) {
      fetchLogs();
      intervalRef.current = setInterval(fetchLogs, 2000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [connected, autoRefresh, fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  const filteredLogs = logs.filter((line) => {
    if (filter && !line.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    if (level !== 'all') {
      const levelMatch = line.match(/\[(error|warn|info|debug)\]/i);
      if (levelMatch && levelMatch[1].toLowerCase() !== level) {
        return false;
      }
    }
    return true;
  });

  const handleExport = () => {
    const blob = new Blob([filteredLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openclaw-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (line: string) => {
    if (line.includes('[error]') || line.includes('ERROR')) return 'red.400';
    if (line.includes('[warn]') || line.includes('WARN')) return 'yellow.400';
    if (line.includes('[debug]') || line.includes('DEBUG')) return 'gray.500';
    return textSecondary;
  };

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
            Logs
          </Text>
          <Badge colorScheme={autoRefresh ? 'green' : 'gray'} fontSize="xs">
            {autoRefresh ? 'Live' : 'Paused'}
          </Badge>
        </HStack>
        <HStack spacing={1}>
          <IconButton
            aria-label={autoRefresh ? 'Pause' : 'Resume'}
            icon={autoRefresh ? <FiPause /> : <FiPlay />}
            size="xs"
            variant="ghost"
            onClick={() => setAutoRefresh(!autoRefresh)}
          />
          <IconButton
            aria-label="Refresh"
            icon={loading ? <Spinner size="sm" /> : <FiRefreshCw />}
            size="xs"
            variant="ghost"
            onClick={fetchLogs}
            isDisabled={!connected || loading}
          />
          <IconButton
            aria-label="Export"
            icon={<FiDownload />}
            size="xs"
            variant="ghost"
            onClick={handleExport}
            isDisabled={filteredLogs.length === 0}
          />
        </HStack>
      </HStack>

      <HStack p={2} borderBottom="1px solid" borderColor={borderSubtle}>
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="xs"
          flex={1}
        />
        <Select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          size="xs"
          w="100px"
        >
          <option value="all">All</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </Select>
      </HStack>

      <Box
        h="300px"
        overflowY="auto"
        p={2}
        bg="gray.900"
        fontFamily="mono"
        fontSize="xs"
      >
        {filteredLogs.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={4}>
            No logs available
          </Text>
        ) : (
          <VStack align="stretch" spacing={0}>
            {filteredLogs.map((line, idx) => (
              <Code
                key={idx}
                bg="transparent"
                color={getLogColor(line)}
                fontSize="xs"
                whiteSpace="pre-wrap"
                wordBreak="break-all"
              >
                {line}
              </Code>
            ))}
            <div ref={logsEndRef} />
          </VStack>
        )}
      </Box>
    </Box>
  );
}

export default OpenClawLogsPanel;
