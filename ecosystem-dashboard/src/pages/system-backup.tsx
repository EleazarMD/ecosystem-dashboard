import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Container,
  Heading,
  Button,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  useToast,
  Flex,
  Icon,
  Divider,
  Code,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tooltip,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  WarningIcon,
  RepeatIcon,
  TimeIcon,
  DownloadIcon,
  SettingsIcon,
  CalendarIcon,
  ArrowUpDownIcon,
} from '@chakra-ui/icons';
import {
  FaCloud, 
  FaHdd, 
  FaServer, 
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaDatabase,
  FaSyncAlt,
  FaCloudUploadAlt,
  FaCloudDownloadAlt,
} from 'react-icons/fa';

interface BackupStatus {
  status: 'running' | 'success' | 'failed' | 'idle';
  lastRun?: string;
  nextRun?: string;
  currentOperation?: string;
  progress?: number;
  error?: string;
}

interface BackupMetrics {
  totalBackups: number;
  successRate: number;
  storageUsed: string;
  totalDataSize?: string;
  lastBackupSize?: string;
  dailySnapshots: number;
  weeklySnapshots: number;
  cloudSafetyScore: number;
  uploadedToCloud: number;
}

interface BackupSnapshot {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  created: string;
  type: 'daily' | 'weekly';
  cloudStatus: 'uploaded' | 'uploading' | 'pending' | 'error' | 'unknown';
  uploadProgress?: number;
  safeInCloud: boolean;
  path: string;
}

interface DatabaseSyncStatus {
  isRunning: boolean;
  lastSync?: string;
  lastBackup?: string;
  currentOperation?: 'uploading' | 'downloading' | 'idle';
  progress?: number;
  direction?: 'local-to-cloud' | 'cloud-to-local';
  error?: string;
}

interface SyncLogEntry {
  id: string;
  timestamp: string;
  operation: 'sync' | 'backup' | 'restore';
  direction: 'local-to-cloud' | 'cloud-to-local';
  status: 'success' | 'error' | 'in-progress';
  message: string;
  recordsAffected?: number;
  duration?: string;
}

