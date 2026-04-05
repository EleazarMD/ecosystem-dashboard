/**
 * OpenClaw Sessions Panel
 * 
 * Native sessions management for OpenClaw Gateway.
 * Implements sessions.list, sessions.patch, sessions.delete via WebSocket RPC.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Switch,
  Tooltip,
} from '@chakra-ui/react';
import { FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Session {
  key: string;
  agentId: string;
  model?: string;
  lastActivity?: string;
  messageCount?: number;
  thinking?: boolean;
  verbose?: boolean;
}

interface OpenClawSessionsPanelProps {
  connected: boolean;
  sessions: Session[];
  onRefresh: () => Promise<Session[]>;
  onPatch: (key: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

export function OpenClawSessionsPanel({
  connected,
  sessions,
  onRefresh,
  onPatch,
  onDelete,
}: OpenClawSessionsPanelProps) {
  const [loading, setLoading] = useState(false);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    if (connected) {
      handleRefresh();
    }
  }, [connected]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleThinking = async (session: Session) => {
    try {
      await onPatch(session.key, { thinking: !session.thinking });
      await onRefresh();
    } catch (err) {
      console.error('Failed to toggle thinking:', err);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Delete this session?')) return;
    try {
      await onDelete(key);
      await onRefresh();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
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
            Sessions
          </Text>
          <Badge colorScheme="blue" fontSize="xs">
            {sessions.length}
          </Badge>
        </HStack>
        <IconButton
          aria-label="Refresh"
          icon={loading ? <Spinner size="sm" /> : <FiRefreshCw />}
          size="xs"
          variant="ghost"
          onClick={handleRefresh}
          isDisabled={!connected || loading}
        />
      </HStack>

      <Box overflowX="auto" maxH="300px" overflowY="auto">
        {sessions.length === 0 ? (
          <Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>
            No active sessions
          </Text>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Session</Th>
                <Th>Agent</Th>
                <Th>Model</Th>
                <Th>Thinking</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sessions.map((session) => (
                <Tr key={session.key}>
                  <Td>
                    <Text fontSize="xs" fontFamily="mono" color={textPrimary}>
                      {session.key.slice(0, 20)}...
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme="purple" fontSize="xs">
                      {session.agentId}
                    </Badge>
                  </Td>
                  <Td>
                    <Text fontSize="xs" color={textSecondary}>
                      {session.model || 'default'}
                    </Text>
                  </Td>
                  <Td>
                    <Tooltip label="Toggle extended thinking">
                      <Switch
                        size="sm"
                        isChecked={session.thinking}
                        onChange={() => handleToggleThinking(session)}
                      />
                    </Tooltip>
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="Delete"
                      icon={<FiTrash2 />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDelete(session.key)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
    </Box>
  );
}

export default OpenClawSessionsPanel;
