/**
 * VersionHistoryPanel - Shows page version history with diff and restore
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  Badge,
  Spinner,
  Divider,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiClock, FiRotateCcw, FiChevronRight, FiSave } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Version {
  id: string;
  pageId: string;
  versionNumber: number;
  title: string;
  createdBy: string;
  createdAt: string;
  changeSummary?: string;
  snapshotType: 'auto' | 'manual' | 'restore';
}

interface VersionHistoryPanelProps {
  pageId: string;
  userId: string;
  onRestore?: () => void;
}

export function VersionHistoryPanel({ pageId, userId, onRestore }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    loadVersions();
  }, [pageId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pages/${pageId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    try {
      setRestoring(versionNumber);
      const response = await fetch(`/api/pages/${pageId}/versions/${versionNumber}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast({
          title: `Restored to version ${versionNumber}`,
          status: 'success',
          duration: 3000,
        });
        onRestore?.();
        loadVersions();
      } else {
        toast({ title: 'Failed to restore', status: 'error', duration: 3000 });
      }
    } catch (error) {
      console.error('Failed to restore:', error);
      toast({ title: 'Failed to restore', status: 'error', duration: 3000 });
    } finally {
      setRestoring(null);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      const response = await fetch(`/api/pages/${pageId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Manual snapshot',
          content: [],
          createdBy: userId,
          changeSummary: 'Manual snapshot',
          snapshotType: 'manual',
        }),
      });

      if (response.ok) {
        toast({ title: 'Snapshot created', status: 'success', duration: 2000 });
        loadVersions();
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getSnapshotBadge = (type: string) => {
    switch (type) {
      case 'manual': return <Badge colorScheme="blue" fontSize="xs">Manual</Badge>;
      case 'restore': return <Badge colorScheme="orange" fontSize="xs">Restore</Badge>;
      default: return <Badge colorScheme="gray" fontSize="xs">Auto</Badge>;
    }
  };

  if (loading) {
    return (
      <VStack py={6} spacing={3}>
        <Spinner size="md" />
        <Text fontSize="sm" color={textSecondary}>Loading history...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={0} align="stretch" h="full">
      <HStack px={4} py={3} justify="space-between" borderBottom="1px" borderColor={borderColor}>
        <HStack spacing={2}>
          <Icon as={FiClock} boxSize={4} color={textSecondary} />
          <Text fontSize="sm" fontWeight="600" color={textPrimary}>
            Version History
          </Text>
          <Badge colorScheme="gray" fontSize="xs">{versions.length}</Badge>
        </HStack>
        <Button size="xs" variant="ghost" leftIcon={<FiSave />} onClick={handleCreateSnapshot}>
          Snapshot
        </Button>
      </HStack>

      <Box overflowY="auto" flex={1}>
        {versions.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text fontSize="sm" color={textSecondary}>No versions yet</Text>
            <Text fontSize="xs" color={textSecondary} mt={1}>
              Versions are created automatically when you save
            </Text>
          </Box>
        ) : (
          <VStack spacing={0} align="stretch">
            {versions.map((version) => (
              <Box
                key={version.id}
                px={4}
                py={3}
                borderBottom="1px"
                borderColor={borderColor}
                _hover={{ bg: hoverBg }}
                cursor="pointer"
              >
                <HStack justify="space-between" mb={1}>
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                      v{version.versionNumber}
                    </Text>
                    {getSnapshotBadge(version.snapshotType)}
                  </HStack>
                  <Text fontSize="xs" color={textSecondary}>
                    {formatDate(version.createdAt)}
                  </Text>
                </HStack>

                {version.changeSummary && (
                  <Text fontSize="xs" color={textSecondary} noOfLines={2} mb={2}>
                    {version.changeSummary}
                  </Text>
                )}

                <HStack spacing={2}>
                  <Button
                    size="xs"
                    variant="ghost"
                    leftIcon={<FiRotateCcw />}
                    onClick={() => handleRestore(version.versionNumber)}
                    isLoading={restoring === version.versionNumber}
                    loadingText="Restoring..."
                  >
                    Restore
                  </Button>
                  <Text fontSize="xs" color={textSecondary}>
                    by {version.createdBy}
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
}