export default function SystemBackupPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [metrics, setMetrics] = useState<BackupMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [runningBackup, setRunningBackup] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dbSyncStatus, setDbSyncStatus] = useState<DatabaseSyncStatus>({
    isRunning: false,
    currentOperation: 'idle',
  });
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadData();
    loadDatabaseStatus();
    loadSyncLogs();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
      loadDatabaseStatus();
      loadSyncLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, metricsRes, snapshotsRes] = await Promise.all([
        fetch('/api/backup/status'),
        fetch('/api/backup/metrics'),
        fetch('/api/backup/snapshots'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (snapshotsRes.ok) {
        const snapshotsData = await snapshotsRes.json();
        setSnapshots(snapshotsData.snapshots || []);
      }
    } catch (error) {
      console.error('Failed to load backup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseStatus = async () => {
    try {
      const response = await fetch('/api/database/status');
      if (response.ok) {
        const data = await response.json();
        setDbSyncStatus({
          isRunning: data.isRunning,
          lastSync: data.lastSync,
          lastBackup: data.lastBackup,
          currentOperation: data.currentOperation,
          error: data.error,
        });
      }
    } catch (error) {
      console.error('Failed to load database status:', error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const response = await fetch('/api/database/logs?limit=50');
      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load sync logs:', error);
    }
  };

  const handleRunBackup = async () => {
    setRunningBackup(true);
    try {
      const response = await fetch('/api/backup/run', {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Backup Started',
          description: 'System backup is running in the background',
          status: 'success',
          duration: 5000,
        });
        // Reload data after a short delay
        setTimeout(loadData, 2000);
      } else {
        throw new Error('Failed to start backup');
      }
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: 'Failed to start backup process',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setRunningBackup(false);
    }
  };

  const handleDatabaseSync = async (direction: 'local-to-cloud' | 'cloud-to-local') => {
    setDbSyncStatus({ ...dbSyncStatus, isRunning: true, direction, currentOperation: direction === 'local-to-cloud' ? 'uploading' : 'downloading' });
    
    try {
      const response = await fetch('/api/database/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDbSyncStatus({
          isRunning: false,
          currentOperation: 'idle',
          lastSync: new Date().toISOString(),
        });

        toast({
          title: 'Database Sync Complete',
          description: data.message,
          status: 'success',
          duration: 5000,
        });

        // Reload logs
        await loadSyncLogs();
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error: any) {
      setDbSyncStatus({ ...dbSyncStatus, isRunning: false, error: error.message });
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync database',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleDatabaseBackup = async () => {
    setDbSyncStatus({ ...dbSyncStatus, isRunning: true, currentOperation: 'uploading' });
    
    try {
      const response = await fetch('/api/database/backup', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDbSyncStatus({
          isRunning: false,
          currentOperation: 'idle',
          lastBackup: new Date().toISOString(),
        });

        toast({
          title: 'Database Backup Complete',
          description: `${data.message} (${data.size})`,
          status: 'success',
          duration: 5000,
        });

        // Reload logs
        await loadSyncLogs();
      } else {
        throw new Error(data.message || 'Backup failed');
      }
    } catch (error: any) {
      setDbSyncStatus({ ...dbSyncStatus, isRunning: false, error: error.message });
      toast({
        title: 'Backup Failed',
        description: error.message || 'Failed to backup database',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'green';
      case 'running':
        return 'blue';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return CheckCircleIcon;
      case 'running':
        return RepeatIcon;
      case 'failed':
        return WarningIcon;
      default:
        return TimeIcon;
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex justify="center" align="center" minH="400px">
          <Spinner size="xl" />
        </Flex>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="xl" mb={2}>System Backup</Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Automated iCloud backup system for AI Homelab ecosystem
            </Text>
          </Box>
          <Button
            leftIcon={<RepeatIcon />}
            colorScheme="blue"
            onClick={handleRunBackup}
            isLoading={runningBackup}
            size="lg"
          >
            Run Backup Now
          </Button>
        </Flex>

        {/* Status Alert */}
        {status?.status === 'failed' && (
          <Alert status="error">
            <AlertIcon />
            {status.error || 'Backup system error'}
          </Alert>
        )}

        {status?.status === 'running' && (
          <Alert status="info">
            <AlertIcon />
            <VStack align="stretch" spacing={2} flex="1">
              <Text fontWeight="bold">Backup in progress...</Text>
              {status.currentOperation && (
                <Text fontSize="sm">{status.currentOperation}</Text>
              )}
              {typeof status.progress === 'number' && (
                <Progress value={status.progress} size="sm" colorScheme="blue" />
              )}
            </VStack>
          </Alert>
        )}

        {/* Metrics Cards */}
        {metrics && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card>
              <CardBody>
                <HStack>
                  <Icon as={FaCloud} color="blue.500" boxSize={6} />
                  <Box>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Backups</Text>
                    <Text fontSize="2xl" fontWeight="bold">{metrics.totalBackups}</Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {metrics.dailySnapshots} daily, {metrics.weeklySnapshots} weekly
                    </Text>
                  </Box>
                </HStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <HStack>
                  <Icon as={FaCheckCircle} color="green.500" boxSize={6} />
                  <Box>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Success Rate</Text>
                    <Text fontSize="2xl" fontWeight="bold">{metrics.successRate}%</Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Last 30 days</Text>
                  </Box>
                </HStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <HStack>
                  <Icon as={FaHdd} color="purple.500" boxSize={6} />
                  <Box>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Total Storage</Text>
                    <Text fontSize="2xl" fontWeight="bold">{metrics.storageUsed}</Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>In iCloud Drive</Text>
                  </Box>
                </HStack>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <HStack>
                  <Icon as={FaCloud} color={metrics.cloudSafetyScore === 100 ? 'green.500' : 'orange.500'} boxSize={6} />
                  <Box>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Cloud Safety</Text>
                    <Text fontSize="2xl" fontWeight="bold">{metrics.cloudSafetyScore}%</Text>
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      {metrics.uploadedToCloud}/{metrics.totalBackups} uploaded
                    </Text>
                  </Box>
                </HStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Status Card */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <HStack>
                  <Icon 
                    as={getStatusIcon(status?.status)} 
                    color={`${getStatusColor(status?.status)}.500`}
                    boxSize={5}
                  />
                  <Heading size="md">Backup Status</Heading>
                </HStack>
                <Badge colorScheme={getStatusColor(status?.status)} fontSize="md" px={3} py={1}>
                  {status?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </HStack>

              <Divider />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat>
                  <StatLabel>Last Backup</StatLabel>
                  <StatNumber fontSize="lg">
                    {status?.lastRun 
                      ? new Date(status.lastRun).toLocaleString()
                      : 'Never'}
                  </StatNumber>
                  <StatHelpText>
                    <CalendarIcon mr={1} />
                    Automated daily at 2:00 AM
                  </StatHelpText>
                </Stat>

                <Stat>
                  <StatLabel>Next Scheduled Backup</StatLabel>
                  <StatNumber fontSize="lg">
                    {status?.nextRun 
                      ? new Date(status.nextRun).toLocaleString()
                      : 'Tonight at 2:00 AM'}
                  </StatNumber>
                  <StatHelpText>
                    <TimeIcon mr={1} />
                    Automatic execution
                  </StatHelpText>
                </Stat>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Tabs for Snapshots and Logs */}
        <Card>
          <CardBody>
            <Tabs index={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab>
                  <Icon as={DownloadIcon} mr={2} />
                  Recent Snapshots
                </Tab>
                <Tab>
                  <Icon as={FaDatabase} mr={2} />
                  Database Cloud Sync
                </Tab>
                <Tab>
                  <Icon as={SettingsIcon} mr={2} />
                  Configuration
                </Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Last {snapshots.length} backup snapshots stored in iCloud Drive
                    </Text>

                    <TableContainer>
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Snapshot Name</Th>
                            <Th>Type</Th>
                            <Th>Size</Th>
                            <Th>Cloud Status</Th>
                            <Th>Created</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {snapshots.map((snapshot, index) => (
                            <Tr key={index}>
                              <Td>
                                <Code fontSize="xs">{snapshot.name}</Code>
                              </Td>
                              <Td>
                                <Badge colorScheme={snapshot.type === 'weekly' ? 'purple' : 'blue'}>
                                  {snapshot.type}
                                </Badge>
                              </Td>
                              <Td>{snapshot.size}</Td>
                              <Td>
                                <Tooltip label={snapshot.safeInCloud ? 'Safely uploaded to iCloud' : 'Not yet in cloud'}>
                                  <Badge 
                                    colorScheme={snapshot.safeInCloud ? 'green' : 'yellow'}
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                  >
                                    {snapshot.safeInCloud ? '✅ Uploaded' : '⏳ Syncing'}
                                  </Badge>
                                </Tooltip>
                              </Td>
                              <Td>{new Date(snapshot.created).toLocaleString()}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>

                    {snapshots.length === 0 && (
                      <Text color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                        No snapshots found
                      </Text>
                    )}
                  </VStack>
                </TabPanel>

                <TabPanel>
                  <VStack align="stretch" spacing={6}>
                    {/* Sync Status Header */}
                    <HStack justify="space-between">
                      <Box>
                        <Text fontSize="lg" fontWeight="bold" mb={1}>Database Cloud Synchronization</Text>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          Sync production data between local PostgreSQL and Cloud SQL
                        </Text>
                      </Box>
                      <HStack>
                        <Button
                          leftIcon={<Icon as={FaCloudUploadAlt} />}
                          colorScheme="blue"
                          size="sm"
                          onClick={() => handleDatabaseSync('local-to-cloud')}
                          isLoading={dbSyncStatus.isRunning && dbSyncStatus.direction === 'local-to-cloud'}
                          isDisabled={dbSyncStatus.isRunning}
                        >
                          Sync to Cloud
                        </Button>
                        <Button
                          leftIcon={<Icon as={FaCloudDownloadAlt} />}
                          colorScheme="purple"
                          size="sm"
                          onClick={() => handleDatabaseSync('cloud-to-local')}
                          isLoading={dbSyncStatus.isRunning && dbSyncStatus.direction === 'cloud-to-local'}
                          isDisabled={dbSyncStatus.isRunning}
                        >
                          Sync from Cloud
                        </Button>
                        <Button
                          leftIcon={<Icon as={FaDatabase} />}
                          colorScheme="green"
                          size="sm"
                          onClick={handleDatabaseBackup}
                          isLoading={dbSyncStatus.isRunning && dbSyncStatus.currentOperation === 'uploading'}
                          isDisabled={dbSyncStatus.isRunning}
                        >
                          Backup Now
                        </Button>
                      </HStack>
                    </HStack>

                    {/* Active Sync Progress */}
                    {dbSyncStatus.isRunning && (
                      <Alert status="info">
                        <AlertIcon />
                        <VStack align="stretch" spacing={2} flex="1">
                          <Text fontWeight="bold">
                            {dbSyncStatus.direction === 'local-to-cloud' ? 'Uploading to Cloud SQL...' : 'Downloading from Cloud SQL...'}
                          </Text>
                          <Progress size="sm" isIndeterminate colorScheme="blue" />
                        </VStack>
                      </Alert>
                    )}

                    {/* Sync Status Cards */}
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Card bg="blue.50" borderColor="blue.200" borderWidth="1px">
                        <CardBody>
                          <HStack spacing={3}>
                            <Icon as={FaSyncAlt} color="blue.500" boxSize={8} />
                            <Box>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="medium">Last Sync</Text>
                              <Text fontSize="lg" fontWeight="bold" color="blue.700">
                                {dbSyncStatus.lastSync 
                                  ? new Date(dbSyncStatus.lastSync).toLocaleTimeString()
                                  : 'Never'}
                              </Text>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {dbSyncStatus.lastSync 
                                  ? new Date(dbSyncStatus.lastSync).toLocaleDateString()
                                  : 'No sync performed yet'}
                              </Text>
                            </Box>
                          </HStack>
                        </CardBody>
                      </Card>

                      <Card bg="green.50" borderColor="green.200" borderWidth="1px">
                        <CardBody>
                          <HStack spacing={3}>
                            <Icon as={FaDatabase} color="green.500" boxSize={8} />
                            <Box>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="medium">Last Backup</Text>
                              <Text fontSize="lg" fontWeight="bold" color="green.700">
                                {dbSyncStatus.lastBackup 
                                  ? new Date(dbSyncStatus.lastBackup).toLocaleTimeString()
                                  : 'Never'}
                              </Text>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {dbSyncStatus.lastBackup 
                                  ? new Date(dbSyncStatus.lastBackup).toLocaleDateString()
                                  : 'No backup created yet'}
                              </Text>
                            </Box>
                          </HStack>
                        </CardBody>
                      </Card>

                      <Card bg="purple.50" borderColor="purple.200" borderWidth="1px">
                        <CardBody>
                          <HStack spacing={3}>
                            <Icon as={FaCloud} color="purple.500" boxSize={8} />
                            <Box>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="medium">Cloud Status</Text>
                              <Text fontSize="lg" fontWeight="bold" color="purple.700">
                                {dbSyncStatus.isRunning ? 'Syncing' : 'In Sync'}
                              </Text>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                ecosystem_unified
                              </Text>
                            </Box>
                          </HStack>
                        </CardBody>
                      </Card>
                    </SimpleGrid>

                    {/* Database Connection Info */}
                    <Card>
                      <CardBody>
                        <Text fontWeight="bold" mb={3}>Connection Information</Text>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color={useSemanticToken('text.secondary')} mb={2}>
                              Local PostgreSQL
                            </Text>
                            <VStack align="start" spacing={1}>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>Host:</Text>
                                <Code fontSize="xs">localhost:5432</Code>
                              </HStack>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>Database:</Text>
                                <Code fontSize="xs">ecosystem_unified</Code>
                              </HStack>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>User:</Text>
                                <Code fontSize="xs">eleazar</Code>
                              </HStack>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>Tables:</Text>
                                <Badge colorScheme="blue">23 tables</Badge>
                              </HStack>
                            </VStack>
                          </Box>

                          <Box>
                            <Text fontSize="sm" fontWeight="medium" color={useSemanticToken('text.secondary')} mb={2}>
                              Cloud SQL (Production)
                            </Text>
                            <VStack align="start" spacing={1}>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>Host:</Text>
                                <Code fontSize="xs">34.30.212.77:5432</Code>
                              </HStack>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>Database:</Text>
                                <Code fontSize="xs">ecosystem_unified</Code>
                              </HStack>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>User:</Text>
                                <Code fontSize="xs">workspace_user</Code>
                              </HStack>
                              <HStack fontSize="sm">
                                <Text color={useSemanticToken('text.secondary')}>SSL:</Text>
                                <Badge colorScheme="green">Required</Badge>
                              </HStack>
                            </VStack>
                          </Box>
                        </SimpleGrid>
                      </CardBody>
                    </Card>

                    {/* Sync Logs */}
                    <Box>
                      <HStack justify="space-between" mb={3}>
                        <Text fontWeight="bold">Synchronization Logs</Text>
                        <Badge colorScheme="gray">{syncLogs.length} entries</Badge>
                      </HStack>

                      <TableContainer>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr bg={useSemanticToken('surface.base')}>
                              <Th>Timestamp</Th>
                              <Th>Operation</Th>
                              <Th>Direction</Th>
                              <Th>Status</Th>
                              <Th>Message</Th>
                              <Th isNumeric>Records</Th>
                              <Th>Duration</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {syncLogs.map((log) => (
                              <Tr key={log.id}>
                                <Td fontSize="xs">
                                  {new Date(log.timestamp).toLocaleString()}
                                </Td>
                                <Td>
                                  <Badge 
                                    colorScheme={
                                      log.operation === 'sync' ? 'blue' : 
                                      log.operation === 'backup' ? 'green' : 'purple'
                                    }
                                    fontSize="xs"
                                  >
                                    {log.operation}
                                  </Badge>
                                </Td>
                                <Td fontSize="xs">
                                  <HStack spacing={1}>
                                    <Icon 
                                      as={log.direction === 'local-to-cloud' ? FaCloudUploadAlt : FaCloudDownloadAlt} 
                                      boxSize={3}
                                      color={log.direction === 'local-to-cloud' ? 'blue.500' : 'purple.500'}
                                    />
                                    <Text>
                                      {log.direction === 'local-to-cloud' ? 'Upload' : 'Download'}
                                    </Text>
                                  </HStack>
                                </Td>
                                <Td>
                                  <Badge 
                                    colorScheme={
                                      log.status === 'success' ? 'green' : 
                                      log.status === 'error' ? 'red' : 'yellow'
                                    }
                                    fontSize="xs"
                                  >
                                    {log.status}
                                  </Badge>
                                </Td>
                                <Td fontSize="xs" maxW="300px" isTruncated>
                                  {log.message}
                                </Td>
                                <Td isNumeric fontSize="xs">
                                  {log.recordsAffected || '-'}
                                </Td>
                                <Td fontSize="xs">{log.duration || '-'}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>

                      {syncLogs.length === 0 && (
                        <Box textAlign="center" py={8}>
                          <Icon as={FaSyncAlt} boxSize={12} color={useSemanticToken('text.tertiary')} mb={3} />
                          <Text color={useSemanticToken('text.secondary')} fontSize="sm">
                            No synchronization logs yet
                          </Text>
                          <Text color={useSemanticToken('text.tertiary')} fontSize="xs" mt={1}>
                            Sync operations will appear here
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </VStack>
                </TabPanel>

                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Backup system configuration and settings
                    </Text>

                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                      <Box>
                        <Text fontWeight="bold" mb={2}>Source Directory</Text>
                        <Code display="block" p={2} fontSize="sm">
                          /Users/eleazar/Projects/AIHomelab
                        </Code>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={2}>Destination</Text>
                        <Code display="block" p={2} fontSize="sm">
                          iCloud Drive/AI Homelab Backups
                        </Code>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={2}>Retention Policy</Text>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">• Daily: Last 7 snapshots</Text>
                          <Text fontSize="sm">• Weekly: Last 4 snapshots</Text>
                        </VStack>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={2}>Schedule</Text>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">• Daily at 2:00 AM</Text>
                          <Text fontSize="sm">• Weekly on Sundays</Text>
                        </VStack>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={2}>Excluded Directories</Text>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">• node_modules/</Text>
                          <Text fontSize="sm">• .venv/, venv/</Text>
                          <Text fontSize="sm">• dist/, build/</Text>
                          <Text fontSize="sm">• __pycache__/</Text>
                        </VStack>
                      </Box>

                      <Box>
                        <Text fontWeight="bold" mb={2}>Log Location</Text>
                        <Code display="block" p={2} fontSize="xs">
                          ~/Library/Logs/aihomelab-backup.log
                        </Code>
                      </Box>
                    </SimpleGrid>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
}
