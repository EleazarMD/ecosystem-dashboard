import React from 'react';
import {
  Box,
  VStack,
  Text,
  IconButton,
  Heading,
  Badge,
  HStack,
  Divider,
  Button,
  Tooltip,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  TimeIcon,
} from '@chakra-ui/icons';
import { FaCloud, FaHdd } from 'react-icons/fa';
import { Resizable } from 're-resizable';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BackupSnapshot {
  name: string;
  type: 'daily' | 'weekly';
  size: string;
  created: string;
}

interface BackupLibraryPanelProps {
  snapshots: BackupSnapshot[];
  selectedSnapshotId?: string;
  onSelectSnapshot?: (name: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onWidthChange?: (width: number) => void;
  onRunBackup?: () => void;
}

export default function BackupLibraryPanel({
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
  isCollapsed,
  onToggleCollapse,
  onWidthChange,
  onRunBackup,
}: BackupLibraryPanelProps) {
  const dailySnapshots = snapshots.filter(s => s.type === 'daily');
  const weeklySnapshots = snapshots.filter(s => s.type === 'weekly');

  if (isCollapsed) {
    return (
      <Box
        position="fixed"
        left={0}
        top="60px"
        bottom={0}
        w="60px"
        bg={useSemanticToken('surface.base')}
        borderRight="1px"
        borderColor={useSemanticToken('border.default')}
        zIndex={10}
      >
        <VStack spacing={4} pt={4}>
          <Tooltip label="Expand" placement="right">
            <IconButton
              icon={<ChevronRightIcon />}
              aria-label="Expand panel"
              size="sm"
              onClick={onToggleCollapse}
            />
          </Tooltip>
          <Divider />
          <Tooltip label={`${dailySnapshots.length} Daily`} placement="right">
            <Box>
              <CalendarIcon boxSize={5} color="blue.500" />
              <Badge colorScheme="blue" fontSize="xs" ml={-2} mt={-2}>
                {dailySnapshots.length}
              </Badge>
            </Box>
          </Tooltip>
          <Tooltip label={`${weeklySnapshots.length} Weekly`} placement="right">
            <Box>
              <TimeIcon boxSize={5} color="purple.500" />
              <Badge colorScheme="purple" fontSize="xs" ml={-2} mt={-2}>
                {weeklySnapshots.length}
              </Badge>
            </Box>
          </Tooltip>
        </VStack>
      </Box>
    );
  }

  return (
    <Resizable
      defaultSize={{ width: 350, height: '100%' }}
      minWidth={250}
      maxWidth={500}
      enable={{ right: true }}
      onResizeStop={(e, direction, ref, d) => {
        if (onWidthChange) {
          onWidthChange(ref.offsetWidth);
        }
      }}
      style={{
        position: 'fixed',
        left: 0,
        top: '60px',
        bottom: 0,
        zIndex: 10,
      }}
    >
      <Box
        h="full"
        bg={useSemanticToken('surface.elevated')}
        borderRight="1px"
        borderColor={useSemanticToken('border.default')}
        overflowY="auto"
      >
        <VStack spacing={4} align="stretch" p={4}>
          {/* Header */}
          <HStack justify="space-between">
            <Heading size="sm">Backup Library</Heading>
            <IconButton
              icon={<ChevronLeftIcon />}
              aria-label="Collapse panel"
              size="sm"
              onClick={onToggleCollapse}
            />
          </HStack>

          {/* Quick Actions */}
          <Button
            leftIcon={<FaCloud />}
            colorScheme="blue"
            size="sm"
            onClick={onRunBackup}
          >
            Run Backup Now
          </Button>

          <Divider />

          {/* Daily Snapshots */}
          <Box>
            <HStack mb={2}>
              <CalendarIcon color="blue.500" />
              <Text fontWeight="bold" fontSize="sm">
                Daily Snapshots
              </Text>
              <Badge colorScheme="blue">{dailySnapshots.length}</Badge>
            </HStack>
            <VStack align="stretch" spacing={1}>
              {dailySnapshots.slice(0, 7).map((snapshot) => (
                <Box
                  key={snapshot.name}
                  p={2}
                  bg={selectedSnapshotId === snapshot.name ? 'blue.50' : 'gray.50'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: 'blue.50' }}
                  onClick={() => onSelectSnapshot?.(snapshot.name)}
                >
                  <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                    {snapshot.name}
                  </Text>
                  <HStack fontSize="xs" color={useSemanticToken('text.secondary')}>
                    <Text>{snapshot.size}</Text>
                    <Text>•</Text>
                    <Text>{new Date(snapshot.created).toLocaleDateString()}</Text>
                  </HStack>
                </Box>
              ))}
              {dailySnapshots.length === 0 && (
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  No daily snapshots
                </Text>
              )}
            </VStack>
          </Box>

          <Divider />

          {/* Weekly Snapshots */}
          <Box>
            <HStack mb={2}>
              <TimeIcon color="purple.500" />
              <Text fontWeight="bold" fontSize="sm">
                Weekly Snapshots
              </Text>
              <Badge colorScheme="purple">{weeklySnapshots.length}</Badge>
            </HStack>
            <VStack align="stretch" spacing={1}>
              {weeklySnapshots.slice(0, 4).map((snapshot) => (
                <Box
                  key={snapshot.name}
                  p={2}
                  bg={selectedSnapshotId === snapshot.name ? 'purple.50' : 'gray.50'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: 'purple.50' }}
                  onClick={() => onSelectSnapshot?.(snapshot.name)}
                >
                  <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                    {snapshot.name}
                  </Text>
                  <HStack fontSize="xs" color={useSemanticToken('text.secondary')}>
                    <Text>{snapshot.size}</Text>
                    <Text>•</Text>
                    <Text>{new Date(snapshot.created).toLocaleDateString()}</Text>
                  </HStack>
                </Box>
              ))}
              {weeklySnapshots.length === 0 && (
                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  No weekly snapshots
                </Text>
              )}
            </VStack>
          </Box>

          <Divider />

          {/* Storage Info */}
          <Box>
            <HStack mb={2}>
              <FaHdd />
              <Text fontWeight="bold" fontSize="sm">
                iCloud Storage
              </Text>
            </HStack>
            <VStack align="stretch" spacing={1}>
              <HStack justify="space-between" fontSize="xs">
                <Text color={useSemanticToken('text.secondary')}>Total Snapshots</Text>
                <Text fontWeight="medium">{snapshots.length}</Text>
              </HStack>
              <HStack justify="space-between" fontSize="xs">
                <Text color={useSemanticToken('text.secondary')}>Retention</Text>
                <Text fontWeight="medium">7d + 4w</Text>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Box>
    </Resizable>
  );
}
