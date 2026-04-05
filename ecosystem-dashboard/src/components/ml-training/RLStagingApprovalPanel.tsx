/**
 * RL Staging Approval Panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Textarea,
  useToast,
  Spinner,
  Link,
  Icon,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface StagingStatus {
  production_version: number | string;
  staging_version: number | string;
  is_identical: boolean;
  diff_count: number;
  diffs: Array<{type: string; key: string; old_value?: any; new_value?: any}>;
  staging_ui_url: string;
  production_ui_url: string;
}

interface ApprovalHistoryEntry {
  timestamp: string;
  action: string;
  from_version?: number;
  to_version?: number;
  rejected_version?: number;
  reason: string;
}

const STAGING_API_URL = 'http://100.108.41.22:8023';

export const RLStagingApprovalPanel: React.FC = () => {
  const [stagingStatus, setStagingStatus] = useState<StagingStatus | null>(null);
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [promoteReason, setPromoteReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showPromoteForm, setShowPromoteForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgCard = useSemanticToken('surface.card');
  const borderSubtle = useSemanticToken('border.subtle');

  const fetchData = useCallback(async () => {
    try {
      const statusRes = await fetch(STAGING_API_URL + '/api/staging/status');
      const historyRes = await fetch(STAGING_API_URL + '/api/staging/history');
      if (statusRes.ok) setStagingStatus(await statusRes.json());
      if (historyRes.ok) setHistory((await historyRes.json()).history || []);
    } catch (err) {
      console.error('Failed to fetch staging data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePromote = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(STAGING_API_URL + '/api/staging/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: promoteReason }),
      });
      if (res.ok) {
        toast({ title: 'Promoted to Production', status: 'success', duration: 5000 });
        setShowPromoteForm(false);
        setPromoteReason('');
        await fetchData();
      } else {
        toast({ title: 'Promotion Failed', status: 'error', duration: 5000 });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(STAGING_API_URL + '/api/staging/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        toast({ title: 'Changes Rejected', status: 'info', duration: 5000 });
        setShowRejectForm(false);
        setRejectReason('');
        await fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading staging status...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color={textPrimary}>RL Staging Approval</Text>
            <Text color={textSecondary}>Review and approve RL parameter changes</Text>
          </Box>
          {stagingStatus && (
            <HStack>
              <Badge colorScheme="blue" px={3} py={1}>Prod v{stagingStatus.production_version}</Badge>
              <Icon as={ArrowRightIcon} boxSize={4} />
              <Badge colorScheme="purple" px={3} py={1}>Staging v{stagingStatus.staging_version}</Badge>
            </HStack>
          )}
        </HStack>
        <Divider borderColor={borderSubtle} />
        {stagingStatus && stagingStatus.is_identical ? (
          <VStack py={8}>
            <Icon as={CheckCircleIcon} boxSize={12} color="green.400" />
            <Text fontSize="lg" fontWeight="bold" color={textPrimary}>In Sync</Text>
            <Text color={textSecondary}>No changes pending</Text>
          </VStack>
        ) : stagingStatus && (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Text fontWeight="bold" color={textPrimary}>{stagingStatus.diff_count} Changes</Text>
              <Badge colorScheme="orange">Pending</Badge>
            </HStack>
            <Box bg="gray.900" p={4} borderRadius="md" maxH="200px" overflowY="auto" fontFamily="mono" fontSize="sm">
              {stagingStatus.diffs.map((diff, i) => (
                <Text key={i} color={diff.type === 'added' ? 'green.400' : diff.type === 'removed' ? 'red.400' : 'yellow.400'}>
                  {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : '~'} {diff.key}
                </Text>
              ))}
            </Box>
            <HStack spacing={4}>
              <Link href={stagingStatus.staging_ui_url} isExternal>
                <Button size="sm" colorScheme="purple" variant="outline">Preview Staging</Button>
              </Link>
              <Link href={stagingStatus.production_ui_url} isExternal>
                <Button size="sm" variant="outline">View Production</Button>
              </Link>
            </HStack>
            {!showPromoteForm && !showRejectForm && (
              <HStack spacing={4} pt={4}>
                <Button colorScheme="green" size="lg" onClick={() => setShowPromoteForm(true)} isDisabled={actionLoading}>Approve & Promote</Button>
                <Button colorScheme="red" size="lg" variant="outline" onClick={() => setShowRejectForm(true)} isDisabled={actionLoading}>Reject</Button>
              </HStack>
            )}
            {showPromoteForm && (
              <Box bg="green.900" p={4} borderRadius="md">
                <Text fontWeight="bold" mb={2}>Promote to Production</Text>
                <Textarea placeholder="Reason..." value={promoteReason} onChange={(e) => setPromoteReason(e.target.value)} mb={3} />
                <HStack>
                  <Button colorScheme="green" onClick={handlePromote} isLoading={actionLoading}>Confirm</Button>
                  <Button variant="ghost" onClick={() => setShowPromoteForm(false)}>Cancel</Button>
                </HStack>
              </Box>
            )}
            {showRejectForm && (
              <Box bg="red.900" p={4} borderRadius="md">
                <Text fontWeight="bold" mb={2}>Reject Changes</Text>
                <Textarea placeholder="Reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} mb={3} />
                <HStack>
                  <Button colorScheme="red" onClick={handleReject} isLoading={actionLoading}>Confirm</Button>
                  <Button variant="ghost" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                </HStack>
              </Box>
            )}
          </VStack>
        )}
        {history.length > 0 && (
          <Box>
            <Text fontWeight="bold" color={textPrimary} mb={3}>Recent Actions</Text>
            <VStack spacing={2} align="stretch">
              {history.slice(-5).reverse().map((entry, i) => (
                <HStack key={i} p={3} bg={bgCard} borderRadius="md">
                  <Icon as={entry.action === 'promote' ? CheckCircleIcon : XCircleIcon} boxSize={5} color={entry.action === 'promote' ? 'green.400' : 'red.400'} />
                  <Text fontSize="sm" color={textPrimary} flex={1}>{entry.action}</Text>
                  <Text fontSize="xs" color={textSecondary}>{new Date(entry.timestamp).toLocaleString()}</Text>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default RLStagingApprovalPanel;
