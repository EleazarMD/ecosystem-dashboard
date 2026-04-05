/**
 * Training Overview Dashboard
 * Main dashboard view showing training metrics, active jobs, and resource utilization
 * Connected to DGX Spark API for real-time data
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Progress,
  Badge,
  Icon,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Tooltip,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  IconButton,
} from '@chakra-ui/react';
import StatWrapper from '@/components/ui/StatWrapper';
import {
  CpuChipIcon,
  ServerStackIcon,
  ClockIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ArrowPathIcon,
  SignalIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useDGXSparkStream } from '@/hooks/useDGXSparkStream';
import { useTrainingJobs, useDGXSparkConnection } from '@/hooks/useDGXSparkApi';
import type { GPUStatus, TrainingJob as ApiJob } from '@/services/dgxSparkApi';

interface TrainingJob {
  id: string;
  name: string;
  model: string;
  status: 'running' | 'queued' | 'completed' | 'failed';
  progress: number;
  epoch: number;
  totalEpochs: number;
  loss: number;
  eta: string;
  gpu: string;
  startedAt: string;
}

interface ComputeResource {
  id: string;
  name: string;
  type: 'dgx-spark' | 'gpu-cluster' | 'cloud';
  status: 'online' | 'busy' | 'offline';
  gpuUtilization: number;
  memoryUsed: number;
  memoryTotal: number;
  activeJobs: number;
}

export const TrainingOverviewDashboard: React.FC = () => {
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceElevated = useSemanticToken('surface.elevated');

  // AI Training Hub real-time stream connection
  const { data: streamData, isConnected, isConnecting, error: streamError, reconnect } = useDGXSparkStream();
  
  // Jobs from API
  const { data: apiJobs, refetch: refetchJobs } = useTrainingJobs({ pollInterval: 10000 });

  // Connection status check
  const { isConnected: apiConnected, checkConnection } = useDGXSparkConnection();

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  // Format date helper
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Convert API jobs to display format
  const jobs: TrainingJob[] = useMemo(() => {
    // Get active jobs from stream data or API
    const activeJobs = streamData?.active_jobs || apiJobs?.filter((j: ApiJob) => j.status === 'running') || [];
    
    return activeJobs.map((job: ApiJob) => ({
      id: job.id,
      name: job.project_id,
      model: job.script,
      status: job.status === 'running' ? 'running' as const : 
              job.status === 'completed' ? 'completed' as const :
              job.status === 'failed' ? 'failed' as const : 'queued' as const,
      progress: job.status === 'running' ? 50 : job.status === 'completed' ? 100 : 0,
      epoch: 0,
      totalEpochs: 1,
      loss: 0,
      eta: job.status === 'running' ? 'In Progress' : '-',
      gpu: 'DGX Spark',
      startedAt: formatDate(job.started_at),
    }));
  }, [streamData, apiJobs]);

  // Convert GPU data to resources format
  const resources: ComputeResource[] = useMemo(() => {
    if (!streamData?.gpus) return [];
    
    return streamData.gpus.map((gpu: GPUStatus, index: number) => ({
      id: `gpu-${index}`,
      name: gpu.name || `GPU ${index}`,
      type: 'dgx-spark' as const,
      status: gpu.gpu_utilization > 0 ? 'busy' as const : 'online' as const,
      gpuUtilization: gpu.gpu_utilization || 0,
      memoryUsed: Math.round((gpu.memory_used || 0) / 1024), // Convert MB to GB
      memoryTotal: Math.round((gpu.memory_total || 0) / 1024),
      activeJobs: gpu.gpu_utilization > 0 ? 1 : 0,
    }));
  }, [streamData]);

  // Calculate aggregate metrics
  const totalGPUUtilization = useMemo(() => {
    if (!streamData?.gpus?.length) return 0;
    return Math.round(
      streamData.gpus.reduce((acc: number, gpu: GPUStatus) => acc + (gpu.gpu_utilization || 0), 0) / 
      streamData.gpus.length
    );
  }, [streamData]);

  const isLoading = isConnecting && !streamData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'online':
        return 'green';
      case 'queued':
      case 'busy':
        return 'yellow';
      case 'completed':
        return 'blue';
      case 'failed':
      case 'offline':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Connection Status Banner */}
      {streamError && (
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription flex={1}>{streamError}</AlertDescription>
          <Button size="sm" onClick={reconnect} leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}>
            Reconnect
          </Button>
        </Alert>
      )}

      {/* DGX Spark Connection Status */}
      <GlassPanel p={4}>
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Icon
              as={isConnected ? SignalIcon : SignalSlashIcon}
              boxSize={5}
              color={isConnected ? 'green.400' : 'red.400'}
            />
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" color={textPrimary}>
                RTX Training Hub (localhost:8766)
              </Text>
              <Text fontSize="sm" color={textSecondary}>
                {isConnected ? 'Connected - Real-time streaming active' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </Text>
            </VStack>
          </HStack>
          <HStack spacing={2}>
            {isConnecting && <Spinner size="sm" color="purple.500" />}
            {(streamData?.active_jobs?.length ?? 0) > 0 && (
              <Badge colorScheme="green" fontSize="sm">
                {streamData?.active_jobs?.length} Job(s) Active
              </Badge>
            )}
            {isConnected && (streamData?.active_jobs?.length ?? 0) === 0 && (
              <Badge colorScheme="gray" fontSize="sm">
                Idle
              </Badge>
            )}
            <Tooltip label="Refresh connection">
              <IconButton
                aria-label="Reconnect"
                icon={<Icon as={ArrowPathIcon} boxSize={4} />}
                size="sm"
                variant="ghost"
                onClick={reconnect}
              />
            </Tooltip>
          </HStack>
        </HStack>
      </GlassPanel>

      {/* Top Stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <GlassPanel p={4}>
          <StatWrapper>
            <StatLabel color={textSecondary}>Active Training Jobs</StatLabel>
            <StatNumber color={textPrimary}>
              {streamData?.active_jobs?.length ?? jobs.filter(j => j.status === 'running').length}
            </StatNumber>
            <StatHelpText>
              {(streamData?.active_jobs?.length ?? 0) > 0 ? (
                <>
                  <Icon as={BoltIcon} boxSize={3} mr={1} color="green.400" />
                  Training in progress
                </>
              ) : (
                'No active training'
              )}
            </StatHelpText>
          </StatWrapper>
        </GlassPanel>

        <GlassPanel p={4}>
          <StatWrapper>
            <StatLabel color={textSecondary}>GPU Utilization</StatLabel>
            <StatNumber color={textPrimary}>{totalGPUUtilization}%</StatNumber>
            <Progress
              value={totalGPUUtilization}
              size="sm"
              colorScheme={totalGPUUtilization > 80 ? 'red' : 'green'}
              mt={2}
              borderRadius="full"
            />
          </StatWrapper>
        </GlassPanel>

        <GlassPanel p={4}>
          <StatWrapper>
            <StatLabel color={textSecondary}>GPUs Connected</StatLabel>
            <StatNumber color={textPrimary}>
              {streamData?.gpus?.length || 0}
            </StatNumber>
            <StatHelpText color={isConnected ? 'green.400' : 'red.400'}>
              <Icon as={isConnected ? CheckCircleIcon : ExclamationTriangleIcon} boxSize={4} mr={1} />
              {isConnected ? 'DGX Spark online' : 'Disconnected'}
            </StatHelpText>
          </StatWrapper>
        </GlassPanel>

        <GlassPanel p={4}>
          <StatWrapper>
            <StatLabel color={textSecondary}>Estimated Completion</StatLabel>
            <StatNumber color={textPrimary}>
              {(streamData?.active_jobs?.length ?? 0) > 0 ? 'In Progress' : '-'}
            </StatNumber>
            <StatHelpText color={textSecondary}>
              <Icon as={ClockIcon} boxSize={4} mr={1} />
              {(streamData?.active_jobs?.length ?? 0) > 0
                ? `${streamData?.active_jobs?.length} job(s) running`
                : 'No active training'}
            </StatHelpText>
          </StatWrapper>
        </GlassPanel>
      </SimpleGrid>

      {/* Active Training Jobs */}
      <GlassPanel p={6}>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
            Active Training Jobs
          </Text>
          <Button
            size="sm"
            colorScheme="purple"
            leftIcon={<Icon as={PlayIcon} boxSize={4} />}
          >
            New Training
          </Button>
        </HStack>

        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th color={textSecondary}>Job Name</Th>
                <Th color={textSecondary}>Model</Th>
                <Th color={textSecondary}>Status</Th>
                <Th color={textSecondary}>Progress</Th>
                <Th color={textSecondary}>Loss</Th>
                <Th color={textSecondary}>ETA</Th>
                <Th color={textSecondary}>Resource</Th>
              </Tr>
            </Thead>
            <Tbody>
              {jobs.map((job) => (
                <Tr key={job.id}>
                  <Td>
                    <Text fontWeight="medium" color={textPrimary}>
                      {job.name}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={textSecondary}>
                      {job.model}
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </Td>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <Progress
                        value={job.progress}
                        size="sm"
                        colorScheme="purple"
                        w="100px"
                        borderRadius="full"
                      />
                      <Text fontSize="xs" color={textSecondary}>
                        Epoch {job.epoch}/{job.totalEpochs} ({job.progress}%)
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Text
                      color={job.loss > 0 ? 'green.400' : textSecondary}
                      fontFamily="mono"
                    >
                      {job.loss > 0 ? job.loss.toFixed(4) : '-'}
                    </Text>
                  </Td>
                  <Td>
                    <Text color={textSecondary}>{job.eta}</Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={textSecondary}>
                      {job.gpu}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </GlassPanel>

      {/* Compute Resources */}
      <GlassPanel p={6}>
        <Text fontSize="lg" fontWeight="bold" color={textPrimary} mb={4}>
          Compute Resources
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {resources.map((resource) => (
            <Box
              key={resource.id}
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderSubtle}
              bg={surfaceElevated}
            >
              <HStack justify="space-between" mb={3}>
                <HStack>
                  <Icon
                    as={resource.type === 'dgx-spark' ? CpuChipIcon : ServerStackIcon}
                    boxSize={5}
                    color={resource.type === 'dgx-spark' ? 'green.400' : 'blue.400'}
                  />
                  <Text fontWeight="bold" color={textPrimary}>
                    {resource.name}
                  </Text>
                </HStack>
                <Badge colorScheme={getStatusColor(resource.status)}>
                  {resource.status}
                </Badge>
              </HStack>

              <VStack align="stretch" spacing={2}>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color={textSecondary}>
                      GPU Utilization
                    </Text>
                    <Text fontSize="xs" color={textPrimary}>
                      {resource.gpuUtilization}%
                    </Text>
                  </HStack>
                  <Progress
                    value={resource.gpuUtilization}
                    size="xs"
                    colorScheme={resource.gpuUtilization > 80 ? 'red' : 'green'}
                    borderRadius="full"
                  />
                </Box>

                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color={textSecondary}>
                      Memory
                    </Text>
                    <Text fontSize="xs" color={textPrimary}>
                      {resource.memoryUsed}GB / {resource.memoryTotal}GB
                    </Text>
                  </HStack>
                  <Progress
                    value={(resource.memoryUsed / resource.memoryTotal) * 100}
                    size="xs"
                    colorScheme="blue"
                    borderRadius="full"
                  />
                </Box>

                <HStack justify="space-between" pt={2}>
                  <Text fontSize="xs" color={textSecondary}>
                    Active Jobs: {resource.activeJobs}
                  </Text>
                  <Badge variant="outline" colorScheme="purple" fontSize="2xs">
                    {resource.type.toUpperCase()}
                  </Badge>
                </HStack>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </GlassPanel>

      {/* Live Training Metrics */}
      <GlassPanel p={6}>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
            Active Jobs
          </Text>
          <HStack spacing={2}>
            <Button size="xs" variant="ghost" onClick={() => refetchJobs()}>
              <Icon as={ArrowPathIcon} boxSize={3} mr={1} />
              Refresh
            </Button>
          </HStack>
        </HStack>

        {(streamData?.active_jobs?.length ?? 0) > 0 ? (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Box p={3} bg={surfaceElevated} borderRadius="md">
              <Text fontSize="xs" color={textSecondary} mb={1}>Active Jobs</Text>
              <Text fontSize="2xl" fontWeight="bold" color="green.400" fontFamily="mono">
                {streamData?.active_jobs?.length ?? 0}
              </Text>
            </Box>
            <Box p={3} bg={surfaceElevated} borderRadius="md">
              <Text fontSize="xs" color={textSecondary} mb={1}>Total Jobs</Text>
              <Text fontSize="2xl" fontWeight="bold" color="blue.400" fontFamily="mono">
                {streamData?.total_jobs ?? apiJobs?.length ?? 0}
              </Text>
            </Box>
            <Box p={3} bg={surfaceElevated} borderRadius="md">
              <Text fontSize="xs" color={textSecondary} mb={1}>Projects</Text>
              <Text fontSize="2xl" fontWeight="bold" color="purple.400" fontFamily="mono">
                {streamData?.projects?.length ?? 0}
              </Text>
            </Box>
            <Box p={3} bg={surfaceElevated} borderRadius="md">
              <Text fontSize="xs" color={textSecondary} mb={1}>Hub Status</Text>
              <Text fontSize="2xl" fontWeight="bold" color="orange.400" fontFamily="mono">
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </Box>
          </SimpleGrid>
        ) : (
          <Box
            h="150px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            border="1px dashed"
            borderColor={borderSubtle}
            borderRadius="md"
          >
            <VStack>
              <Icon as={ArrowTrendingUpIcon} boxSize={8} color={textSecondary} />
              <Text color={textSecondary}>
                {isConnected ? 'No active training jobs' : 'Connect to Training Hub for live status'}
              </Text>
            </VStack>
          </Box>
        )}

        {/* Jobs Summary */}
        {apiJobs && apiJobs.length > 0 && (
          <Box mt={4}>
            <Text fontSize="sm" fontWeight="medium" color={textSecondary} mb={2}>
              Recent Jobs ({apiJobs.length} total)
            </Text>
            <HStack spacing={4} overflowX="auto" pb={2}>
              {apiJobs.slice(0, 5).map((job: ApiJob, idx: number) => (
                <Box key={idx} p={2} bg={surfaceElevated} borderRadius="md" minW="120px">
                  <Text fontSize="xs" color={textSecondary}>{job.project_id}</Text>
                  <Text fontSize="sm" fontWeight="bold" color={job.status === 'running' ? 'green.400' : 'gray.400'}>
                    {job.status}
                  </Text>
                </Box>
              ))}
            </HStack>
          </Box>
        )}
      </GlassPanel>

      {/* System Status */}
      {streamData?.system && (
        <GlassPanel p={6}>
          <Text fontSize="lg" fontWeight="bold" color={textPrimary} mb={4}>
            System Status
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color={textSecondary} mb={1}>CPU Usage</Text>
              <Progress value={streamData.system.cpu_percent} size="sm" colorScheme="blue" borderRadius="full" />
              <Text fontSize="xs" color={textPrimary} mt={1}>{streamData.system.cpu_percent?.toFixed(1)}%</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary} mb={1}>Memory Usage</Text>
              <Progress value={streamData.system.memory_percent} size="sm" colorScheme="purple" borderRadius="full" />
              <Text fontSize="xs" color={textPrimary} mt={1}>
                {streamData.system.memory_used_gb?.toFixed(1)} / {streamData.system.memory_total_gb?.toFixed(1)} GB
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary} mb={1}>Disk Usage</Text>
              <Progress value={streamData.system.disk_percent} size="sm" colorScheme="orange" borderRadius="full" />
              <Text fontSize="xs" color={textPrimary} mt={1}>{streamData.system.disk_percent?.toFixed(1)}%</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color={textSecondary} mb={1}>Uptime</Text>
              <Text fontSize="lg" fontWeight="bold" color={textPrimary}>
                {formatTime(streamData.system.uptime_seconds)}
              </Text>
            </Box>
          </SimpleGrid>
        </GlassPanel>
      )}
    </VStack>
  );
};

export default TrainingOverviewDashboard;
