/**
 * Email Watcher Panel
 * Right panel component for monitoring email processing
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  Button,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

interface WatcherStatus {
  enabled: boolean;
  paused_reason?: string;
  last_heartbeat?: string;
  processed_count?: number;
  pending_count?: number;
  error_count?: number;
}

interface ProcessingStats {
  indexed_emails: {
    sent: number;
    inbox: number;
  };
  total_contacts: number;
  total_topics: number;
}

export default function EmailWatcherPanel() {
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');

  const [status, setStatus] = useState<WatcherStatus | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, statsRes] = await Promise.all([
          fetch(`${GRAPHRAG_URL}/watcher/status`),
          fetch(`${GRAPHRAG_URL}/graph/stats`),
        ]);

        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch watcher data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Trigger manual sync on Mac watcher
  const handleForceSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      // Trigger sync on GraphRAG which forwards to Mac watcher
      const res = await fetch(`${GRAPHRAG_URL}/sync/trigger`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSyncMessage(data.message || 'Sync started');
      } else {
        setSyncMessage('Failed to trigger sync');
      }
    } catch (error) {
      setSyncMessage('Error connecting to sync service');
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center" h="200px">
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

  const totalEmails = (stats?.indexed_emails.sent || 0) + (stats?.indexed_emails.inbox || 0);

  return (
    <Box p={4} h="full" overflowY="auto">
      <VStack align="stretch" spacing={4}>
        {/* Status Header */}
        <HStack justify="space-between">
          <HStack>
            <Icon
              as={status?.enabled ? CheckCircleIcon : ExclamationCircleIcon}
              color={status?.enabled ? 'green.500' : 'orange.500'}
              boxSize={5}
            />
            <Text fontWeight="600" color={textColor}>
              Watcher Status
            </Text>
          </HStack>
          <Badge colorScheme={status?.enabled ? 'green' : 'orange'} fontSize="xs">
            {status?.enabled ? 'Running' : 'Paused'}
          </Badge>
        </HStack>

        {status?.paused_reason && (
          <Box bg={bgSubtle} p={2} borderRadius="md">
            <Text fontSize="xs" color={textSecondary}>
              Paused: {status.paused_reason}
            </Text>
          </Box>
        )}

        <Divider borderColor={borderColor} />

        {/* Processing Stats */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={3}>Processing Stats</Text>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Stat size="sm">
                <StatLabel color={textSecondary}>Total Indexed</StatLabel>
                <StatNumber fontSize="xl">{totalEmails.toLocaleString()}</StatNumber>
                <StatHelpText>emails</StatHelpText>
              </Stat>
              <Stat size="sm">
                <StatLabel color={textSecondary}>Contacts</StatLabel>
                <StatNumber fontSize="xl">{stats?.total_contacts || 0}</StatNumber>
                <StatHelpText>discovered</StatHelpText>
              </Stat>
            </HStack>

            <HStack justify="space-between">
              <Stat size="sm">
                <StatLabel color={textSecondary}>Inbox</StatLabel>
                <StatNumber fontSize="lg">{stats?.indexed_emails.inbox || 0}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel color={textSecondary}>Sent</StatLabel>
                <StatNumber fontSize="lg">{stats?.indexed_emails.sent || 0}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel color={textSecondary}>Topics</StatLabel>
                <StatNumber fontSize="lg">{stats?.total_topics || 0}</StatNumber>
              </Stat>
            </HStack>
          </VStack>
        </Box>

        <Divider borderColor={borderColor} />

        {/* Last Activity */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={2}>Last Activity</Text>
          {status?.last_heartbeat ? (
            <Text fontSize="sm" color={textSecondary}>
              {new Date(status.last_heartbeat).toLocaleString()}
            </Text>
          ) : (
            <Text fontSize="sm" color={textSecondary}>No recent activity</Text>
          )}
        </Box>

        {/* Quick Actions */}
        <Box>
          <Text fontWeight="600" color={textColor} mb={2}>Quick Actions</Text>
          <VStack align="stretch" spacing={2}>
            <Button 
              size="sm" 
              variant="outline" 
              colorScheme="blue"
              onClick={handleForceSync}
              isLoading={syncing}
              loadingText="Syncing..."
            >
              Force Sync
            </Button>
            {syncMessage && (
              <Text fontSize="xs" color="green.500">{syncMessage}</Text>
            )}
            <Button size="sm" variant="outline" colorScheme="purple">
              Reindex All
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
