import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiClock, FiCalendar, FiDatabase } from 'react-icons/fi';
import { CalendarIcon } from '@chakra-ui/icons';
import RetractablePanel from '../layout/RetractablePanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BackupSnapshot {
  name: string;
  type: 'daily' | 'weekly';
  size: string;
  created: string;
}

interface BackupSnapshotsPanelProps {
  snapshots: BackupSnapshot[];
  selectedSnapshotId?: string;
  onSelectSnapshot?: (name: string) => void;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  onWidthChange?: (width: number) => void;
  onRunBackup?: () => void;
}

export default function BackupSnapshotsPanel({
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
  isCollapsed,
  onToggleCollapse,
  onWidthChange,
  onRunBackup,
}: BackupSnapshotsPanelProps) {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');

  const dailySnapshots = snapshots.filter(s => s.type === 'daily').slice(0, 7);
  const weeklySnapshots = snapshots.filter(s => s.type === 'weekly').slice(0, 4);

  return (
    <RetractablePanel
      title="Backup Snapshots"
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
        <Button
          size="xs"
          colorScheme="blue"
          onClick={onRunBackup}
          leftIcon={<Icon as={FiClock} />}
        >
          Run Now
        </Button>
      }
    >
      <VStack spacing={4} align="stretch" p={4}>
        {/* Daily Snapshots */}
        <Box>
          <HStack mb={2} spacing={2}>
            <Icon as={FiCalendar} color="blue.500" boxSize={4} />
            <Text fontSize="sm" fontWeight="bold">Daily Backups</Text>
            <Badge colorScheme="blue" fontSize="xs">{dailySnapshots.length}</Badge>
          </HStack>
          <VStack spacing={1} align="stretch">
            {dailySnapshots.map((snapshot) => (
              <Box
                key={snapshot.name}
                p={2}
                bg={selectedSnapshotId === snapshot.name ? selectedBg : bgColor}
                borderWidth="1px"
                borderColor={selectedSnapshotId === snapshot.name ? 'blue.300' : borderColor}
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: hoverBg }}
                onClick={() => onSelectSnapshot?.(snapshot.name)}
                transition="all 0.2s"
              >
                <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                  {snapshot.name.replace('AIHomelab-daily-', '').replace('.tar.gz', '')}
                </Text>
                <HStack fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                  <Text>{snapshot.size}</Text>
                  <Text>•</Text>
                  <Text>{new Date(snapshot.created).toLocaleDateString()}</Text>
                </HStack>
              </Box>
            ))}
            {dailySnapshots.length === 0 && (
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center" py={2}>
                No daily snapshots
              </Text>
            )}
          </VStack>
        </Box>

        <Divider />

        {/* Weekly Snapshots */}
        <Box>
          <HStack mb={2} spacing={2}>
            <Icon as={FiClock} color="purple.500" boxSize={4} />
            <Text fontSize="sm" fontWeight="bold">Weekly Backups</Text>
            <Badge colorScheme="purple" fontSize="xs">{weeklySnapshots.length}</Badge>
          </HStack>
          <VStack spacing={1} align="stretch">
            {weeklySnapshots.map((snapshot) => (
              <Box
                key={snapshot.name}
                p={2}
                bg={selectedSnapshotId === snapshot.name ? 'purple.100' : bgColor}
                borderWidth="1px"
                borderColor={selectedSnapshotId === snapshot.name ? 'purple.300' : borderColor}
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: 'purple.50' }}
                onClick={() => onSelectSnapshot?.(snapshot.name)}
                transition="all 0.2s"
              >
                <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                  {snapshot.name.replace('AIHomelab-weekly-', '').replace('.tar.gz', '')}
                </Text>
                <HStack fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                  <Text>{snapshot.size}</Text>
                  <Text>•</Text>
                  <Text>{new Date(snapshot.created).toLocaleDateString()}</Text>
                </HStack>
              </Box>
            ))}
            {weeklySnapshots.length === 0 && (
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center" py={2}>
                No weekly snapshots
              </Text>
            )}
          </VStack>
        </Box>

        <Divider />

        {/* Storage Summary */}
        <Box>
          <HStack mb={2} spacing={2}>
            <Icon as={FiDatabase} color="green.500" boxSize={4} />
            <Text fontSize="sm" fontWeight="bold">Storage Info</Text>
          </HStack>
          <VStack spacing={1} align="stretch" fontSize="xs">
            <HStack justify="space-between">
              <Text color={useSemanticToken('text.secondary')}>Total Snapshots</Text>
              <Text fontWeight="medium">{snapshots.length}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color={useSemanticToken('text.secondary')}>Retention Policy</Text>
              <Text fontWeight="medium">7d + 4w</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color={useSemanticToken('text.secondary')}>Location</Text>
              <Text fontWeight="medium">iCloud</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </RetractablePanel>
  );
}
