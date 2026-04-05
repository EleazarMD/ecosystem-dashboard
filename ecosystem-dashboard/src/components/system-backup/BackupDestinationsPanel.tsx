import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Icon,
  Collapse,
  IconButton,
  Progress,
  Tooltip,
} from '@chakra-ui/react';
import { 
  FiCloud, 
  FiHardDrive, 
  FiDatabase,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiExternalLink,
} from 'react-icons/fi';
import RetractablePanel from '../layout/RetractablePanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BackupSnapshot {
  name: string;
  type: 'daily' | 'weekly';
  size: string;
  created: string;
}

interface BackupDestination {
  id: string;
  name: string;
  type: 'icloud' | 'local' | 'external' | 'gdrive' | 'dropbox' | 's3';
  status: 'healthy' | 'syncing' | 'error' | 'disconnected';
  storageUsed: string;
  totalStorage?: string;
  snapshotCount: number;
  lastSync?: string;
  syncProgress?: number;
}

interface BackupDestinationsPanelProps {
  snapshots: BackupSnapshot[];
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onWidthChange?: (width: number) => void;
  onRefresh?: () => void;
}

export default function BackupDestinationsPanel({
  snapshots,
  isCollapsed,
  onToggleCollapse,
  onWidthChange,
  onRefresh,
}: BackupDestinationsPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const [expandedDestinations, setExpandedDestinations] = useState<string[]>(['icloud']);

  const toggleDestination = (id: string) => {
    setExpandedDestinations(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  // Calculate destinations from actual data
  const dailyCount = snapshots.filter(s => s.type === 'daily').length;
  const weeklyCount = snapshots.filter(s => s.type === 'weekly').length;
  const totalSize = snapshots.reduce((acc, s) => {
    const sizeNum = parseFloat(s.size);
    return acc + (isNaN(sizeNum) ? 0 : sizeNum);
  }, 0);

  const destinations: BackupDestination[] = [
    {
      id: 'icloud',
      name: 'iCloud Drive',
      type: 'icloud',
      status: snapshots.length > 0 ? 'healthy' : 'disconnected',
      storageUsed: `${totalSize.toFixed(1)} GB`,
      snapshotCount: snapshots.length,
      lastSync: snapshots.length > 0 ? snapshots[0].created : undefined,
    },
    {
      id: 'local',
      name: 'Local Storage',
      type: 'local',
      status: 'disconnected',
      storageUsed: '0 GB',
      snapshotCount: 0,
    },
    {
      id: 'external',
      name: 'External Drives',
      type: 'external',
      status: 'disconnected',
      storageUsed: '0 GB',
      snapshotCount: 0,
    },
  ];

  const getStatusColor = (status: BackupDestination['status']) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'syncing': return 'blue';
      case 'error': return 'red';
      case 'disconnected': return 'gray';
    }
  };

  const getStatusIcon = (status: BackupDestination['status']) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'syncing': return '🔄';
      case 'error': return '⚠️';
      case 'disconnected': return '⭕';
    }
  };

  const getTypeIcon = (type: BackupDestination['type']) => {
    switch (type) {
      case 'icloud': return FiCloud;
      case 'local': return FiDatabase;
      case 'external': return FiHardDrive;
      case 'gdrive': return FiCloud;
      case 'dropbox': return FiCloud;
      case 's3': return FiCloud;
    }
  };

  return (
    <RetractablePanel
      title="Backup Destinations"
      icon={FiDatabase}
      iconColor="blue.500"
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      width={350}
      onWidthChange={onWidthChange}
      side="left"
      minWidth={280}
      maxWidth={500}
      headerActions={
        <Tooltip label="Refresh" placement="top">
          <IconButton
            icon={<FiRefreshCw />}
            size="xs"
            variant="ghost"
            aria-label="Refresh destinations"
            onClick={onRefresh}
          />
        </Tooltip>
      }
    >
      <VStack spacing={3} align="stretch" p={4}>
        {/* Active Destinations */}
        {destinations.map((dest) => (
          <Box key={dest.id}>
            <Box
              p={3}
              bg={bgColor}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              _hover={{ bg: hoverBg }}
              cursor="pointer"
              onClick={() => toggleDestination(dest.id)}
            >
              <HStack justify="space-between" mb={2}>
                <HStack spacing={2}>
                  <Icon as={getTypeIcon(dest.type)} boxSize={4} color="blue.500" />
                  <Text fontSize="sm" fontWeight="bold">{dest.name}</Text>
                  <Text fontSize="xs">{getStatusIcon(dest.status)}</Text>
                </HStack>
                <IconButton
                  icon={expandedDestinations.includes(dest.id) ? <FiChevronDown /> : <FiChevronRight />}
                  size="xs"
                  variant="ghost"
                  aria-label="Toggle details"
                />
              </HStack>

              <HStack spacing={4} fontSize="xs" color={useSemanticToken('text.secondary')}>
                <HStack spacing={1}>
                  <Text fontWeight="medium">{dest.snapshotCount}</Text>
                  <Text>snapshots</Text>
                </HStack>
                <HStack spacing={1}>
                  <Text fontWeight="medium">{dest.storageUsed}</Text>
                  <Text>used</Text>
                </HStack>
              </HStack>

              <Collapse in={expandedDestinations.includes(dest.id)} animateOpacity>
                <VStack align="stretch" mt={3} spacing={2} pt={2} borderTop="1px" borderColor={borderColor}>
                  {dest.status === 'healthy' && (
                    <>
                      <HStack justify="space-between" fontSize="xs">
                        <Text color={useSemanticToken('text.secondary')}>Status</Text>
                        <Badge colorScheme={getStatusColor(dest.status)} fontSize="xs">
                          {dest.status}
                        </Badge>
                      </HStack>
                      {dest.lastSync && (
                        <HStack justify="space-between" fontSize="xs">
                          <Text color={useSemanticToken('text.secondary')}>Last Sync</Text>
                          <Text fontWeight="medium">
                            {new Date(dest.lastSync).toLocaleDateString()}
                          </Text>
                        </HStack>
                      )}
                      {dest.id === 'icloud' && (
                        <>
                          <HStack justify="space-between" fontSize="xs">
                            <Text color={useSemanticToken('text.secondary')}>Daily Backups</Text>
                            <Text fontWeight="medium">{dailyCount}</Text>
                          </HStack>
                          <HStack justify="space-between" fontSize="xs">
                            <Text color={useSemanticToken('text.secondary')}>Weekly Backups</Text>
                            <Text fontWeight="medium">{weeklyCount}</Text>
                          </HStack>
                          <Button size="xs" leftIcon={<FiExternalLink />} variant="ghost" w="full">
                            Open in Finder
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  
                  {dest.status === 'syncing' && dest.syncProgress !== undefined && (
                    <Box>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>
                        Syncing... {dest.syncProgress}%
                      </Text>
                      <Progress value={dest.syncProgress} size="sm" colorScheme="blue" />
                    </Box>
                  )}

                  {dest.status === 'disconnected' && (
                    <Button size="xs" leftIcon={<FiPlus />} colorScheme="blue" variant="ghost" w="full">
                      Configure {dest.name}
                    </Button>
                  )}

                  {dest.status === 'error' && (
                    <Box>
                      <Text fontSize="xs" color="red.500" mb={2}>
                        Connection error
                      </Text>
                      <Button size="xs" colorScheme="red" variant="ghost" w="full">
                        Reconnect
                      </Button>
                    </Box>
                  )}
                </VStack>
              </Collapse>
            </Box>
          </Box>
        ))}

        <Divider />

        {/* Add Cloud Service */}
        <Box>
          <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} mb={2}>
            Add Cloud Backup
          </Text>
          <VStack spacing={1}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiCloud} />}
              w="full"
              fontSize="xs"
              isDisabled
            >
              Google Drive (Coming Soon)
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiCloud} />}
              w="full"
              fontSize="xs"
              isDisabled
            >
              Dropbox (Coming Soon)
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiCloud} />}
              w="full"
              fontSize="xs"
              isDisabled
            >
              AWS S3 (Coming Soon)
            </Button>
          </VStack>
        </Box>

        <Divider />

        {/* Quick Stats */}
        <Box>
          <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} mb={2}>
            Overall Statistics
          </Text>
          <VStack spacing={1} fontSize="xs">
            <HStack justify="space-between" w="full">
              <Text color={useSemanticToken('text.secondary')}>Total Snapshots</Text>
              <Text fontWeight="medium">{snapshots.length}</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text color={useSemanticToken('text.secondary')}>Total Storage</Text>
              <Text fontWeight="medium">{totalSize.toFixed(1)} GB</Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text color={useSemanticToken('text.secondary')}>Active Destinations</Text>
              <Text fontWeight="medium">
                {destinations.filter(d => d.status !== 'disconnected').length}
              </Text>
            </HStack>
            <HStack justify="space-between" w="full">
              <Text color={useSemanticToken('text.secondary')}>Retention Policy</Text>
              <Text fontWeight="medium">7d + 4w</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </RetractablePanel>
  );
}
