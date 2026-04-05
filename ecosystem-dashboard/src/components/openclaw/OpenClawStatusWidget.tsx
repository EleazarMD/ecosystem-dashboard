/**
 * OpenClaw Status Widget
 * 
 * Displays the current status of the OpenClaw gateway daemon.
 * Shows running status, active sessions, channels, and memory entries.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tooltip,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { FiTerminal, FiRefreshCw, FiActivity, FiUsers, FiClock, FiSmartphone, FiMessageSquare } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface OpenClawStatus {
  running: boolean;
  uptime_seconds: number;
  active_sessions: number;
  memory_entries: number;
  last_activity: string | null;
  version: string;
  channels: {
    ios: boolean;
    imessage: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  skills_loaded: number;
  policy_stack: string[];
}

interface OpenClawStatusWidgetProps {
  compact?: boolean;
}

export function OpenClawStatusWidget({ compact = false }: OpenClawStatusWidgetProps) {
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/openclaw/status');
      const data = await res.json();
      
      if (data.success && data.status) {
        setStatus(data.status);
        setError(data.error || null);
      } else {
        setError(data.error || 'Failed to fetch status');
        setStatus(null);
      }
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const getStatusColor = (): string => {
    if (!status) return 'gray';
    if (!status.running) return 'red';
    if (status.active_sessions > 0) return 'green';
    return 'blue';
  };

  const getStatusText = (): string => {
    if (!status) return 'Unknown';
    if (!status.running) return 'Offline';
    if (status.active_sessions > 0) return 'Active';
    return 'Idle';
  };

  if (compact) {
    return (
      <HStack
        p={3}
        bg={bgElevated}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderSubtle}
        spacing={3}
      >
        <Icon as={FiTerminal} color={textPrimary} />
        <Text fontSize="sm" fontWeight="500" color={textPrimary}>
          OpenClaw
        </Text>
        <Badge colorScheme={getStatusColor()} size="sm">
          {getStatusText()}
        </Badge>
        {status?.running && (
          <Text fontSize="xs" color={textSecondary}>
            {status.active_sessions} sessions
          </Text>
        )}
      </HStack>
    );
  }

  return (
    <Box
      p={4}
      bg={bgElevated}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderSubtle}
    >
      <HStack justify="space-between" mb={4}>
        <HStack spacing={2}>
          <Icon as={FiTerminal} color={textPrimary} boxSize={5} />
          <Text fontWeight="600" color={textPrimary}>
            OpenClaw Gateway
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Badge colorScheme={getStatusColor()} variant="solid">
            {getStatusText()}
          </Badge>
          <Tooltip label="Refresh status">
            <IconButton
              aria-label="Refresh"
              icon={isLoading ? <Spinner size="xs" /> : <FiRefreshCw size={14} />}
              size="xs"
              variant="ghost"
              onClick={fetchStatus}
              isDisabled={isLoading}
            />
          </Tooltip>
        </HStack>
      </HStack>

      {error && !status?.running && (
        <Text fontSize="xs" color="red.400" mb={3}>
          {error}
        </Text>
      )}

      {status && (
        <>
          <SimpleGrid columns={3} spacing={4} mb={4}>
            <Stat size="sm">
              <StatLabel fontSize="xs" color={textSecondary}>
                <HStack spacing={1}>
                  <Icon as={FiUsers} boxSize={3} />
                  <Text>Sessions</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg" color={textPrimary}>
                {status.active_sessions}
              </StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs" color={textSecondary}>
                <HStack spacing={1}>
                  <Icon as={FiActivity} boxSize={3} />
                  <Text>Memory</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg" color={textPrimary}>
                {status.memory_entries}
              </StatNumber>
            </Stat>
            <Stat size="sm">
              <StatLabel fontSize="xs" color={textSecondary}>
                <HStack spacing={1}>
                  <Icon as={FiClock} boxSize={3} />
                  <Text>Uptime</Text>
                </HStack>
              </StatLabel>
              <StatNumber fontSize="lg" color={textPrimary}>
                {status.running ? formatUptime(status.uptime_seconds) : '-'}
              </StatNumber>
            </Stat>
          </SimpleGrid>

          <VStack align="start" spacing={2}>
            <Text fontSize="xs" fontWeight="500" color={textSecondary}>
              Channels
            </Text>
            <HStack spacing={2} flexWrap="wrap">
              <Tooltip label="iOS App">
                <Badge
                  size="sm"
                  colorScheme={status.channels.ios ? 'green' : 'gray'}
                  variant={status.channels.ios ? 'solid' : 'outline'}
                >
                  <HStack spacing={1}>
                    <Icon as={FiSmartphone} boxSize={3} />
                    <Text>iOS</Text>
                  </HStack>
                </Badge>
              </Tooltip>
              <Tooltip label="iMessage">
                <Badge
                  size="sm"
                  colorScheme={status.channels.imessage ? 'green' : 'gray'}
                  variant={status.channels.imessage ? 'solid' : 'outline'}
                >
                  <HStack spacing={1}>
                    <Icon as={FiMessageSquare} boxSize={3} />
                    <Text>iMessage</Text>
                  </HStack>
                </Badge>
              </Tooltip>
              <Tooltip label="WhatsApp">
                <Badge
                  size="sm"
                  colorScheme={status.channels.whatsapp ? 'green' : 'gray'}
                  variant={status.channels.whatsapp ? 'solid' : 'outline'}
                >
                  WhatsApp
                </Badge>
              </Tooltip>
              <Tooltip label="Telegram">
                <Badge
                  size="sm"
                  colorScheme={status.channels.telegram ? 'green' : 'gray'}
                  variant={status.channels.telegram ? 'solid' : 'outline'}
                >
                  Telegram
                </Badge>
              </Tooltip>
            </HStack>
          </VStack>

          {status.skills_loaded > 0 && (
            <Text fontSize="xs" color={textSecondary} mt={3}>
              {status.skills_loaded} skills loaded • v{status.version}
            </Text>
          )}
        </>
      )}

      {lastRefresh && (
        <Text fontSize="xs" color={textSecondary} mt={2}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </Text>
      )}
    </Box>
  );
}

export default OpenClawStatusWidget;
